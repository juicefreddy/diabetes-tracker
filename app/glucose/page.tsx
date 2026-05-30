'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { BloodGlucose } from '@/lib/types'
import { judgeGlucose, getTimePointLabel, getTodayString, formatDate } from '@/lib/utils'
import { getStoredTZ, formatTimeInTZ, localToUTCIso, getCurrentTimeInTZ } from '@/lib/timezone'

const TIME_POINTS = ['fasting', 'after_breakfast', 'after_lunch', 'after_dinner', 'bedtime'] as const
type TimePoint = typeof TIME_POINTS[number]

interface EditState { id: string; value: string; memo: string }

export default function GlucosePage() {
  const [tab, setTab] = useState<'input' | 'records'>('input')
  const [tz] = useState(() => getStoredTZ())
  const [date, setDate] = useState(getTodayString())
  const [measureTime, setMeasureTime] = useState(() => getCurrentTimeInTZ(getStoredTZ()))
  const [timePoint, setTimePoint] = useState<TimePoint>('fasting')
  const [value, setValue] = useState('')
  const [memo, setMemo] = useState('')
  const [saving, setSaving] = useState(false)
  const [records, setRecords] = useState<BloodGlucose[]>([])
  const [loadingRecords, setLoadingRecords] = useState(true)
  const [toast, setToast] = useState('')
  const [editing, setEditing] = useState<EditState | null>(null)

  const fetchRecords = useCallback(async () => {
    setLoadingRecords(true)
    const { data } = await supabase
      .from('blood_glucose').select('*')
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
    setRecords((data as BloodGlucose[]) ?? [])
    setLoadingRecords(false)
  }, [])

  useEffect(() => { if (tab === 'records') fetchRecords() }, [tab, fetchRecords])

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 2500) }

  function formatTime(iso?: string) {
    if (!iso) return ''
    return formatTimeInTZ(iso, tz)
  }

  async function handleSave() {
    if (!value || isNaN(Number(value))) return
    setSaving(true)
    const createdAt = localToUTCIso(date, measureTime, tz)
    const { error } = await supabase.from('blood_glucose').insert({
      date, time_point: timePoint, value: Number(value), memo: memo || null, created_at: createdAt,
    })
    setSaving(false)
    if (!error) { setValue(''); setMemo(''); showToast('저장되었습니다!'); fetchRecords() }
    else showToast('저장 실패: ' + error.message)
  }

  async function handleEdit(id: string) {
    if (!editing || editing.id !== id) return
    if (!editing.value || isNaN(Number(editing.value))) return
    const { error } = await supabase.from('blood_glucose')
      .update({ value: Number(editing.value), memo: editing.memo || null })
      .eq('id', id)
    if (!error) {
      setRecords(prev => prev.map(r => r.id === id ? { ...r, value: Number(editing.value), memo: editing.memo } : r))
      setEditing(null)
      showToast('수정되었습니다!')
    } else showToast('수정 실패: ' + error.message)
  }

  async function handleDelete(id: string) {
    if (!confirm('삭제하시겠습니까?')) return
    const { error } = await supabase.from('blood_glucose').delete().eq('id', id)
    if (!error) { setRecords(prev => prev.filter(r => r.id !== id)); showToast('삭제되었습니다.') }
  }

  const grouped: Record<string, BloodGlucose[]> = {}
  records.forEach((r) => { if (!grouped[r.date]) grouped[r.date] = []; grouped[r.date].push(r) })

  const numVal = Number(value)
  const judgment = value && !isNaN(numVal)
    ? judgeGlucose(numVal, timePoint === 'fasting' ? 'fasting' : 'postprandial') : null

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-gray-800 text-white px-4 py-2 rounded-full text-sm z-50 shadow-lg">{toast}</div>
      )}
      <h1 className="text-xl font-bold text-gray-800">💉 혈당</h1>

      <div className="flex bg-gray-100 rounded-xl p-1">
        <button onClick={() => setTab('input')}
          className={`flex-1 h-9 rounded-lg text-sm font-medium transition-colors ${tab === 'input' ? 'bg-white text-[#2e6da4] shadow-sm' : 'text-gray-500'}`}>입력</button>
        <button onClick={() => setTab('records')}
          className={`flex-1 h-9 rounded-lg text-sm font-medium transition-colors ${tab === 'records' ? 'bg-white text-[#2e6da4] shadow-sm' : 'text-gray-500'}`}>기록 보기</button>
      </div>

      {tab === 'input' && (
        <div className="bg-white rounded-2xl shadow-sm p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              날짜 / 시간
              <span className="ml-2 text-xs text-gray-400 font-normal">({tz})</span>
            </label>
            <div className="flex gap-2">
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
                className="flex-1 border border-gray-200 rounded-xl px-3 py-3 text-sm text-gray-800 focus:outline-none focus:border-[#2e6da4]" />
              <input type="time" value={measureTime} onChange={(e) => setMeasureTime(e.target.value)}
                className="w-28 border border-gray-200 rounded-xl px-3 py-3 text-sm text-gray-800 focus:outline-none focus:border-[#2e6da4]" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">측정 시점</label>
            <div className="flex flex-wrap gap-2">
              {TIME_POINTS.map((tp) => (
                <button key={tp} onClick={() => setTimePoint(tp)}
                  className={`h-10 px-3 rounded-xl text-sm font-medium transition-colors ${timePoint === tp ? 'bg-[#2e6da4] text-white' : 'bg-gray-100 text-gray-600'}`}>
                  {getTimePointLabel(tp)}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">혈당 수치 (mg/dL)</label>
            <div className="flex items-center gap-3">
              <input type="number" inputMode="numeric" value={value} onChange={(e) => setValue(e.target.value)}
                placeholder="예: 120"
                className="flex-1 h-14 border border-gray-200 rounded-xl px-4 text-2xl font-bold text-gray-800 focus:outline-none focus:border-[#2e6da4]" />
              {judgment && (
                <span className={`px-3 py-2 rounded-xl text-sm font-medium ${judgment.bg} ${judgment.text}`}>{judgment.label}</span>
              )}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">메모 (선택)</label>
            <input type="text" value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="예: 식사 후 30분"
              className="w-full h-12 border border-gray-200 rounded-xl px-3 text-gray-800 focus:outline-none focus:border-[#2e6da4]" />
          </div>
          <button onClick={handleSave} disabled={saving || !value}
            className="w-full h-12 bg-[#2e6da4] text-white rounded-xl font-semibold text-base disabled:opacity-50 flex items-center justify-center gap-2">
            {saving ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />저장 중...</> : '저장하기'}
          </button>
        </div>
      )}

      {tab === 'records' && (
        <div className="space-y-4">
          {loadingRecords ? (
            <div className="space-y-3">{[0,1,2].map(i => <div key={i} className="h-20 bg-white rounded-2xl animate-pulse" />)}</div>
          ) : Object.keys(grouped).length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm p-8 text-center text-gray-400">
              <p className="text-3xl mb-2">💉</p><p className="text-sm">기록이 없습니다</p>
            </div>
          ) : (
            Object.entries(grouped).map(([d, entries]) => (
              <div key={d} className="bg-white rounded-2xl shadow-sm p-4">
                <p className="text-sm font-semibold text-gray-600 mb-3">{formatDate(d)}</p>
                <div className="space-y-2">
                  {entries.map((entry) => {
                    const j = judgeGlucose(entry.value, entry.time_point === 'fasting' ? 'fasting' : 'postprandial')
                    const isEdit = editing?.id === entry.id
                    return (
                      <div key={entry.id} className={`rounded-xl p-3 ${j.bg}`}>
                        {isEdit ? (
                          <div className="space-y-2">
                            <p className="text-xs text-gray-500">{getTimePointLabel(entry.time_point)}</p>
                            <div className="flex gap-2">
                              <input type="number" inputMode="numeric" value={editing.value}
                                onChange={(e) => setEditing(prev => prev ? { ...prev, value: e.target.value } : null)}
                                className="w-24 h-10 border border-gray-300 rounded-lg px-2 text-lg font-bold focus:outline-none" />
                              <input type="text" value={editing.memo}
                                onChange={(e) => setEditing(prev => prev ? { ...prev, memo: e.target.value } : null)}
                                placeholder="메모"
                                className="flex-1 h-10 border border-gray-300 rounded-lg px-2 text-sm focus:outline-none" />
                            </div>
                            <div className="flex gap-2">
                              <button onClick={() => handleEdit(entry.id)}
                                className="flex-1 h-9 bg-[#2e6da4] text-white rounded-lg text-sm font-medium">저장</button>
                              <button onClick={() => setEditing(null)}
                                className="flex-1 h-9 bg-gray-100 text-gray-600 rounded-lg text-sm font-medium">취소</button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="text-xs text-gray-500">{getTimePointLabel(entry.time_point)}</p>
                                {entry.created_at && <p className="text-xs text-gray-400">{formatTime(entry.created_at)}</p>}
                              </div>
                              <div className="flex items-baseline gap-2">
                                <p className={`text-xl font-bold ${j.text}`}>{entry.value}</p>
                                <p className="text-xs">{j.label}</p>
                              </div>
                              {entry.memo && <p className="text-xs text-gray-400 mt-0.5">{entry.memo}</p>}
                            </div>
                            <div className="flex gap-1">
                              <button onClick={() => setEditing({ id: entry.id, value: String(entry.value), memo: entry.memo ?? '' })}
                                className="text-xs text-[#2e6da4] bg-white bg-opacity-60 px-2 py-1 rounded-lg">수정</button>
                              <button onClick={() => handleDelete(entry.id)}
                                className="text-xs text-red-400 bg-white bg-opacity-60 px-2 py-1 rounded-lg">삭제</button>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
