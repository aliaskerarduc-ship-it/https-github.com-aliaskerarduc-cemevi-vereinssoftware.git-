// app/(auth)/reset-password/page.tsx
'use client';
import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Lock, CheckCircle, XCircle } from 'lucide-react';
import Link from 'next/link';

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) setError('Ungültiger Link.');
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) { setError('Passwörter stimmen nicht überein.'); return; }
    if (password.length < 6) { setError('Passwort muss mindestens 6 Zeichen haben.'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/password/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const d = await res.json();
      if (!res.ok) { setError(d.error ?? 'Fehler'); return; }
      setSuccess(true);
      setTimeout(() => router.push('/login'), 3000);
    } catch { setError('Fehler'); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8 space-y-6">
        <div className="text-center space-y-2">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto ${success ? 'bg-emerald-100' : error && !password ? 'bg-red-100' : 'bg-primary/10'}`}>
            {success ? <CheckCircle className="w-8 h-8 text-emerald-600" /> : error && !password ? <XCircle className="w-8 h-8 text-destructive" /> : <Lock className="w-8 h-8 text-primary" />}
          </div>
          <h1 className="text-2xl font-bold">Neues Passwort</h1>
        </div>

        {success ? (
          <div className="text-center space-y-3">
            <p className="text-emerald-700 font-medium">Passwort erfolgreich geändert!</p>
            <p className="text-sm text-muted-foreground">Sie werden in 3 Sekunden zum Login weitergeleitet...</p>
            <Link href="/login" className="text-sm text-primary hover:underline">Zum Login</Link>
          </div>
        ) : error && !password ? (
          <div className="text-center space-y-3">
            <p className="text-destructive font-medium">{error}</p>
            <Link href="/forgot-password" className="text-sm text-primary hover:underline">Neuen Link anfordern</Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Neues Passwort</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6}
                placeholder="Mindestens 6 Zeichen"
                className="w-full px-4 py-3 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Passwort bestätigen</label>
              <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required
                placeholder="Passwort wiederholen"
                className="w-full px-4 py-3 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <button type="submit" disabled={loading}
              className="w-full bg-primary text-primary-foreground py-3 rounded-lg font-medium hover:opacity-90 disabled:opacity-50">
              {loading ? 'Speichere...' : 'Passwort ändern'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
