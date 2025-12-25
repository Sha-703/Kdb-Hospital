from django.contrib import admin
from django.urls import path, include
from rest_framework_simplejwt.views import (
    TokenRefreshView,
)
from core.auth import EmailOrUsernameTokenView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/tenants/', include('tenants.urls')),
    path('api/', include('core.urls')),
    path('api/token/', EmailOrUsernameTokenView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
]

# Custom error handlers (use dotted path to view)
handler404 = 'core.views.custom_404'
