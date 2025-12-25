from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import status
import logging
from rest_framework.permissions import IsAuthenticatedOrReadOnly, IsAuthenticated, AllowAny
from .permissions import RolePermission
from django.shortcuts import render
from django.conf import settings
from django.contrib.auth import authenticate, get_user_model
from django.http import JsonResponse
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework_simplejwt.tokens import RefreshToken
import uuid
from rest_framework.permissions import IsAuthenticated
from .serializers import StaffSerializer
from django.contrib.auth import get_user_model

from .models import Patient, Staff, Appointment, Billing, InventoryItem, Acte
from django.db.models import Sum, Case, When, DecimalField, Q
from .serializers import PatientSerializer, StaffSerializer, AppointmentSerializer, BillingSerializer, InventorySerializer, ActeSerializer
from django.utils import timezone
from .mixins import TenantFilterMixin


class PatientViewSet(TenantFilterMixin, viewsets.ModelViewSet):
    # only staff with allowed roles can access (read/write)
    permission_classes = [IsAuthenticated, RolePermission]
    allowed_roles = ['admin', 'reception', 'doctor', 'nurse', 'billing']
    queryset = Patient.objects.all().order_by('last_name')
    serializer_class = PatientSerializer
    logger = logging.getLogger(__name__)

    def create(self, request, *args, **kwargs):
        # Log incoming payload for debugging 400 Bad Request
        try:
            self.logger.info('Patient create request by %s path=%s data=%s', request.user if hasattr(request, 'user') else None, request.path, request.data)
        except Exception:
            pass
        # Ensure tenant is included in the payload before validation.
        data = dict(request.data) if isinstance(request.data, dict) else {k: v for k, v in request.data.items()}
        tenant = getattr(request, 'tenant', None)
        # normalize date/time fields: accept `date` or legacy `start_time` (and datetime-local strings)
        try:
            if not data.get('date') and data.get('start_time'):
                # start_time might be ISO datetime like '2025-12-22T14:30'
                st = data.get('start_time')
                if isinstance(st, str) and 'T' in st:
                    data['date'] = st.split('T')[0]
                else:
                    # if it's a date-like string, use it directly
                    data['date'] = st
        except Exception:
            pass
        # If no tenant from middleware, try to use authenticated user's staff.tenant
        if tenant is None:
            try:
                user = getattr(request, 'user', None)
                if user and getattr(user, 'is_authenticated', False):
                    staff = getattr(user, 'staff_profile', None)
                    if staff and getattr(staff, 'tenant', None):
                        tenant = staff.tenant
            except Exception:
                tenant = None

        if tenant is not None and not data.get('tenant'):
            # use tenant id (primary key)
            try:
                data['tenant'] = str(tenant.id)
            except Exception:
                data['tenant'] = tenant.pk

        serializer = self.get_serializer(data=data)
        if not serializer.is_valid():
            # Log validation errors to server log to help debugging
            try:
                self.logger.warning('Patient create validation failed: %s', serializer.errors)
            except Exception:
                pass
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    


class StaffViewSet(TenantFilterMixin, viewsets.ModelViewSet):
    # Only admin can manage staff
    permission_classes = [IsAuthenticated, RolePermission]
    allowed_roles = ['admin']
    # Order staff by role then linked user's last/first name when available.
    queryset = Staff.objects.all().order_by('role', 'user__last_name', 'user__first_name')
    serializer_class = StaffSerializer
    logger = __import__('logging').getLogger(__name__)

    def create(self, request, *args, **kwargs):
        # Log incoming payload for debugging 400 Bad Request
        try:
            self.logger.info('Staff create request by %s path=%s data=%s', getattr(request, 'user', None), request.path, request.data)
        except Exception:
            pass

        data = dict(request.data) if isinstance(request.data, dict) else {k: v for k, v in request.data.items()}
        tenant = getattr(request, 'tenant', None)
        if tenant is None:
            try:
                user = getattr(request, 'user', None)
                if user and getattr(user, 'is_authenticated', False):
                    staff = getattr(user, 'staff_profile', None)
                    if staff and getattr(staff, 'tenant', None):
                        tenant = staff.tenant
            except Exception:
                tenant = None

        if tenant is not None and not data.get('tenant'):
            try:
                data['tenant'] = str(tenant.id)
            except Exception:
                data['tenant'] = tenant.pk

        serializer = self.get_serializer(data=data)
        if not serializer.is_valid():
            try:
                self.logger.warning('Staff create validation failed: %s', serializer.errors)
            except Exception:
                pass
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)
    
    
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def create_user(self, request, pk=None):
        """Create a Django User for this Staff and link it (authenticated users).

        POST body: { "username": "optional", "password": "required" }
        """
        staff = self.get_object()
        if staff.user:
            return Response({'detail': 'Staff already linked to a user.'}, status=status.HTTP_400_BAD_REQUEST)

        password = request.data.get('password')
        if not password:
            return Response({'detail': 'Password is required.'}, status=status.HTTP_400_BAD_REQUEST)

        username = request.data.get('username')
        User = get_user_model()
        # derive username if not provided
        if not username:
            if staff.email:
                base = staff.email.split('@')[0]
                username = base
            else:
                username = f'staff_{str(staff.id)[:8]}'

        # ensure unique username
        orig = username
        counter = 1
        while User.objects.filter(username=username).exists():
            username = f"{orig}{counter}"
            counter += 1

        user = User.objects.create_user(username=username, email=staff.email or '', password=password)
        staff.user = user
        staff.save()
        ser = self.get_serializer(staff)
        return Response(ser.data, status=status.HTTP_201_CREATED)


