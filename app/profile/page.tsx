'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { TIMEZONE_OPTIONS, DEFAULT_TZ, getStoredTZ, setStoredTZ } from '@/lib/timezone'

interface Profile {
  id?: string
  diagnosis_date?: string
  diabetes_type?: string
  height_cm?: number
  weight_kg?: number
  medications?: string[]
  comorbidities?: string[]
  protein_goal_g?: number
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')
  const [medInput, setMedInput] = useState('')
  const [comorInput, setComorInput] = useState('')
  const [timezone, setTimezone] = useState(DEFAULT_TZ)

  useEffect(() => {
    fetchProfile()
    setTimezone(getStoredTZ())
  }, [])

  function handleTimezoneChange(tz: string) {
    setTimezone(tz)
    setStoredTZ(tz)
    setToast('시간대가 변경되었습니다.')
    setTimeout(() => setToast(''), 2000)
  }

  async function fetchProfile() {
    setLoading(true)
    const { data } = await supabase.from('patient_profiles').select('*').limit(1).single()
    if (data) setProfile(data as Profile)
    setLoading(false)
  }

  async function handleSave() {
    setSaving(true)
    let error
    if (profile.id) {
      const { error: e } = await supabase
        .from('patient_profiles')
        .update(profile)
        .eq('id', profile.id)
      error = e
    } else {
      const { data, error: e } = await supabase
        .from('patient_profiles')
        .insert(profile)
        .select()
        .single()
      if (data) setProfile(data as Profile)
      error = e
    }
    setSaving(false)
    if (!error) {
      setToast('저장되었습니다!')
      setTimeout(() => setToast(''), 2000)
    } else {
      setToast('저장 실패: ' + error.message)
      setTimeout(() => setToast(''), 3000)
    }
  }

  function addMedication() {
    if (!medInput.trim()) return
    setProfile((p) => ({ ...p, medications: [...(p.medications ?? []), medInput.trim()] }))
    setMedInput('')
  }

  function removeMedication(idx: number) {
    setProfile((p) => ({ ...p, medications: (p.medications ?? []).filter((_, i) => i !== idx) }))
  }

  function addComorbidity() {
    if (!comorInput.trim()) return
    setProfile((p) => ({ ...p, comorbidities: [...(p.comorbidities ?? []), comorInput.trim()] }))
    setComorInput('')
  }

  function removeComorbidity(idx: number) {
    setProfile((p) => ({ ...p, comorbidities: (p.comorbidities ?? []).filter((_, i) => i !== idx) }))
  }

  if (loading) {
    return (
      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
        {[0, 1, 2].map((i) => <div key={i} className="h-20 bg-white rounded-2xl animate-pulse" />)}
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-gray-800 text-white px-4 py-2 rounded-full text-sm z-50">
          {toast}
        </div>
      )}

      <h1 className="text-xl font-bold text-gray-800">👤 프로필</h1>

      {/* 기본 정보 */}
      <div className="bg-white rounded-2xl shadow-sm p-4 space-y-4">
        <h2 className="text-sm font-semibold text-gray-600">기본 정보</h2>

