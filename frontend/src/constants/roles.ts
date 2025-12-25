export const ROLES = [
  { value: 'doctor', label: 'Médecin' },
  { value: 'nurse', label: 'Infirmier' },
  { value: 'reception', label: 'Réceptionniste' },
  { value: 'billing', label: 'Caissier' },
  { value: 'admin', label: 'Administrateur' },
];

export const ROLE_LABELS: Record<string, string> = ROLES.reduce((acc, r) => { acc[r.value] = r.label; return acc; }, {} as Record<string, string>);
