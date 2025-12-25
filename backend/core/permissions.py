from rest_framework import permissions

DEFAULT_ROLE_MAP = {
    # viewset_name: allowed_roles
    'PatientViewSet': ['admin', 'reception', 'doctor', 'nurse'],
    'AppointmentViewSet': ['admin', 'reception', 'doctor', 'nurse'],
    'BillingViewSet': ['admin', 'billing'],
    'StaffViewSet': ['admin'],
    'ActeViewSet': ['admin', 'doctor', 'billing'],
    'InventoryViewSet': ['admin', 'billing'],
}


class RolePermission(permissions.BasePermission):
    """Permission that checks a user's staff role against allowed roles for a view.

    Views may set `allowed_roles = ['admin', 'reception']` attribute to override default mapping.
    Superusers are allowed for everything. Unauthenticated requests are denied.
    """

    def has_permission(self, request, view):
        user = getattr(request, 'user', None)
        if not user or not getattr(user, 'is_authenticated', False):
            return False

        # superuser bypass
        if getattr(user, 'is_superuser', False):
            return True

        # Attempt to get staff role
        role = None
        try:
            staff = getattr(user, 'staff_profile', None)
            if staff:
                role = getattr(staff, 'role', None)
        except Exception:
            role = None

        if not role:
            return False

        role = str(role).lower()

        # view-specific override
        allowed = getattr(view, 'allowed_roles', None)
        if allowed is None:
            # fall back to default mapping by class name
            allowed = DEFAULT_ROLE_MAP.get(view.__class__.__name__, [])

        allowed = [a.lower() for a in (allowed or [])]

        return role in allowed
