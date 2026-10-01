// app/api/ai/route.ts
// Server-side proxy for Anthropic API calls — avoids CORS and keeps API key secret

import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type':            'application/json',
        'x-api-key':               process.env.ANTHROPIC_API_KEY ?? '',
        'anthropic-version':       '2023-06-01',
      },
      body: JSON.stringify(body),
    })

    const data = await response.json()

    if (!response.ok) {
      return NextResponse.json(
        { error: data.error?.message ?? 'Anthropic API error' },
        { status: response.status }
      )
    }

    return NextResponse.json(data)
  } catch (err) {
    console.error('AI route error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}