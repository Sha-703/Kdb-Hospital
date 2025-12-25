import uuid
from django.db import models
from django.conf import settings
from django.utils import timezone


class TimestampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class Patient(TimestampedModel):
    GENDER_CHOICES = [("M", "Male"), ("F", "Female"), ("O", "Other")]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey('tenants.Tenant', on_delete=models.CASCADE)
    first_name = models.CharField(max_length=150)
    last_name = models.CharField(max_length=150)
    birth_date = models.DateField(null=True, blank=True)
    gender = models.CharField(max_length=1, choices=GENDER_CHOICES, null=True, blank=True)
    phone = models.CharField(max_length=50, blank=True)
    email = models.EmailField(blank=True)
    address = models.TextField(blank=True)
    medical_record_number = models.CharField(max_length=64)
    allergies = models.TextField(blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        indexes = [models.Index(fields=['medical_record_number']), models.Index(fields=['last_name'])]
        unique_together = (('tenant', 'medical_record_number'),)

    def __str__(self):
        return f"{self.last_name} {self.first_name}"

    def save(self, *args, **kwargs):
        # Auto-generate medical_record_number in format YYYY/MM/NNNN when not provided.
        if not self.medical_record_number:
            try:
                now = timezone.now()
                year = now.year
                month = now.month
                # count existing patients for this tenant in this year/month
                if self.tenant_id:
                    existing_count = Patient.objects.filter(
                        tenant_id=self.tenant_id,
                        created_at__year=year,
                        created_at__month=month,
                    ).count()
                else:
                    existing_count = Patient.objects.filter(
                        created_at__year=year,
                        created_at__month=month,
                    ).count()

                seq = existing_count + 1
                candidate = f"{year}/{str(month).zfill(2)}/{str(seq).zfill(4)}"
                # ensure uniqueness (defensive loop)
                while Patient.objects.filter(tenant=self.tenant, medical_record_number=candidate).exists():
                    seq += 1
                    candidate = f"{year}/{str(month).zfill(2)}/{str(seq).zfill(4)}"

                self.medical_record_number = candidate
            except Exception:
                # fallback to a uuid-like short id if anything goes wrong
                try:
                    import uuid
                    self.medical_record_number = uuid.uuid4().hex[:12]
                except Exception:
                    self.medical_record_number = 'UNKNOWN'

        super().save(*args, **kwargs)


class Staff(TimestampedModel):
    ROLE_CHOICES = [("doctor", "Médecin"), ("nurse", "Infirmier"), ("reception", "Réceptionniste"), ("billing", "Caissier"), ("admin", "Administrateur")]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey('tenants.Tenant', on_delete=models.CASCADE)
    # A Staff member MAY be linked to a Django auth User account.
    # This allows treating staff as application users without duplicating identity fields.
    user = models.OneToOneField(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name='staff_profile')
    role = models.CharField(max_length=32, choices=ROLE_CHOICES)
    email = models.EmailField(unique=False, blank=True)
    phone = models.CharField(max_length=50, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        indexes = [models.Index(fields=['role'])]

    def __str__(self):
        if self.user:
            try:
                name = self.user.get_full_name() or self.user.username
            except Exception:
                name = None
            if name:
                return f"{name} ({self.role})"
        # fall back to email or id when no linked user
        if self.email:
            return f"{self.email} ({self.role})"
        return f"Staff {str(self.id)[:8]} ({self.role})"


class Appointment(TimestampedModel):
    STATUS = [("scheduled", "Planifié"), ("checked_in", "Enregistré"), ("completed", "Terminé"), ("cancelled", "Annulé")]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey('tenants.Tenant', on_delete=models.CASCADE)
    patient = models.ForeignKey('core.Patient', on_delete=models.CASCADE, related_name='appointments')
    staff = models.ForeignKey('core.Staff', on_delete=models.SET_NULL, null=True, blank=True, related_name='appointments')
    # Use a single datetime field (date + time)
    date = models.DateTimeField(null=True, blank=True)
    location = models.CharField(max_length=255, blank=True)
    status = models.CharField(max_length=32, choices=STATUS, default='scheduled')
    reason = models.TextField(blank=True)

    class Meta:
        indexes = [models.Index(fields=['date']), models.Index(fields=['status'])]

    def __str__(self):
        return f"Appt {self.id} - {self.patient} @ {self.date}"


class Billing(TimestampedModel):
    STATUS = [("pending", "En attente"), ("paid", "Payé"), ("declined", "Refusé")]

    # Currency limited to Congolese francs and US dollars
    CURRENCY_CHOICES = [("CDF", "Franc Congolais (CDF)"), ("USD", "Dollar US (USD)")]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey('tenants.Tenant', on_delete=models.CASCADE)
    patient = models.ForeignKey('core.Patient', on_delete=models.CASCADE, related_name='billings')
    appointment = models.ForeignKey('core.Appointment', on_delete=models.SET_NULL, null=True, blank=True)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=8, choices=CURRENCY_CHOICES, default='CDF')
    # status and insurance_reference removed (handled by paid_at and description)
    description = models.TextField(blank=True)
    issued_at = models.DateTimeField(auto_now_add=True)
    paid_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        # `status` field was removed; keep index only for `issued_at`.
        indexes = [models.Index(fields=['issued_at'])]

    def __str__(self):
        return f"Billing {self.id} - {self.amount} {self.currency} ({self.status})"

    @property
    def paid_total(self):
        try:
            return float(self.payments.aggregate(s=models.Sum('amount'))['s'] or 0)
        except Exception:
            return 0

    @property
    def remaining_due(self):
        try:
            return float((self.amount or 0) - (self.payments.aggregate(s=models.Sum('amount'))['s'] or 0))
        except Exception:
            return float(self.amount or 0)


class BillingItem(TimestampedModel):
    """Line item for a Billing (invoice).

    Stores a snapshot of the acte/description, unit_price and computed total so
    that historical invoices remain correct even if Acte prices change later.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    billing = models.ForeignKey('core.Billing', on_delete=models.CASCADE, related_name='items')
    acte = models.ForeignKey('core.Acte', on_delete=models.SET_NULL, null=True, blank=True)
    description = models.TextField(blank=True)
    quantity = models.IntegerField(default=1)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    currency = models.CharField(max_length=8, default='CDF')
    discount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    class Meta:
        indexes = [models.Index(fields=['billing']), models.Index(fields=['acte'])]

    def save(self, *args, **kwargs):
        # If an acte is provided and unit_price is not explicitly set, copy the acte amount
        try:
            if self.acte and (not self.unit_price or float(self.unit_price) == 0):
                self.unit_price = getattr(self.acte, 'amount', self.unit_price) or 0
                # prefer acte currency if available
                if getattr(self.acte, 'currency', None):
                    self.currency = self.acte.currency

            qty = int(self.quantity or 0)
            up = float(self.unit_price or 0)
            disc = float(self.discount or 0)
            calc_total = qty * up - disc
            if calc_total < 0:
                calc_total = 0
            self.total = calc_total
        except Exception:
            pass
        super().save(*args, **kwargs)


class BillingPayment(TimestampedModel):
    """Records a payment made towards a Billing (supports partial payments)."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    billing = models.ForeignKey('core.Billing', on_delete=models.CASCADE, related_name='payments')
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=8, default='CDF')
    method = models.CharField(max_length=64, blank=True)
    paid_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [models.Index(fields=['billing']), models.Index(fields=['paid_at'])]

    def __str__(self):
        return f"Payment {self.id} - {self.amount} {self.currency} for {self.billing_id}"