        <div>
          <label className="block text-xs text-gray-500 mb-1">진단일</label>
          <input
            type="date"
            value={profile.diagnosis_date ?? ''}
            onChange={(e) => setProfile((p) => ({ ...p, diagnosis_date: e.target.value }))}
            className="w-full h-12 border border-gray-200 rounded-xl px-3 text-gray-800 focus:outline-none focus:border-[#2e6da4]"
          />
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1">당뇨 유형</label>
          <div className="flex gap-2">
            {['제1형', '제2형', '임신성'].map((t) => (
              <button
                key={t}
                onClick={() => setProfile((p) => ({ ...p, diabetes_type: t }))}
                className={`flex-1 h-11 rounded-xl text-sm font-medium transition-colors ${
                  profile.diabetes_type === t
                    ? 'bg-[#2e6da4] text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">키 (cm)</label>
            <input
              type="number"
              inputMode="numeric"
              value={profile.height_cm ?? ''}
              onChange={(e) => setProfile((p) => ({ ...p, height_cm: Number(e.target.value) || undefined }))}
              placeholder="180"
              className="w-full h-12 border border-gray-200 rounded-xl px-3 text-gray-800 focus:outline-none focus:border-[#2e6da4]"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">체중 (kg)</label>
            <input
              type="number"
              inputMode="numeric"
              value={profile.weight_kg ?? ''}
              onChange={(e) => setProfile((p) => ({ ...p, weight_kg: Number(e.target.value) || undefined }))}
              placeholder="80"
              className="w-full h-12 border border-gray-200 rounded-xl px-3 text-gray-800 focus:outline-none focus:border-[#2e6da4]"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1">하루 단백질 목표 (g)</label>
          <input
            type="number"
            inputMode="numeric"
            value={profile.protein_goal_g ?? ''}
            onChange={(e) => setProfile((p) => ({ ...p, protein_goal_g: Number(e.target.value) || undefined }))}
            placeholder="96"
            className="w-full h-12 border border-gray-200 rounded-xl px-3 text-gray-800 focus:outline-none focus:border-[#2e6da4]"
          />
        </div>
      </div>

      {/* 약물 목록 */}
      <div className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
        <h2 className="text-sm font-semibold text-gray-600">약물 목록</h2>
        <div className="flex gap-2">
          <input
            type="text"
            value={medInput}
            onChange={(e) => setMedInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addMedication()}
            placeholder="약물명 입력"
            className="flex-1 h-12 border border-gray-200 rounded-xl px-3 text-gray-800 focus:outline-none focus:border-[#2e6da4]"
          />
          <button onClick={addMedication} className="h-12 px-4 bg-[#2e6da4] text-white rounded-xl text-sm font-medium">
            추가
          </button>
        </div>
        {(profile.medications ?? []).length > 0 && (
          <div className="flex flex-wrap gap-2">
            {(profile.medications ?? []).map((med, idx) => (
              <span key={idx} className="flex items-center gap-1 bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm">
                {med}
                <button onClick={() => removeMedication(idx)} className="ml-1 text-blue-400 hover:text-blue-600">✕</button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* 동반질환 */}
      <div className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
        <h2 className="text-sm font-semibold text-gray-600">동반질환</h2>
        <div className="flex gap-2">
          <input
            type="text"
            value={comorInput}
            onChange={(e) => setComorInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addComorbidity()}
            placeholder="예: 고지혈증"
            className="flex-1 h-12 border border-gray-200 rounded-xl px-3 text-gray-800 focus:outline-none focus:border-[#2e6da4]"
          />
          <button onClick={addComorbidity} className="h-12 px-4 bg-[#2e6da4] text-white rounded-xl text-sm font-medium">
            추가
          </button>
        </div>
        {(profile.comorbidities ?? []).length > 0 && (
          <div className="flex flex-wrap gap-2">
            {(profile.comorbidities ?? []).map((c, idx) => (
              <span key={idx} className="flex items-center gap-1 bg-orange-50 text-orange-700 px-3 py-1 rounded-full text-sm">
                {c}
                <button onClick={() => removeComorbidity(idx)} className="ml-1 text-orange-400 hover:text-orange-600">✕</button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* 시간대 설정 */}
      <div className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
        <h2 className="text-sm font-semibold text-gray-600">시간대 설정</h2>
        <select
          value={timezone}
          onChange={(e) => handleTimezoneChange(e.target.value)}
          className="w-full h-12 border border-gray-200 rounded-xl px-3 text-gray-800 focus:outline-none focus:border-[#2e6da4] bg-white"
        >
          {TIMEZONE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <p className="text-xs text-gray-400">혈당·식단·운동 기록의 시간 표시에 적용됩니다.</p>
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
        ) : '프로필 저장'}
      </button>
    </div>
  )
}
