import os
from django.conf import settings
from django.http import HttpResponseServerError


def _client_ip_from_request(request):
    xff = request.META.get('HTTP_X_FORWARDED_FOR', '')
    if xff:
        return xff.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR', '')


class DebugGuardMiddleware:
    """
    When `DEBUG=True`, only allow Django's detailed debug pages for requests
    originating from IPs listed in the env var `DEBUG_ALLOWED_IPS`.

    If the client IP is not allowed, a generic 500 response is returned so
    no sensitive information is leaked via the technical_500_response page.

    Configure allowed IPs with `DEBUG_ALLOWED_IPS=127.0.0.1,203.0.113.5`.
    """

    def __init__(self, get_response):
        self.get_response = get_response
        raw = os.environ.get('DEBUG_ALLOWED_IPS', '127.0.0.1')
        self.allowed = {ip.strip() for ip in raw.split(',') if ip.strip()}

    def __call__(self, request):
        try:
            return self.get_response(request)
        except Exception:
            # If DEBUG is enabled, only reveal the technical debug page to
            # allowed IP addresses. Otherwise, return a simple 500.
            if settings.DEBUG:
                client_ip = _client_ip_from_request(request)
                if client_ip in self.allowed:
                    # Re-raise so Django's technical_500_response runs.
                    raise
                return HttpResponseServerError('Internal Server Error')
            # In non-debug mode, behave normally (re-raise exception).
            raise
