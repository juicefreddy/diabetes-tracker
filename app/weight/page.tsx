'use client'

import { useState, useEffect, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { supabase } from '@/lib/supabase'
import { getTodayString } from '@/lib/utils'

const WeightLineChart = dynamic(() => import('../components/charts/WeightLineChart'), { ssr: false })

interface WeightRecord {
  id: string
  date: string
  weight_kg: number
}

const COLOR = '#0d9488'

function bmiInfo(bmi: number) {
  if (bmi < 18.5) return { label: '저체중', cls: 'text-blue-500' }
  if (bmi < 23) return { label: '정상', cls: 'text-green-600' }
  if (bmi < 25) return { label: '과체중', cls: 'text-yellow-600' }
  return { label: '비만', cls: 'text-red-500' }
}

export default function WeightPage() {
  const [tab, setTab] = useState<'input' | 'records'>('input')
  const [date, setDate] = useState(getTodayString())
  const [weightInput, setWeightInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')
  const [records, setRecords] = useState<WeightRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [heightCm, setHeightCm] = useState<number | undefined>()

  const fetchRecords = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('weight_logs').select('*').order('date', { ascending: false })
    setRecords((data as WeightRecord[]) ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchRecords()
    supabase.from('patient_profiles').select('height_cm').single().then(({ data }) => {
      if (data?.height_cm) setHeightCm(data.height_cm)
    })
  }, [fetchRecords])

  // 선택 날짜에 기존 기록이 있으면 미리 채우기
  useEffect(() => {
    const existing = records.find(r => r.date === date)
    setWeightInput(existing ? String(existing.weight_kg) : '')
  }, [records, date])

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 2500)
  }

  async function handleSave() {
    const kg = parseFloat(weightInput)
    if (!weightInput || isNaN(kg) || kg < 20 || kg > 300) return
    setSaving(true)
    const { error } = await supabase.from('weight_logs').upsert(
      { date, weight_kg: Math.round(kg * 10) / 10 },
      { onConflict: 'date' }
    )
    setSaving(false)
    if (!error) {
      showToast('저장되었습니다!')
      fetchRecords()
    } else {
      showToast('저장 실패: ' + error.message)
    }
  }

  async function deleteRecord(id: string) {
    if (!confirm('삭제하시겠습니까?')) return
    const { error } = await supabase.from('weight_logs').delete().eq('id', id)
    if (!error) {
      setRecords(prev => prev.filter(r => r.id !== id))
      showToast('삭제되었습니다.')
    }
  }

  const prevRecord = records.find(r => r.date < date)
  const kg = parseFloat(weightInput)
  const diff = prevRecord && !isNaN(kg) ? Math.round((kg - prevRecord.weight_kg) * 10) / 10 : null
  const bmi = heightCm && !isNaN(kg) ? Math.round((kg / (heightCm / 100) ** 2) * 10) / 10 : null
  const chartData = [...records].reverse().map(r => ({ date: r.date, value: r.weight_kg }))

  // 전체 변화량 (최초 → 최신)
  const firstRecord = records.length > 0 ? records[records.length - 1] : null
  const latestRecord = records.length > 0 ? records[0] : null
  const totalChange = firstRecord && latestRecord && firstRecord.id !== latestRecord.id
    ? Math.round((latestRecord.weight_kg - firstRecord.weight_kg) * 10) / 10
    : null

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-gray-800 text-white px-4 py-2 rounded-full text-sm z-50 shadow-lg">
          {toast}
        </div>
      )}

      <h1 className="text-xl font-bold text-gray-800">⚖️ 몸무게</h1>

      {/* 요약 카드 */}
      {latestRecord && (
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <p className="text-xs text-gray-500 mb-1">최근 측정</p>
            <p className="text-2xl font-bold" style={{ color: COLOR }}>{latestRecord.weight_kg}</p>
            <p className="text-xs text-gray-400">kg · {latestRecord.date}</p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <p className="text-xs text-gray-500 mb-1">
              {totalChange !== null ? '총 변화량' : '측정 횟수'}
            </p>
            {totalChange !== null ? (
              <>
                <p className={`text-2xl font-bold ${totalChange < 0 ? 'text-green-600' : totalChange > 0 ? 'text-red-500' : 'text-gray-400'}`}>
                  {totalChange < 0 ? '▼' : totalChange > 0 ? '▲' : '─'} {Math.abs(totalChange)}
                </p>
                <p className="text-xs text-gray-400">kg ({records.length}회 측정)</p>
              </>
            ) : (
              <>
                <p className="text-2xl font-bold text-gray-700">{records.length}</p>
                <p className="text-xs text-gray-400">회</p>
              </>
            )}
          </div>
        </div>
      )}

      {/* 추이 차트 */}
      {chartData.length >= 2 && (
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <h2 className="text-sm font-semibold text-gray-600 mb-3">체중 변화 추이</h2>
          <WeightLineChart data={chartData} height_cm={heightCm} />
          {!heightCm && (
            <p className="text-xs text-gray-400 mt-2 text-center">
              프로필에 키를 입력하면 BMI 기준선이 표시됩니다
            </p>
          )}
        </div>
      )}

      {/* 탭 */}
      <div className="flex bg-gray-100 rounded-xl p-1">
        {(['input', 'records'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 h-9 rounded-lg text-sm font-medium transition-colors ${tab === t ? 'bg-white shadow-sm' : 'text-gray-500'}`}
            style={tab === t ? { color: COLOR } : {}}>
            {t === 'input' ? '입력' : '기록 보기'}
          </button>
        ))}
      </div>

      {/* 입력 탭 */}
      {tab === 'input' && (
        <div className="bg-white rounded-2xl shadow-sm p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">날짜</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm text-gray-800 focus:outline-none focus:border-teal-500" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              몸무게
              <span className="ml-2 text-xs font-normal text-gray-400">공복 기준</span>
            </label>
            <div className="relative">
              <input type="number" value={weightInput} onChange={(e) => setWeightInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                step="0.1" placeholder="72.5"
                className="w-full border border-gray-200 rounded-xl px-4 py-4 text-3xl font-bold text-gray-800 focus:outline-none focus:border-teal-500 pr-16" />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">kg</span>
            </div>

            {/* 이전 대비 변화 */}
            {diff !== null && (
              <div className={`mt-2 flex items-center gap-1 text-sm font-semibold ${diff < 0 ? 'text-green-600' : diff > 0 ? 'text-red-500' : 'text-gray-400'}`}>
                <span>{diff < 0 ? '▼' : diff > 0 ? '▲' : '─'}</span>
                <span>{Math.abs(diff)} kg</span>
                <span className="text-xs font-normal text-gray-400">이전 기록({prevRecord!.date}) 대비</span>
              </div>
            )}

            {/* BMI */}
            {bmi && (() => {
              const info = bmiInfo(bmi)
              return (
                <div className="mt-2 flex items-center gap-1 text-sm">
                  <span className="text-gray-500">BMI</span>
                  <span className={`font-bold ${info.cls}`}>{bmi}</span>
                  <span className={`text-xs ${info.cls}`}>({info.label})</span>
                </div>
              )
            })()}
          </div>

          <button onClick={handleSave} disabled={saving || !weightInput}
            className="w-full h-12 text-white rounded-xl font-semibold text-base disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ backgroundColor: COLOR }}>
            {saving
              ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />저장 중...</>
              : '저장하기'}
          </button>
        </div>
      )}

      {/* 기록 탭 */}
      {tab === 'records' && (
        <div className="space-y-3">
          {loading ? (
            [0, 1, 2].map(i => <div key={i} className="h-20 bg-white rounded-2xl animate-pulse" />)
          ) : records.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm p-8 text-center text-gray-400">
              <p className="text-3xl mb-2">⚖️</p>
              <p className="text-sm">기록된 몸무게가 없습니다</p>
            </div>
          ) : records.map((rec, idx) => {
            const prevRec = records[idx + 1]
            const d = prevRec ? Math.round((rec.weight_kg - prevRec.weight_kg) * 10) / 10 : null
            const b = heightCm ? Math.round((rec.weight_kg / (heightCm / 100) ** 2) * 10) / 10 : null
            return (
              <div key={rec.id} className="bg-white rounded-2xl shadow-sm p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-400 mb-1">{rec.date}</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold" style={{ color: COLOR }}>{rec.weight_kg}</span>
                    <span className="text-sm text-gray-400">kg</span>
                  </div>
                  {b && <p className="text-xs text-gray-400 mt-0.5">BMI {b} · {bmiInfo(b).label}</p>}
                </div>
                <div className="flex items-center gap-3">
                  {d !== null && (
                    <span className={`text-sm font-semibold ${d < 0 ? 'text-green-600' : d > 0 ? 'text-red-500' : 'text-gray-400'}`}>
                      {d < 0 ? '▼' : d > 0 ? '▲' : '─'} {Math.abs(d)}
                    </span>
                  )}
                  <button onClick={() => deleteRecord(rec.id)}
                    className="text-xs text-red-400 bg-red-50 px-3 py-1 rounded-lg font-medium">삭제</button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
