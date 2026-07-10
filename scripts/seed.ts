import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash('johndoe123', 12);
  await prisma.user.upsert({
    where: { email: 'john@doe.com' },
    update: { role: 'ADMIN' },
    create: {
      email: 'john@doe.com',
      name: 'Administrator',
      password: hashedPassword,
      role: 'ADMIN',
    },
  });
  console.log('Seed abgeschlossen.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
