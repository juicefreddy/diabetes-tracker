'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { getTodayString } from '@/lib/utils'

const MEAL_TYPES = [
  { value: 'breakfast', label: '아침' },
  { value: 'lunch', label: '점심' },
  { value: 'dinner', label: '저녁' },
  { value: 'snack', label: '간식' },
] as const

const RICE_OPTIONS = [
  { value: 'none', label: '안먹음' },
  { value: 'quarter', label: '1/4공기' },
  { value: 'half', label: '반공기' },
  { value: 'three_quarter', label: '3/4공기' },
  { value: 'full', label: '1공기' },
] as const

type MealType = typeof MEAL_TYPES[number]['value']
type RiceAmount = typeof RICE_OPTIONS[number]['value']

interface MealRecord {
  id: string
  date: string
  meal_type: string
  foods: string[]
  rice_amount: string | null
  tomato_check: boolean
  meal_order_check: boolean
  ai_analysis: string | null
}

export default function MealsPage() {
  const [tab, setTab] = useState<'input' | 'records'>('input')
  const [date, setDate] = useState(getTodayString())
  const [mealType, setMealType] = useState<MealType>('breakfast')
  const [tomatoCheck, setTomatoCheck] = useState(false)
  const [mealOrderCheck, setMealOrderCheck] = useState(false)
  const [riceAmount, setRiceAmount] = useState<RiceAmount>('none')
  const [foodInput, setFoodInput] = useState('')
  const [foods, setFoods] = useState<string[]>([])
  const [aiAnalysis, setAiAnalysis] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')

  // 기록 목록
  const [records, setRecords] = useState<MealRecord[]>([])
  const [recordsLoading, setRecordsLoading] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editFoods, setEditFoods] = useState<string[]>([])
  const [editFoodInput, setEditFoodInput] = useState('')

  const [analysisMap, setAnalysisMap] = useState<Record<string, string>>({})

  const fetchRecords = useCallback(async () => {
    setRecordsLoading(true)
    const [mealsRes, analysisRes] = await Promise.all([
      supabase.from('meals').select('*').order('date', { ascending: false }).order('created_at', { ascending: false }),
      supabase.from('daily_analysis').select('date, analysis'),
    ])
    setRecords((mealsRes.data as MealRecord[]) ?? [])
    const map: Record<string, string> = {}
    for (const row of (analysisRes.data ?? []) as { date: string; analysis: string }[]) {
      map[row.date] = row.analysis
    }
    setAnalysisMap(map)
    setRecordsLoading(false)
  }, [])

  useEffect(() => {
    if (tab === 'records') fetchRecords()
  }, [tab, fetchRecords])

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 2500)
  }

  function addFood() {
    if (!foodInput.trim()) return
    setFoods((prev) => [...prev, foodInput.trim()])
    setFoodInput('')
  }

  function removeFood(idx: number) {
    setFoods((prev) => prev.filter((_, i) => i !== idx))
  }

  async function handleAnalyze() {
    if (foods.length === 0) return
    setAnalyzing(true)
    setAiAnalysis('')
    try {
      const res = await fetch('/api/analyze-meal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          foods,
          mealType: MEAL_TYPES.find((m) => m.value === mealType)?.label,
          date,
        }),
      })
      const data = await res.json()
      setAiAnalysis(data.analysis ?? '분석 실패')
    } catch {
      setAiAnalysis('AI 분석 중 오류가 발생했습니다.')
    } finally {
      setAnalyzing(false)
    }
  }

  async function handleSave() {
    if (foods.length === 0) return
    setSaving(true)
    const { error } = await supabase.from('meals').insert({
      date,
      meal_type: mealType,
      foods,
      rice_amount: riceAmount,
      tomato_check: tomatoCheck,
      meal_order_check: mealOrderCheck,
      ai_analysis: aiAnalysis || null,
    })
    setSaving(false)
    if (!error) {
      setFoods([])
      setAiAnalysis('')
      setTomatoCheck(false)
      setMealOrderCheck(false)
      showToast('저장되었습니다!')
    } else {
      showToast('저장 실패: ' + error.message)
    }
  }

  // 수정 시작
  function startEdit(record: MealRecord) {
    setEditingId(record.id)
    setEditFoods([...record.foods])
  }

  async function saveEdit(record: MealRecord) {
    const { error } = await supabase
      .from('meals')
      .update({ foods: editFoods })
      .eq('id', record.id)
    if (!error) {
      setRecords((prev) => prev.map((r) => r.id === record.id ? { ...r, foods: editFoods } : r))
      setEditingId(null)
      showToast('수정되었습니다!')
    } else {
      showToast('수정 실패: ' + error.message)
    }
  }

  async function deleteRecord(id: string) {
    if (!confirm('삭제하시겠습니까?')) return
    const { error } = await supabase.from('meals').delete().eq('id', id)
    if (!error) {
      setRecords((prev) => prev.filter((r) => r.id !== id))
      showToast('삭제되었습니다.')
    }
  }

  const mealLabel = (type: string) => MEAL_TYPES.find((m) => m.value === type)?.label ?? type

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-gray-800 text-white px-4 py-2 rounded-full text-sm z-50 shadow-lg">
          {toast}
        </div>
      )}

      <h1 className="text-xl font-bold text-gray-800">🍽️ 식단</h1>

      {/* 탭 */}
      <div className="flex bg-gray-100 rounded-xl p-1">
        <button
          onClick={() => setTab('input')}
          className={`flex-1 h-9 rounded-lg text-sm font-medium transition-colors ${tab === 'input' ? 'bg-white text-[#2e6da4] shadow-sm' : 'text-gray-500'}`}
        >
          입력
        </button>
        <button
          onClick={() => setTab('records')}
          className={`flex-1 h-9 rounded-lg text-sm font-medium transition-colors ${tab === 'records' ? 'bg-white text-[#2e6da4] shadow-sm' : 'text-gray-500'}`}
        >
          기록 보기
        </button>
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
            <label className="block text-sm font-medium text-gray-600 mb-2">끼니</label>
            <div className="flex gap-2">
              {MEAL_TYPES.map((m) => (
                <button key={m.value} onClick={() => setMealType(m.value)}
                  className={`flex-1 h-11 rounded-xl text-sm font-medium transition-colors ${mealType === m.value ? 'bg-[#2e6da4] text-white' : 'bg-gray-100 text-gray-600'}`}>
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-600">체크리스트</label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={tomatoCheck} onChange={(e) => setTomatoCheck(e.target.checked)} className="w-5 h-5 accent-[#2e6da4]" />
              <span className="text-sm text-gray-700">🍅 방울토마토 먹었음</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={mealOrderCheck} onChange={(e) => setMealOrderCheck(e.target.checked)} className="w-5 h-5 accent-[#2e6da4]" />
              <span className="text-sm text-gray-700">✅ 식사순서 지켰음 (채소→단백질→탄수화물)</span>
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">밥 섭취량</label>
            <div className="flex flex-wrap gap-2">
              {RICE_OPTIONS.map((r) => (
                <button key={r.value} onClick={() => setRiceAmount(r.value)}
                  className={`h-10 px-3 rounded-xl text-sm font-medium transition-colors ${riceAmount === r.value ? 'bg-[#2e6da4] text-white' : 'bg-gray-100 text-gray-600'}`}>
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">음식 목록</label>
            <div className="flex gap-2">
              <input type="text" value={foodInput} onChange={(e) => setFoodInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addFood()}
                placeholder="음식 이름 입력 후 추가"
                className="flex-1 h-12 border border-gray-200 rounded-xl px-3 text-gray-800 focus:outline-none focus:border-[#2e6da4]" />
              <button onClick={addFood} className="h-12 px-4 bg-[#2e6da4] text-white rounded-xl text-sm font-medium">추가</button>
            </div>
            {foods.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {foods.map((food, idx) => (
                  <span key={idx} className="flex items-center gap-1 bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm">
                    {food}
                    <button onClick={() => removeFood(idx)} className="ml-1 text-blue-400 hover:text-blue-600">✕</button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <button onClick={handleAnalyze} disabled={analyzing || foods.length === 0}
            className="w-full h-12 bg-purple-600 text-white rounded-xl font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2">
            {analyzing ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />AI 분석 중...</> : '🤖 AI 식단 분석 요청'}
          </button>

          {(analyzing || aiAnalysis) && (
            <div className="bg-purple-50 rounded-xl p-4">
              <p className="text-xs font-semibold text-purple-600 mb-2">AI 분석 결과</p>
              {analyzing
                ? <div className="space-y-2">{[0,1,2].map((i) => <div key={i} className="h-4 bg-purple-100 rounded animate-pulse" />)}</div>
                : <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{aiAnalysis}</p>}
            </div>
          )}

          <button onClick={handleSave} disabled={saving || foods.length === 0}
            className="w-full h-12 bg-[#2e6da4] text-white rounded-xl font-semibold text-base disabled:opacity-50 flex items-center justify-center gap-2">
            {saving ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />저장 중...</> : '저장하기'}
          </button>
        </div>
      )}

      {/* ── 기록 탭 ── */}
      {tab === 'records' && (
        <div className="space-y-3">
          {recordsLoading ? (
            <div className="space-y-3">{[0,1,2].map((i) => <div key={i} className="h-24 bg-white rounded-2xl animate-pulse" />)}</div>
          ) : records.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm p-8 text-center text-gray-400">
              <p className="text-3xl mb-2">🍽️</p>
              <p className="text-sm">기록된 식단이 없습니다</p>
            </div>
          ) : (
            records.map((record) => (
              <div key={record.id} className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs bg-[#2e6da4] text-white px-2 py-0.5 rounded-full font-medium">
                      {mealLabel(record.meal_type)}
                    </span>
                    <span className="text-sm font-semibold text-gray-700">{record.date}</span>
                  </div>
                  <div className="flex gap-2">
                    {editingId !== record.id && (
                      <button onClick={() => startEdit(record)}
                        className="text-xs text-[#2e6da4] bg-blue-50 px-3 py-1 rounded-lg font-medium">수정</button>
                    )}
                    <button onClick={() => deleteRecord(record.id)}
                      className="text-xs text-red-400 bg-red-50 px-3 py-1 rounded-lg font-medium">삭제</button>
                  </div>
                </div>

                {/* 체크 뱃지 */}
                <div className="flex gap-2 flex-wrap">
                  {record.tomato_check && <span className="text-xs bg-red-50 text-red-500 px-2 py-0.5 rounded-full">🍅 방울토마토</span>}
                  {record.meal_order_check && <span className="text-xs bg-green-50 text-green-600 px-2 py-0.5 rounded-full">✅ 식사순서</span>}
                  {record.rice_amount && record.rice_amount !== 'none' && (
                    <span className="text-xs bg-yellow-50 text-yellow-600 px-2 py-0.5 rounded-full">
                      🍚 {RICE_OPTIONS.find(r => r.value === record.rice_amount)?.label ?? record.rice_amount}
                    </span>
                  )}
                </div>

                {/* 음식 목록 (수정 모드) */}
                {editingId === record.id ? (
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-2">
                      {editFoods.map((food, idx) => (
                        <span key={idx} className="flex items-center gap-1 bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm">
                          {food}
                          <button onClick={() => setEditFoods((prev) => prev.filter((_, i) => i !== idx))}
                            className="ml-1 text-blue-400">✕</button>
                        </span>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <input type="text" value={editFoodInput} onChange={(e) => setEditFoodInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter' && editFoodInput.trim()) { setEditFoods(p => [...p, editFoodInput.trim()]); setEditFoodInput('') }}}
                        placeholder="음식 추가"
                        className="flex-1 h-10 border border-gray-200 rounded-xl px-3 text-sm focus:outline-none focus:border-[#2e6da4]" />
                      <button onClick={() => { if (editFoodInput.trim()) { setEditFoods(p => [...p, editFoodInput.trim()]); setEditFoodInput('') }}}
                        className="h-10 px-3 bg-[#2e6da4] text-white rounded-xl text-sm">추가</button>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => saveEdit(record)}
                        className="flex-1 h-10 bg-[#2e6da4] text-white rounded-xl text-sm font-medium">저장</button>
                      <button onClick={() => setEditingId(null)}
                        className="flex-1 h-10 bg-gray-100 text-gray-600 rounded-xl text-sm font-medium">취소</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {record.foods.map((food, idx) => (
                      <span key={idx} className="text-sm bg-gray-50 text-gray-700 px-3 py-1 rounded-full">{food}</span>
                    ))}
                  </div>
                )}

                {/* 식단별 AI 분석 */}
                {record.ai_analysis && (
                  <details>
                    <summary className="text-xs cursor-pointer text-purple-600 font-medium">🤖 식단 AI 분석 보기</summary>
                    <p className="mt-2 text-xs text-gray-600 whitespace-pre-wrap leading-relaxed">{record.ai_analysis}</p>
                  </details>
                )}
              </div>
            ))
          )}

          {/* 날짜별 하루 AI 분석 요약 */}
          {!recordsLoading && Object.keys(analysisMap).length > 0 && (
            <div className="space-y-3">
              <p className="text-sm font-semibold text-gray-600">🤖 AI 하루 분석 기록</p>
              {Object.entries(analysisMap).sort(([a], [b]) => b.localeCompare(a)).map(([d, analysis]) => (
                <details key={d} className="bg-white rounded-2xl shadow-sm p-4">
                  <summary className="text-sm font-medium text-purple-700 cursor-pointer">{d}</summary>
                  <p className="mt-3 text-xs text-gray-600 whitespace-pre-wrap leading-relaxed">{analysis}</p>
                </details>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
