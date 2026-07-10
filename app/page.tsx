import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

export default async function Home() {
  const adminCount = await prisma.user.count({ where: { role: 'ADMIN' } });
  if (adminCount === 0) redirect('/setup');

  const session = await getServerSession(authOptions);
  if (session) redirect('/dashboard');
  else redirect('/login');
}
