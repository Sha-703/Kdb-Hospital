from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Patient, Staff, Appointment, Billing, InventoryItem, Acte, BillingItem
from django.db.models import Q


class PatientSerializer(serializers.ModelSerializer):
    medical_record_number = serializers.CharField(read_only=True)
    appointments = serializers.SerializerMethodField()
    billings = serializers.SerializerMethodField()

    class Meta:
        model = Patient
        fields = '__all__'
        read_only_fields = ('medical_record_number',)

    def get_appointments(self, obj):
        try:
            # import here to avoid ordering issues
            from .serializers import AppointmentSerializer as _AS
        except Exception:
            _AS = AppointmentSerializer
        qs = obj.appointments.all().order_by('-date')
        return _AS(qs, many=True).data

    def get_billings(self, obj):
        try:
            from .serializers import BillingSerializer as _BS
        except Exception:
            _BS = BillingSerializer
        qs = obj.billings.all().order_by('-issued_at')
        return _BS(qs, many=True).data


class StaffSerializer(serializers.ModelSerializer):
    display_name = serializers.SerializerMethodField()
    # optional fields to create a linked Django User when creating a Staff
    username = serializers.CharField(write_only=True, required=False, allow_blank=False)
    password = serializers.CharField(write_only=True, required=False, allow_blank=False)

    class Meta:
        model = Staff
        fields = ['id', 'tenant', 'user', 'role', 'email', 'phone', 'is_active', 'created_at', 'updated_at', 'display_name', 'username', 'password']

    def get_display_name(self, obj):
        if obj.user:
            try:
                return obj.user.get_full_name() or obj.user.username
            except Exception:
                pass
        # fall back to email or username if available
        if getattr(obj, 'email', None):
            return obj.email
        if getattr(obj, 'user', None):
            try:
                return obj.user.username
            except Exception:
                pass
        return None

    def create(self, validated_data):
        # extract optional username/password for creating a linked User
        username = validated_data.pop('username', None)
        password = validated_data.pop('password', None)

        # allow linking an existing user via 'user' field if provided
        user_val = validated_data.get('user', None)

        # create the Staff instance (TenantFilterMixin may pass tenant via save kwargs)
        staff = Staff.objects.create(**validated_data)

        # if a user is already linked via provided 'user' value, do nothing
        if staff.user is not None:
            return staff

        # create a new Django User if username/password provided
        if password:
            User = get_user_model()
            if not username:
                # derive from email or staff id
                if staff.email:
                    base = staff.email.split('@')[0]
                else:
                    base = f'staff_{str(staff.id)[:8]}'
                username = base

            orig = username
            counter = 1
            while User.objects.filter(username=username).exists():
                username = f"{orig}{counter}"
                counter += 1

            user = User.objects.create_user(username=username, email=staff.email or '', password=password)
            staff.user = user
            staff.save()

        return staff


class AppointmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Appointment
        fields = '__all__'


class BillingItemSerializer(serializers.ModelSerializer):
    acte_display = serializers.CharField(source='acte.name', read_only=True)

    class Meta:
        model = BillingItem
        fields = ['id', 'billing', 'acte', 'acte_display', 'description', 'quantity', 'unit_price', 'currency', 'discount', 'total', 'created_at', 'updated_at']
        extra_kwargs = {
            'billing': {'read_only': True},
        }


