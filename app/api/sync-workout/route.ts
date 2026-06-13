import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Apple HealthKit workout type → our type
const TYPE_MAP: Record<string, string> = {
  // English (international iPhones)
  walking: 'walking', running: 'walking', 'stair climbing': 'stepper',
  cycling: 'cycling', 'indoor cycling': 'cycling',
  'traditional strength training': 'other_strength',
  'functional strength training': 'other_strength',
  'core training': 'other_strength',
  'high intensity interval training': 'other',
  // Korean iPhones
  걷기: 'walking', 달리기: 'walking', 계단오르기: 'stepper', '계단 오르기': 'stepper',
  '자전거 타기': 'cycling', 자전거타기: 'cycling',
  '근력 운동': 'other_strength', 근력운동: 'other_strength',
  '코어 트레이닝': 'other_strength', 코어트레이닝: 'other_strength',
  '기능성 근력 훈련': 'other_strength',
  'HIIT': 'other', '고강도인터벌훈련': 'other',
  '스테퍼': 'stepper',
  밴드운동: 'band', '밴드 운동': 'band',
}

function mapType(raw: string): string {
  if (!raw) return 'other'
  return TYPE_MAP[raw.trim().toLowerCase()] ?? TYPE_MAP[raw.trim()] ?? 'other'
}

function getTimeOfDay(isoDate: string): string {
  const d = new Date(isoDate)
  // KST = UTC+9
  const kstHour = (d.getUTCHours() + 9) % 24
  if (kstHour >= 5 && kstHour < 11) return 'morning'
  if (kstHour >= 11 && kstHour < 15) return 'after_lunch'
  if (kstHour >= 17 && kstHour < 22) return 'after_dinner'
  return 'evening'
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { token, date, type, duration_minutes, distance_km, calories, avg_heart_rate, elevation, start_time, sets, reps, memo } = body

    if (!token) {
      return NextResponse.json({ error: '토큰이 필요합니다' }, { status: 401 })
    }

    // Validate token
    const { data: profile } = await supabase
      .from('patient_profiles')
      .select('id')
      .eq('sync_token', token)
      .single()

    if (!profile) {
      return NextResponse.json({ error: '유효하지 않은 토큰입니다' }, { status: 401 })
    }

    const exerciseType = mapType(String(type ?? ''))
    const isStrength = ['squat', 'lunge', 'pushup', 'plank', 'other_strength'].includes(exerciseType)
    const timeOfDay = start_time ? getTimeOfDay(String(start_time)) : 'after_dinner'
    const workoutDate = date ?? (start_time ? new Date(start_time).toISOString().split('T')[0] : new Date().toISOString().split('T')[0])

    const { error } = await supabase.from('exercise').insert({
      date: workoutDate,
      type: exerciseType,
      time_of_day: timeOfDay,
      duration_minutes: duration_minutes ? Math.round(Number(duration_minutes)) : 0,
      sets: isStrength && sets ? Math.round(Number(sets)) : null,
      reps: isStrength && reps ? Math.round(Number(reps)) : null,
      distance_km: distance_km ? Math.round(Number(distance_km) * 100) / 100 : null,
      avg_heart_rate: avg_heart_rate ? Math.round(Number(avg_heart_rate)) : null,
      elevation: elevation ? Math.round(Number(elevation)) : null,
      calories: calories ? Math.round(Number(calories)) : null,
      memo: memo || (type ? String(type) : null),
      created_at: start_time ? new Date(start_time).toISOString() : new Date().toISOString(),
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: `운동 기록 저장 완료: ${exerciseType} ${duration_minutes ?? 0}분`,
    })
  } catch {
    return NextResponse.json({ error: '잘못된 요청입니다' }, { status: 400 })
  }
}

// Health check
export async function GET() {
  return NextResponse.json({ status: 'ok', endpoint: 'sync-workout' })
}
