'use client';

import { useState, useEffect } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Lock, Mail } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [verein, setVerein] = useState<any>({});
  const router = useRouter();

  useEffect(() => {
    fetch('/api/verein-settings').then(r => r.json()).then(setVerein).catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await signIn('credentials', { email, password, redirect: false });
      if (result?.error) {
        setError('Ungültige E-Mail-Adresse oder Passwort.');
      } else {
        router.replace('/dashboard');
      }
    } catch {
      setError('Ein Fehler ist aufgetreten.');
    } finally {
      setLoading(false);
    }
  };

  const logoSrc = verein.logoLeft || '/logo.jpg';
  const vereinName = verein.name || 'Cemevi Mitgliederverwaltung';
  const unterzeile = verein.unterzeile || '';
  const adresse = [verein.strasse, verein.plz && verein.stadt ? verein.plz + ' ' + verein.stadt : ''].filter(Boolean).join(', ');

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-green-100 px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <div className="mb-4">
              <img
                src={logoSrc}
                alt="Logo"
                width={100}
                height={100}
                className="rounded-full object-cover shadow-md w-24 h-24"
              />
            </div>
            <h1 className="text-2xl font-display font-bold tracking-tight text-center text-primary">
              {vereinName}
            </h1>
            {unterzeile && (
              <p className="text-sm text-muted-foreground mt-1 text-center">{unterzeile}</p>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">E-Mail</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring bg-background"
                  placeholder="E-Mail-Adresse eingeben"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Passwort</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring bg-background"
                  placeholder="Passwort eingeben"
                  required
                />
              </div>
            </div>
            {error && (
              <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg">{error}</div>
            )}
            <div className="flex justify-end">
              <a href="/forgot-password" className="text-xs text-muted-foreground hover:text-primary hover:underline">
                Passwort vergessen?
              </a>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-primary-foreground py-2.5 rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {loading ? 'Anmelden...' : 'Anmelden'}
            </button>
          </form>
        </div>
        {adresse && (
          <p className="text-center text-xs text-muted-foreground mt-4">
            {adresse}{verein.website ? ' · ' + verein.website : ''}
          </p>
        )}
      </div>
    </div>
  );
}
