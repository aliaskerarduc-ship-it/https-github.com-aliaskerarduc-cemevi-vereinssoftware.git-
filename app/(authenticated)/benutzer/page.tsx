'use client';
import { useEffect, useState } from 'react';
import { UserCog, Plus, Shield, Trash2, Check, X, Pencil, Save } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { ROLE_LABELS } from '@/lib/roles';

const ROLE_COLORS: Record<string, string> = {
  ADMIN: 'bg-red-100 text-red-700',
  VORSTAND: 'bg-blue-100 text-blue-700',
  KASSIERER: 'bg-green-100 text-green-700',
  SACHBEARBEITER: 'bg-gray-100 text-gray-700',
  SCHRIFTFUEHRER: 'bg-purple-100 text-purple-700',
};

const MODULES = [
  { key: 'members',           label: 'Mitglieder' },
  { key: 'families',          label: 'Familien' },
  { key: 'donations',         label: 'Spenden' },
  { key: 'contributions',     label: 'Beiträge' },
  { key: 'kassenbuch',        label: 'Ausgaben' },
  { key: 'documents',         label: 'Dokumente' },
  { key: 'vereinsdokumente',  label: 'Vereinsdokumente' },
  { key: 'inventarliste',     label: 'Inventarliste' },
  { key: 'briefe',            label: 'Briefe' },
  { key: 'meetings',          label: 'Versammlungen' },
  { key: 'termine',           label: 'Terminkalender' },
  { key: 'reports',           label: 'Berichte' },
  { key: 'datev',             label: 'DATEV Export' },
  { key: 'users',             label: 'Benutzer' },
  { key: 'settings',          label: 'Einstellungen' },
];

const DEFAULT_PERMISSIONS: Record<string, string[]> = {
  ADMIN: ['members','families','donations','contributions','kassenbuch','documents','vereinsdokumente','inventarliste','briefe','meetings','termine','reports','datev','users','settings'],
  VORSTAND: ['members','families','documents','vereinsdokumente','meetings','termine','reports','briefe'],
  KASSIERER: ['members','donations','contributions','kassenbuch','reports','datev','vereinsdokumente'],
  SACHBEARBEITER: ['members','families','documents','vereinsdokumente','briefe'],
  SCHRIFTFUEHRER: ['members','documents','vereinsdokumente','meetings','termine','briefe','reports'],
};

function parsePermissions(user: any): string[] {
  if (user.permissions) {
    try { return JSON.parse(user.permissions); } catch {}
  }
  return DEFAULT_PERMISSIONS[user.role] ?? [];
}

