'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Search, CheckCircle, XCircle, AlertTriangle, Vote, UserCheck, Pen, Printer } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

export default function VersammlungDetailPage() {
  const params = useParams();
  const meetingId = params?.id as string;
  const [meeting, setMeeting] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [showSignature, setShowSignature] = useState(false);
  const [checking, setChecking] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);

  const fetchData = useCallback(async () => {
    try {
      const [meetingRes, membersRes] = await Promise.all([
        fetch(`/api/meetings/${meetingId}`),
        fetch('/api/members?limit=2000&status=AKTIV'),
      ]);
      const meetingData = await meetingRes.json();
      const membersData = await membersRes.json();
      setMeeting(meetingData);
      setMembers(membersData?.members ?? []);
    } catch { toast.error('Fehler beim Laden'); }
    finally { setLoading(false); }
  }, [meetingId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const startCheckIn = (member: any) => {
    setSelectedMember(member);
    setShowSignature(true);
  };

  useEffect(() => {
    if (showSignature && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
      }
    }
  }, [showSignature]);

  const getPos = (e: React.TouchEvent | React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    if ('touches' in e) {
      return { x: (e as React.TouchEvent).touches[0].clientX - rect.left, y: (e as React.TouchEvent).touches[0].clientY - rect.top };
    }
    return { x: (e as React.MouseEvent).clientX - rect.left, y: (e as React.MouseEvent).clientY - rect.top };
  };

  const startDraw = (e: React.TouchEvent | React.MouseEvent) => {
    isDrawingRef.current = true;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const { x, y } = getPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.TouchEvent | React.MouseEvent) => {
    if (!isDrawingRef.current) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const { x, y } = getPos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const endDraw = () => { isDrawingRef.current = false; };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (ctx && canvas) { ctx.clearRect(0, 0, canvas.width, canvas.height); }
  };

  const confirmCheckIn = async () => {
    if (!selectedMember) return;
    setChecking(true);
    try {
      const signatureData = canvasRef.current?.toDataURL('image/png') ?? null;
      const res = await fetch(`/api/meetings/${meetingId}/attendance`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId: selectedMember.id, signatureData }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data?.error ?? 'Fehler'); return; }

      if (data?.eligibility?.isEligibleElect) {
        toast.success(`${selectedMember.firstName} ${selectedMember.lastName} - Stimmberechtigt & Wählbar`);
      } else if (data?.eligibility?.isEligibleVote) {
        toast.success(`${selectedMember.firstName} ${selectedMember.lastName} - Stimmberechtigt`);
      } else {
        toast.warning(`${selectedMember.firstName} ${selectedMember.lastName} - ${data?.eligibility?.ineligibleReason ?? 'Nicht berechtigt'}`);
      }

      setShowSignature(false);
      setSelectedMember(null);
      fetchData();
    } catch { toast.error('Fehler'); }
    finally { setChecking(false); }
  };

  const checkedInIds = new Set((meeting?.attendances ?? []).filter((a: any) => a?.checkedIn).map((a: any) => a?.memberId));

  const filteredMembers = (members ?? []).filter((m: any) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (m?.firstName?.toLowerCase()?.includes(s) || m?.lastName?.toLowerCase()?.includes(s) || String(m?.memberNumber)?.includes(s));
  });

  if (loading) return <div className="flex items-center justify-center min-h-[400px]"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/versammlungen" className="p-2 rounded-lg hover:bg-muted transition-colors"><ArrowLeft className="w-5 h-5" /></Link>
        <div>
          <h1 className="text-2xl font-display font-bold tracking-tight">{meeting?.title}</h1>
          <div className="ml-auto"><button onClick={() => { const url = `/api/attendance-pdf?meetingId=${meetingId}`;
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = "anwesenheitsliste.pdf";
                  a.click();
                  window.open(url, '_blank'); }} className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-lg font-medium hover:opacity-90"><Printer className="w-4 h-4" /> Anwesenheitsliste herunterladen</button>
            <button onClick={() => { window.open(`/api/attendance-pdf?meetingId=${meetingId}&inline=1`, '_blank'); }} className="inline-flex items-center gap-2 bg-emerald-600 text-white px-4 py-2.5 rounded-lg font-medium hover:opacity-90 ml-2"><Printer className="w-4 h-4" /> Drucken</button></div></div></div><div className="flex items-center gap-3"><div><p className="text-sm text-muted-foreground">{new Date(meeting?.date).toLocaleDateString('de-DE', { timeZone: 'UTC', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-card rounded-lg p-4 shadow-sm text-center">
          <p className="text-2xl font-display font-bold">{checkedInIds?.size ?? 0}</p>
          <p className="text-xs text-muted-foreground">Anwesend</p>
        </div>
        <div className="bg-card rounded-lg p-4 shadow-sm text-center">
          <p className="text-2xl font-display font-bold">{(meeting?.attendances ?? []).filter((a: any) => a?.isEligibleVote)?.length ?? 0}</p>
          <p className="text-xs text-muted-foreground">Stimmberechtigt</p>
        </div>
        <div className="bg-card rounded-lg p-4 shadow-sm text-center">
          <p className="text-2xl font-display font-bold">{(meeting?.attendances ?? []).filter((a: any) => a?.isEligibleElect)?.length ?? 0}</p>
          <p className="text-xs text-muted-foreground">Wählbar</p>
        </div>
        <div className="bg-card rounded-lg p-4 shadow-sm text-center">
          <p className="text-2xl font-display font-bold">{(meeting?.attendances ?? []).filter((a: any) => a?.ineligibleReason)?.length ?? 0}</p>
          <p className="text-xs text-muted-foreground">Nicht berechtigt</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Mitglied suchen (Name oder Nr.)..." className="w-full pl-10 pr-4 py-3 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring text-lg" />
      </div>

      {/* Member List - Touch optimized */}
      <div className="space-y-2">
        {filteredMembers?.map((m: any) => {
          const isCheckedIn = checkedInIds?.has(m?.id);
          const attendance = (meeting?.attendances ?? []).find((a: any) => a?.memberId === m?.id);
          return (
            <motion.div
              key={m?.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className={`flex items-center justify-between p-4 rounded-xl touch-target transition-colors ${
                isCheckedIn ? 'bg-emerald-50 border border-emerald-200' : 'bg-card shadow-sm border border-border'
              }`}
            >
              <div className="flex items-center gap-3">
                {isCheckedIn ? (
                  <CheckCircle className="w-6 h-6 text-emerald-600 shrink-0" />
                ) : (
                  <div className="w-6 h-6 rounded-full border-2 border-muted-foreground/30 shrink-0" />
                )}
                <div>
                  <p className="font-medium">{m?.firstName} {m?.lastName}</p>
                  <p className="text-xs text-muted-foreground">Nr. {String(m?.memberNumber ?? 0).padStart(5, "0")}</p>
                  {attendance?.ineligibleReason && (
                    <p className="text-xs text-destructive flex items-center gap-1 mt-0.5"><AlertTriangle className="w-3 h-3" /> {attendance.ineligibleReason}</p>
                  )}
                  {attendance?.isEligibleVote && !attendance?.isEligibleElect && (
                    <p className="text-xs text-blue-600 flex items-center gap-1 mt-0.5"><Vote className="w-3 h-3" /> Stimmberechtigt</p>
                  )}
                  {attendance?.isEligibleElect && (
                    <p className="text-xs text-emerald-600 flex items-center gap-1 mt-0.5"><UserCheck className="w-3 h-3" /> Stimmberechtigt & Wählbar</p>
                  )}
                </div>
              </div>
              {!isCheckedIn && (
                <button
                  onClick={() => startCheckIn(m)}
                  className="bg-primary text-primary-foreground px-4 py-3 rounded-lg font-medium text-sm hover:opacity-90 transition-opacity touch-target flex items-center gap-2"
                >
                  <Pen className="w-4 h-4" /> Einchecken
                </button>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Signature Modal */}
      {showSignature && selectedMember && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowSignature(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <h2 className="font-display font-bold text-lg mb-1">Anwesenheitsbestätigung</h2>
            <p className="text-sm text-muted-foreground mb-4">{selectedMember?.firstName} {selectedMember?.lastName} (Nr. {selectedMember?.memberNumber})</p>
            <p className="text-sm mb-2">Bitte unterschreiben Sie hier:</p>
            <canvas
              ref={canvasRef}
              className="w-full h-40 border-2 border-dashed border-input rounded-lg signature-canvas bg-gray-50"
              onMouseDown={startDraw}
              onMouseMove={draw}
              onMouseUp={endDraw}
              onMouseLeave={endDraw}
              onTouchStart={startDraw}
              onTouchMove={draw}
              onTouchEnd={endDraw}
            />
            <div className="flex gap-3 mt-4">
              <button onClick={confirmCheckIn} disabled={checking} className="flex-1 bg-primary text-primary-foreground py-3 rounded-lg font-medium text-lg hover:opacity-90 disabled:opacity-50 touch-target">
                {checking ? 'Prüfe...' : 'Bestätigen'}
              </button>
              <button onClick={clearSignature} className="px-4 py-3 rounded-lg border border-input hover:bg-muted touch-target">Löschen</button>
              <button onClick={() => { setShowSignature(false); setSelectedMember(null); }} className="px-4 py-3 rounded-lg border border-input hover:bg-muted touch-target">Abbrechen</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
