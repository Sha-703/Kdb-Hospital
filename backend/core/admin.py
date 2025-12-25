from django.contrib import admin
from .models import Patient, Staff, Appointment, Billing, InventoryItem, Acte


@admin.register(Patient)
class PatientAdmin(admin.ModelAdmin):
    list_display = ('medical_record_number', 'last_name', 'first_name', 'tenant')
    search_fields = ('medical_record_number', 'last_name', 'first_name')


@admin.register(Staff)
class StaffAdmin(admin.ModelAdmin):
    def user_display(self, obj):
        if obj.user:
            return obj.user.get_username()
        # fallback to username/email when no linked user
        if getattr(obj, 'email', None):
            return obj.email
        return '(aucun utilisateur)'

    user_display.short_description = 'Utilisateur'

    list_display = ('user_display', 'role', 'tenant')
    search_fields = ('role', 'user__username', 'user__email')


@admin.register(Appointment)
class AppointmentAdmin(admin.ModelAdmin):
    list_display = ('id', 'patient', 'staff', 'date', 'status', 'tenant')
    list_filter = ('status',)


@admin.register(Billing)
class BillingAdmin(admin.ModelAdmin):
    def paid_display(self, obj):
        return bool(obj.paid_at)
    paid_display.boolean = True
    paid_display.short_description = 'Payé'

    list_display = ('id', 'patient', 'amount', 'currency', 'paid_display', 'issued_at', 'tenant')
    list_filter = ('paid_at',)


@admin.register(InventoryItem)
class InventoryAdmin(admin.ModelAdmin):
    list_display = ('sku', 'name', 'quantity', 'tenant')
    search_fields = ('sku', 'name')


@admin.register(Acte)
class ActeAdmin(admin.ModelAdmin):
    list_display = ('code', 'name', 'parent', 'amount', 'currency', 'active', 'tenant')
    search_fields = ('code', 'name', 'parent__name')
    list_filter = ('active',)
