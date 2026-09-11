import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.user.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      phoneNumber: '254722111222',
      phoneLookupToken: 'lookup_test_user',
      smartAccountAddress: '0x7c3a...9e21',
      sessionKeyAddress: '0xabcd...1234',
      verificationTier: 'TIER_1',
      dailyLimitMinorUnits: 10_000_000, // $10.00 USDC
      dailySentMinorUnits: 0,
      limitResetsAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      agreedToTermsAt: new Date(),
    },
  });

  console.log('Seeded prototype user');
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
