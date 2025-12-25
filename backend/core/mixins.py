class TenantFilterMixin:
    """ViewSet mixin that filters queryset by request.tenant and sets tenant on create."""

    def get_queryset(self):
        qs = super().get_queryset()
        tenant = getattr(self.request, 'tenant', None)
        if tenant is None:
            # No tenant detected — return empty queryset to avoid leaks
            return qs.none()
        return qs.filter(tenant=tenant)

    def perform_create(self, serializer):
        tenant = getattr(self.request, 'tenant', None)
        import logging
        logger = logging.getLogger(__name__)
        if tenant is not None:
            serializer.save(tenant=tenant)
            return

        # attempt fallback: if the request user is authenticated and linked to a Staff with tenant, use it
        try:
            user = getattr(self.request, 'user', None)
            if user and getattr(user, 'is_authenticated', False):
                staff = getattr(user, 'staff_profile', None)
                if staff and getattr(staff, 'tenant', None):
                    serializer.save(tenant=staff.tenant)
                    return
        except Exception:
            pass

        # log missing tenant to help debug why creations fail
        logger.warning('TenantFilterMixin: no tenant set on request during create; request path=%s, data keys=%s', getattr(self.request, 'path', ''), list(getattr(self.request, 'data', {}).keys()))
        # allow serializer to handle missing tenant (could raise)
        serializer.save()
