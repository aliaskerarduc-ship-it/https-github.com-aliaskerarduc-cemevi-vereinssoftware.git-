import './globals.css';
import type { Metadata } from 'next';
import Providers from './providers';
import { Toaster } from 'sonner';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const base = process.env.NEXTAUTH_URL || 'http://localhost:3000';
  return {
    metadataBase: new URL(base),
    title: 'Cemevi Mitgliederverwaltung',
    description: 'Mitgliederverwaltung der Alevitischen Kulturgemeinde Duisburg und Umgebung e.V.',
    icons: { icon: '/favicon.svg', shortcut: '/favicon.svg' },
    openGraph: { images: ['/og-image.png'] },
  };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" suppressHydrationWarning>
      <head>
        <script src="https://apps.abacus.ai/chatllm/appllm-lib.js" />
      </head>
      <script dangerouslySetInnerHTML={{ __html: `
  (function() {
    var theme = localStorage.getItem('theme') || 'system';
    var color = localStorage.getItem('primaryColor');
    if (theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
    }
    if (color) {
      document.documentElement.style.setProperty('--primary', color);
    }
  })();
` }} />
<body className="font-sans antialiased bg-background text-foreground">
        <Providers>
          {children}
          <Toaster richColors position="top-right" />
        </Providers>
      </body>
    </html>
  );
}
