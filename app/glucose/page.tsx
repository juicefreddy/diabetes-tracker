'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { BloodGlucose } from '@/lib/types'
import { judgeGlucose, getTimePointLabel, getTodayString, formatDate } from '@/lib/utils'

const TIME_POINTS = ['fasting', 'after_breakfast', 'after_lunch', 'after_dinner', 'bedtime'] as const
type TimePoint = typeof TIME_POINTS[number]

export default function GlucosePage() {
  const [date, setDate] = useState(getTodayString())
  const [timePoint, setTimePoint] = useState<TimePoint>('fasting')
  const [value, setValue] = useState('')
  const [memo, setMemo] = useState('')
  const [saving, setSaving] = useState(false)
  const [records, setRecords] = useState<BloodGlucose[]>([])
  const [loadingRecords, setLoadingRecords] = useState(true)
  const [toast, setToast] = useState('')

  useEffect(() => {
    fetchRecords()
  }, [])

  async function fetchRecords() {
    setLoadingRecords(true)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const { data } = await supabase
      .from('blood_glucose')
      .select('*')
      .gte('date', thirtyDaysAgo.toISOString().split('T')[0])
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
    setRecords((data as BloodGlucose[]) ?? [])
    setLoadingRecords(false)
  }

  async function handleSave() {
    if (!value || isNaN(Number(value))) return
    setSaving(true)
    const { error } = await supabase.from('blood_glucose').insert({
      date,
      time_point: timePoint,
      value: Number(value),
      memo: memo || null,
    })
    setSaving(false)
    if (!error) {
      setValue('')
      setMemo('')
      setToast('저장되었습니다!')
      setTimeout(() => setToast(''), 2000)
      fetchRecords()
    } else {
      setToast('저장 실패: ' + error.message)
      setTimeout(() => setToast(''), 3000)
    }
  }

  // 날짜별 그룹핑
  const grouped: Record<string, BloodGlucose[]> = {}
  records.forEach((r) => {
    if (!grouped[r.date]) grouped[r.date] = []
    grouped[r.date].push(r)
  })

  const numVal = Number(value)
  const judgment = value && !isNaN(numVal)
    ? judgeGlucose(numVal, timePoint === 'fasting' ? 'fasting' : 'postprandial')
    : null

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-gray-800 text-white px-4 py-2 rounded-full text-sm z-50">
          {toast}
        </div>
      )}

      <h1 className="text-xl font-bold text-gray-800">💉 혈당 입력</h1>

      {/* 입력 카드 */}
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

        {/* 측정 시점 */}
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-2">측정 시점</label>
          <div className="flex flex-wrap gap-2">
            {TIME_POINTS.map((tp) => (
              <button
                key={tp}
                onClick={() => setTimePoint(tp)}
                className={`h-10 px-3 rounded-xl text-sm font-medium transition-colors ${
                  timePoint === tp
                    ? 'bg-[#2e6da4] text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {getTimePointLabel(tp)}
              </button>
            ))}
          </div>
        </div>

        {/* 수치 입력 */}
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">혈당 수치 (mg/dL)</label>
          <div className="flex items-center gap-3">
            <input
              type="number"
              inputMode="numeric"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="예: 120"
              className="flex-1 h-14 border border-gray-200 rounded-xl px-4 text-2xl font-bold text-gray-800 focus:outline-none focus:border-[#2e6da4]"
            />
            {judgment && (
              <span className={`px-3 py-2 rounded-xl text-sm font-medium ${judgment.bg} ${judgment.text}`}>
                {judgment.label}
              </span>
            )}
          </div>
        </div>

        {/* 메모 */}
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">메모 (선택)</label>
          <input
            type="text"
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="예: 식사 후 30분"
            className="w-full h-12 border border-gray-200 rounded-xl px-3 text-gray-800 focus:outline-none focus:border-[#2e6da4]"
          />
        </div>

        {/* 저장 버튼 */}
        <button
          onClick={handleSave}
          disabled={saving || !value}
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

      {/* 최근 30일 기록 */}
      <div className="bg-white rounded-2xl shadow-sm p-4">
        <h2 className="text-sm font-semibold text-gray-600 mb-3">최근 30일 기록</h2>
        {loadingRecords ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-10 bg-gray-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : Object.keys(grouped).length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-4">기록이 없습니다</p>
        ) : (
          <div className="space-y-4">
            {Object.entries(grouped).map(([d, entries]) => (
              <div key={d}>
                <p className="text-xs font-semibold text-gray-500 mb-2">{formatDate(d)}</p>
                <div className="grid grid-cols-3 gap-1">
                  {entries.map((entry) => {
                    const j = judgeGlucose(
                      entry.value,
                      entry.time_point === 'fasting' ? 'fasting' : 'postprandial'
                    )
                    return (
                      <div key={entry.id} className={`rounded-lg p-2 ${j.bg}`}>
                        <p className="text-[10px] text-gray-500">{getTimePointLabel(entry.time_point)}</p>
                        <p className={`text-base font-bold ${j.text}`}>{entry.value}</p>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
