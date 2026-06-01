'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { Exercise } from '@/lib/types'
import { getTodayString, formatDate, getExerciseTypeLabel, getTimeOfDayLabel, isStrengthType } from '@/lib/utils'
import { getStoredTZ, formatTimeInTZ } from '@/lib/timezone'
import type { WorkoutData } from '@/lib/parseWorkoutImage'

const CARDIO_TYPES = ['walking', 'stepper', 'band', 'cycling'] as const
const STRENGTH_TYPES = ['squat', 'lunge', 'pushup', 'plank'] as const
const TIME_OF_DAY = ['morning', 'after_lunch', 'after_dinner', 'evening'] as const
const INTENSITY = ['low', 'medium', 'high'] as const
const INTENSITY_LABEL: Record<string, string> = { low: '낮음', medium: '보통', high: '높음' }

type ExerciseType = typeof CARDIO_TYPES[number] | typeof STRENGTH_TYPES[number] | 'other' | 'other_strength'
type TimeOfDay = typeof TIME_OF_DAY[number]
type Intensity = typeof INTENSITY[number]

interface EditState {
  id: string; type: string; time_of_day: string; duration_minutes: string
  sets: string; reps: string; memo: string
  distance_km: string; avg_heart_rate: string; elevation: string; calories: string; intensity: string
}

function exerciseDisplayName(type: string, memo?: string): string {
  if ((type === 'other' || type === 'other_strength') && memo) return memo
  return getExerciseTypeLabel(type)
}

