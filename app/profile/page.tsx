'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { TIMEZONE_OPTIONS, DEFAULT_TZ, getStoredTZ, setStoredTZ } from '@/lib/timezone'
import { CHANGELOG, CURRENT_VERSION, type ChangelogEntry } from '@/lib/changelog'

interface Profile {
  id?: string
  diagnosis_date?: string
  diabetes_type?: string
  height_cm?: number
  weight_kg?: number
  medications?: string[]
  comorbidities?: string[]
  protein_goal_g?: number
  sync_token?: string
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile>({})
  const [changelogOpen, setChangelogOpen] = useState(false)
  const [shortcutGuideOpen, setShortcutGuideOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')
  const [medInput, setMedInput] = useState('')
  const [comorInput, setComorInput] = useState('')
  const [timezone, setTimezone] = useState(DEFAULT_TZ)
  const [appUrl, setAppUrl] = useState('')

  useEffect(() => {
    setAppUrl(window.location.origin)
  }, [])

  useEffect(() => {
    fetchProfile()
    setTimezone(getStoredTZ())
  }, [])

  function generateToken() {
    const token = crypto.randomUUID()
    setProfile(p => ({ ...p, sync_token: token }))
    setToast('토큰이 생성되었습니다. 저장 버튼을 눌러주세요.')
    setTimeout(() => setToast(''), 2500)
  }

  async function copyToClipboard(text: string, label: string) {
    await navigator.clipboard.writeText(text)
    setToast(`${label} 복사됨!`)
    setTimeout(() => setToast(''), 1500)
  }

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

      {/* iPhone 단축어 연동 */}
      <div className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
        <h2 className="text-sm font-semibold text-gray-600">📱 iPhone 단축어 연동</h2>
        <p className="text-xs text-gray-500">Apple Health 운동 기록을 단축어 앱으로 자동 저장할 수 있습니다.</p>

        {/* 토큰 */}
        <div>
          <label className="block text-xs text-gray-500 mb-1">연동 토큰</label>
          {profile.sync_token ? (
            <div className="flex gap-2">
              <div className="flex-1 h-12 border border-gray-200 rounded-xl px-3 flex items-center bg-gray-50">
                <span className="text-xs text-gray-500 font-mono truncate">{profile.sync_token}</span>
              </div>
              <button onClick={() => copyToClipboard(profile.sync_token!, '토큰')}
                className="h-12 px-3 bg-blue-50 text-[#2e6da4] rounded-xl text-xs font-medium">복사</button>
              <button onClick={generateToken}
                className="h-12 px-3 bg-gray-100 text-gray-600 rounded-xl text-xs font-medium">재생성</button>
            </div>
          ) : (
            <button onClick={generateToken}
              className="w-full h-12 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-500 font-medium">
              토큰 생성하기
            </button>
          )}
        </div>

        {/* 단축어 설치 버튼 */}
        {profile.sync_token && appUrl && (
          <div className="space-y-2">
            <a
              href={`shortcuts://import-workflow?url=${encodeURIComponent(`${appUrl}/api/shortcut?token=${profile.sync_token}&url=${encodeURIComponent(appUrl)}`)}&name=${encodeURIComponent('운동기록')}`}
              className="w-full h-12 bg-gradient-to-r from-[#2e6da4] to-[#1a5a8a] text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
            >
              📲 단축어 앱으로 바로 설치
            </a>
            <a
              href={`${appUrl}/api/shortcut?token=${profile.sync_token}&url=${encodeURIComponent(appUrl)}`}
              className="w-full h-10 border border-gray-200 text-gray-500 rounded-xl text-xs font-medium flex items-center justify-center gap-1"
            >
              파일 직접 다운로드 (백업용)
            </a>
          </div>
        )}
        {!profile.sync_token && (
          <p className="text-xs text-gray-400 text-center">먼저 토큰을 생성하고 저장하세요</p>
        )}

        {/* 단축어 설정 가이드 */}
        <button onClick={() => setShortcutGuideOpen(o => !o)}
          className="w-full flex items-center justify-between py-1">
          <span className="text-xs font-medium text-[#2e6da4]">단축어 설정 방법 보기</span>
          <span className="text-gray-400 text-xs">{shortcutGuideOpen ? '▲' : '▼'}</span>
        </button>

        {shortcutGuideOpen && (
          <div className="bg-gray-50 rounded-xl p-3 space-y-3 text-xs text-gray-600">
            <p className="font-semibold text-gray-700">단축어 설치 방법:</p>
            <ol className="space-y-2.5 list-decimal list-inside">
              <li>위에서 <span className="font-medium text-[#2e6da4]">토큰 생성 → 저장</span>을 먼저 완료하세요</li>
              <li><span className="font-medium">📲 단축어 앱으로 바로 설치</span> 버튼을 탭하세요
                <br /><span className="text-gray-400 pl-4">→ 단축어 앱이 열리며 &quot;단축어 추가&quot; 화면이 바로 표시됩니다</span></li>
              <li><span className="font-medium">단축어 추가</span> 버튼을 탭해서 완료</li>
            </ol>

            <div className="border-t border-gray-200 pt-2 mt-1">
              <p className="font-semibold text-gray-700 mb-1">단축어 실행 순서:</p>
              <div className="space-y-1 text-gray-500">
                <p>① 운동 종류 선택 (목록에서 탭)</p>
                <p>② 운동 시간(분) 입력</p>
                <p>③ 칼로리 입력 (모르면 0)</p>
                <p>④ 자동으로 오늘 날짜 + 앱에 저장</p>
                <p>⑤ &quot;저장 완료&quot; 알림 확인</p>
              </div>
            </div>

            <p className="text-gray-400 text-xs border-t border-gray-200 pt-2">
              💡 Chrome이나 다른 브라우저에서는 다운로드가 안 될 수 있습니다. 반드시 Safari로 접속해주세요.
            </p>
          </div>
        )}
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

      {/* 앱 정보 / 변경 이력 */}
      <div className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
        <button
          onClick={() => setChangelogOpen((o) => !o)}
          className="w-full flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-gray-600">앱 정보</h2>
            <span className="text-xs bg-[#2e6da4] text-white px-2 py-0.5 rounded-full font-medium">
              {CURRENT_VERSION}
            </span>
          </div>
          <span className="text-gray-400 text-sm">{changelogOpen ? '▲' : '▼'}</span>
        </button>

        {changelogOpen && (
          <div className="space-y-4 pt-1">
            {CHANGELOG.map((entry: ChangelogEntry) => (
              <div key={entry.version} className="border-l-2 border-gray-100 pl-3 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-bold text-gray-800">{entry.version}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    entry.type === 'feature' ? 'bg-blue-50 text-blue-600' :
                    entry.type === 'fix'     ? 'bg-orange-50 text-orange-600' :
                                              'bg-green-50 text-green-600'
                  }`}>
                    {entry.type === 'feature' ? '신기능' : entry.type === 'fix' ? '버그수정' : '최초출시'}
                  </span>
                  <span className="text-xs text-gray-400">{entry.date}</span>
                </div>
                <p className="text-xs font-medium text-gray-700">{entry.title}</p>
                <ul className="space-y-0.5">
                  {entry.items.map((item, i) => (
                    <li key={i} className="text-xs text-gray-500 flex gap-1.5">
                      <span className="text-gray-300 shrink-0">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
