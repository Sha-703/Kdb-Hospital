from django.urls import include, path
from rest_framework.routers import DefaultRouter
from .views import PatientViewSet, StaffViewSet, AppointmentViewSet, BillingViewSet, InventoryViewSet, ActeViewSet, debug_auth, dev_token_for_staff, current_user

router = DefaultRouter()
router.register(r'patients', PatientViewSet, basename='patients')
router.register(r'staff', StaffViewSet, basename='staff')
router.register(r'appointments', AppointmentViewSet, basename='appointments')
router.register(r'billing', BillingViewSet, basename='billing')
router.register(r'inventory', InventoryViewSet, basename='inventory')
router.register(r'actes', ActeViewSet, basename='actes')

urlpatterns = [
    path('', include(router.urls)),
    # Explicit add_payment route to ensure availability even if router registration varies
    path('billing/<uuid:pk>/add_payment/', BillingViewSet.as_view({'post': 'add_payment'}), name='billing-add-payment'),
    path('debug-auth/', debug_auth),
    path('dev-token/', dev_token_for_staff),
    path('me/', current_user),
]
