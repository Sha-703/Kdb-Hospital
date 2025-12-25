from django.utils.deprecation import MiddlewareMixin
from tenants.models import Tenant
from django.contrib.auth import get_user_model
import base64
import json
from django.conf import settings


class TenantMiddleware(MiddlewareMixin):
    """
    Simple tenant middleware: sets `request.tenant` from an HTTP header `X-Tenant-Slug`
    or query param `tenant`. For MVP we keep it simple; production may use subdomains
    or authentication-associated tenant.
    """

    def process_request(self, request):
        slug = None
        # prefer header
        slug = request.META.get('HTTP_X_TENANT_SLUG') or request.GET.get('tenant')
        if not slug:
            # Fallback 1: if the request has a Django-authenticated user (session), use it
            try:
                user = getattr(request, 'user', None)
                if user and getattr(user, 'is_authenticated', False):
                    staff = getattr(user, 'staff_profile', None)
                    if staff and getattr(staff, 'tenant', None):
                        request.tenant = staff.tenant
                        return
            except Exception:
                pass

            # Fallback 2: if Authorization: Bearer <token> header present (JWT), try to decode payload
            auth = request.META.get('HTTP_AUTHORIZATION', '')
            if auth and auth.startswith('Bearer '):
                token = auth.split(' ', 1)[1].strip()
                try:
                    parts = token.split('.')
                    if len(parts) >= 2:
                        payload_b64 = parts[1]
                        # base64 url decode with padding
                        padded = payload_b64 + '=' * (-len(payload_b64) % 4)
                        decoded = base64.urlsafe_b64decode(padded.encode('utf-8'))
                        payload = json.loads(decoded.decode('utf-8'))
                        user_id = payload.get('user_id') or payload.get('user') or payload.get('sub') or payload.get('username')
                        User = get_user_model()
                        user_obj = None
                        if user_id:
                            # try numeric id first
                            try:
                                user_obj = User.objects.filter(id=user_id).first()
                            except Exception:
                                # maybe username
                                user_obj = User.objects.filter(username=user_id).first()
                        if not user_obj and payload.get('username'):
                            user_obj = User.objects.filter(username=payload.get('username')).first()
                        if user_obj:
                            try:
                                staff = getattr(user_obj, 'staff_profile', None)
                                if staff and getattr(staff, 'tenant', None):
                                    request.tenant = staff.tenant
                                    return
                            except Exception:
                                pass
                except Exception:
                    # decoding failed; ignore and continue
                    pass

            # final fallback: no tenant found
            request.tenant = None
            return

        try:
            tenant = Tenant.objects.get(slug=slug)
            request.tenant = tenant
        except Tenant.DoesNotExist:
            request.tenant = None
