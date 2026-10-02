// app/api/ai/route.ts - debugging version of the AI API route for Anthropic Claude integration
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY

  // Debug — log key presence (never log the actual key)
  console.log('[AI Route] Key present:', !!apiKey)
  console.log('[AI Route] Key length:', apiKey?.length ?? 0)
  console.log('[AI Route] Key prefix:', apiKey?.slice(0, 10) ?? 'none')

  if (!apiKey) {
    return NextResponse.json(
      { error: 'ANTHROPIC_API_KEY is not set on the server.' },
      { status: 500 }
    )
  }

  // Validate key format — Anthropic keys start with sk-ant-
  if (!apiKey.startsWith('sk-ant-')) {
    return NextResponse.json(
      { error: `API key format invalid. Expected sk-ant-... got ${apiKey.slice(0,10)}...` },
      { status: 500 }
    )
  }

  try {
    const body = await req.json()
    console.log('[AI Route] Model:', body.model)

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type':      'application/json',
        'x-api-key':         apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
    })

    const data = await response.json()
    console.log('[AI Route] Status:', response.status)

    if (!response.ok) {
      console.error('[AI Route] Anthropic error:', JSON.stringify(data))
      return NextResponse.json(
        { error: data.error?.message ?? 'Anthropic API error', details: data },
        { status: response.status }
      )
    }

    return NextResponse.json(data)
  } catch (err) {
    console.error('[AI Route] Exception:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}