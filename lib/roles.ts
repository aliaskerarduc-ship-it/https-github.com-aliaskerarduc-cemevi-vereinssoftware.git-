export const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Administrator',
  VORSTAND: 'Vorsitzender',
  KASSIERER: 'Kassierer',
  SACHBEARBEITER: 'Sachbearbeiter',
  SCHRIFTFUEHRER: 'Schriftfuehrer',
};

export const ROLE_PERMISSIONS: Record<string, string[]> = {
  ADMIN: ['members', 'families', 'donations', 'contributions', 'documents', 'meetings', 'reports', 'users', 'settings', 'backup'],
  VORSTAND: ['members', 'families', 'documents', 'meetings', 'reports'],
  KASSIERER: ['members', 'donations', 'contributions', 'reports'],
  SACHBEARBEITER: ['members', 'families', 'documents'],
  SCHRIFTFUEHRER: ['members', 'documents', 'meetings'],
};

export function hasPermission(role: string | null | undefined, permission: string): boolean {
  if (!role) return false;
  const perms = ROLE_PERMISSIONS[role] ?? [];
  return perms.includes(permission);
}

export const CONTRIBUTION_LEVELS: Record<string, { label: string; amount: number }> = {
  STUDENT: { label: 'Student', amount: 5 },
  ERMAESSIGT: { label: 'Ermäßigt', amount: 8 },
  NORMAL: { label: 'Normal', amount: 12 },
  FAMILIE: { label: 'Familienmitgliedschaft', amount: 16 },
  PARTNER: { label: 'Partner/in', amount: 4 },
};

export const PAYMENT_METHODS: Record<string, string> = {
  BAR: 'Bar',
  UEBERWEISUNG: 'Überweisung',
  LASTSCHRIFT: 'Lastschrift',
  PAYPAL: 'PayPal',
  SONSTIGE: 'Sonstige',
};

export const MEMBER_STATUS_LABELS: Record<string, string> = {
  AKTIV: 'Aktiv',
  PASSIV: 'Passiv',
  AUSGETRETEN: 'Ausgetreten',
  VERSTORBEN: 'Verstorben',
  AUSGESCHLOSSEN: 'Ausgeschlossen',
};

export const GENDER_LABELS: Record<string, string> = {
  MAENNLICH: 'Männlich',
  WEIBLICH: 'Weiblich',
  DIVERS: 'Divers',
};
