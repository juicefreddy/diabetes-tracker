'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Exercise } from '@/lib/types'
import { getTodayString, getExerciseTypeLabel, getTimeOfDayLabel } from '@/lib/utils'

const EXERCISE_TYPES = ['walking', 'stepper', 'band', 'cycling', 'other'] as const
const TIME_OF_DAY = ['morning', 'after_lunch', 'after_dinner', 'evening'] as const
const INTENSITY = ['low', 'medium', 'high'] as const

type ExerciseType = typeof EXERCISE_TYPES[number]
type TimeOfDay = typeof TIME_OF_DAY[number]
type Intensity = typeof INTENSITY[number]

export default function ExercisePage() {
  const [date, setDate] = useState(getTodayString())
  const [type, setType] = useState<ExerciseType>('walking')
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>('after_dinner')
  const [duration, setDuration] = useState('')
  const [distance, setDistance] = useState('')
  const [heartRate, setHeartRate] = useState('')
  const [elevation, setElevation] = useState('')
  const [intensity, setIntensity] = useState<Intensity>('medium')
  const [calories, setCalories] = useState('')
  const [saving, setSaving] = useState(false)
  const [sessions, setSessions] = useState<Exercise[]>([])
  const [toast, setToast] = useState('')

  useEffect(() => {
    fetchSessions()
  }, [date])

  async function fetchSessions() {
    const { data } = await supabase
      .from('exercise')
      .select('*')
      .eq('date', date)
      .order('created_at', { ascending: false })
    setSessions((data as Exercise[]) ?? [])
  }

  async function handleSave() {
    if (!duration) return
    setSaving(true)
    const { error } = await supabase.from('exercise').insert({
      date,
      type,
      time_of_day: timeOfDay,
      duration_minutes: Number(duration),
      distance_km: distance ? Number(distance) : null,
      avg_heart_rate: heartRate ? Number(heartRate) : null,
      elevation: elevation ? Number(elevation) : null,
      intensity,
      calories: calories ? Number(calories) : null,
    })
    setSaving(false)
    if (!error) {
      setDuration('')
      setDistance('')
      setHeartRate('')
      setElevation('')
      setCalories('')
      setToast('저장되었습니다!')
      setTimeout(() => setToast(''), 2000)
      fetchSessions()
    } else {
      setToast('저장 실패: ' + error.message)
      setTimeout(() => setToast(''), 3000)
    }
  }

  const intensityLabel: Record<Intensity, string> = { low: '낮음', medium: '보통', high: '높음' }

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-gray-800 text-white px-4 py-2 rounded-full text-sm z-50">
          {toast}
        </div>
      )}

      <h1 className="text-xl font-bold text-gray-800">🏃 운동 입력</h1>

      <div className="bg-white rounded-2xl shadow-sm p-4 space-y-4">
        {/* 날짜 */}
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">날짜</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full h-12 border border-gray-200 rounded-xl px-3 text-gray-800 focus:outline-none focus:border-[#2e6da4]"
          />
        </div>

        {/* 운동 종류 */}
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-2">운동 종류</label>
          <div className="flex flex-wrap gap-2">
            {EXERCISE_TYPES.map((t) => (
              <button
                key={t}
                onClick={() => setType(t)}
                className={`h-11 px-4 rounded-xl text-sm font-medium transition-colors ${
                  type === t ? 'bg-[#2e6da4] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {getExerciseTypeLabel(t)}
              </button>
            ))}
          </div>
        </div>

        {/* 시간대 */}
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-2">시간대</label>
          <div className="flex gap-2">
            {TIME_OF_DAY.map((t) => (
              <button
                key={t}
                onClick={() => setTimeOfDay(t)}
                className={`flex-1 h-11 rounded-xl text-sm font-medium transition-colors ${
                  timeOfDay === t ? 'bg-[#2e6da4] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {getTimeOfDayLabel(t)}
              </button>
            ))}
          </div>
        </div>

        {/* 수치 입력 그리드 */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">운동 시간 (분) *</label>
            <input
              type="number"
              inputMode="numeric"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              placeholder="30"
              className="w-full h-12 border border-gray-200 rounded-xl px-3 text-gray-800 focus:outline-none focus:border-[#2e6da4]"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">거리 (km)</label>
            <input
              type="number"
              inputMode="numeric"
              value={distance}
              onChange={(e) => setDistance(e.target.value)}
              placeholder="3.5"
              className="w-full h-12 border border-gray-200 rounded-xl px-3 text-gray-800 focus:outline-none focus:border-[#2e6da4]"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">평균심박수 (bpm)</label>
            <input
              type="number"
              inputMode="numeric"
              value={heartRate}
              onChange={(e) => setHeartRate(e.target.value)}
              placeholder="120"
              className="w-full h-12 border border-gray-200 rounded-xl px-3 text-gray-800 focus:outline-none focus:border-[#2e6da4]"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">고도 (m)</label>
            <input
              type="number"
              inputMode="numeric"
              value={elevation}
              onChange={(e) => setElevation(e.target.value)}
              placeholder="50"
              className="w-full h-12 border border-gray-200 rounded-xl px-3 text-gray-800 focus:outline-none focus:border-[#2e6da4]"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">칼로리 (kcal)</label>
            <input
              type="number"
              inputMode="numeric"
              value={calories}
              onChange={(e) => setCalories(e.target.value)}
              placeholder="200"
              className="w-full h-12 border border-gray-200 rounded-xl px-3 text-gray-800 focus:outline-none focus:border-[#2e6da4]"
            />
          </div>
        </div>

        {/* 강도 */}
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-2">강도</label>
          <div className="flex gap-2">
            {INTENSITY.map((i) => (
              <button
                key={i}
                onClick={() => setIntensity(i)}
                className={`flex-1 h-11 rounded-xl text-sm font-medium transition-colors ${
                  intensity === i ? 'bg-[#2e6da4] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {intensityLabel[i]}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving || !duration}
          className="w-full h-12 bg-[#2e6da4] text-white rounded-xl font-semibold text-base disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {saving ? (
            <>
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              저장 중...
            </>
          ) : '저장하기'}
        </button>
      </div>

      {/* 오늘 운동 세션 */}
      {sessions.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <h2 className="text-sm font-semibold text-gray-600 mb-3">오늘 운동 세션</h2>
          <div className="space-y-3">
            {sessions.map((s) => (
              <div key={s.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <span className="text-2xl">🏃</span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-800">
                    {getExerciseTypeLabel(s.type)} · {getTimeOfDayLabel(s.time_of_day)}
                  </p>
                  <p className="text-xs text-gray-500">
                    {s.duration_minutes}분
                    {s.distance_km ? ` · ${s.distance_km}km` : ''}
                    {s.avg_heart_rate ? ` · 심박 ${s.avg_heart_rate}bpm` : ''}
                    {s.calories ? ` · ${s.calories}kcal` : ''}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
