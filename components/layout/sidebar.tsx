'use client';

import { useSession, signOut } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Receipt, LayoutDashboard, Users, Heart, CreditCard, FileText, CalendarCheck,
  BarChart3, Settings, UserCog, LogOut, ChevronLeft, ChevronRight, Menu, Mail, Info, CalendarDays, FileSpreadsheet, FolderOpen, Package, HelpCircle
, Building2} from 'lucide-react';
import { useState } from 'react';
import { hasPermission, ROLE_LABELS } from '@/lib/roles';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, permission: 'members' },
  { href: '/mitglieder', label: 'Mitglieder', icon: Users, permission: 'members' },
  { href: '/spenden', label: 'Spenden', icon: Heart, permission: 'donations' },
  { href: '/beitraege', label: 'Beiträge', icon: CreditCard, permission: 'contributions' },
  { href: '/familien', label: 'Familien', icon: Users, permission: 'members' },
  { href: '/ausgaben', label: 'Ausgaben', icon: Receipt, permission: 'reports' },
  { href: '/dokumente', label: 'Dokumente', icon: FileText, permission: 'documents' },
  { href: '/vereinsdokumente', label: 'Vereinsdokumente', icon: FolderOpen, permission: 'vereinsdokumente' },
  { href: '/inventarliste', label: 'Inventarliste', icon: Package, permission: 'members' },
  { href: '/briefe', label: 'Briefe', icon: Mail, permission: 'members' },
  { href: '/versammlungen', label: 'Versammlungen', icon: CalendarCheck, permission: 'meetings' },
  { href: '/termine', label: 'Terminkalender', icon: CalendarDays, permission: 'termine' },
  { href: '/berichte', label: 'Berichte', icon: BarChart3, permission: 'reports' },
  { href: '/datev', label: 'DATEV Export', icon: FileSpreadsheet, permission: 'datev' },
  { href: '/benutzer', label: 'Benutzer', icon: UserCog, permission: 'users' },
  { href: '/einstellungen', label: 'Einstellungen', icon: Settings, permission: 'settings' },
  { href: '/hilfe', label: 'Hilfe', icon: HelpCircle, permission: 'members' },
  { href: '/ueber-verein', label: 'Über diesen Verein', icon: Building2, permission: 'members' },
  { href: '/ueber', label: 'Über diese Software', icon: Info, permission: 'members' },
];

export default function Sidebar() {
  const { data: session } = useSession() || {};
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const role = (session?.user as any)?.role ?? '';
  const userPermissions: string[] = (() => { try { const p = (session?.user as any)?.permissions; return p ? JSON.parse(p) : []; } catch { return []; } })();

  return (
    <>
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 bg-white shadow-md rounded-lg p-2 hover:bg-muted transition-colors"
      >
        <Menu className="w-5 h-5" />
      </button>

      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 bg-black/30 z-40" onClick={() => setMobileOpen(false)} />
      )}

      <aside className={`fixed top-0 left-0 h-full bg-white border-r border-border z-40 flex flex-col transition-all duration-300 ${collapsed ? 'w-[72px]' : 'w-64'} ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        
        {/* Logo + Başlık */}
        <div className={`flex items-center gap-3 px-4 h-20 border-b border-border shrink-0 ${collapsed ? 'justify-center' : ''}`}>
          <div className="shrink-0">
            <Image
              src="/logo.jpg"
              alt="Cemevi Logo"
              width={collapsed ? 40 : 48}
              height={collapsed ? 40 : 48}
              className="rounded-full object-cover"
            />
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <p className="font-display font-bold text-sm leading-tight truncate text-primary">Cemevi</p>
              <p className="text-xs text-muted-foreground truncate">Mitgliederverwaltung</p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
          {navItems
            ?.filter((item: any) => role === "ADMIN" || userPermissions.includes(item?.permission))
            ?.map((item: any) => {
              const isActive = pathname === item?.href || pathname?.startsWith(item?.href + '/');
              const Icon = item?.icon;
              return (
                <Link
                  key={item?.href}
                  href={item?.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  <Icon className="w-5 h-5 shrink-0" />
                  {!collapsed && <span className="truncate">{item?.label}</span>}
                </Link>
              );
            })}
        </nav>

        {/* Footer */}
        <div className="border-t border-border p-3 space-y-2">
          {!collapsed && (
            <div className="px-2 py-1">
              <p className="text-sm font-medium truncate">{session?.user?.name ?? 'Benutzer'}</p>
              <p className="text-xs text-muted-foreground truncate">{ROLE_LABELS[role] ?? role}</p>
            </div>
          )}
          {!collapsed && (
            <div className="px-3 pb-2 border-t border-border pt-2">
              <div className="flex items-center gap-1 mb-1">
                <button title="Hell" onClick={() => { document.documentElement.classList.remove('dark'); localStorage.setItem('theme','light'); }} className="flex-1 py-1 text-xs rounded hover:bg-muted">☀️</button>
                <button title="Dunkel" onClick={() => { document.documentElement.classList.add('dark'); localStorage.setItem('theme','dark'); }} className="flex-1 py-1 text-xs rounded hover:bg-muted">🌙</button>
                <button title="System" onClick={() => { const d=window.matchMedia('(prefers-color-scheme: dark)').matches; d?document.documentElement.classList.add('dark'):document.documentElement.classList.remove('dark'); localStorage.setItem('theme','system'); }} className="flex-1 py-1 text-xs rounded hover:bg-muted">💻</button>
              </div>
              <div className="flex gap-1 justify-center flex-wrap">
                {[['#16a34a','142 55% 35%'],['#2563eb','221 83% 53%'],['#7c3aed','263 70% 58%'],['#ea580c','21 90% 48%'],['#dc2626','0 72% 51%'],['#0d9488','174 72% 32%']].map(([hex,hsl]) => (
                  <button key={hex} onClick={() => { document.documentElement.style.setProperty('--primary',hsl); localStorage.setItem('primaryColor',hsl); }}
                    style={{width:16,height:16,borderRadius:'50%',backgroundColor:hex,border:'none',cursor:'pointer'}} />
                ))}
              </div>
            </div>
          )}
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-destructive hover:bg-destructive/10 transition-colors"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {!collapsed && <span>Abmelden</span>}
          </button>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-muted transition-colors"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            {!collapsed && <span>Einklappen</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
