export interface GlucoseJudgment {
  label: string
  color: string
  bg: string
  text: string
}

export function judgeGlucose(value: number, type: 'fasting' | 'postprandial'): GlucoseJudgment {
  if (type === 'fasting') {
    if (value < 70) return { label: '⚠️ 저혈당', color: 'red', bg: 'bg-red-100', text: 'text-red-700' }
    if (value <= 99) return { label: '✅ 정상', color: 'green', bg: 'bg-green-100', text: 'text-green-700' }
    if (value <= 125) return { label: '🟡 주의', color: 'yellow', bg: 'bg-yellow-100', text: 'text-yellow-700' }
    return { label: '🔴 위험', color: 'red', bg: 'bg-red-100', text: 'text-red-700' }
  } else {
    if (value <= 140) return { label: '✅ 정상', color: 'green', bg: 'bg-green-100', text: 'text-green-700' }
    if (value <= 199) return { label: '🟡 주의', color: 'yellow', bg: 'bg-yellow-100', text: 'text-yellow-700' }
    return { label: '🔴 위험', color: 'red', bg: 'bg-red-100', text: 'text-red-700' }
  }
}

export function estimateHbA1c(avgGlucose: number): string {
  return ((avgGlucose + 46.7) / 28.7).toFixed(1)
}

export function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })
}

export function getTodayString(): string {
  return new Date().toISOString().split('T')[0]
}

export function getTimePointLabel(timePoint: string): string {
  const labels: Record<string, string> = {
    fasting: '공복',
    after_breakfast: '아침식후2h',
    after_lunch: '점심식후2h',
    after_dinner: '저녁식후2h',
    bedtime: '취침전',
  }
  return labels[timePoint] ?? timePoint
}

export function getExerciseTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    walking: '걷기',
    stepper: '스테퍼',
    band: '밴드운동',
    cycling: '자전거',
    other: '기타',
  }
  return labels[type] ?? type
}

export function getTimeOfDayLabel(time: string): string {
  const labels: Record<string, string> = {
    morning: '아침',
    after_lunch: '점심후',
    after_dinner: '저녁후',
    evening: '귀가',
  }
  return labels[time] ?? time
}