class BillingSerializer(serializers.ModelSerializer):
    # allow nested create of items
    items = BillingItemSerializer(many=True, required=False)
    patient_display = serializers.SerializerMethodField()
    payments = serializers.SerializerMethodField()
    remaining_due = serializers.SerializerMethodField()
    paid_total = serializers.SerializerMethodField()
    # no status field anymore; use `paid_at` to determine paid state if needed

    class Meta:
        model = Billing
        # explicit fields (removed `status` and `insurance_reference`)
        fields = ['id', 'tenant', 'patient', 'appointment', 'amount', 'currency', 'description', 'issued_at', 'paid_at', 'items', 'patient_display', 'payments', 'remaining_due', 'paid_total']

    def create(self, validated_data):
        items_data = validated_data.pop('items', [])
        # If amount not provided, compute from items (snapshot unit_price from Acte if needed)
        total_amount = 0
        for it in items_data:
            acte_id = it.get('acte')
            acte_obj = None
            # defensive normalization: frontend may send an Acte instance, a dict/object, or a display name
            if acte_id is not None:
                # if caller passed an Acte model instance accidentally
                try:
                    from .models import Acte as _ActeModel
                except Exception:
                    _ActeModel = Acte
                if isinstance(acte_id, _ActeModel):
                    acte_obj = acte_id
                    acte_id = acte_obj.id
                    it['acte'] = acte_id
                # if caller passed a dict-like object (e.g., {id: ..., name: ...})
                elif isinstance(acte_id, dict):
                    # prefer explicit id field
                    if acte_id.get('id'):
                        acte_id = acte_id.get('id')
                        it['acte'] = acte_id
                    else:
                        # fallback to name/code fields
                        acte_id = acte_id.get('code') or acte_id.get('name') or acte_id
                        it['acte'] = acte_id
                # if it's a string, strip surrounding whitespace/non-breaking spaces
                elif isinstance(acte_id, str):
                    acte_id = acte_id.strip() if acte_id is not None else acte_id
                    it['acte'] = acte_id
                # now try to resolve acte by id, code or name so frontend may send display values
                if acte_obj is None and acte_id:
                    # try id lookup first (will safely accept UUID string)
                    acte_obj = Acte.objects.filter(id=acte_id).first()
                    if not acte_obj:
                        acte_obj = Acte.objects.filter(Q(code__iexact=acte_id) | Q(name__iexact=acte_id)).first()
                    if acte_obj:
                        acte_id = acte_obj.id
                        # replace in item so later code uses resolved id
                        it['acte'] = acte_id
            qty = int(it.get('quantity', 1) or 1)
            disc = float(it.get('discount', 0) or 0)
            unit_price = it.get('unit_price')
            if acte_id and (not unit_price):
                # acte_obj may already be resolved above
                a = acte_obj or Acte.objects.filter(id=acte_id).first()
                if a:
                    unit_price = float(getattr(a, 'amount', 0) or 0)
                    # prefer acte currency if available
                    if getattr(a, 'currency', None) and not it.get('currency'):
                        it['currency'] = a.currency
            unit_price = float(unit_price or 0)
            total_amount += max(qty * unit_price - float(disc), 0)

        # set amount if missing
        if not validated_data.get('amount'):
            validated_data['amount'] = total_amount

        billing = Billing.objects.create(**validated_data)
        # create items using model to avoid nested serializer recursion
        for it in items_data:
            acte_id = it.get('acte')
            # defensive normalization again before database use
            if acte_id is not None:
                try:
                    from .models import Acte as _ActeModel
                except Exception:
                    _ActeModel = Acte
                if isinstance(acte_id, _ActeModel):
                    acte_id = acte_id.id
                elif isinstance(acte_id, dict):
                    acte_id = acte_id.get('id') or acte_id.get('code') or acte_id.get('name') or acte_id
                elif isinstance(acte_id, str):
                    acte_id = acte_id.strip()
                it['acte'] = acte_id
            # try resolve acte id again in case frontend provided name/code
            if acte_id and not Acte.objects.filter(id=acte_id).exists():
                a_lookup = Acte.objects.filter(Q(code__iexact=acte_id) | Q(name__iexact=acte_id)).first()
                if a_lookup:
                    acte_id = a_lookup.id
            # snapshot price from acte if acte provided and unit_price missing
            if acte_id and (not it.get('unit_price')):
                a = Acte.objects.filter(id=acte_id).first()
                if a:
                    it['unit_price'] = getattr(a, 'amount', it.get('unit_price'))
                    it['currency'] = getattr(a, 'currency', it.get('currency', billing.currency))

            kwargs = {'billing': billing}
            if acte_id:
                kwargs['acte_id'] = acte_id
            for f in ('description', 'quantity', 'unit_price', 'currency', 'discount'):
                if f in it:
                    kwargs[f] = it[f]
            BillingItem.objects.create(**kwargs)

        return billing

    def get_patient_display(self, obj):
        try:
            p = obj.patient
            if p:
                name = f"{p.last_name or ''} {p.first_name or ''}".strip()
                return name or getattr(p, 'medical_record_number', str(p.id))
        except Exception:
            pass
        return None

    def get_payments(self, obj):
        try:
            from .serializers import BillingItemSerializer as _bis
        except Exception:
            _bis = BillingItemSerializer
        # reuse BillingItemSerializer for items, but payments need a serializer
        try:
            from .serializers import BillingItemSerializer as _p
        except Exception:
            _p = BillingItemSerializer
        payments_qs = getattr(obj, 'payments', None)
        if payments_qs is None:
            return []
        # simple mapping
        return [{'id': str(p.id), 'amount': float(p.amount), 'currency': p.currency, 'method': p.method, 'paid_at': p.paid_at} for p in payments_qs.all().order_by('-paid_at')]

    def get_paid_total(self, obj):
        try:
            return float(getattr(obj, 'paid_total', 0) or 0)
        except Exception:
            try:
                return float(obj.payments.aggregate(s=models.Sum('amount'))['s'] or 0)
            except Exception:
                return 0

    def get_remaining_due(self, obj):
        try:
            return float(getattr(obj, 'remaining_due', 0) or 0)
        except Exception:
            return 0

    def update(self, instance, validated_data):
        items_data = validated_data.pop('items', None)
        for attr, val in validated_data.items():
            setattr(instance, attr, val)
        instance.save()
        if items_data is not None:
            # delete existing items and recreate
            instance.items.all().delete()
            for it in items_data:
                acte_id = it.get('acte')
                if acte_id and (not it.get('unit_price')):
                    a = Acte.objects.filter(id=acte_id).first()
                    if a:
                        it['unit_price'] = getattr(a, 'amount', it.get('unit_price'))
                        it['currency'] = getattr(a, 'currency', it.get('currency', instance.currency))
                kwargs = {'billing': instance}
                if acte_id:
                    kwargs['acte_id'] = acte_id
                for f in ('description', 'quantity', 'unit_price', 'currency', 'discount'):
                    if f in it:
                        kwargs[f] = it[f]
                BillingItem.objects.create(**kwargs)
        return instance


class BillingItemSerializer(serializers.ModelSerializer):
    acte_display = serializers.CharField(source='acte.name', read_only=True)

    class Meta:
        model = None
        # set model dynamically to avoid import cycles; will be set below
        fields = ['id', 'billing', 'acte', 'acte_display', 'description', 'quantity', 'unit_price', 'currency', 'discount', 'total', 'created_at', 'updated_at']
        extra_kwargs = {
            'billing': {'read_only': True},
        }


# import model class for BillingItem dynamically
from .models import BillingItem as _BillingItem
BillingItemSerializer.Meta.model = _BillingItem


class InventorySerializer(serializers.ModelSerializer):
    class Meta:
        model = InventoryItem
        fields = '__all__'


class ActeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Acte
        fields = '__all__'
