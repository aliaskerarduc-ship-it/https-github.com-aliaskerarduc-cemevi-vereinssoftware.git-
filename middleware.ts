import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

const ROUTE_PERMISSIONS: Record<string, string[]> = {
  '/dashboard': ['members','donations','contributions','documents','meetings','reports','users','settings'],
  '/mitglieder': ['members'],
  '/spenden': ['donations'],
  '/beitraege': ['contributions'],
  '/dokumente': ['documents'],
  '/versammlungen': ['meetings'],
  '/berichte': ['reports'],
  '/benutzer': ['users'],
  '/einstellungen': ['settings'],
  '/ausgaben': ['members'],
};

const DEFAULT_PERMISSIONS: Record<string, string[]> = {
  ADMIN: ['members','donations','contributions','documents','meetings','reports','users','settings'],
  VORSTAND: ['members','documents','meetings','reports'],
  KASSIERER: ['members','donations','contributions','reports'],
  SACHBEARBEITER: ['members','documents'],
};

export default withAuth(
  function middleware(req) {
    const token = req.nextauth?.token as any;
    if (!token) return NextResponse.redirect(new URL('/login', req.url));

    const pathname = req.nextUrl.pathname;
    const routeKey = Object.keys(ROUTE_PERMISSIONS).find(r => pathname.startsWith(r));
    
    if (!routeKey) return NextResponse.next();

    const requiredPermissions = ROUTE_PERMISSIONS[routeKey];

    // Kullanıcının izinlerini al
    let userPermissions: string[];
    if (token.permissions) {
      try {
        userPermissions = JSON.parse(token.permissions);
      } catch {
        userPermissions = DEFAULT_PERMISSIONS[token.role] ?? [];
      }
    } else {
      userPermissions = DEFAULT_PERMISSIONS[token.role] ?? [];
    }

    // Admin her yere erişebilir
    if (token.role === 'ADMIN') return NextResponse.next();

    // İzin kontrolü
    const hasAccess = requiredPermissions.some(p => userPermissions.includes(p));
    if (!hasAccess) {
      return NextResponse.redirect(new URL('/dashboard?error=unauthorized', req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
    pages: {
      signIn: '/login',
    },
  }
);

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/mitglieder/:path*',
    '/spenden/:path*',
    '/beitraege/:path*',
    '/dokumente/:path*',
    '/versammlungen/:path*',
    '/berichte/:path*',
    '/ausgaben/:path*',
    '/einstellungen/:path*',
    '/benutzer/:path*',
  ],
};
