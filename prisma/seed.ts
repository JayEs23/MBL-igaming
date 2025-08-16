import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Create some test users
  const user1 = await prisma.user.upsert({
    where: { username: 'Samuel' },
    update: {},
    create: { username: 'Samuel' },
  });

  const user2 = await prisma.user.upsert({
    where: { username: 'John' },
    update: {},
    create: { username: 'John' },
  });

  // Create a pending session
  const pending = await prisma.session.create({ data: { status: 'PENDING' } });

  console.log({ user1, user2, pending });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