class AppointmentViewSet(TenantFilterMixin, viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, RolePermission]
    allowed_roles = ['admin', 'reception', 'doctor', 'nurse']
    queryset = Appointment.objects.all().order_by('-date')
    serializer_class = AppointmentSerializer
    logger = logging.getLogger(__name__)

    def create(self, request, *args, **kwargs):
        # Ensure tenant included before validation (similar to other create methods)
        try:
            self.logger.info('Appointment create request by %s path=%s data=%s', getattr(request, 'user', None), request.path, request.data)
        except Exception:
            pass

        data = dict(request.data) if isinstance(request.data, dict) else {k: v for k, v in request.data.items()}
        tenant = getattr(request, 'tenant', None)
        if tenant is None:
            try:
                user = getattr(request, 'user', None)
                if user and getattr(user, 'is_authenticated', False):
                    staff = getattr(user, 'staff_profile', None)
                    if staff and getattr(staff, 'tenant', None):
                        tenant = staff.tenant
            except Exception:
                tenant = None

        if tenant is not None and not data.get('tenant'):
            try:
                data['tenant'] = str(tenant.id)
            except Exception:
                data['tenant'] = tenant.pk

        serializer = self.get_serializer(data=data)
        if not serializer.is_valid():
            try:
                self.logger.warning('Appointment create validation failed: %s', serializer.errors)
            except Exception:
                pass
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)


