'use client'

import { useState } from 'react'
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

export default function MealsPage() {
  const [date, setDate] = useState(getTodayString())
  const [mealType, setMealType] = useState<MealType>('breakfast')
  const [tomatoCheck, setTomatoCheck] = useState(false)
  const [mealOrderCheck, setMealOrderCheck] = useState(false)
  const [riceAmount, setRiceAmount] = useState<RiceAmount>('half')
  const [foodInput, setFoodInput] = useState('')
  const [foods, setFoods] = useState<string[]>([])
  const [aiAnalysis, setAiAnalysis] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')

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
      setToast('저장되었습니다!')
      setTimeout(() => setToast(''), 2000)
    } else {
      setToast('저장 실패: ' + error.message)
      setTimeout(() => setToast(''), 3000)
    }
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-gray-800 text-white px-4 py-2 rounded-full text-sm z-50">
          {toast}
        </div>
      )}

      <h1 className="text-xl font-bold text-gray-800">🍽️ 식단 입력</h1>

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

        {/* 끼니 */}
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-2">끼니</label>
          <div className="flex gap-2">
            {MEAL_TYPES.map((m) => (
              <button
                key={m.value}
                onClick={() => setMealType(m.value)}
                className={`flex-1 h-11 rounded-xl text-sm font-medium transition-colors ${
                  mealType === m.value
                    ? 'bg-[#2e6da4] text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* 체크리스트 */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-600">체크리스트</label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={tomatoCheck}
              onChange={(e) => setTomatoCheck(e.target.checked)}
              className="w-5 h-5 accent-[#2e6da4]"
            />
            <span className="text-sm text-gray-700">방울토마토 먹었음</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={mealOrderCheck}
              onChange={(e) => setMealOrderCheck(e.target.checked)}
              className="w-5 h-5 accent-[#2e6da4]"
            />
            <span className="text-sm text-gray-700">식사순서 지켰음 (채소 → 단백질 → 탄수화물)</span>
          </label>
        </div>

        {/* 밥 섭취량 */}
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-2">밥 섭취량</label>
          <div className="flex flex-wrap gap-2">
            {RICE_OPTIONS.map((r) => (
              <button
                key={r.value}
                onClick={() => setRiceAmount(r.value)}
                className={`h-10 px-3 rounded-xl text-sm font-medium transition-colors ${
                  riceAmount === r.value
                    ? 'bg-[#2e6da4] text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {/* 음식 입력 */}
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-2">음식 목록</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={foodInput}
              onChange={(e) => setFoodInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addFood()}
              placeholder="음식 이름 입력"
              className="flex-1 h-12 border border-gray-200 rounded-xl px-3 text-gray-800 focus:outline-none focus:border-[#2e6da4]"
            />
            <button
              onClick={addFood}
              className="h-12 px-4 bg-[#2e6da4] text-white rounded-xl text-sm font-medium"
            >
              추가
            </button>
          </div>

          {foods.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {foods.map((food, idx) => (
                <span
                  key={idx}
                  className="flex items-center gap-1 bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm"
                >
                  {food}
                  <button onClick={() => removeFood(idx)} className="ml-1 text-blue-400 hover:text-blue-600">✕</button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* AI 분석 버튼 */}
        <button
          onClick={handleAnalyze}
          disabled={analyzing || foods.length === 0}
          className="w-full h-12 bg-purple-600 text-white rounded-xl font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {analyzing ? (
            <>
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              AI 분석 중...
            </>
          ) : '🤖 AI 식단 분석 요청'}
        </button>

        {/* AI 분석 결과 */}
        {(analyzing || aiAnalysis) && (
          <div className="bg-purple-50 rounded-xl p-4">
            <p className="text-xs font-semibold text-purple-600 mb-2">AI 분석 결과</p>
            {analyzing ? (
              <div className="space-y-2">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-4 bg-purple-100 rounded animate-pulse" />
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{aiAnalysis}</p>
            )}
          </div>
        )}

        {/* 저장 버튼 */}
        <button
          onClick={handleSave}
          disabled={saving || foods.length === 0}
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
    </div>
  )
}
