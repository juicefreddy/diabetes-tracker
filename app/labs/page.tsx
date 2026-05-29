'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { LabResult } from '@/lib/types'
import { getTodayString, formatDate } from '@/lib/utils'

const GOALS = {
  hba1c: { label: 'HbA1c', unit: '%', target: '< 7.0', targetVal: 7.0, lowerBetter: true },
  fasting_glucose: { label: '공복혈당', unit: 'mg/dL', target: '70~99', targetVal: 99, lowerBetter: true },
  ldl: { label: 'LDL 콜레스테롤', unit: 'mg/dL', target: '< 70', targetVal: 70, lowerBetter: true },
  hdl: { label: 'HDL 콜레스테롤', unit: 'mg/dL', target: '> 40', targetVal: 40, lowerBetter: false },
  triglycerides: { label: '중성지방', unit: 'mg/dL', target: '< 150', targetVal: 150, lowerBetter: true },
  creatinine: { label: '크레아티닌', unit: 'mg/dL', target: '< 1.2', targetVal: 1.2, lowerBetter: true },
}

export default function LabsPage() {
  const [date, setDate] = useState(getTodayString())
  const [form, setForm] = useState({
    hba1c: '',
    fasting_glucose: '',
    ldl: '',
    hdl: '',
    triglycerides: '',
    creatinine: '',
  })
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [records, setRecords] = useState<LabResult[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState('')

  useEffect(() => {
    fetchRecords()
  }, [])

  async function fetchRecords() {
    setLoading(true)
    const { data } = await supabase
      .from('lab_results')
      .select('*')
      .order('date', { ascending: false })
    setRecords((data as LabResult[]) ?? [])
    setLoading(false)
  }

  async function handleSave() {
    setSaving(true)
    const payload: Record<string, unknown> = { date, notes: notes || null }
    Object.entries(form).forEach(([k, v]) => {
      payload[k] = v ? Number(v) : null
    })
    const { error } = await supabase.from('lab_results').insert(payload)
    setSaving(false)
    if (!error) {
      setForm({ hba1c: '', fasting_glucose: '', ldl: '', hdl: '', triglycerides: '', creatinine: '' })
      setNotes('')
      setToast('저장되었습니다!')
      setTimeout(() => setToast(''), 2000)
      fetchRecords()
    } else {
      setToast('저장 실패: ' + error.message)
      setTimeout(() => setToast(''), 3000)
    }
  }

  const latest = records[0]

  function goalStatus(key: keyof typeof GOALS, val: number) {
    const g = GOALS[key]
    const ok = g.lowerBetter ? val <= g.targetVal : val >= g.targetVal
    return ok
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-gray-800 text-white px-4 py-2 rounded-full text-sm z-50">
          {toast}
        </div>
      )}

      <h1 className="text-xl font-bold text-gray-800">🧪 검사결과</h1>

      {/* 입력 카드 */}
      <div className="bg-white rounded-2xl shadow-sm p-4 space-y-4">
        <h2 className="text-sm font-semibold text-gray-600">결과 입력</h2>

        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">검사 날짜</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full h-12 border border-gray-200 rounded-xl px-3 text-gray-800 focus:outline-none focus:border-[#2e6da4]"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          {(Object.entries(GOALS) as [keyof typeof GOALS, typeof GOALS[keyof typeof GOALS]][]).map(([key, g]) => (
            <div key={key}>
              <label className="block text-xs text-gray-500 mb-1">
                {g.label} ({g.unit}) <span className="text-gray-400">목표: {g.target}</span>
              </label>
              <input
                type="number"
                inputMode="numeric"
                value={form[key]}
                onChange={(e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))}
                placeholder="-"
                className="w-full h-12 border border-gray-200 rounded-xl px-3 text-gray-800 focus:outline-none focus:border-[#2e6da4]"
              />
            </div>
          ))}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">메모</label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="의사 소견 등"
            className="w-full h-12 border border-gray-200 rounded-xl px-3 text-gray-800 focus:outline-none focus:border-[#2e6da4]"
          />
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
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

      {/* 최근 결과 목표 대비 현황 */}
      {latest && (
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <h2 className="text-sm font-semibold text-gray-600 mb-3">
            최근 결과 ({formatDate(latest.date)})
          </h2>
          <div className="grid grid-cols-2 gap-2">
            {(Object.entries(GOALS) as [keyof typeof GOALS, typeof GOALS[keyof typeof GOALS]][]).map(([key, g]) => {
              const val = latest[key as keyof LabResult] as number | undefined
              if (!val) return null
              const ok = goalStatus(key, val)
              return (
                <div key={key} className={`rounded-xl p-3 ${ok ? 'bg-green-50' : 'bg-red-50'}`}>
                  <p className="text-xs text-gray-500">{g.label}</p>
                  <p className={`text-xl font-bold ${ok ? 'text-green-700' : 'text-red-600'}`}>
                    {val} <span className="text-xs font-normal">{g.unit}</span>
                  </p>
                  <p className="text-xs">{ok ? '✅ 목표 달성' : '⚠️ 목표 미달'}</p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* 히스토리 */}
      <div className="bg-white rounded-2xl shadow-sm p-4">
        <h2 className="text-sm font-semibold text-gray-600 mb-3">기록 히스토리</h2>
        {loading ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => <div key={i} className="h-12 bg-gray-100 rounded-xl animate-pulse" />)}
          </div>
        ) : records.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-4">기록이 없습니다</p>
        ) : (
          <div className="space-y-3">
            {records.map((r) => (
              <div key={r.id} className="border border-gray-100 rounded-xl p-3">
                <p className="text-sm font-semibold text-gray-700 mb-2">{formatDate(r.date)}</p>
                <div className="flex flex-wrap gap-2 text-xs text-gray-600">
                  {r.hba1c && <span className="bg-blue-50 px-2 py-1 rounded-lg">HbA1c: {r.hba1c}%</span>}
                  {r.fasting_glucose && <span className="bg-gray-50 px-2 py-1 rounded-lg">공복: {r.fasting_glucose}</span>}
                  {r.ldl && <span className="bg-gray-50 px-2 py-1 rounded-lg">LDL: {r.ldl}</span>}
                  {r.hdl && <span className="bg-gray-50 px-2 py-1 rounded-lg">HDL: {r.hdl}</span>}
                  {r.triglycerides && <span className="bg-gray-50 px-2 py-1 rounded-lg">중성지방: {r.triglycerides}</span>}
                  {r.creatinine && <span className="bg-gray-50 px-2 py-1 rounded-lg">크레아티닌: {r.creatinine}</span>}
                </div>
                {r.notes && <p className="text-xs text-gray-400 mt-2">{r.notes}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
