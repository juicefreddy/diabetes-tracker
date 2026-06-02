'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { supabase } from '@/lib/supabase'
import { BloodGlucose, Exercise } from '@/lib/types'
import { judgeGlucose, getTimePointLabel, getTodayString, formatDate, getExerciseTypeLabel, isStrengthType } from '@/lib/utils'
import { getStoredTZ, formatTimeInTZ } from '@/lib/timezone'
import { CURRENT_VERSION } from '@/lib/changelog'

const MiniLineChart = dynamic(() => import('./components/charts/MiniLineChart'), { ssr: false })
const DashboardGlucoseChart = dynamic(() => import('./components/charts/DashboardGlucoseChart'), { ssr: false })

interface ChartPoint { date: string; fasting: number | null; maxPost: number | null; spike: number | null }
interface MealRecord {
  id: string
  meal_type: string
  foods: string[]
  tomato_check?: boolean
  meal_order_check?: boolean
  rice_amount?: string
  created_at?: string
}

export default function DashboardPage() {
  const [selectedDate, setSelectedDate] = useState(getTodayString())
  const [tz] = useState(() => getStoredTZ())
  const [glucose, setGlucose] = useState<BloodGlucose[]>([])
  const [exercise, setExercise] = useState<Exercise[]>([])
  const [meals, setMeals] = useState<MealRecord[]>([])
  const [chartData, setChartData] = useState<ChartPoint[]>([])
  const [todayWeight, setTodayWeight] = useState<number | null>(null)
  const [prevWeight, setPrevWeight] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const isToday = selectedDate === getTodayString()

  function getDateDaysAgo(days: number) {
    const d = new Date()
    d.setDate(d.getDate() - days)
    return d.toISOString().split('T')[0]
  }

  const fetchData = useCallback(async () => {
    setLoading(true)
    const [glucoseRes, exerciseRes, mealsRes, chartRes, weightRes] = await Promise.all([
      supabase.from('blood_glucose').select('*').eq('date', selectedDate).order('created_at'),
      supabase.from('exercise').select('*').eq('date', selectedDate),
      supabase.from('meals').select('id, meal_type, foods, tomato_check, meal_order_check, rice_amount, created_at').eq('date', selectedDate),
      supabase.from('blood_glucose').select('date, value, time_point')
        .gte('date', getDateDaysAgo(6)).order('date'),
      supabase.from('weight_logs').select('date, weight_kg').lte('date', selectedDate).order('date', { ascending: false }).limit(2),
    ])
    setGlucose((glucoseRes.data as BloodGlucose[]) ?? [])
    setExercise((exerciseRes.data as Exercise[]) ?? [])
    setMeals((mealsRes.data as MealRecord[]) ?? [])

    const weightRows = (weightRes.data ?? []) as { date: string; weight_kg: number }[]
    const todayRow = weightRows.find(r => r.date === selectedDate)
    const prevRow = weightRows.find(r => r.date !== selectedDate)
    setTodayWeight(todayRow?.weight_kg ?? null)
    setPrevWeight(prevRow?.weight_kg ?? null)

    const raw = (chartRes.data ?? []) as { date: string; value: number; time_point: string }[]
    const grouped: Record<string, { fasting?: number; posts: number[] }> = {}
    raw.forEach(r => {
      if (!grouped[r.date]) grouped[r.date] = { posts: [] }
      if (r.time_point === 'fasting') grouped[r.date].fasting = r.value
      else grouped[r.date].posts.push(r.value)
    })
    const points: ChartPoint[] = []
    for (let i = 6; i >= 0; i--) {
      const d = getDateDaysAgo(i)
      const day = grouped[d] ?? { posts: [] }
      const fasting = day.fasting ?? null
      const maxPost = day.posts.length > 0 ? Math.max(...day.posts) : null
      const spike = fasting !== null && maxPost !== null ? maxPost - fasting : null
      points.push({ date: d, fasting, maxPost, spike })
    }
    setChartData(points)
    setLoading(false)
  }, [selectedDate])

  useEffect(() => { fetchData() }, [fetchData])

  const totalExerciseMin = exercise.reduce((sum, e) => sum + e.duration_minutes, 0)
  const timePoints = ['fasting', 'after_breakfast', 'after_lunch', 'after_dinner'] as const
  const mealLabels: Record<string, string> = { breakfast: '아침', lunch: '점심', dinner: '저녁', snack: '간식' }

  function buildClaudePrompt(): string {
    const lines: string[] = []
    lines.push(`안녕하세요. 저는 당뇨 관리 중인 환자입니다. ${selectedDate} 하루 데이터를 정리했으니 당뇨 관리 관점에서 분석과 조언 부탁드립니다.`)
    lines.push('')

    lines.push('【혈당】')
    const tpOrder = ['fasting', 'after_breakfast', 'after_lunch', 'after_dinner', 'bedtime']
    const tpLabels: Record<string, string> = {
      fasting: '공복', after_breakfast: '아침식후2h',
      after_lunch: '점심식후2h', after_dinner: '저녁식후2h', bedtime: '취침전',
    }
    const glucoseEntries = tpOrder.map(tp => glucose.find(g => g.time_point === tp)).filter(Boolean) as BloodGlucose[]
    if (glucoseEntries.length === 0) {
      lines.push('- 입력 없음')
    } else {
      glucoseEntries.forEach(g => {
        const note = g.memo ? ` (${g.memo})` : ''
        lines.push(`- ${tpLabels[g.time_point] ?? g.time_point}: ${g.value} mg/dL${note}`)
      })
    }
    lines.push('')

    lines.push('【식단】')
    const mealOrder = ['breakfast', 'lunch', 'dinner', 'snack']
    const riceLabels: Record<string, string> = { none: '안먹음', quarter: '1/4공기', half: '반공기', three_quarter: '3/4공기', full: '1공기' }
    if (meals.length === 0) {
      lines.push('- 입력 없음')
    } else {
      const sorted = [...meals].sort((a, b) => mealOrder.indexOf(a.meal_type) - mealOrder.indexOf(b.meal_type))
      sorted.forEach(m => {
        const timeStr = m.created_at ? ` (${formatTimeInTZ(m.created_at, tz)})` : ''
        const extras: string[] = []
        if (m.rice_amount && m.rice_amount !== 'none') extras.push(`밥 ${riceLabels[m.rice_amount] ?? m.rice_amount}`)
        if (m.tomato_check) extras.push('방울토마토 ✓')
        if (m.meal_order_check) extras.push('식사순서 준수 ✓')
        const extraStr = extras.length > 0 ? ` [${extras.join(', ')}]` : ''
        lines.push(`- ${mealLabels[m.meal_type] ?? m.meal_type}${timeStr}: ${m.foods.join(', ')}${extraStr}`)
      })
    }
    lines.push('')

    lines.push('【운동】')
    const todLabels: Record<string, string> = { morning: '아침', after_lunch: '점심후', after_dinner: '저녁후', evening: '귀가' }
    if (exercise.length === 0) {
      lines.push('- 없음')
    } else {
      exercise.forEach(e => {
        const strength = isStrengthType(e.type)
        const name = (e.type === 'other' || e.type === 'other_strength') && e.memo
          ? e.memo
          : getExerciseTypeLabel(e.type)
        const timeStr = e.created_at ? ` ${formatTimeInTZ(e.created_at, tz)}` : ''
        const todStr = todLabels[e.time_of_day] ?? e.time_of_day
        if (strength) {
          const setRep = e.sets && e.reps
            ? `${e.sets}세트 × ${e.reps}회 = 총 ${e.sets * e.reps}회`
            : e.sets ? `${e.sets}세트` : e.reps ? `${e.reps}회` : ''
          const parts = [`${name} (${todStr}${timeStr})`, setRep]
          if (e.duration_minutes) parts.push(`${e.duration_minutes}분`)
          if (e.calories) parts.push(`${e.calories}kcal`)
          lines.push(`- ${parts.filter(Boolean).join(', ')}`)
        } else {
          const parts = [`${name} ${e.duration_minutes}분 (${todStr}${timeStr})`]
          if (e.distance_km) parts.push(`${e.distance_km}km`)
          if (e.avg_heart_rate) parts.push(`심박 ${e.avg_heart_rate}bpm`)
          if (e.calories) parts.push(`${e.calories}kcal`)
          if (e.elevation) parts.push(`고도상승 ${e.elevation}m`)
          lines.push(`- ${parts.join(', ')}`)
        }
      })
    }
    lines.push('')

    lines.push('【몸무게】')
    if (todayWeight !== null) {
      const weightDiffStr = prevWeight !== null
        ? ` (전일 대비 ${todayWeight > prevWeight ? '+' : ''}${Math.round((todayWeight - prevWeight) * 10) / 10}kg)`
        : ''
      lines.push(`- ${todayWeight} kg${weightDiffStr}`)
    } else {
      lines.push('- 미입력')
    }
    lines.push('')
    lines.push('위 데이터를 바탕으로 혈당 조절 상태 평가, 식단의 적절성, 운동 효과, 체중 관리 상태, 개선이 필요한 부분에 대해 구체적인 조언 부탁드립니다.')

    return lines.join('\n')
  }

  function openClaudeAnalysis() {
    const prompt = buildClaudePrompt()
    window.open(`https://claude.ai/new?q=${encodeURIComponent(prompt)}`, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
      {/* 날짜 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{isToday ? '오늘' : '선택한 날짜'}</p>
          <h1 className="text-xl font-bold text-gray-800">{formatDate(selectedDate)}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/profile" className="flex items-center gap-1.5 text-gray-500 text-sm">
            <span className="text-xs text-gray-400">{CURRENT_VERSION}</span>
            <span className="text-2xl">👤</span>
          </Link>
        </div>
      </div>

      {/* 날짜 선택 */}
      <div className="flex items-center gap-2">
        <button onClick={() => {
          const d = new Date(selectedDate); d.setDate(d.getDate() - 1)
          setSelectedDate(d.toISOString().split('T')[0])
        }} className="h-10 w-10 bg-white rounded-xl shadow-sm text-gray-500 text-lg flex items-center justify-center">‹</button>
        <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)}
          className="flex-1 h-10 border border-gray-200 rounded-xl px-3 text-sm text-gray-700 focus:outline-none focus:border-[#2e6da4]" />
        <button onClick={() => {
          const d = new Date(selectedDate); d.setDate(d.getDate() + 1)
          setSelectedDate(d.toISOString().split('T')[0])
        }} className="h-10 w-10 bg-white rounded-xl shadow-sm text-gray-500 text-lg flex items-center justify-center">›</button>
        {!isToday && (
          <button onClick={() => setSelectedDate(getTodayString())}
            className="h-10 px-3 bg-[#2e6da4] text-white rounded-xl text-xs font-medium">오늘</button>
        )}
      </div>

      {/* 혈당 카드 */}
      <div className="bg-white rounded-2xl shadow-sm p-4">
        <h2 className="text-sm font-semibold text-gray-600 mb-3">혈당</h2>
        {loading ? (
          <div className="grid grid-cols-2 gap-2">{[0,1,2,3].map((i) => <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />)}</div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {timePoints.map((tp) => {
              const entry = glucose.find((g) => g.time_point === tp)
              const judgment = entry ? judgeGlucose(entry.value, tp === 'fasting' ? 'fasting' : 'postprandial') : null
              return (
                <div key={tp} className={`rounded-xl p-3 ${judgment ? judgment.bg : 'bg-gray-50'}`}>
                  <p className="text-xs text-gray-500 mb-1">{getTimePointLabel(tp)}</p>
                  {entry ? (
                    <><p className={`text-2xl font-bold ${judgment?.text}`}>{entry.value}</p>
                    <p className="text-xs mt-0.5">{judgment?.label}</p></>
                  ) : <p className="text-gray-400 text-sm mt-1">미입력</p>}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* 몸무게 카드 */}
      <div className="bg-white rounded-2xl shadow-sm p-4">
        <h2 className="text-sm font-semibold text-gray-600 mb-2">몸무게</h2>
        {loading ? <div className="h-10 bg-gray-100 rounded-xl animate-pulse" /> :
          todayWeight === null ? (
            <Link href="/weight" className="flex items-center gap-3 text-gray-400 py-1">
              <span className="text-2xl">⚖️</span>
              <p className="text-sm">오늘 체중 미입력</p>
              <span className="text-xs text-teal-600 ml-auto font-medium">입력하기 →</span>
            </Link>
          ) : (
            <div className="flex items-center gap-3">
              <span className="text-2xl">⚖️</span>
              <p className="text-lg font-bold text-teal-600">{todayWeight} kg</p>
              {prevWeight !== null && (() => {
                const d = Math.round((todayWeight - prevWeight) * 10) / 10
                return (
                  <span className={`text-sm font-semibold ${d < 0 ? 'text-green-600' : d > 0 ? 'text-red-500' : 'text-gray-400'}`}>
                    {d < 0 ? '▼' : d > 0 ? '▲' : '─'} {Math.abs(d)} kg
                  </span>
                )
              })()}
            </div>
          )}
      </div>

      {/* 운동 카드 */}
      <div className="bg-white rounded-2xl shadow-sm p-4">
        <h2 className="text-sm font-semibold text-gray-600 mb-2">운동</h2>
        {loading ? <div className="h-12 bg-gray-100 rounded-xl animate-pulse" /> :
          exercise.length === 0 ? (
            <div className="flex items-center gap-3 text-gray-400 py-2">
              <span className="text-2xl">🏃</span><p className="text-sm">운동 기록 없음</p>
            </div>
          ) : (
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🏃</span>
                <p className="font-bold text-[#2e6da4] text-lg">{totalExerciseMin}분</p>
                <p className="text-xs text-gray-500">{exercise.length}개 세션</p>
              </div>
              {exercise.map((e, i) => (
                <p key={i} className="text-xs text-gray-500 pl-9">• {e.type} {e.duration_minutes}분{e.distance_km ? ` · ${e.distance_km}km` : ''}</p>
              ))}
            </div>
          )}
      </div>

      {/* 식단 카드 */}
      <div className="bg-white rounded-2xl shadow-sm p-4">
        <h2 className="text-sm font-semibold text-gray-600 mb-2">식단</h2>
        {loading ? <div className="h-12 bg-gray-100 rounded-xl animate-pulse" /> :
          meals.length === 0 ? (
            <div className="flex items-center gap-3 text-gray-400 py-2">
              <span className="text-2xl">🍽️</span><p className="text-sm">식단 기록 없음</p>
            </div>
          ) : (
            <div className="space-y-2">
              {meals.map((m) => (
                <div key={m.id} className="flex gap-2">
                  <span className="text-xs bg-[#2e6da4] text-white px-2 py-0.5 rounded-full font-medium shrink-0">
                    {mealLabels[m.meal_type] ?? m.meal_type}
                  </span>
                  <p className="text-xs text-gray-600 leading-relaxed">{m.foods.join(', ')}</p>
                </div>
              ))}
            </div>
          )}
      </div>

      {/* 7일 차트 */}
      <div className="bg-white rounded-2xl shadow-sm p-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-gray-600">7일 혈당 추이</h2>
          <div className="flex items-center gap-3 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <span className="inline-block w-4 h-[3px] rounded bg-[#2e6da4]" />공복
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-4 h-px bg-orange-400" style={{ borderTop: '1.5px dashed #f97316' }} />식후최고
            </span>
            <span className="text-orange-400 font-semibold">+N 상승폭</span>
          </div>
        </div>
        <DashboardGlucoseChart data={chartData} />
      </div>

      {/* 빠른 입력 버튼 */}
      <div className="grid grid-cols-3 gap-3">
        <Link href="/glucose" className="flex flex-col items-center justify-center h-14 bg-[#2e6da4] text-white rounded-2xl shadow-sm text-sm font-medium gap-1">
          <span className="text-xl">💉</span>혈당
        </Link>
        <Link href="/meals" className="flex flex-col items-center justify-center h-14 bg-white text-gray-700 rounded-2xl shadow-sm text-sm font-medium gap-1 border border-gray-100">
          <span className="text-xl">🍽️</span>식단
        </Link>
        <Link href="/exercise" className="flex flex-col items-center justify-center h-14 bg-white text-gray-700 rounded-2xl shadow-sm text-sm font-medium gap-1 border border-gray-100">
          <span className="text-xl">🏃</span>운동
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Link href="/labs" className="flex items-center gap-2 bg-white rounded-2xl shadow-sm p-4 text-sm font-medium text-gray-700">
          <span className="text-xl">🧪</span> 검사결과
        </Link>
        <Link href="/trends" className="flex items-center gap-2 bg-white rounded-2xl shadow-sm p-4 text-sm font-medium text-gray-700">
          <span className="text-xl">📊</span> 트렌드 분석
        </Link>
      </div>

      {/* Claude AI 분석 버튼 */}
      <button
        onClick={openClaudeAnalysis}
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 h-14 bg-gradient-to-r from-[#7c3aed] to-[#a855f7] text-white rounded-2xl shadow-sm text-sm font-semibold disabled:opacity-50 transition-opacity"
      >
        <span className="text-xl">🤖</span>
        Claude AI로 {selectedDate === getTodayString() ? '오늘' : selectedDate} 데이터 분석하기
      </button>
    </div>
  )
}
