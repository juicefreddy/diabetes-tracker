import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'

const client = new Anthropic()

export async function POST(req: NextRequest) {
  const { date, glucose, meals, exercise } = await req.json()

  const glucoseSummary = glucose.length > 0
    ? glucose.map((g: { time_point: string; value: number }) => `${g.time_point}: ${g.value} mg/dL`).join(', ')
    : '혈당 기록 없음'

  const mealSummary = meals.length > 0
    ? meals.map((m: { meal_type: string; foods: string[] }) => `${m.meal_type}: ${m.foods.join(', ')}`).join('\n')
    : '식단 기록 없음'

  const exerciseSummary = exercise.length > 0
    ? exercise.map((e: { type: string; duration_minutes: number; distance_km?: number }) =>
        `${e.type} ${e.duration_minutes}분${e.distance_km ? ` ${e.distance_km}km` : ''}`
      ).join(', ')
    : '운동 기록 없음'

  const systemPrompt = `당신은 내분비내과 전문의 AI입니다.
환자 정보:
- 제2형 당뇨 (진단: 2026-05-09)
- 진단 시 HbA1c 11.6%, 공복혈당 206 → 현재 관리 중
- 약물: 슈가매트(메트포르민+삭사글립틴), 다파원(다파글리플로진), 알제트(로수바스타틴+에제티미브)
- 고지혈증 동반, 체중 80kg, 신장 180cm, 하루 단백질 목표 96~120g
- 혈당 목표: 공복 80~130, 식후2h 180 미만

하루 데이터를 분석하고 아래 형식으로 간결하게 답하세요:

📋 하루 총평 (2줄 이내)
🩸 혈당 패턴 분석
🍽️ 식단 평가
🏃 운동 효과
💡 내일을 위한 추천 (3가지)`

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: systemPrompt,
    messages: [{
      role: 'user',
      content: `날짜: ${date}\n\n혈당:\n${glucoseSummary}\n\n식단:\n${mealSummary}\n\n운동:\n${exerciseSummary}`
    }]
  })

  return NextResponse.json({ analysis: (message.content[0] as { text: string }).text })
}
