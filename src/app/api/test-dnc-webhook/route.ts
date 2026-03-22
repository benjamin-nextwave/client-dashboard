import { NextResponse } from 'next/server'

export async function GET() {
  const DNC_WEBHOOK = 'https://hook.eu2.make.com/dhkkgga3ktiwgalbkeujdw21odiqqqa5'

  try {
    const res = await fetch(DNC_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'test',
        company_name: 'DEPLOY-TEST',
        email: 'deploy-test@test.nl',
      }),
    })

    return NextResponse.json({
      success: true,
      status: res.status,
      message: 'Webhook called from Vercel serverless function',
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: String(error),
    }, { status: 500 })
  }
}
