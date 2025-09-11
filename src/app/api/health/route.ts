import { NextResponse } from 'next/server'
import { checkDatabaseConnection } from '@/lib/prisma'

export async function GET() {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      database: false,
    },
    errors: [] as string[]
  }

  try {
    // Check database connection
    const dbHealthy = await checkDatabaseConnection()
    health.services.database = dbHealthy
    
    if (!dbHealthy) {
      health.errors.push('Database connection failed')
      health.status = 'unhealthy'
    }

    // Check environment variables
    const requiredEnvVars = ['DATABASE_URL', 'NEXTAUTH_SECRET', 'NEXTAUTH_URL']
    const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar])
    
    if (missingEnvVars.length > 0) {
      health.errors.push(`Missing environment variables: ${missingEnvVars.join(', ')}`)
      health.status = 'unhealthy'
    }

    const statusCode = health.status === 'healthy' ? 200 : 503
    
    return NextResponse.json(health, { status: statusCode })
  } catch (error) {
    console.error('Health check failed:', error)
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      services: {
        database: false,
      },
      errors: ['Health check failed'],
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 503 })
  }
}