class BillingViewSet(TenantFilterMixin, viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, RolePermission]
    allowed_roles = ['admin', 'billing']
    # select_related patient and prefetch items to avoid N+1 queries when listing
    queryset = Billing.objects.all().select_related('patient').prefetch_related('items').order_by('-issued_at')
    serializer_class = BillingSerializer

    def create(self, request, *args, **kwargs):
        # Ensure tenant included before validation and allow convenient top-level acte/description
        try:
            self.logger = getattr(self, 'logger', None) or __import__('logging').getLogger(__name__)
            self.logger.info('Billing create request by %s path=%s data=%s', getattr(request, 'user', None), request.path, request.data)
        except Exception:
            pass

        # normalize incoming data into a mutable dict
        data = dict(request.data) if isinstance(request.data, dict) else {k: v for k, v in request.data.items()}

        # attach tenant if middleware set it or if user's staff has tenant
        tenant = getattr(request, 'tenant', None)
        if tenant is None:
            try:
                user = getattr(request, 'user', None)
                if user and getattr(user, 'is_authenticated', False):
                    staff = getattr(user, 'staff_profile', None)
                    if staff and getattr(staff, 'tenant', None):
                        tenant = staff.tenant
            except Exception:
                tenant = None

        if tenant is not None and not data.get('tenant'):
            try:
                data['tenant'] = str(tenant.id)
            except Exception:
                data['tenant'] = tenant.pk

        # allow passing a single acte + description at top level instead of nested items
        if not data.get('items'):
            acte_id = data.pop('acte', None) or data.pop('acte_id', None)
            desc = data.pop('description', None) or data.pop('desc', None)
            qty = data.pop('quantity', None) or 1
            if acte_id:
                try:
                    data['items'] = [{'acte': acte_id, 'description': desc or '', 'quantity': qty}]
                    # preserve top-level description so billing list can show it
                    if desc and not data.get('description'):
                        data['description'] = desc
                except Exception:
                    pass

        serializer = self.get_serializer(data=data)
        if not serializer.is_valid():
            try:
                self.logger.warning('Billing create validation failed: %s', serializer.errors)
            except Exception:
                pass
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def add_payment(self, request, pk=None):
        """Add a payment to a billing. POST body: { amount: number, currency: 'CDF'|'USD', method: '...' }"""
        billing = self.get_object()
        data = request.data or {}
        try:
            amt = float(data.get('amount') or 0)
        except Exception:
            return Response({'detail': 'Invalid amount'}, status=status.HTTP_400_BAD_REQUEST)
        if amt <= 0:
            return Response({'detail': 'Amount must be > 0'}, status=status.HTTP_400_BAD_REQUEST)
        currency = data.get('currency') or billing.currency
        method = data.get('method') or ''
        # create payment
        from .models import BillingPayment
        pay = BillingPayment.objects.create(billing=billing, amount=amt, currency=currency, method=method)
        # if fully paid, set paid_at
        try:
            total_paid = billing.payments.aggregate(s=Sum('amount'))['s'] or 0
            if float(total_paid) >= float(billing.amount or 0):
                billing.paid_at = timezone.now()
                billing.save()
        except Exception:
            pass

        ser = self.get_serializer(billing)
        return Response(ser.data)
    def pay(self, request, pk=None):
        """Mark a billing as paid. Sets `status='paid'` and `paid_at` to now."""
        billing = self.get_object()
        # If already has a paid timestamp, report it; otherwise set paid_at.
        if billing.paid_at is not None:
            return Response({'detail': 'Billing already marked paid.'}, status=status.HTTP_400_BAD_REQUEST)
        billing.paid_at = timezone.now()
        billing.save()
        serializer = self.get_serializer(billing)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], permission_classes=[AllowAny])
    def totals(self, request):
        """Return totals grouped by currency for the current tenant (or all if no tenant).

        Response format: [{ 'currency': 'CDF', 'total': 123.45, 'paid': 100.00, 'unpaid': 23.45 }, ...]
        """
        qs = Billing.objects.all()
        # apply tenant filter if middleware set request.tenant
        tenant = getattr(request, 'tenant', None)
        if tenant:
            qs = qs.filter(tenant=tenant)
        # compute totals per currency and paid/unpaid based on actual payments (supports partial payments)
        currencies = [c[0] for c in getattr(Billing, 'CURRENCY_CHOICES', [])]
        result = []
        from .models import BillingPayment
        for cur in currencies:
            total = qs.filter(currency=cur).aggregate(s=Sum('amount'))['s'] or 0
            # sum payments for billings in this currency (join via billing__currency)
            paid = BillingPayment.objects.filter(billing__currency=cur)
            if tenant:
                paid = paid.filter(billing__tenant=tenant)
            paid_amt = paid.aggregate(s=Sum('amount'))['s'] or 0
            unpaid = (total or 0) - (paid_amt or 0)
            result.append({'currency': cur, 'total': float(total or 0), 'paid': float(paid_amt or 0), 'unpaid': float(unpaid or 0)})

        return Response(result)


class InventoryViewSet(TenantFilterMixin, viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, RolePermission]
    allowed_roles = ['admin', 'billing']
    queryset = InventoryItem.objects.all().order_by('name')
    serializer_class = InventorySerializer


class ActeViewSet(TenantFilterMixin, viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, RolePermission]
    allowed_roles = ['admin', 'doctor', 'billing']
    queryset = Acte.objects.all().order_by('name')
    serializer_class = ActeSerializer
    logger = logging.getLogger(__name__)

    def create(self, request, *args, **kwargs):
        # Ensure tenant included before validation
        try:
            self.logger.info('Acte create request by %s path=%s data=%s', request.user if hasattr(request, 'user') else None, request.path, request.data)
        except Exception:
            pass

        data = dict(request.data) if isinstance(request.data, dict) else {k: v for k, v in request.data.items()}
        tenant = getattr(request, 'tenant', None)
        if tenant is None:
            try:
                user = getattr(request, 'user', None)
                if user and getattr(user, 'is_authenticated', False):
                    staff = getattr(user, 'staff_profile', None)
                    if staff and getattr(staff, 'tenant', None):
                        tenant = staff.tenant
            except Exception:
                tenant = None

        if tenant is not None and not data.get('tenant'):
            try:
                data['tenant'] = str(tenant.id)
            except Exception:
                data['tenant'] = tenant.pk

        serializer = self.get_serializer(data=data)
        if not serializer.is_valid():
            try:
                self.logger.warning('Acte create validation failed: %s', serializer.errors)
            except Exception:
                pass
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)


