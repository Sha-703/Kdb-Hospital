import csv
import uuid
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model


class Command(BaseCommand):
    help = 'Create Django User accounts for Staff records that have no linked user. Outputs CSV of username,password,email.'

    def add_arguments(self, parser):
        parser.add_argument('--output', type=str, default='staff_users.csv', help='Output CSV file')
        parser.add_argument('--dry-run', action='store_true', help='Do not create users, only show what would be done')

    def handle(self, *args, **options):
        from core.models import Staff

        User = get_user_model()
        out_path = options['output']
        dry = options['dry_run']

        rows = []
        staffs = Staff.objects.filter(user__isnull=True)
        if not staffs.exists():
            self.stdout.write(self.style.SUCCESS('No staff without user found.'))
            return

        for s in staffs:
            email = (s.email or '').strip()
            base = email.split('@')[0] if email else f'staff_{str(s.id)[:8]}'
            username = base
            orig = username
            counter = 1
            while User.objects.filter(username=username).exists():
                username = f"{orig}{counter}"
                counter += 1

            password = uuid.uuid4().hex[:12]
            rows.append({'staff_id': str(s.id), 'username': username, 'password': password, 'email': email})

            if not dry:
                u = User.objects.create_user(username=username, email=email, password=password)
                s.user = u
                s.save()

        # write CSV
        with open(out_path, 'w', newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=['staff_id', 'username', 'password', 'email'])
            writer.writeheader()
            for r in rows:
                writer.writerow(r)

        self.stdout.write(self.style.SUCCESS(f'Processed {len(rows)} staff records. Output -> {out_path}'))
