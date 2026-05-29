'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { supabase } from '@/lib/supabase'
import { BloodGlucose, Exercise } from '@/lib/types'
import { judgeGlucose, getTimePointLabel, getTodayString, formatDate } from '@/lib/utils'

const MiniLineChart = dynamic(() => import('./components/charts/MiniLineChart'), { ssr: false })

interface ChartPoint { date: string; value: number | null }
interface MealRecord { id: string; meal_type: string; foods: string[] }

export default function DashboardPage() {
  const [selectedDate, setSelectedDate] = useState(getTodayString())
  const [glucose, setGlucose] = useState<BloodGlucose[]>([])
  const [exercise, setExercise] = useState<Exercise[]>([])
  const [meals, setMeals] = useState<MealRecord[]>([])
  const [chartData, setChartData] = useState<ChartPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [aiAnalysis, setAiAnalysis] = useState('')
  const [analyzing, setAnalyzing] = useState(false)

  const isToday = selectedDate === getTodayString()

  function getDateDaysAgo(days: number) {
    const d = new Date()
    d.setDate(d.getDate() - days)
    return d.toISOString().split('T')[0]
  }

  const fetchData = useCallback(async () => {
    setLoading(true)
    setAiAnalysis('')
    const [glucoseRes, exerciseRes, mealsRes, chartRes] = await Promise.all([
      supabase.from('blood_glucose').select('*').eq('date', selectedDate).order('created_at'),
      supabase.from('exercise').select('*').eq('date', selectedDate),
      supabase.from('meals').select('id, meal_type, foods').eq('date', selectedDate),
      supabase.from('blood_glucose').select('date, value')
        .gte('date', getDateDaysAgo(6)).eq('time_point', 'fasting').order('date'),
    ])
    setGlucose((glucoseRes.data as BloodGlucose[]) ?? [])
    setExercise((exerciseRes.data as Exercise[]) ?? [])
    setMeals((mealsRes.data as MealRecord[]) ?? [])

    const raw = (chartRes.data ?? []) as { date: string; value: number }[]
    const grouped: Record<string, number[]> = {}
    raw.forEach((r) => { if (!grouped[r.date]) grouped[r.date] = []; grouped[r.date].push(r.value) })
    const points: ChartPoint[] = []
    for (let i = 6; i >= 0; i--) {
      const d = getDateDaysAgo(i)
      const vals = grouped[d]
      points.push({ date: d, value: vals ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null })
    }
    setChartData(points)
    setLoading(false)
  }, [selectedDate])

  useEffect(() => { fetchData() }, [fetchData])

  async function handleAiAnalysis() {
    setAnalyzing(true)
    setAiAnalysis('')
    try {
      const res = await fetch('/api/daily-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: selectedDate, glucose, meals, exercise }),
      })
      const data = await res.json()
      setAiAnalysis(data.analysis ?? '분석 실패')
    } catch {
      setAiAnalysis('AI 분석 중 오류가 발생했습니다.')
    } finally {
      setAnalyzing(false)
    }
  }

  const totalExerciseMin = exercise.reduce((sum, e) => sum + e.duration_minutes, 0)
  const timePoints = ['fasting', 'after_breakfast', 'after_lunch', 'after_dinner'] as const
  const mealLabels: Record<string, string> = { breakfast: '아침', lunch: '점심', dinner: '저녁', snack: '간식' }

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
      {/* 날짜 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{isToday ? '오늘' : '선택한 날짜'}</p>
          <h1 className="text-xl font-bold text-gray-800">{formatDate(selectedDate)}</h1>
        </div>
        <Link href="/profile" className="text-2xl" aria-label="프로필">👤</Link>
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

      {/* AI 일일 분석 */}
      <div className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-600">🤖 AI 일일 분석</h2>
          {aiAnalysis && !analyzing && (
            <button onClick={() => setAiAnalysis('')} className="text-xs text-gray-400">닫기</button>
          )}
        </div>
        {!aiAnalysis && !analyzing && (
          <button onClick={handleAiAnalysis}
            className="w-full h-12 bg-gradient-to-r from-purple-600 to-[#2e6da4] text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2">
            ✨ {selectedDate} 하루 분석 요청
          </button>
        )}
        {analyzing && (
          <div className="space-y-2 py-2">
            <div className="flex items-center gap-2 text-purple-600 text-sm font-medium">
              <span className="w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
              AI가 하루를 분석하고 있습니다...
            </div>
            {[0,1,2,3].map((i) => <div key={i} className="h-4 bg-purple-50 rounded animate-pulse" />)}
          </div>
        )}
        {aiAnalysis && !analyzing && (
          <div className="bg-purple-50 rounded-xl p-4">
            <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{aiAnalysis}</p>
          </div>
        )}
      </div>

      {/* 7일 차트 */}
      <div className="bg-white rounded-2xl shadow-sm p-4">
        <h2 className="text-sm font-semibold text-gray-600 mb-3">7일 공복혈당 추이</h2>
        <MiniLineChart data={chartData} />
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
    </div>
  )
}
