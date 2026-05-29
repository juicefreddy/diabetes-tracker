import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'

const client = new Anthropic()

export async function POST(req: NextRequest) {
  const { foods, mealType, date } = await req.json()

  const systemPrompt = `당신은 내분비내과 전문의 AI입니다.
다음은 환자 정보입니다:
- 제2형 당뇨 (진단: 2025-05-09)
- 진단 시 HbA1c 11.6%, 공복혈당 206
- 현재 약물: 슈가매트(메트포르민+삭사글립틴), 다파원(다파글리플로진), 알제트(로수바스타틴+에제티미브)
- 고지혈증 동반, 체중 80kg, 신장 180cm
- 하루 단백질 목표: 96~120g

식단을 분석하고 다음 형식으로 답하세요:
📊 영양 분석 (탄수화물/단백질/지방/나트륨 추정)
🩸 혈당 영향 예측 (낮음/중간/높음 + 이유)
✅ 잘한 점
⚠️ 보완할 점
🥗 추가 추천
🎯 오늘 남은 끼니 체크

반드시 간결하고 실용적으로 답하세요.`

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: systemPrompt,
    messages: [{ role: 'user', content: `${mealType} 식단: ${foods.join(', ')}` }],
  })

  return NextResponse.json({ analysis: (message.content[0] as { text: string }).text })
}
