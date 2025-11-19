const { PrismaClient } = require('@prisma/client');

async function testPrisma() {
  console.log('Testing Prisma client...');
  try {
    const prisma = new PrismaClient({
      datasources: {
        db: {
          url: 'mysql://root:407033@127.0.0.1:3307/meeting_manage'
        }
      }
    });

    console.log('Prisma client created successfully');

    await prisma.$connect();
    console.log('Connected to database successfully');

    const result = await prisma.$queryRaw`SELECT 1 as test`;
    console.log('Query result:', result);

    await prisma.$disconnect();
    console.log('Disconnected successfully');

    return true;
  } catch (error) {
    console.error('Error:', error.message);
    return false;
  }
}

testPrisma().then(success => {
  console.log('Test result:', success ? 'SUCCESS' : 'FAILED');
  process.exit(success ? 0 : 1);
});