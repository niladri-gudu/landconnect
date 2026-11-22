import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const PASSWORD = 'password123';

async function main() {
  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  const buyer = await prisma.user.upsert({
    where: { email: 'buyer@landconnect.dev' },
    update: {},
    create: {
      name: 'Asha Buyer',
      email: 'buyer@landconnect.dev',
      passwordHash,
      role: 'BUYER',
      phone: '+919800000001',
    },
  });

  const seller = await prisma.user.upsert({
    where: { email: 'seller@landconnect.dev' },
    update: {},
    create: {
      name: 'Ravi Seller',
      email: 'seller@landconnect.dev',
      passwordHash,
      role: 'SELLER',
      phone: '+919800000002',
    },
  });

  const broker = await prisma.user.upsert({
    where: { email: 'broker@landconnect.dev' },
    update: {},
    create: {
      name: 'Meera Broker',
      email: 'broker@landconnect.dev',
      passwordHash,
      role: 'BROKER',
      phone: '+919800000003',
    },
  });

  const listings = [
    {
      title: '5-acre farm land with borewell near Devanahalli',
      description:
        'Level agricultural land with a working borewell, road access and clear title. Ideal for farmhouse or investment. 12 km from airport road.',
      price: 8500000,
      areaAcres: 5,
      address: 'Devanahalli taluk, Bengaluru Rural',
      city: 'Bengaluru',
      state: 'Karnataka',
      latitude: 13.2437,
      longitude: 77.7139,
      ownerId: seller.id,
    },
    {
      title: '2-acre residential plot, gated layout',
      description:
        'Corner plot in an approved gated layout with blacktop roads, street lights and water lines. Close to schools and the upcoming metro extension.',
      price: 12500000,
      areaAcres: 2,
      address: 'Sarjapur Road, Bengaluru',
      city: 'Bengaluru',
      state: 'Karnataka',
      latitude: 12.8639,
      longitude: 77.7876,
      ownerId: broker.id,
    },
    {
      title: '12-acre mango orchard with farmhouse',
      description:
        'Productive mango orchard with drip irrigation, a small farmhouse and labour quarters. Seasonal income and excellent long-term appreciation.',
      price: 32000000,
      areaAcres: 12,
      address: 'Hosur Road, Tamil Nadu border',
      city: 'Hosur',
      state: 'Tamil Nadu',
      latitude: 12.7409,
      longitude: 77.8253,
      ownerId: seller.id,
    },
  ];

  for (const listing of listings) {
    const existing = await prisma.listing.findFirst({ where: { title: listing.title } });
    if (!existing) {
      await prisma.listing.create({ data: listing });
    }
  }

  console.log('Seed complete');
  console.log(`  buyer  ${buyer.email}  / ${PASSWORD}`);
  console.log(`  seller ${seller.email} / ${PASSWORD}`);
  console.log(`  broker ${broker.email} / ${PASSWORD}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