export default function ExercisePage() {
  const [tab, setTab] = useState<'input' | 'records'>('input')
  const [tz] = useState(() => getStoredTZ())
  const [date, setDate] = useState(getTodayString())
  const [type, setType] = useState<ExerciseType>('walking')
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>('after_dinner')
  const [duration, setDuration] = useState('')
  const [sets, setSets] = useState('')
  const [reps, setReps] = useState('')
  const [memo, setMemo] = useState('')
  const [distance, setDistance] = useState('')
  const [heartRate, setHeartRate] = useState('')
  const [elevation, setElevation] = useState('')
  const [intensity, setIntensity] = useState<Intensity>('medium')
  const [calories, setCalories] = useState('')
  const [saving, setSaving] = useState(false)
  const [parsing, setParsing] = useState(false)
  const [toast, setToast] = useState('')
  const imageInputRef = useRef<HTMLInputElement>(null)

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

  function formatTime(iso?: string) {
    if (!iso) return ''
    return formatTimeInTZ(iso, tz)
  }

  const isStrength = isStrengthType(type)

  function clearInputs() {
    setDuration(''); setSets(''); setReps(''); setMemo('')
    setDistance(''); setHeartRate(''); setElevation(''); setCalories('')
  }

  async function handleImageParse(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setParsing(true)
    try {
      const { parseWorkoutImage } = await import('@/lib/parseWorkoutImage')
      const data: WorkoutData = await parseWorkoutImage(file)
      if (data.duration_minutes != null) setDuration(String(data.duration_minutes))
      if (data.distance_km != null) setDistance(String(data.distance_km))
      if (data.calories != null) setCalories(String(data.calories))
      if (data.avg_heart_rate != null) setHeartRate(String(data.avg_heart_rate))
      if (data.elevation != null) setElevation(String(data.elevation))
      const filled = Object.values(data).filter(v => v != null).length
      showToast(filled > 0 ? `자동 입력 완료! (${filled}개 항목)` : '인식된 데이터가 없습니다. 직접 입력해주세요.')
    } catch {
      showToast('이미지 읽기 실패. 직접 입력해주세요.')
    } finally {
      setParsing(false)
      e.target.value = ''
    }
  }

  async function handleSave() {
    const strength = isStrengthType(type)
    if (strength && !sets && !reps) return
    if (!strength && !duration) return
    setSaving(true)
    const { error } = await supabase.from('exercise').insert({
      date, type, time_of_day: timeOfDay,
      duration_minutes: duration ? Math.round(Number(duration)) : 0,
      sets: (strength && sets) ? Math.round(Number(sets)) : null,
      reps: (strength && reps) ? Math.round(Number(reps)) : null,
      distance_km: distance ? Number(distance) : null,
      avg_heart_rate: heartRate ? Math.round(Number(heartRate)) : null,
      elevation: elevation ? Math.round(Number(elevation)) : null,
      intensity,
      calories: calories ? Math.round(Number(calories)) : null,
      memo: memo || null,
      created_at: new Date().toISOString(),
    })
    setSaving(false)
    if (!error) {
      clearInputs()
      showToast('저장되었습니다!')
    } else showToast('저장 실패: ' + error.message)
  }

  function startEdit(s: Exercise) {
    setEditing({
      id: s.id, type: s.type, time_of_day: s.time_of_day,
      duration_minutes: s.duration_minutes ? String(s.duration_minutes) : '',
      sets: s.sets ? String(s.sets) : '',
      reps: s.reps ? String(s.reps) : '',
      memo: s.memo ?? '',
      distance_km: s.distance_km ? String(s.distance_km) : '',
      avg_heart_rate: s.avg_heart_rate ? String(s.avg_heart_rate) : '',
      elevation: s.elevation ? String(s.elevation) : '',
      calories: s.calories ? String(s.calories) : '',
      intensity: s.intensity ?? 'medium',
    })
  }

  async function saveEdit() {
    if (!editing) return
    const strength = isStrengthType(editing.type)
    const { error } = await supabase.from('exercise').update({
      type: editing.type, time_of_day: editing.time_of_day,
      duration_minutes: editing.duration_minutes ? Math.round(Number(editing.duration_minutes)) : 0,
      sets: (strength && editing.sets) ? Math.round(Number(editing.sets)) : null,
      reps: (strength && editing.reps) ? Math.round(Number(editing.reps)) : null,
      distance_km: editing.distance_km ? Number(editing.distance_km) : null,
      avg_heart_rate: editing.avg_heart_rate ? Math.round(Number(editing.avg_heart_rate)) : null,
      elevation: editing.elevation ? Math.round(Number(editing.elevation)) : null,
      calories: editing.calories ? Math.round(Number(editing.calories)) : null,
      intensity: editing.intensity,
      memo: editing.memo || null,
    }).eq('id', editing.id)
    if (!error) {
      setAllRecords(prev => prev.map(r => r.id === editing.id ? {
        ...r,
        type: editing.type as Exercise['type'],
        time_of_day: editing.time_of_day as Exercise['time_of_day'],
        duration_minutes: editing.duration_minutes ? Number(editing.duration_minutes) : 0,
        sets: editing.sets ? Number(editing.sets) : undefined,
        reps: editing.reps ? Number(editing.reps) : undefined,
        distance_km: editing.distance_km ? Number(editing.distance_km) : undefined,
        avg_heart_rate: editing.avg_heart_rate ? Number(editing.avg_heart_rate) : undefined,
        elevation: editing.elevation ? Number(editing.elevation) : undefined,
        calories: editing.calories ? Number(editing.calories) : undefined,
        intensity: editing.intensity as Exercise['intensity'],
        memo: editing.memo || undefined,
      } : r))
      setEditing(null); showToast('수정되었습니다!')
    } else showToast('수정 실패: ' + error.message)
  }

  async function handleDelete(id: string) {
    if (!confirm('삭제하시겠습니까?')) return
    const { error } = await supabase.from('exercise').delete().eq('id', id)
    if (!error) { setAllRecords(prev => prev.filter(r => r.id !== id)); showToast('삭제되었습니다.') }
  }

  const grouped: Record<string, Exercise[]> = {}
  allRecords.forEach(r => { if (!grouped[r.date]) grouped[r.date] = []; grouped[r.date].push(r) })

  const canSave = isStrength ? (!!sets || !!reps) : !!duration

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
          <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageParse} />
          <button
            onClick={() => imageInputRef.current?.click()}
            disabled={parsing}
            className="w-full h-12 border-2 border-dashed border-[#2e6da4] text-[#2e6da4] rounded-xl text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {parsing
              ? <><span className="w-4 h-4 border-2 border-[#2e6da4] border-t-transparent rounded-full animate-spin" />분석 중...</>
              : '📷 운동 기록 사진으로 자동 입력'}
          </button>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">날짜</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
              className="w-full h-12 border border-gray-200 rounded-xl px-3 text-gray-800 focus:outline-none focus:border-[#2e6da4]" />
          </div>

          {/* 운동 종류 — 유산소 / 근력 그룹 */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-600">운동 종류</label>
            <div>
              <p className="text-xs text-gray-400 mb-1.5">유산소</p>
              <div className="flex flex-wrap gap-2">
                {CARDIO_TYPES.map(t => (
                  <button key={t} onClick={() => { setType(t); clearInputs() }}
                    className={`h-10 px-4 rounded-xl text-sm font-medium transition-colors ${type === t ? 'bg-[#2e6da4] text-white' : 'bg-gray-100 text-gray-600'}`}>
                    {getExerciseTypeLabel(t)}
                  </button>
                ))}
                <button onClick={() => { setType('other'); clearInputs() }}
                  className={`h-10 px-4 rounded-xl text-sm font-medium transition-colors ${type === 'other' ? 'bg-[#2e6da4] text-white' : 'bg-gray-100 text-gray-600'}`}>
                  기타
                </button>
              </div>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1.5 mt-1">근력</p>
              <div className="flex flex-wrap gap-2">
                {STRENGTH_TYPES.map(t => (
                  <button key={t} onClick={() => { setType(t); clearInputs() }}
                    className={`h-10 px-4 rounded-xl text-sm font-medium transition-colors ${type === t ? 'bg-[#2e6da4] text-white' : 'bg-gray-100 text-gray-600'}`}>
                    {getExerciseTypeLabel(t)}
                  </button>
                ))}
                <button onClick={() => { setType('other_strength'); clearInputs() }}
                  className={`h-10 px-4 rounded-xl text-sm font-medium transition-colors ${type === 'other_strength' ? 'bg-[#2e6da4] text-white' : 'bg-gray-100 text-gray-600'}`}>
                  기타
                </button>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">시간대</label>
            <div className="flex gap-2">
              {TIME_OF_DAY.map(t => (
                <button key={t} onClick={() => setTimeOfDay(t)}
                  className={`flex-1 h-10 rounded-xl text-sm font-medium transition-colors ${timeOfDay === t ? 'bg-[#2e6da4] text-white' : 'bg-gray-100 text-gray-600'}`}>
                  {getTimeOfDayLabel(t)}
                </button>
              ))}
            </div>
          </div>

          {/* 근력 운동 입력 */}
          {isStrength ? (
            <div className="space-y-3">
              {/* 근력 기타: 운동 이름 입력 */}
              {type === 'other_strength' && (
                <div>
                  <label className="block text-xs text-gray-500 mb-1">운동 이름</label>
                  <input type="text" value={memo} onChange={e => setMemo(e.target.value)} placeholder="예: 데드리프트, 덤벨컬 등"
                    className="w-full h-12 border border-gray-200 rounded-xl px-3 text-gray-800 focus:outline-none focus:border-[#2e6da4]" />
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">세트 수 *</label>
                  <div className="relative">
                    <input type="number" inputMode="numeric" step="1" value={sets} onChange={e => setSets(e.target.value)} placeholder="3"
                      className="w-full h-14 border border-gray-200 rounded-xl px-3 text-2xl font-bold text-gray-800 focus:outline-none focus:border-[#2e6da4] pr-12" />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">세트</span>
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">세트당 횟수 *</label>
                  <div className="relative">
                    <input type="number" inputMode="numeric" step="1" value={reps} onChange={e => setReps(e.target.value)} placeholder="15"
                      className="w-full h-14 border border-gray-200 rounded-xl px-3 text-2xl font-bold text-gray-800 focus:outline-none focus:border-[#2e6da4] pr-10" />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">회</span>
                  </div>
                </div>
              </div>
              {/* 세트수×횟수 미리보기 */}
              {(sets || reps) && (
                <div className="bg-blue-50 rounded-xl px-4 py-2 text-center">
                  <span className="text-[#2e6da4] font-bold text-sm">
                    {memo || getExerciseTypeLabel(type)} {sets || '?'}세트 × {reps || '?'}회
                    {sets && reps ? ` = 총 ${Math.round(Number(sets) * Number(reps))}회` : ''}
                  </span>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">총 시간 (분)</label>
                  <input type="number" inputMode="numeric" step="1" value={duration} onChange={e => setDuration(e.target.value)} placeholder="20"
                    className="w-full h-12 border border-gray-200 rounded-xl px-3 text-gray-800 focus:outline-none focus:border-[#2e6da4]" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">칼로리 (kcal)</label>
                  <input type="number" inputMode="numeric" step="1" value={calories} onChange={e => setCalories(e.target.value)} placeholder="100"
                    className="w-full h-12 border border-gray-200 rounded-xl px-3 text-gray-800 focus:outline-none focus:border-[#2e6da4]" />
                </div>
              </div>
            </div>
          ) : (
            /* 유산소/기타 입력 */
            <div className="space-y-3">
              {/* 유산소 기타: 운동 이름 입력 */}
              {type === 'other' && (
                <div>
                  <label className="block text-xs text-gray-500 mb-1">운동 이름</label>
                  <input type="text" value={memo} onChange={e => setMemo(e.target.value)} placeholder="예: 줄넘기, 수영, 등산 등"
                    className="w-full h-12 border border-gray-200 rounded-xl px-3 text-gray-800 focus:outline-none focus:border-[#2e6da4]" />
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: '운동 시간 (분) *', val: duration, set: setDuration, ph: '30', decimal: false },
                  { label: '거리 (km)', val: distance, set: setDistance, ph: '3.5', decimal: true },
                  { label: '평균심박수 (bpm)', val: heartRate, set: setHeartRate, ph: '120', decimal: false },
                  { label: '고도 (m)', val: elevation, set: setElevation, ph: '50', decimal: false },
                  { label: '칼로리 (kcal)', val: calories, set: setCalories, ph: '200', decimal: false },
                ].map(({ label, val, set, ph, decimal }) => (
                  <div key={label}>
                    <label className="block text-xs text-gray-500 mb-1">{label}</label>
                    <input type="number" inputMode={decimal ? 'decimal' : 'numeric'} step={decimal ? 'any' : '1'} value={val} onChange={e => set(e.target.value)} placeholder={ph}
                      className="w-full h-12 border border-gray-200 rounded-xl px-3 text-gray-800 focus:outline-none focus:border-[#2e6da4]" />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">강도</label>
            <div className="flex gap-2">
              {INTENSITY.map(i => (
                <button key={i} onClick={() => setIntensity(i)}
                  className={`flex-1 h-10 rounded-xl text-sm font-medium transition-colors ${intensity === i ? 'bg-[#2e6da4] text-white' : 'bg-gray-100 text-gray-600'}`}>
                  {INTENSITY_LABEL[i]}
                </button>
              ))}
            </div>
          </div>

          <button onClick={handleSave} disabled={saving || !canSave}
            className="w-full h-12 bg-[#2e6da4] text-white rounded-xl font-semibold text-base disabled:opacity-50 flex items-center justify-center gap-2">
            {saving ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />저장 중...</> : '저장하기'}
          </button>
        </div>
      )}

      {/* ── 기록 탭 ── */}
      {tab === 'records' && (
        <div className="space-y-4">
          {loadingRecords ? (
            <div className="space-y-3">{[0, 1, 2].map(i => <div key={i} className="h-24 bg-white rounded-2xl animate-pulse" />)}</div>
          ) : Object.keys(grouped).length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm p-8 text-center text-gray-400">
              <p className="text-3xl mb-2">🏃</p><p className="text-sm">기록된 운동이 없습니다</p>
            </div>
          ) : (
            Object.entries(grouped).map(([d, sessions]) => (
              <div key={d} className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-gray-700">{formatDate(d)}</p>
                  <p className="text-xs text-gray-400">
                    총 {sessions.reduce((s, e) => s + (e.duration_minutes || 0), 0)}분
                  </p>
                </div>

                {sessions.map(s => {
                  const strength = isStrengthType(s.type)
                  return (
                    <div key={s.id} className="bg-gray-50 rounded-xl p-3 space-y-2">
                      {editing?.id === s.id ? (
                        <div className="space-y-2">
                          {/* 수정 — 종류 선택 */}
                          <div className="space-y-1">
                            <p className="text-xs text-gray-400">유산소</p>
                            <div className="flex flex-wrap gap-1.5">
                              {([...CARDIO_TYPES, 'other'] as string[]).map(t => (
                                <button key={t} onClick={() => setEditing(p => p ? { ...p, type: t } : null)}
                                  className={`h-8 px-3 rounded-lg text-xs font-medium ${editing!.type === t ? 'bg-[#2e6da4] text-white' : 'bg-white text-gray-600'}`}>
                                  {getExerciseTypeLabel(t)}
                                </button>
                              ))}
                            </div>
                            <p className="text-xs text-gray-400 mt-1">근력</p>
                            <div className="flex flex-wrap gap-1.5">
                              {([...STRENGTH_TYPES, 'other_strength'] as string[]).map(t => (
                                <button key={t} onClick={() => setEditing(p => p ? { ...p, type: t } : null)}
                                  className={`h-8 px-3 rounded-lg text-xs font-medium ${editing!.type === t ? 'bg-[#2e6da4] text-white' : 'bg-white text-gray-600'}`}>
                                  {getExerciseTypeLabel(t)}
                                </button>
                              ))}
                            </div>
                          </div>
                          {/* 기타 운동 이름 */}
                          {(editing.type === 'other' || editing.type === 'other_strength') && (
                            <div>
                              <label className="text-xs text-gray-500">운동 이름</label>
                              <input type="text"
                                value={editing.memo}
                                onChange={e => setEditing(p => p ? { ...p, memo: e.target.value } : null)}
                                placeholder="운동 이름 입력"
                                className="w-full h-9 border border-gray-200 rounded-lg px-2 text-sm focus:outline-none" />
                            </div>
                          )}
                          {isStrengthType(editing.type) ? (
                            <div className="grid grid-cols-2 gap-2">
                              {[
                                { label: '세트', key: 'sets' },
                                { label: '횟수/세트', key: 'reps' },
                                { label: '시간(분)', key: 'duration_minutes' },
                                { label: '칼로리', key: 'calories' },
                              ].map(({ label, key }) => (
                                <div key={key}>
                                  <label className="text-xs text-gray-500">{label}</label>
                                  <input type="number" inputMode="numeric"
                                    value={editing![key as keyof EditState]}
                                    onChange={e => setEditing(p => p ? { ...p, [key]: e.target.value } : null)}
                                    className="w-full h-9 border border-gray-200 rounded-lg px-2 text-sm focus:outline-none" />
                                </div>
                              ))}
                            </div>
                          ) : (
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
                          )}
                          <div className="flex gap-2">
                            <button onClick={saveEdit} className="flex-1 h-9 bg-[#2e6da4] text-white rounded-lg text-sm font-medium">저장</button>
                            <button onClick={() => setEditing(null)} className="flex-1 h-9 bg-gray-200 text-gray-600 rounded-lg text-sm font-medium">취소</button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-2">
                            <span className="text-xl mt-0.5">{strength ? '💪' : '🏃'}</span>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-medium text-gray-800">
                                  {exerciseDisplayName(s.type, s.memo)} · {getTimeOfDayLabel(s.time_of_day)}
                                </p>
                                {s.created_at && <p className="text-xs text-gray-400">{formatTime(s.created_at)}</p>}
                              </div>
                              <p className="text-xs text-gray-500">
                                {strength ? (
                                  <>
                                    {s.sets && s.reps ? `${s.sets}세트 × ${s.reps}회 = 총 ${s.sets * s.reps}회` :
                                      s.sets ? `${s.sets}세트` : s.reps ? `${s.reps}회` : ''}
                                    {s.duration_minutes ? ` · ${s.duration_minutes}분` : ''}
                                    {s.calories ? ` · ${s.calories}kcal` : ''}
                                  </>
                                ) : (
                                  <>
                                    {s.duration_minutes ? `${s.duration_minutes}분` : ''}
                                    {s.distance_km ? ` · ${s.distance_km}km` : ''}
                                    {s.avg_heart_rate ? ` · 심박 ${s.avg_heart_rate}bpm` : ''}
                                    {s.calories ? ` · ${s.calories}kcal` : ''}
                                  </>
                                )}
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
                  )
                })}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