export default function BenutzerPage() {
  const { data: session } = useSession() || {};
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingPerms, setEditingPerms] = useState<string[]>([]);
  const [editingRole, setEditingRole] = useState('');
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'SACHBEARBEITER' });
  const isAdmin = (session?.user as any)?.role === 'ADMIN';
  const currentUserId = (session?.user as any)?.id;

  const fetchUsers = async () => {
    const res = await fetch('/api/users');
    const d = await res.json();
    setUsers(d?.users ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) { const err = await res.json(); toast.error(err?.error ?? 'Fehler'); return; }
      toast.success('Benutzer erstellt.');
      setShowForm(false);
      setForm({ name: '', email: '', password: '', role: 'SACHBEARBEITER' });
      fetchUsers();
    } catch { toast.error('Fehler'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (user: any) => {
    if (user.id === currentUserId) { toast.error('Sie können sich nicht selbst löschen.'); return; }
    if (!confirm(`"${user.name}" wirklich löschen?`)) return;
    try {
      const res = await fetch('/api/users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: user.id }),
      });
      if (!res.ok) { const err = await res.json(); toast.error(err?.error ?? 'Fehler'); return; }
      toast.success('Benutzer gelöscht.');
      fetchUsers();
    } catch { toast.error('Fehler'); }
  };

  const startEdit = (user: any) => {
    setEditingId(user.id);
    setEditingRole(user.role);
    setEditingPerms(parsePermissions(user));
  };

  const togglePerm = (key: string) => {
    setEditingPerms(prev =>
      prev.includes(key) ? prev.filter(p => p !== key) : [...prev, key]
    );
  };

  const handleSave = async (userId: string) => {
    try {
      const res = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: userId, role: editingRole, permissions: JSON.stringify(editingPerms) }),
      });
      if (!res.ok) { const err = await res.json(); toast.error(err?.error ?? 'Fehler'); return; }
      toast.success('Berechtigungen gespeichert.');
      setEditingId(null);
      fetchUsers();
    } catch { toast.error('Fehler'); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold flex items-center gap-2">
            <UserCog className="w-6 h-6 text-primary" /> Benutzerverwaltung
          </h1>
          <p className="text-muted-foreground text-sm">Benutzer, Rollen und Berechtigungen verwalten</p>
        </div>
        {isAdmin && (
          <button onClick={() => setShowForm(!showForm)} className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-lg font-medium hover:opacity-90">
            <Plus className="w-4 h-4" /> Neuer Benutzer
          </button>
        )}
      </div>

      {showForm && isAdmin && (
        <form onSubmit={handleSubmit} className="bg-card rounded-xl p-6 shadow-sm space-y-4">
          <h2 className="font-display font-bold">Neuer Benutzer</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Name *</label>
              <input value={form.name} onChange={e => setForm(p => ({...p, name: e.target.value}))} required className="w-full px-3 py-2.5 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">E-Mail *</label>
              <input type="email" value={form.email} onChange={e => setForm(p => ({...p, email: e.target.value}))} required className="w-full px-3 py-2.5 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Passwort *</label>
              <input type="password" value={form.password} onChange={e => setForm(p => ({...p, password: e.target.value}))} required minLength={6} className="w-full px-3 py-2.5 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Rolle</label>
              <select value={form.role} onChange={e => setForm(p => ({...p, role: e.target.value}))} className="w-full px-3 py-2.5 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring">
                {Object.entries(ROLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={saving} className="bg-primary text-primary-foreground px-6 py-2.5 rounded-lg font-medium hover:opacity-90 disabled:opacity-50">{saving ? 'Erstelle...' : 'Anlegen'}</button>
            <button type="button" onClick={() => setShowForm(false)} className="px-6 py-2.5 rounded-lg border border-input hover:bg-muted">Abbrechen</button>
          </div>
        </form>
      )}

      {/* Kullanıcı listesi */}
      <div className="bg-card rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="font-display font-bold">Benutzer & Berechtigungen</h2>
          <p className="text-sm text-muted-foreground">Klicken Sie auf ✏️ um die Berechtigungen eines Benutzers anzupassen</p>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin w-6 h-6 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        ) : (
          <div className="divide-y divide-border">
            {users?.map((u: any) => {
              const perms = parsePermissions(u);
              const isEditing = editingId === u?.id;
              return (
                <div key={u?.id} className="p-4">
                  {/* Başlık satırı */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                        <Shield className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{u?.name}</p>
                        <p className="text-xs text-muted-foreground">{u?.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {isEditing ? (
                        <>
                          <select
                            value={editingRole}
                            onChange={e => setEditingRole(e.target.value)}
                            className="px-3 py-1.5 border border-input rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                          >
                            {Object.entries(ROLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                          </select>
                          <button onClick={() => handleSave(u?.id)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-100 text-emerald-700 hover:bg-emerald-200 text-sm font-medium">
                            <Save className="w-4 h-4" /> Speichern
                          </button>
                          <button onClick={() => setEditingId(null)} className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200">
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${ROLE_COLORS[u?.role] ?? 'bg-gray-100 text-gray-700'}`}>
                            {ROLE_LABELS[u?.role] ?? u?.role}
                          </span>
                          {isAdmin && (
                            <button onClick={() => startEdit(u)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-input hover:bg-muted text-sm" title="Berechtigungen bearbeiten">
                              <Pencil className="w-3.5 h-3.5" /> Bearbeiten
                            </button>
                          )}
                          {isAdmin && u?.id !== currentUserId && (
                            <button onClick={() => handleDelete(u)} className="p-2 rounded-lg text-destructive hover:bg-destructive/10" title="Löschen">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Checkbox düzenleme modu */}
                  {isEditing ? (
                    <div className="mt-3 p-4 bg-muted/30 rounded-lg">
                      <p className="text-sm font-medium mb-3">Berechtigungen auswählen:</p>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {MODULES.map(mod => (
                          <label key={mod.key} className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-muted transition-colors">
                            <input
                              type="checkbox"
                              checked={editingPerms.includes(mod.key)}
                              onChange={() => togglePerm(mod.key)}
                              className="w-4 h-4 accent-primary"
                            />
                            <span className="text-sm">{mod.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ) : (
                    /* Mevcut yetkiler gösterimi */
                    <div className="flex flex-wrap gap-1">
                      {MODULES.map(mod => (
                        <span key={mod.key} className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 ${perms.includes(mod.key) ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-400'}`}>
                          {perms.includes(mod.key)
                            ? <Check className="w-3 h-3" />
                            : <X className="w-3 h-3" />}
                          {mod.label}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
