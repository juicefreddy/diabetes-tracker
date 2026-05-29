import { createClient } from '@supabase/supabase-js'

import 'dotenv/config'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const glucoseData = [
  { date: '2025-05-13', time_point: 'fasting', value: 119 },
  { date: '2025-05-13', time_point: 'breakfast_2h', value: 99 },
  { date: '2025-05-13', time_point: 'lunch_2h', value: 129 },
  { date: '2025-05-13', time_point: 'dinner_2h', value: 111 },
  { date: '2025-05-14', time_point: 'fasting', value: 111 },
  { date: '2025-05-14', time_point: 'dinner_2h', value: 123 },
  { date: '2025-05-15', time_point: 'fasting', value: 104 },
  { date: '2025-05-15', time_point: 'lunch_2h', value: 108 },
  { date: '2025-05-15', time_point: 'dinner_2h', value: 148, memo: '나트륨부족 회복, 불고기+잡곡밥 반공기' },
  { date: '2025-05-16', time_point: 'fasting', value: 111 },
  { date: '2025-05-16', time_point: 'breakfast_2h', value: 145 },
  { date: '2025-05-16', time_point: 'lunch_2h', value: 127 },
  { date: '2025-05-16', time_point: 'dinner_2h', value: 146 },
  { date: '2025-05-17', time_point: 'fasting', value: 95 },
  { date: '2025-05-17', time_point: 'breakfast_2h', value: 111 },
  { date: '2025-05-17', time_point: 'dinner_2h', value: 133 },
  { date: '2025-05-18', time_point: 'fasting', value: 113 },
  { date: '2025-05-18', time_point: 'breakfast_2h', value: 102 },
  { date: '2025-05-18', time_point: 'lunch_2h', value: 122 },
  { date: '2025-05-18', time_point: 'dinner_2h', value: 129 },
  { date: '2025-05-19', time_point: 'fasting', value: 101 },
  { date: '2025-05-19', time_point: 'breakfast_2h', value: 94 },
  { date: '2025-05-19', time_point: 'lunch_2h', value: 141 },
  { date: '2025-05-19', time_point: 'dinner_2h', value: 132 },
  { date: '2025-05-26', time_point: 'dinner_2h', value: 120, memo: '족발보쌈, 위스키 소량' },
  { date: '2025-05-28', time_point: 'dinner_2h', value: 105, memo: '순댓국, 하루 걷기 62분' },
  { date: '2025-05-29', time_point: 'fasting', value: 95 },
]

const { error } = await supabase.from('blood_glucose').insert(glucoseData)
if (error) console.error('혈당 데이터 오류:', error.message)
else console.log(`✅ 혈당 ${glucoseData.length}건 입력 완료`)
