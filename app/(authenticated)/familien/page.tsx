'use client';

import { useEffect, useState } from 'react';
import { Users, Plus, Trash2, ChevronDown, ChevronRight, X, Search } from 'lucide-react';
import { toast } from 'sonner';

export default function FamilienPage() {
  const [families, setFamilies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [openFamily, setOpenFamily] = useState<string | null>(null);
  const [allMembers, setAllMembers] = useState<any[]>([]);
  const [memberSearch, setMemberSearch] = useState('');
  const [addingMember, setAddingMember] = useState(false);

  const fetchFamilies = async () => {
    setLoading(true);
    const res = await fetch('/api/families');
    const d = await res.json();
    setFamilies(d?.families ?? []);
    setLoading(false);
  };

  const fetchMembers = async () => {
    const res = await fetch('/api/members?limit=500');
    const d = await res.json();
    setAllMembers(d?.members ?? []);
  };

  useEffect(() => { fetchFamilies(); fetchMembers(); }, []);

  const handleCreate = async () => {
    if (!newName.trim()) { toast.error('Familienname eingeben.'); return; }
    setCreating(true);
    try {
      const res = await fetch('/api/families', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ familyName: newName.trim() }),
      });
      if (!res.ok) { toast.error('Fehler'); return; }
      toast.success('Familie erstellt.');
      setNewName('');
      fetchFamilies();
    } catch { toast.error('Fehler'); }
    finally { setCreating(false); }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`"${name}" ailesini silmek istediğinizden emin misiniz?`)) return;
    try {
      const res = await fetch('/api/families', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) { toast.error('Fehler'); return; }
      toast.success('Familie gelöscht.');
      if (openFamily === id) setOpenFamily(null);
      fetchFamilies();
    } catch { toast.error('Fehler'); }
  };

  const addMemberToFamily = async (memberId: string, familyId: string) => {
    setAddingMember(true);
    try {
      const res = await fetch(`/api/members/${memberId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ familyId }),
      });
      if (!res.ok) { toast.error('Fehler'); return; }
      toast.success('Mitglied zur Familie hinzugefügt!');
      fetchFamilies();
      fetchMembers();
    } catch { toast.error('Fehler'); }
    finally { setAddingMember(false); }
  };

  const removeMemberFromFamily = async (memberId: string) => {
    try {
      const res = await fetch(`/api/members/${memberId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ familyId: null }),
      });
      if (!res.ok) { toast.error('Fehler'); return; }
      toast.success('Mitglied aus Familie entfernt.');
      fetchFamilies();
      fetchMembers();
    } catch { toast.error('Fehler'); }
  };

  const getAvailableMembers = (familyId: string) => {
    const familyMemberIds = new Set(
      families.find(f => f.id === familyId)?.members?.map((m: any) => m.id) ?? []
    );
    return allMembers.filter(m =>
      !familyMemberIds.has(m.id) &&
      (memberSearch === '' ||
        `${m.firstName} ${m.lastName}`.toLowerCase().includes(memberSearch.toLowerCase()))
    );
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-display font-bold tracking-tight flex items-center gap-2">
          <Users className="w-6 h-6 text-primary" /> Familienverwaltung
        </h1>
        <p className="text-muted-foreground text-sm">Familien erstellen und Mitglieder zuweisen</p>
      </div>

      {/* Yeni aile */}
      <div className="bg-card rounded-xl p-5 shadow-sm">
        <h2 className="font-display font-bold mb-3">Neue Familie erstellen</h2>
        <div className="flex gap-2">
          <input value={newName} onChange={e => setNewName(e.target.value)}
            placeholder="z.B. Familie Yilmaz"
            onKeyDown={e => e.key === 'Enter' && handleCreate()}
            className="flex-1 px-3 py-2.5 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
          <button onClick={handleCreate} disabled={creating}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 disabled:opacity-50">
            <Plus className="w-4 h-4" /> Erstellen
          </button>
        </div>
      </div>

      {/* Aile listesi */}
      <div className="bg-card rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="font-display font-bold">Vorhandene Familien ({families.length})</h2>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin w-6 h-6 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        ) : families.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">Noch keine Familien vorhanden.</div>
        ) : (
          <div className="divide-y divide-border">
            {families.map((f: any) => (
              <div key={f?.id}>
                {/* Aile başlığı */}
                <div
                  className="flex items-center justify-between p-4 hover:bg-muted/30 cursor-pointer"
                  onClick={() => setOpenFamily(openFamily === f.id ? null : f.id)}
                >
                  <div className="flex items-center gap-3">
                    {openFamily === f.id
                      ? <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                    <div className="w-9 h-9 bg-primary/10 rounded-full flex items-center justify-center">
                      <Users className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{f?.familyName}</p>
                      <p className="text-xs text-muted-foreground">{f?.members?.length ?? 0} Mitglieder</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                    {f?.members?.length > 0 && (
                      <div className="flex -space-x-1 mr-2">
                        {f.members.slice(0, 3).map((m: any) => (
                          <div key={m.id} className="w-6 h-6 rounded-full bg-emerald-100 border-2 border-white flex items-center justify-center">
                            <span className="text-xs text-emerald-700 font-bold">{m.firstName?.[0]}</span>
                          </div>
                        ))}
                        {f.members.length > 3 && (
                          <div className="w-6 h-6 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center">
                            <span className="text-xs text-gray-500">+{f.members.length - 3}</span>
                          </div>
                        )}
                      </div>
                    )}
                    <button onClick={() => handleDelete(f.id, f.familyName)}
                      className="p-2 rounded-lg text-destructive hover:bg-destructive/10">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Aile detayı */}
                {openFamily === f.id && (
                  <div className="border-t border-border bg-muted/20 p-4 space-y-4">
                    {/* Mevcut üyeler */}
                    <div>
                      <h3 className="text-sm font-medium mb-2">Familienmitglieder</h3>
                      {f.members?.length === 0 ? (
                        <p className="text-xs text-muted-foreground">Noch keine Mitglieder in dieser Familie.</p>
                      ) : (
                        <div className="space-y-1">
                          {f.members.map((m: any) => (
                            <div key={m.id} className="flex items-center justify-between bg-white rounded-lg px-3 py-2">
                              <div>
                                <p className="text-sm font-medium">{m.firstName} {m.lastName}</p>
                                <p className="text-xs text-muted-foreground">#{String(m.memberNumber ?? 0).padStart(5, "0")}</p>
                              </div>
                              <button onClick={() => removeMemberFromFamily(m.id)}
                                className="p-1.5 rounded hover:bg-destructive/10 text-destructive">
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Üye ekle */}
                    <div>
                      <h3 className="text-sm font-medium mb-2">Mitglied hinzufügen</h3>
                      <div className="relative mb-2">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                        <input value={memberSearch} onChange={e => setMemberSearch(e.target.value)}
                          placeholder="Mitglied suchen..."
                          className="w-full pl-8 pr-3 py-2 border border-input rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                      </div>
                      <div className="max-h-48 overflow-y-auto space-y-1 border border-border rounded-lg">
                        {getAvailableMembers(f.id).length === 0 ? (
                          <p className="text-xs text-muted-foreground text-center py-4">Keine weiteren Mitglieder verfügbar.</p>
                        ) : (
                          getAvailableMembers(f.id).slice(0, 20).map(m => (
                            <button key={m.id} onClick={() => addMemberToFamily(m.id, f.id)}
                              disabled={addingMember}
                              className="w-full flex items-center justify-between px-3 py-2 hover:bg-muted/50 text-left disabled:opacity-50">
                              <div>
                                <p className="text-sm font-medium">{m.firstName} {m.lastName}</p>
                                <p className="text-xs text-muted-foreground">#{String(m.memberNumber ?? 0).padStart(5, "0")}</p>
                              </div>
                              <Plus className="w-4 h-4 text-primary" />
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
