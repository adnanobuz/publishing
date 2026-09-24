import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const hashed = await bcrypt.hash('DZVCa0OsR*', 12)
  await prisma.user.upsert({
    where: { email: 'abacus-c528e32b@example.com' },
    update: {},
    create: {
      email: 'abacus-c528e32b@example.com',
      password: hashed,
      name: 'Admin',
    },
  })
  console.log('Seed complete')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(async () => await prisma.$disconnect())