class InventoryItem(TimestampedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey('tenants.Tenant', on_delete=models.CASCADE)
    sku = models.CharField(max_length=64)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    quantity = models.IntegerField(default=0)
    unit = models.CharField(max_length=32, default='pcs')
    reorder_level = models.IntegerField(default=0)
    location = models.CharField(max_length=128, blank=True)

    class Meta:
        indexes = [models.Index(fields=['sku']), models.Index(fields=['name'])]
        unique_together = (('tenant', 'sku'),)

    def __str__(self):
        return f"{self.name} ({self.sku})"


class Acte(TimestampedModel):
    """Represents a medical act/procedure that can be used for scheduling and billing.

    Fields:
    - code: short reference code (CPT-like)
    - name: display name
    - description: longer description
    - amount: price for the act
    - currency: currency code
    - duration_minutes: typical duration in minutes
    - active: whether the act is currently available
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey('tenants.Tenant', on_delete=models.CASCADE)
    # allow hierarchical acts: an Acte may have a parent Acte (sub-acts)
    parent = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='sub_actes')
    code = models.CharField(max_length=64, blank=True)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    currency = models.CharField(max_length=8, default='CDF')
    active = models.BooleanField(default=True)

    class Meta:
        indexes = [models.Index(fields=['code']), models.Index(fields=['name'])]
        unique_together = (('tenant', 'code'),)

    def __str__(self):
        return f"{self.name} ({self.code})"

    def save(self, *args, **kwargs):
        # Save first to ensure `id` exists for children/parent relations
        super().save(*args, **kwargs)
        # Keep parent amounts consistent: if this Acte has children, its amount
        # should be the sum of its children's amounts. If this Acte is a child,
        # propagate a recalculation to the parent.
        try:
            from django.db.models import Sum
            # If this acte has children, compute and store their sum
            children_qs = self.sub_actes.all()
            if children_qs.exists():
                total = children_qs.aggregate(s=Sum('amount'))['s'] or 0
                # use update to avoid recursive save loops
                if float(self.amount or 0) != float(total):
                    Acte.objects.filter(id=self.id).update(amount=total)

            # If this acte is a child, update its parent total
            if self.parent_id:
                parent = Acte.objects.filter(id=self.parent_id).first()
                if parent:
                    total = parent.sub_actes.aggregate(s=Sum('amount'))['s'] or 0
                    if float(parent.amount or 0) != float(total):
                        Acte.objects.filter(id=parent.id).update(amount=total)
        except Exception:
            # never block saving the object for unexpected errors
            pass
