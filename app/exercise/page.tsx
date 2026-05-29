'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Exercise } from '@/lib/types'
import { getTodayString, formatDate, getExerciseTypeLabel, getTimeOfDayLabel } from '@/lib/utils'

const EXERCISE_TYPES = ['walking', 'stepper', 'band', 'cycling', 'other'] as const
const TIME_OF_DAY = ['morning', 'after_lunch', 'after_dinner', 'evening'] as const
const INTENSITY = ['low', 'medium', 'high'] as const
const INTENSITY_LABEL: Record<string, string> = { low: '낮음', medium: '보통', high: '높음' }

type ExerciseType = typeof EXERCISE_TYPES[number]
type TimeOfDay = typeof TIME_OF_DAY[number]
type Intensity = typeof INTENSITY[number]

interface EditState {
  id: string; type: string; time_of_day: string; duration_minutes: string
  distance_km: string; avg_heart_rate: string; elevation: string; calories: string; intensity: string
}

export default function ExercisePage() {
  const [tab, setTab] = useState<'input' | 'records'>('input')
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
  const [toast, setToast] = useState('')

  // 기록 탭
  const [allRecords, setAllRecords] = useState<Exercise[]>([])
  const [loadingRecords, setLoadingRecords] = useState(false)
  const [editing, setEditing] = useState<EditState | null>(null)
  const fetchRecords = useCallback(async () => {
    setLoadingRecords(true)
    const { data } = await supabase.from('exercise').select('*').order('date', { ascending: false }).order('created_at', { ascending: false })
    setAllRecords((data as Exercise[]) ?? [])
    setLoadingRecords(false)
  }, [])

  useEffect(() => { if (tab === 'records') fetchRecords() }, [tab, fetchRecords])

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 2500) }

  async function handleSave() {
    if (!duration) return
    setSaving(true)
    const { error } = await supabase.from('exercise').insert({
      date, type, time_of_day: timeOfDay,
      duration_minutes: Number(duration),
      distance_km: distance ? Number(distance) : null,
      avg_heart_rate: heartRate ? Number(heartRate) : null,
      elevation: elevation ? Number(elevation) : null,
      intensity, calories: calories ? Number(calories) : null,
    })
    setSaving(false)
    if (!error) {
      setDuration(''); setDistance(''); setHeartRate(''); setElevation(''); setCalories('')
      showToast('저장되었습니다!')
    } else showToast('저장 실패: ' + error.message)
  }

  function startEdit(s: Exercise) {
    setEditing({
      id: s.id, type: s.type, time_of_day: s.time_of_day,
      duration_minutes: String(s.duration_minutes),
      distance_km: s.distance_km ? String(s.distance_km) : '',
      avg_heart_rate: s.avg_heart_rate ? String(s.avg_heart_rate) : '',
      elevation: s.elevation ? String(s.elevation) : '',
      calories: s.calories ? String(s.calories) : '',
      intensity: (s.intensity ?? 'medium'),
    })
  }

  async function saveEdit() {
    if (!editing) return
    const { error } = await supabase.from('exercise').update({
      type: editing.type, time_of_day: editing.time_of_day,
      duration_minutes: Number(editing.duration_minutes),
      distance_km: editing.distance_km ? Number(editing.distance_km) : null,
      avg_heart_rate: editing.avg_heart_rate ? Number(editing.avg_heart_rate) : null,
      elevation: editing.elevation ? Number(editing.elevation) : null,
      calories: editing.calories ? Number(editing.calories) : null,
      intensity: editing.intensity,
    }).eq('id', editing.id)
    if (!error) {
      setAllRecords(prev => prev.map(r => r.id === editing.id ? {
        ...r, type: editing.type as Exercise['type'], time_of_day: editing.time_of_day as Exercise['time_of_day'],
        duration_minutes: Number(editing.duration_minutes),
        distance_km: editing.distance_km ? Number(editing.distance_km) : undefined,
        avg_heart_rate: editing.avg_heart_rate ? Number(editing.avg_heart_rate) : undefined,
        elevation: editing.elevation ? Number(editing.elevation) : undefined,
        calories: editing.calories ? Number(editing.calories) : undefined,
        intensity: editing.intensity as Exercise['intensity'],
      } : r))
      setEditing(null); showToast('수정되었습니다!')
    } else showToast('수정 실패: ' + error.message)
  }

  async function handleDelete(id: string) {
    if (!confirm('삭제하시겠습니까?')) return
    const { error } = await supabase.from('exercise').delete().eq('id', id)
    if (!error) { setAllRecords(prev => prev.filter(r => r.id !== id)); showToast('삭제되었습니다.') }
  }

  // 날짜별 그룹
  const grouped: Record<string, Exercise[]> = {}
  allRecords.forEach(r => { if (!grouped[r.date]) grouped[r.date] = []; grouped[r.date].push(r) })

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-gray-800 text-white px-4 py-2 rounded-full text-sm z-50 shadow-lg">{toast}</div>
      )}
      <h1 className="text-xl font-bold text-gray-800">🏃 운동</h1>

      <div className="flex bg-gray-100 rounded-xl p-1">
        <button onClick={() => setTab('input')}
          className={`flex-1 h-9 rounded-lg text-sm font-medium transition-colors ${tab === 'input' ? 'bg-white text-[#2e6da4] shadow-sm' : 'text-gray-500'}`}>입력</button>
        <button onClick={() => setTab('records')}
          className={`flex-1 h-9 rounded-lg text-sm font-medium transition-colors ${tab === 'records' ? 'bg-white text-[#2e6da4] shadow-sm' : 'text-gray-500'}`}>기록 보기</button>
      </div>

      {/* ── 입력 탭 ── */}
      {tab === 'input' && (
        <div className="bg-white rounded-2xl shadow-sm p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">날짜</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
              className="w-full h-12 border border-gray-200 rounded-xl px-3 text-gray-800 focus:outline-none focus:border-[#2e6da4]" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">운동 종류</label>
            <div className="flex flex-wrap gap-2">
              {EXERCISE_TYPES.map(t => (
                <button key={t} onClick={() => setType(t)}
                  className={`h-11 px-4 rounded-xl text-sm font-medium transition-colors ${type === t ? 'bg-[#2e6da4] text-white' : 'bg-gray-100 text-gray-600'}`}>
                  {getExerciseTypeLabel(t)}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">시간대</label>
            <div className="flex gap-2">
              {TIME_OF_DAY.map(t => (
                <button key={t} onClick={() => setTimeOfDay(t)}
                  className={`flex-1 h-11 rounded-xl text-sm font-medium transition-colors ${timeOfDay === t ? 'bg-[#2e6da4] text-white' : 'bg-gray-100 text-gray-600'}`}>
                  {getTimeOfDayLabel(t)}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: '운동 시간 (분) *', val: duration, set: setDuration, ph: '30' },
              { label: '거리 (km)', val: distance, set: setDistance, ph: '3.5' },
              { label: '평균심박수 (bpm)', val: heartRate, set: setHeartRate, ph: '120' },
              { label: '고도 (m)', val: elevation, set: setElevation, ph: '50' },
              { label: '칼로리 (kcal)', val: calories, set: setCalories, ph: '200' },
            ].map(({ label, val, set, ph }) => (
              <div key={label}>
                <label className="block text-xs text-gray-500 mb-1">{label}</label>
                <input type="number" inputMode="decimal" value={val} onChange={e => set(e.target.value)} placeholder={ph}
                  className="w-full h-12 border border-gray-200 rounded-xl px-3 text-gray-800 focus:outline-none focus:border-[#2e6da4]" />
              </div>
            ))}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">강도</label>
            <div className="flex gap-2">
              {INTENSITY.map(i => (
                <button key={i} onClick={() => setIntensity(i)}
                  className={`flex-1 h-11 rounded-xl text-sm font-medium transition-colors ${intensity === i ? 'bg-[#2e6da4] text-white' : 'bg-gray-100 text-gray-600'}`}>
                  {INTENSITY_LABEL[i]}
                </button>
              ))}
            </div>
          </div>
          <button onClick={handleSave} disabled={saving || !duration}
            className="w-full h-12 bg-[#2e6da4] text-white rounded-xl font-semibold text-base disabled:opacity-50 flex items-center justify-center gap-2">
            {saving ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />저장 중...</> : '저장하기'}
          </button>
        </div>
      )}

      {/* ── 기록 탭 ── */}
      {tab === 'records' && (
        <div className="space-y-4">
          {loadingRecords ? (
            <div className="space-y-3">{[0,1,2].map(i => <div key={i} className="h-24 bg-white rounded-2xl animate-pulse" />)}</div>
          ) : Object.keys(grouped).length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm p-8 text-center text-gray-400">
              <p className="text-3xl mb-2">🏃</p><p className="text-sm">기록된 운동이 없습니다</p>
            </div>
          ) : (
            Object.entries(grouped).map(([d, sessions]) => (
              <div key={d} className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-gray-700">{formatDate(d)}</p>
                  <p className="text-xs text-gray-400">총 {sessions.reduce((s, e) => s + e.duration_minutes, 0)}분</p>
                </div>

                {sessions.map(s => (
                  <div key={s.id} className="bg-gray-50 rounded-xl p-3 space-y-2">
                    {editing?.id === s.id ? (
                      <div className="space-y-2">
                        <div className="flex flex-wrap gap-2">
                          {EXERCISE_TYPES.map(t => (
                            <button key={t} onClick={() => setEditing(p => p ? { ...p, type: t } : null)}
                              className={`h-8 px-3 rounded-lg text-xs font-medium ${editing!.type === t ? 'bg-[#2e6da4] text-white' : 'bg-white text-gray-600'}`}>
                              {getExerciseTypeLabel(t)}
                            </button>
                          ))}
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            { label: '시간(분)', key: 'duration_minutes' },
                            { label: '거리(km)', key: 'distance_km' },
                            { label: '심박(bpm)', key: 'avg_heart_rate' },
                            { label: '칼로리', key: 'calories' },
                          ].map(({ label, key }) => (
                            <div key={key}>
                              <label className="text-xs text-gray-500">{label}</label>
                              <input type="number" inputMode="decimal"
                                value={editing![key as keyof EditState]}
                                onChange={e => setEditing(p => p ? { ...p, [key]: e.target.value } : null)}
                                className="w-full h-9 border border-gray-200 rounded-lg px-2 text-sm focus:outline-none" />
                            </div>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <button onClick={saveEdit} className="flex-1 h-9 bg-[#2e6da4] text-white rounded-lg text-sm font-medium">저장</button>
                          <button onClick={() => setEditing(null)} className="flex-1 h-9 bg-gray-200 text-gray-600 rounded-lg text-sm font-medium">취소</button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-2">
                          <span className="text-xl mt-0.5">🏃</span>
                          <div>
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
                        <div className="flex gap-1 shrink-0">
                          <button onClick={() => startEdit(s)} className="text-xs text-[#2e6da4] bg-blue-50 px-2 py-1 rounded-lg">수정</button>
                          <button onClick={() => handleDelete(s.id)} className="text-xs text-red-400 bg-red-50 px-2 py-1 rounded-lg">삭제</button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}

              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
