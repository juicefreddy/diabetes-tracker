import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const data = JSON.parse(readFileSync('/tmp/diabetes_full/daily_logs_full.json', 'utf-8'))

// ── 1. 기존 혈당 데이터 삭제 후 재입력 ──
await supabase.from('blood_glucose').delete().neq('id', '00000000-0000-0000-0000-000000000000')
console.log('기존 혈당 데이터 삭제 완료')

const glucoseRows = []
for (const log of data.daily_logs) {
  const bg = log.blood_glucose
  if (!bg) continue
  const map = {
    fasting: bg.fasting,
    after_breakfast: bg.breakfast_2h ?? bg.breakfast_2h30min,
    after_lunch: bg.lunch_2h,
    after_dinner: bg.dinner_2h,
    bedtime: bg.bedtime ?? null,
  }
  for (const [time_point, value] of Object.entries(map)) {
    if (value != null) {
      glucoseRows.push({ date: log.date, time_point, value, memo: log.notes ?? null })
    }
  }
  // postprandial_3h 추가
  if (bg.postprandial_3h) {
    glucoseRows.push({ date: log.date, time_point: 'bedtime', value: bg.postprandial_3h, memo: '식후3시간' })
  }
}
const { error: gErr } = await supabase.from('blood_glucose').insert(glucoseRows)
if (gErr) console.error('혈당 오류:', gErr.message)
else console.log(`✅ 혈당 ${glucoseRows.length}건 입력 완료`)

// ── 2. 운동 데이터 입력 ──
const exerciseRows = []
for (const log of data.daily_logs) {
  if (!log.exercise || log.exercise.length === 0) continue
  for (const ex of log.exercise) {
    if (!ex.duration_min) continue
    const timingMap = { '점심 후': '점심후', '귀가': '귀가', '저녁 후': '저녁후', '아침': '아침' }
    exerciseRows.push({
      date: log.date,
      type: ex.type?.replace(/\s*\(.*?\)\s*/g, '').trim() || '걷기',
      time_of_day: timingMap[ex.timing] ?? ex.timing ?? '기타',
      duration_minutes: ex.duration_min,
      distance_km: ex.distance_km ?? null,
      avg_heart_rate: ex.avg_heart_rate_bpm ?? null,
      elevation: ex.elevation_m ?? null,
      intensity: ex.intensity?.includes('쉬움') ? '쉬움' : ex.intensity?.includes('힘듦') ? '힘듦' : '보통',
      calories: ex.active_calories ?? null,
    })
  }
}
const { error: eErr } = await supabase.from('exercise').insert(exerciseRows)
if (eErr) console.error('운동 오류:', eErr.message)
else console.log(`✅ 운동 ${exerciseRows.length}건 입력 완료`)

// ── 3. 식단 데이터 입력 ──
const mealRows = []
const mealTypeMap = { breakfast: '아침', lunch: '점심', dinner: '저녁', snack: '간식' }
for (const log of data.daily_logs) {
  if (!log.meals) continue
  for (const [key, meal] of Object.entries(log.meals)) {
    if (!mealTypeMap[key]) continue
    if (!meal?.foods || meal.foods.length === 0) continue
    mealRows.push({
      date: log.date,
      meal_type: mealTypeMap[key],
      foods: meal.foods,
      rice_amount: null,
      tomato_check: log.meals.pre_meal_tomato ?? meal.pre_meal_tomato ?? false,
      meal_order_check: false,
      ai_analysis: meal.notes ?? null,
    })
  }
}
const { error: mErr } = await supabase.from('meals').insert(mealRows)
if (mErr) console.error('식단 오류:', mErr.message)
else console.log(`✅ 식단 ${mealRows.length}건 입력 완료`)

// ── 4. 환자 프로필 입력 ──
const profile = data.patient_profile
const { error: pErr } = await supabase.from('patient_profiles').upsert({
  diagnosis_date: profile.diagnosis_date,
  diabetes_type: profile.diabetes_type,
  height_cm: profile.height_cm,
  weight_kg: profile.current_weight_kg,
  medications: profile.medications?.map(m => `${m.name} ${m.dose} ${m.frequency}`) ?? [],
  comorbidities: profile.comorbidities ?? [],
  protein_goal_g: 108,
})
if (pErr) console.error('프로필 오류:', pErr.message)
else console.log('✅ 환자 프로필 입력 완료')
