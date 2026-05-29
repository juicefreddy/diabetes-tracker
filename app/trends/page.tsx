'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { supabase } from '@/lib/supabase'
import { estimateHbA1c, judgeGlucose } from '@/lib/utils'

const GlucoseLineChart = dynamic(() => import('../components/charts/GlucoseLineChart'), { ssr: false })
const ExerciseBarChart = dynamic(() => import('../components/charts/ExerciseBarChart'), { ssr: false })

interface ChartPoint { date: string; value: number | null }
interface ExercisePoint { date: string; minutes: number }

export default function TrendsPage() {
  const [fastingData, setFastingData] = useState<ChartPoint[]>([])
  const [postprandialData, setPostprandialData] = useState<ChartPoint[]>([])
  const [exerciseData, setExerciseData] = useState<ExercisePoint[]>([])
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<'30' | '90' | 'all'>('all')

  useEffect(() => {
    fetchData()
  }, [period])

  async function fetchData() {
    setLoading(true)

    let glucoseQuery = supabase.from('blood_glucose').select('date, time_point, value').order('date')
    let exerciseQuery = supabase.from('exercise').select('date, duration_minutes').order('date')

    if (period !== 'all') {
      const from = new Date()
      from.setDate(from.getDate() - Number(period))
      const fromStr = from.toISOString().split('T')[0]
      glucoseQuery = glucoseQuery.gte('date', fromStr)
      exerciseQuery = exerciseQuery.gte('date', fromStr)
    }

    const [glucoseRes, exerciseRes] = await Promise.all([glucoseQuery, exerciseQuery])

    const glucoseRaw = (glucoseRes.data ?? []) as { date: string; time_point: string; value: number }[]
    const exerciseRaw = (exerciseRes.data ?? []) as { date: string; duration_minutes: number }[]

    // 데이터 범위 기반 날짜 배열 생성
    const allDates = [...glucoseRaw.map(g => g.date), ...exerciseRaw.map(e => e.date)]
    const minDate = allDates.length > 0 ? allDates.reduce((a, b) => a < b ? a : b) : new Date().toISOString().split('T')[0]
    const maxDate = new Date().toISOString().split('T')[0]
    const dates: string[] = []
    const cur = new Date(minDate)
    const end = new Date(maxDate)
    while (cur <= end) {
      dates.push(cur.toISOString().split('T')[0])
      cur.setDate(cur.getDate() + 1)
    }

    // 공복혈당 그룹핑
    const fastingGrouped: Record<string, number[]> = {}
    glucoseRaw.filter((g) => g.time_point === 'fasting').forEach((g) => {
      if (!fastingGrouped[g.date]) fastingGrouped[g.date] = []
      fastingGrouped[g.date].push(g.value)
    })

    // 식후혈당 그룹핑 (아침/점심/저녁식후)
    const postGrouped: Record<string, number[]> = {}
    glucoseRaw
      .filter((g) => ['after_breakfast', 'after_lunch', 'after_dinner'].includes(g.time_point))
      .forEach((g) => {
        if (!postGrouped[g.date]) postGrouped[g.date] = []
        postGrouped[g.date].push(g.value)
      })

    // 운동 그룹핑
    const exGrouped: Record<string, number> = {}
    exerciseRaw.forEach((e) => {
      exGrouped[e.date] = (exGrouped[e.date] ?? 0) + e.duration_minutes
    })

    setFastingData(
      dates.map((d) => {
        const vals = fastingGrouped[d]
        return { date: d, value: vals ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null }
      })
    )
    setPostprandialData(
      dates.map((d) => {
        const vals = postGrouped[d]
        return { date: d, value: vals ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null }
      })
    )
    setExerciseData(dates.map((d) => ({ date: d, minutes: exGrouped[d] ?? 0 })))
    setLoading(false)
  }

  // 통계 계산
  const fastingValues = fastingData.map((d) => d.value).filter((v): v is number => v !== null)
  const postValues = postprandialData.map((d) => d.value).filter((v): v is number => v !== null)
  const allValues = [...fastingValues, ...postValues]
  const avgGlucose = allValues.length > 0 ? Math.round(allValues.reduce((a, b) => a + b, 0) / allValues.length) : null
  const avgFasting = fastingValues.length > 0 ? Math.round(fastingValues.reduce((a, b) => a + b, 0) / fastingValues.length) : null
  const minVal = allValues.length > 0 ? Math.min(...allValues) : null
  const maxVal = allValues.length > 0 ? Math.max(...allValues) : null

  const normalFastingCount = fastingValues.filter((v) => judgeGlucose(v, 'fasting').color === 'green').length
  const goalRate = fastingValues.length > 0 ? Math.round((normalFastingCount / fastingValues.length) * 100) : 0
  const exerciseDays = exerciseData.filter((e) => e.minutes > 0).length
  const hba1c = avgGlucose ? estimateHbA1c(avgGlucose) : null

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
      <h1 className="text-xl font-bold text-gray-800">📊 트렌드 분석</h1>
      <div className="flex gap-2">
        {([['30', '30일'], ['90', '90일'], ['all', '전체']] as const).map(([val, label]) => (
          <button key={val} onClick={() => setPeriod(val)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium ${period === val ? 'bg-[#2e6da4] text-white' : 'bg-white text-gray-500 shadow-sm'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* 통계 카드 */}
      {loading ? (
        <div className="grid grid-cols-2 gap-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-white rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-2xl shadow-sm p-4">
              <p className="text-xs text-gray-500 mb-1">7일 공복 평균</p>
              <p className="text-2xl font-bold text-[#2e6da4]">{avgFasting ?? '-'}</p>
              <p className="text-xs text-gray-400">mg/dL</p>
            </div>
            <div className="bg-white rounded-2xl shadow-sm p-4">
              <p className="text-xs text-gray-500 mb-1">목표달성률 (정상)</p>
              <p className="text-2xl font-bold text-[#27ae60]">{goalRate}%</p>
              <p className="text-xs text-gray-400">공복 기준</p>
            </div>
            <div className="bg-white rounded-2xl shadow-sm p-4">
              <p className="text-xs text-gray-500 mb-1">최저 / 최고</p>
              <p className="text-lg font-bold text-gray-700">
                {minVal ?? '-'} / {maxVal ?? '-'}
              </p>
              <p className="text-xs text-gray-400">mg/dL</p>
            </div>
            <div className="bg-white rounded-2xl shadow-sm p-4">
              <p className="text-xs text-gray-500 mb-1">총 운동일수</p>
              <p className="text-2xl font-bold text-[#2e6da4]">{exerciseDays}</p>
              <p className="text-xs text-gray-400">/ 30일</p>
            </div>
          </div>

          {/* HbA1c 예측 */}
          {hba1c && (
            <div className="bg-[#e8f0f9] rounded-2xl p-4 flex items-center gap-4">
              <span className="text-3xl">🧪</span>
              <div>
                <p className="text-xs text-[#2e6da4] font-semibold">HbA1c 예측값</p>
                <p className="text-3xl font-bold text-[#2e6da4]">{hba1c}%</p>
                <p className="text-xs text-gray-500">평균 혈당 {avgGlucose} mg/dL 기준</p>
              </div>
            </div>
          )}

          {/* 공복혈당 차트 */}
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <h2 className="text-sm font-semibold text-gray-600 mb-3">공복혈당 30일 추이</h2>
            <GlucoseLineChart data={fastingData} type="fasting" />
          </div>

          {/* 식후혈당 차트 */}
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <h2 className="text-sm font-semibold text-gray-600 mb-3">식후혈당 30일 추이</h2>
            <GlucoseLineChart data={postprandialData} type="postprandial" />
          </div>

          {/* 운동량 차트 */}
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <h2 className="text-sm font-semibold text-gray-600 mb-3">운동량 (분)</h2>
            <ExerciseBarChart data={exerciseData} />
          </div>
        </>
      )}
    </div>
  )
}
