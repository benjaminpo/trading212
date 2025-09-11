import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  // This endpoint is deprecated. Redirect to the new accounts endpoint.
  return NextResponse.json(
    { 
      error: 'This endpoint is deprecated. Please use POST /api/trading212/accounts instead.',
      migration: {
        oldEndpoint: '/api/trading212/connect',
        newEndpoint: '/api/trading212/accounts',
        requiredFields: ['name', 'apiKey'],
        optionalFields: ['isPractice', 'isDefault']
      }
    },
    { status: 410 } // Gone status code
  )
}

export async function DELETE() {
  // This endpoint is deprecated. Use DELETE /api/trading212/accounts/[accountId] instead.
  return NextResponse.json(
    { 
      error: 'This endpoint is deprecated. Please use DELETE /api/trading212/accounts/[accountId] instead.',
      migration: {
        oldEndpoint: 'DELETE /api/trading212/connect',
        newEndpoint: 'DELETE /api/trading212/accounts/[accountId]',
        note: 'Use the specific account ID to delete individual accounts'
      }
    },
    { status: 410 } // Gone status code
  )
}
