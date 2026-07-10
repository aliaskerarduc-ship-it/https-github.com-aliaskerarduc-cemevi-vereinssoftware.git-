'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Users, Heart, CreditCard, AlertTriangle, TrendingUp, UserCheck, UserX } from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';

interface DashboardStats {
  totalMembers: number;
  activeMembers: number;
  familyMembers: number;
  singleMembers: number;
  totalDonations: number;
  totalContributions: number;
  overdueMembers: any[];
  recentDonations: any[];
  recentContributions: any[];
}

function StatCard({ icon: Icon, label, value, color, href }: any) {
  return (
    <Link href={href ?? '#'}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
      >
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <p className="text-2xl font-display font-bold">{value ?? 0}</p>
            <p className="text-sm text-muted-foreground">{label}</p>
          </div>
        </div>
      </motion.div>
    </Link>
  );
}

export default function DashboardPage() {
  const { data: session } = useSession() || {};
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/dashboard')
      .then((r) => r.json())
      .then((data) => setStats(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Willkommen zurück, {session?.user?.name ?? 'Benutzer'}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Mitglieder gesamt" value={stats?.totalMembers} color="bg-primary/10 text-primary" href="/mitglieder" />
        <StatCard icon={UserCheck} label="Aktive Mitglieder" value={stats?.activeMembers} color="bg-emerald-100 text-emerald-700" href="/mitglieder" />
        <StatCard icon={Heart} label="Spendeneinnahmen" value={`${(stats?.totalDonations ?? 0).toFixed?.(2) ?? '0'} €`} color="bg-rose-100 text-rose-700" href="/spenden" />
        <StatCard icon={CreditCard} label="Beitragseinnahmen" value={`${(stats?.totalContributions ?? 0).toFixed?.(2) ?? '0'} €`} color="bg-blue-100 text-blue-700" href="/beitraege" />
      </div>

      {/* Overdue members warning */}
      {(stats?.overdueMembers?.length ?? 0) > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-destructive/10 border border-destructive/20 rounded-xl p-5"
        >
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            <h2 className="font-display font-bold text-destructive">Beitragsrückstände</h2>
          </div>
          <p className="text-sm text-destructive/80 mb-3">
            {stats?.overdueMembers?.length} Mitglied(er) haben seit mehr als 3 Monaten keinen Beitrag gezahlt.
          </p>
          <div className="space-y-2">
            {stats?.overdueMembers?.slice(0, 5)?.map((m: any) => (
              <Link key={m?.id} href={`/mitglieder/${m?.id}`} className="flex items-center justify-between bg-white rounded-lg p-3 hover:shadow-sm transition-shadow">
                <span className="text-sm font-medium">{m?.firstName} {m?.lastName} (Nr. {String(m?.memberNumber ?? 0).padStart(5, "0")})</span>
                <span className="text-xs text-destructive">Letzter Beitrag: {m?.lastPayment ?? 'Nie'}</span>
              </Link>
            ))}
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Donations */}
        <div className="bg-card rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Heart className="w-4 h-4 text-rose-500" />
            <h2 className="font-display font-bold">Letzte Spenden</h2>
          </div>
          {(stats?.recentDonations?.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground">Keine Spenden vorhanden.</p>
          ) : (
            <div className="space-y-2">
              {stats?.recentDonations?.map((d: any) => (
                <div key={d?.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div>
                    <p className="text-sm font-medium">{d?.member?.firstName} {d?.member?.lastName}</p>
                    <p className="text-xs text-muted-foreground">{d?.purpose ?? 'Allgemeine Spende'}</p>
                  </div>
                  <span className="text-sm font-mono font-bold text-emerald-600">{d?.amount?.toFixed?.(2)} €</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Contributions */}
        <div className="bg-card rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <CreditCard className="w-4 h-4 text-blue-500" />
            <h2 className="font-display font-bold">Letzte Beiträge</h2>
          </div>
          {(stats?.recentContributions?.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground">Keine Beiträge vorhanden.</p>
          ) : (
            <div className="space-y-2">
              {stats?.recentContributions?.map((c: any) => (
                <div key={c?.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div>
                    <p className="text-sm font-medium">{c?.member?.firstName} {c?.member?.lastName}</p>
                    <p className="text-xs text-muted-foreground">{String(c?.periodMonth ?? '').padStart(2, '0')}/{c?.periodYear}</p>
                  </div>
                  <span className="text-sm font-mono font-bold text-blue-600">{c?.amount?.toFixed?.(2)} €</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
