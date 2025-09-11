const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seed...')
  
  // Create a test user
  const hashedPassword = await bcrypt.hash('password123', 12)
  
  const user = await prisma.user.create({
    data: {
      name: 'Test User',
      email: 'test@example.com',
      password: hashedPassword,
    }
  })
  
  console.log('✅ Created test user:', user.email)
  
  // Create a test Trading212 account
  const tradingAccount = await prisma.trading212Account.create({
    data: {
      userId: user.id,
      name: 'Demo Account',
      apiKey: 'demo-api-key',
      isPractice: true,
      isActive: true,
      isDefault: true,
      currency: 'USD',
      cash: 10000.00,
    }
  })
  
  console.log('✅ Created test Trading212 account:', tradingAccount.name)
  
  // Create a test notification
  const notification = await prisma.notification.create({
    data: {
      userId: user.id,
      type: 'welcome',
      title: 'Welcome to Trading212 Advanced Trade!',
      message: 'Your account has been set up successfully.',
      isRead: false,
    }
  })
  
  console.log('✅ Created test notification:', notification.title)
  
  console.log('🎉 Database seeded successfully!')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
