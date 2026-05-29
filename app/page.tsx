'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { supabase } from '@/lib/supabase'
import { BloodGlucose, Exercise } from '@/lib/types'
import { judgeGlucose, getTimePointLabel, getTodayString, formatDate } from '@/lib/utils'

const MiniLineChart = dynamic(() => import('./components/charts/MiniLineChart'), { ssr: false })

interface ChartPoint {
  date: string
  value: number | null
}

export default function DashboardPage() {
  const [todayGlucose, setTodayGlucose] = useState<BloodGlucose[]>([])
  const [todayExercise, setTodayExercise] = useState<Exercise[]>([])
  const [chartData, setChartData] = useState<ChartPoint[]>([])
  const [loading, setLoading] = useState(true)

  const today = getTodayString()

  function getDateDaysAgo(days: number) {
    const d = new Date()
    d.setDate(d.getDate() - days)
    return d.toISOString().split('T')[0]
  }

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      try {
        const [glucoseRes, exerciseRes, chartRes] = await Promise.all([
          supabase
            .from('blood_glucose')
            .select('*')
            .eq('date', today)
            .order('created_at', { ascending: true }),
          supabase
            .from('exercise')
            .select('*')
            .eq('date', today),
          supabase
            .from('blood_glucose')
            .select('date, value')
            .gte('date', getDateDaysAgo(6))
            .eq('time_point', 'fasting')
            .order('date', { ascending: true }),
        ])

        setTodayGlucose((glucoseRes.data as BloodGlucose[]) ?? [])
        setTodayExercise((exerciseRes.data as Exercise[]) ?? [])

        const raw = (chartRes.data ?? []) as { date: string; value: number }[]
        const grouped: Record<string, number[]> = {}
        raw.forEach((r) => {
          if (!grouped[r.date]) grouped[r.date] = []
          grouped[r.date].push(r.value)
        })
        const points: ChartPoint[] = []
        for (let i = 6; i >= 0; i--) {
          const d = getDateDaysAgo(i)
          const vals = grouped[d]
          points.push({
            date: d,
            value: vals ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null,
          })
        }
        setChartData(points)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [today])

  const todayLabel = formatDate(today)
  const totalExerciseMin = todayExercise.reduce((sum, e) => sum + e.duration_minutes, 0)
  const timePoints = ['fasting', 'after_breakfast', 'after_lunch', 'after_dinner'] as const

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
      {/* 날짜 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">오늘</p>
          <h1 className="text-xl font-bold text-gray-800">{todayLabel}</h1>
        </div>
        <Link href="/profile" className="text-2xl" aria-label="프로필">👤</Link>
      </div>

      {/* 오늘 혈당 카드 */}
      <div className="bg-white rounded-2xl shadow-sm p-4">
        <h2 className="text-sm font-semibold text-gray-600 mb-3">오늘 혈당</h2>
        {loading ? (
          <div className="grid grid-cols-2 gap-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {timePoints.map((tp) => {
              const entry = todayGlucose.find((g) => g.time_point === tp)
              const judgment = entry
                ? judgeGlucose(entry.value, tp === 'fasting' ? 'fasting' : 'postprandial')
                : null
              return (
                <div key={tp} className={`rounded-xl p-3 ${judgment ? judgment.bg : 'bg-gray-50'}`}>
                  <p className="text-xs text-gray-500 mb-1">{getTimePointLabel(tp)}</p>
                  {entry ? (
                    <>
                      <p className={`text-2xl font-bold ${judgment?.text}`}>{entry.value}</p>
                      <p className="text-xs mt-0.5">{judgment?.label}</p>
                    </>
                  ) : (
                    <p className="text-gray-400 text-sm mt-1">미입력</p>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* 오늘 운동 카드 */}
      <div className="bg-white rounded-2xl shadow-sm p-4">
        <h2 className="text-sm font-semibold text-gray-600 mb-2">오늘 운동</h2>
        {loading ? (
          <div className="h-12 bg-gray-100 rounded-xl animate-pulse" />
        ) : todayExercise.length === 0 ? (
          <div className="flex items-center gap-3 text-gray-400 py-2">
            <span className="text-2xl">🏃</span>
            <p className="text-sm">오늘 운동 기록이 없습니다</p>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <span className="text-3xl">🏃</span>
            <div>
              <p className="font-bold text-[#2e6da4] text-lg">{totalExerciseMin}분</p>
              <p className="text-xs text-gray-500">{todayExercise.length}개 세션</p>
            </div>
          </div>
        )}
      </div>

      {/* 7일 혈당 차트 */}
      <div className="bg-white rounded-2xl shadow-sm p-4">
        <h2 className="text-sm font-semibold text-gray-600 mb-3">7일 공복혈당 추이</h2>
        <MiniLineChart data={chartData} />
      </div>

      {/* 빠른 입력 버튼 */}
      <div className="grid grid-cols-3 gap-3">
        <Link
          href="/glucose"
          className="flex flex-col items-center justify-center h-14 bg-[#2e6da4] text-white rounded-2xl shadow-sm text-sm font-medium gap-1"
        >
          <span className="text-xl">💉</span>
          혈당
        </Link>
        <Link
          href="/meals"
          className="flex flex-col items-center justify-center h-14 bg-white text-gray-700 rounded-2xl shadow-sm text-sm font-medium gap-1 border border-gray-100"
        >
          <span className="text-xl">🍽️</span>
          식단
        </Link>
        <Link
          href="/exercise"
          className="flex flex-col items-center justify-center h-14 bg-white text-gray-700 rounded-2xl shadow-sm text-sm font-medium gap-1 border border-gray-100"
        >
          <span className="text-xl">🏃</span>
          운동
        </Link>
      </div>

      {/* 추가 메뉴 */}
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
