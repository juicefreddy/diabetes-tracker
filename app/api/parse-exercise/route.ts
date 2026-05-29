import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'

const client = new Anthropic()

export async function POST(req: NextRequest) {
  try {
    const { image, mediaType } = await req.json()

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: mediaType, data: image },
          },
          {
            type: 'text',
            text: `이 운동 기록 스크린샷에서 데이터를 추출해서 JSON만 반환하세요. 다른 텍스트 없이 JSON만:
{
  "duration_minutes": 숫자 또는 null,
  "distance_km": 숫자 또는 null,
  "calories": 숫자 또는 null,
  "avg_heart_rate": 숫자 또는 null,
  "elevation": 숫자 또는 null
}
단위 변환: m→km(소수점 3자리), HH:MM:SS 또는 MM:SS→분(소수점). 데이터 없으면 null.`,
          },
        ],
      }],
    })

    const text = message.content[0].type === 'text' ? message.content[0].text.trim() : '{}'
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {}
    return NextResponse.json(parsed)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