def custom_404(request, exception=None):
    """Render a friendly styled 404 page.

    Note: Django only uses handler404 when DEBUG = False. For local testing
    you can temporarily set DEBUG = False in `hms/settings.py` or add a
    dedicated test route that raises Http404.
    """
    context = {'path': request.path}
    return render(request, '404.html', context=context, status=404)


@api_view(['POST'])
@permission_classes([AllowAny])
def debug_auth(request):
    """Debug endpoint to help diagnose token authentication failures.

    POST JSON: { "username": "...", "password": "..." }
    Only enabled when DEBUG=True.
    """
    if not settings.DEBUG:
        return JsonResponse({'detail': 'Not available'}, status=404)

    data = request.data
    identifier = data.get('username')
    password = data.get('password')
    User = get_user_model()

    found_by_username = False
    found_by_email = False
    resolved_username = None
    try:
        if identifier:
            found_by_username = User.objects.filter(username__iexact=identifier).exists()
            found_by_email = User.objects.filter(email__iexact=identifier).exists()
            # attempt auth by username
            user = authenticate(username=identifier, password=password)
            if not user and found_by_email:
                u = User.objects.filter(email__iexact=identifier).first()
                resolved_username = u.username
                user = authenticate(username=u.username, password=password)
        else:
            user = None
    except Exception as ex:
        return JsonResponse({'error': str(ex)}, status=500)

    return JsonResponse({
        'found_by_username': found_by_username,
        'found_by_email': found_by_email,
        'resolved_username': resolved_username,
        'auth_ok': bool(user),
        'is_active': getattr(user, 'is_active', None),
        'username_used': getattr(user, 'username', None),
    })



@api_view(['POST'])
@permission_classes([AllowAny])
def dev_token_for_staff(request):
    """DEV ONLY: return JWT tokens for a Staff (by id or email) without password.

    POST JSON: { "staff_id": "..." } or { "email": "..." }
    Only available when DEBUG=True.
    WARNING: This endpoint is insecure and must NOT be enabled in production.
    """
    if not settings.DEBUG:
        return JsonResponse({'detail': 'Not available'}, status=404)

    data = request.data or {}
    staff = None
    staff_id = data.get('staff_id')
    email = data.get('email')
    try:
        if staff_id:
            staff = Staff.objects.filter(id=staff_id).first()
        elif email:
            staff = Staff.objects.filter(email__iexact=email).first()
        else:
            return JsonResponse({'detail': 'Provide staff_id or email'}, status=400)

        if not staff:
            return JsonResponse({'detail': 'Staff not found'}, status=404)

        User = get_user_model()
        if not staff.user:
            # create a user with a random password
            base = (staff.email.split('@')[0] if staff.email else f'staff_{str(staff.id)[:8]}')
            username = base
            orig = username
            counter = 1
            while User.objects.filter(username=username).exists():
                username = f"{orig}{counter}"
                counter += 1
            pwd = uuid.uuid4().hex
            user = User.objects.create_user(username=username, email=staff.email or '', password=pwd)
            staff.user = user
            staff.save()
        else:
            user = staff.user

        refresh = RefreshToken.for_user(user)
        return JsonResponse({'access': str(refresh.access_token), 'refresh': str(refresh), 'username': user.username})
    except Exception as ex:
        return JsonResponse({'error': str(ex)}, status=500)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def current_user(request):
    """Return current authenticated user profile including linked Staff and tenant info."""
    User = get_user_model()
    user = request.user
    data = {
        'username': user.get_username(),
        'email': getattr(user, 'email', None),
        'is_staff': user.is_staff,
        'is_superuser': user.is_superuser,
    }
    # attach staff profile if exists
    try:
        staff = getattr(user, 'staff_profile', None)
        if staff:
            ser = StaffSerializer(staff)
            data['staff'] = ser.data
            # add tenant/hospital name for convenience
            tenant = getattr(staff, 'tenant', None)
            if tenant:
                data['hospital'] = {'id': str(tenant.id), 'name': tenant.name, 'slug': tenant.slug}
        else:
            data['staff'] = None
    except Exception:
        data['staff'] = None

    return JsonResponse(data)
