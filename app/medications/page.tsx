'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { getTodayString, formatDate } from '@/lib/utils'

type TimePoint = 'morning' | 'lunch' | 'evening' | 'bedtime'

const TIME_LABELS: Record<TimePoint, string> = {
  morning: '아침',
  lunch: '점심',
  evening: '저녁',
  bedtime: '취침전',
}

const TIME_ICONS: Record<TimePoint, string> = {
  morning: '🌅',
  lunch: '☀️',
  evening: '🌆',
  bedtime: '🌙',
}

const TIME_ORDER: TimePoint[] = ['morning', 'lunch', 'evening', 'bedtime']

interface Medication {
  id: string
  name: string
  dose?: string
  schedule: TimePoint[]
  active: boolean
  sort_order: number
}

interface MedLog {
  id: string
  medication_id: string
  date: string
  time_point: TimePoint
}

export default function MedicationsPage() {
  const [tab, setTab] = useState<'today' | 'settings'>('today')
  const [date, setDate] = useState(getTodayString())
  const [medications, setMedications] = useState<Medication[]>([])
  const [allMedications, setAllMedications] = useState<Medication[]>([])
  const [logs, setLogs] = useState<MedLog[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState('')

  // Settings form
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formName, setFormName] = useState('')
  const [formDose, setFormDose] = useState('')
  const [formSchedule, setFormSchedule] = useState<TimePoint[]>([])
  const [formOpen, setFormOpen] = useState(false)

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 2500)
  }

  const fetchMedications = useCallback(async () => {
    const { data } = await supabase
      .from('medications')
      .select('*')
      .order('sort_order')
      .order('created_at')
    setAllMedications((data as Medication[]) ?? [])
    setMedications(((data as Medication[]) ?? []).filter(m => m.active))
  }, [])

  const fetchLogs = useCallback(async (d: string) => {
    const { data } = await supabase
      .from('medication_logs')
      .select('*')
      .eq('date', d)
    setLogs((data as MedLog[]) ?? [])
  }, [])

  const fetchAll = useCallback(async () => {
    setLoading(true)
    await Promise.all([fetchMedications(), fetchLogs(date)])
    setLoading(false)
  }, [fetchMedications, fetchLogs, date])

  useEffect(() => { fetchAll() }, [fetchAll])

  useEffect(() => {
    if (!loading) fetchLogs(date)
  }, [date, loading, fetchLogs])

  function isTaken(medId: string, timePoint: TimePoint) {
    return logs.some(l => l.medication_id === medId && l.time_point === timePoint)
  }

  async function toggleTaken(medId: string, timePoint: TimePoint) {
    const taken = isTaken(medId, timePoint)
    if (taken) {
      await supabase
        .from('medication_logs')
        .delete()
        .eq('medication_id', medId)
        .eq('date', date)
        .eq('time_point', timePoint)
      setLogs(prev => prev.filter(
        l => !(l.medication_id === medId && l.time_point === timePoint)
      ))
    } else {
      const { data, error } = await supabase
        .from('medication_logs')
        .insert({ medication_id: medId, date, time_point: timePoint })
        .select()
        .single()
      if (!error && data) setLogs(prev => [...prev, data as MedLog])
    }
  }

  function getTotalDoses() {
    return medications.reduce((acc, m) => acc + m.schedule.length, 0)
  }

  function getTakenDoses() {
    return logs.filter(l =>
      medications.some(m => m.id === l.medication_id)
    ).length
  }

  // ── Settings ──────────────────────────────────────────

  function openNewForm() {
    setEditingId(null)
    setFormName('')
    setFormDose('')
    setFormSchedule([])
    setFormOpen(true)
  }

  function openEditForm(med: Medication) {
    setEditingId(med.id)
    setFormName(med.name)
    setFormDose(med.dose ?? '')
    setFormSchedule([...med.schedule])
    setFormOpen(true)
  }

  function toggleSchedule(tp: TimePoint) {
    setFormSchedule(prev =>
      prev.includes(tp) ? prev.filter(x => x !== tp) : [...prev, tp]
    )
  }

  async function saveForm() {
    if (!formName.trim()) { showToast('약 이름을 입력하세요.'); return }
    if (formSchedule.length === 0) { showToast('복용 시점을 하나 이상 선택하세요.'); return }

    const orderedSchedule = TIME_ORDER.filter(tp => formSchedule.includes(tp))

    if (editingId) {
      const { error } = await supabase
        .from('medications')
        .update({ name: formName.trim(), dose: formDose.trim() || null, schedule: orderedSchedule })
        .eq('id', editingId)
      if (error) { showToast('수정 실패: ' + error.message); return }
      showToast('수정되었습니다!')
    } else {
      const { error } = await supabase
        .from('medications')
        .insert({ name: formName.trim(), dose: formDose.trim() || null, schedule: orderedSchedule })
      if (error) { showToast('저장 실패: ' + error.message); return }
      showToast('추가되었습니다!')
    }

    setFormOpen(false)
    fetchMedications()
  }

  async function toggleActive(med: Medication) {
    await supabase
      .from('medications')
      .update({ active: !med.active })
      .eq('id', med.id)
    fetchMedications()
  }

  async function deleteMed(id: string) {
    if (!confirm('삭제하시겠습니까? 복용 기록도 모두 삭제됩니다.')) return
    const { error } = await supabase.from('medications').delete().eq('id', id)
    if (!error) { showToast('삭제되었습니다.'); fetchMedications() }
  }

  const total = getTotalDoses()
  const taken = getTakenDoses()
  const pct = total > 0 ? Math.round((taken / total) * 100) : 0

  return (
    <div className="min-h-screen bg-[#f5f7fa]">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 pt-10 pb-3">
        <h1 className="text-xl font-bold text-gray-800">약·영양제</h1>

        <div className="flex gap-1 mt-3">
          {(['today', 'settings'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="px-4 py-1.5 rounded-full text-sm font-medium transition-colors"
              style={tab === t
                ? { background: '#2e6da4', color: '#fff' }
                : { background: '#f3f4f6', color: '#6b7280' }}
            >
              {t === 'today' ? '오늘 복용' : '약 목록'}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4">

        {/* ── Today tab ───────────────────────────────────── */}
        {tab === 'today' && (
          <>
            {/* Date picker */}
            <div className="flex items-center gap-2 mb-4">
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white flex-1"
              />
              <button
                onClick={() => setDate(getTodayString())}
                className="px-3 py-2 text-sm rounded-lg border border-gray-200 bg-white text-gray-600"
              >
                오늘
              </button>
            </div>

            {loading ? (
              <div className="text-center py-12 text-gray-400">불러오는 중...</div>
            ) : medications.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-400 text-sm mb-3">등록된 약이 없습니다</p>
                <button
                  onClick={() => setTab('settings')}
                  className="text-sm text-[#2e6da4] font-medium underline"
                >
                  약 추가하러 가기
                </button>
              </div>
            ) : (
              <>
                {/* Summary card */}
                <div className="bg-white rounded-2xl p-4 mb-4 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">
                      {formatDate(date)} 복용 현황
                    </span>
                    <span className="text-sm font-bold" style={{ color: pct === 100 ? '#16a34a' : '#2e6da4' }}>
                      {taken}/{total} 완료
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className="h-2 rounded-full transition-all"
                      style={{
                        width: `${pct}%`,
                        background: pct === 100 ? '#16a34a' : '#2e6da4',
                      }}
                    />
                  </div>
                  {pct === 100 && (
                    <p className="text-xs text-green-600 font-medium mt-2">✅ 오늘 복용을 모두 완료했습니다!</p>
                  )}
                </div>

                {/* Time groups */}
                {TIME_ORDER.map(tp => {
                  const medsForTime = medications.filter(m => m.schedule.includes(tp))
                  if (medsForTime.length === 0) return null

                  const allTaken = medsForTime.every(m => isTaken(m.id, tp))
                  const someTaken = medsForTime.some(m => isTaken(m.id, tp))

                  return (
                    <div key={tp} className="bg-white rounded-2xl p-4 mb-3 shadow-sm">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{TIME_ICONS[tp]}</span>
                          <span className="font-semibold text-gray-800">{TIME_LABELS[tp]}</span>
                        </div>
                        {allTaken ? (
                          <span className="text-xs text-green-600 font-medium bg-green-50 px-2 py-0.5 rounded-full">완료</span>
                        ) : someTaken ? (
                          <span className="text-xs text-yellow-600 font-medium bg-yellow-50 px-2 py-0.5 rounded-full">일부 완료</span>
                        ) : (
                          <span className="text-xs text-gray-400 font-medium bg-gray-50 px-2 py-0.5 rounded-full">미복용</span>
                        )}
                      </div>
                      <div className="space-y-2">
                        {medsForTime.map(med => {
                          const done = isTaken(med.id, tp)
                          return (
                            <button
                              key={med.id}
                              onClick={() => toggleTaken(med.id, tp)}
                              className="w-full flex items-center gap-3 p-3 rounded-xl transition-colors text-left"
                              style={{
                                background: done ? '#f0fdf4' : '#f9fafb',
                                border: `1.5px solid ${done ? '#86efac' : '#e5e7eb'}`,
                              }}
                            >
                              <div
                                className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-colors"
                                style={{
                                  background: done ? '#16a34a' : '#fff',
                                  border: `2px solid ${done ? '#16a34a' : '#d1d5db'}`,
                                }}
                              >
                                {done && (
                                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                                    <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                  </svg>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-sm text-gray-800">{med.name}</div>
                                {med.dose && <div className="text-xs text-gray-400 mt-0.5">{med.dose}</div>}
                              </div>
                              {done && (
                                <span className="text-xs text-green-600 font-medium flex-shrink-0">복용완료</span>
                              )}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </>
            )}
          </>
        )}

        {/* ── Settings tab ────────────────────────────────── */}
        {tab === 'settings' && (
          <>
            <button
              onClick={openNewForm}
              className="w-full py-3 rounded-2xl font-semibold text-white mb-4 text-sm"
              style={{ background: '#2e6da4' }}
            >
              + 약·영양제 추가
            </button>

            {/* Form */}
            {formOpen && (
              <div className="bg-white rounded-2xl p-4 mb-4 shadow-sm border border-blue-100">
                <h3 className="font-semibold text-gray-800 mb-3">
                  {editingId ? '약 수정' : '새 약·영양제 추가'}
                </h3>

                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-gray-500 mb-1 block">이름 *</label>
                    <input
                      type="text"
                      value={formName}
                      onChange={e => setFormName(e.target.value)}
                      placeholder="예: 메트포르민, 오메가3"
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-gray-500 mb-1 block">용량/단위 (선택)</label>
                    <input
                      type="text"
                      value={formDose}
                      onChange={e => setFormDose(e.target.value)}
                      placeholder="예: 500mg, 1정, 2캡슐"
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-gray-500 mb-2 block">복용 시점 *</label>
                    <div className="flex gap-2 flex-wrap">
                      {TIME_ORDER.map(tp => {
                        const sel = formSchedule.includes(tp)
                        return (
                          <button
                            key={tp}
                            onClick={() => toggleSchedule(tp)}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium transition-colors"
                            style={sel
                              ? { background: '#2e6da4', color: '#fff' }
                              : { background: '#f3f4f6', color: '#6b7280' }}
                          >
                            <span>{TIME_ICONS[tp]}</span>
                            <span>{TIME_LABELS[tp]}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => setFormOpen(false)}
                    className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-gray-100 text-gray-600"
                  >
                    취소
                  </button>
                  <button
                    onClick={saveForm}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white"
                    style={{ background: '#2e6da4' }}
                  >
                    저장
                  </button>
                </div>
              </div>
            )}

            {/* Medication list */}
            {loading ? (
              <div className="text-center py-8 text-gray-400">불러오는 중...</div>
            ) : allMedications.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-sm">
                아직 등록된 약이 없습니다
              </div>
            ) : (
              <div className="space-y-2">
                {allMedications.map(med => (
                  <div
                    key={med.id}
                    className="bg-white rounded-2xl p-4 shadow-sm"
                    style={{ opacity: med.active ? 1 : 0.55 }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-800 text-sm">{med.name}</span>
                          {!med.active && (
                            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">비활성</span>
                          )}
                        </div>
                        {med.dose && (
                          <span className="text-xs text-gray-400">{med.dose}</span>
                        )}
                        <div className="flex gap-1 mt-1.5 flex-wrap">
                          {TIME_ORDER.filter(tp => med.schedule.includes(tp)).map(tp => (
                            <span
                              key={tp}
                              className="text-xs px-2 py-0.5 rounded-full"
                              style={{ background: '#e8f0f9', color: '#2e6da4' }}
                            >
                              {TIME_ICONS[tp]} {TIME_LABELS[tp]}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="flex gap-1 flex-shrink-0">
                        <button
                          onClick={() => openEditForm(med)}
                          className="p-2 rounded-lg text-gray-400 hover:bg-gray-50"
                        >
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                          </svg>
                        </button>
                        <button
                          onClick={() => toggleActive(med)}
                          className="p-2 rounded-lg hover:bg-gray-50"
                          style={{ color: med.active ? '#16a34a' : '#9ca3af' }}
                          title={med.active ? '비활성화' : '활성화'}
                        >
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            {med.active
                              ? <><path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="10"/></>
                              : <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>
                            }
                          </svg>
                        </button>
                        <button
                          onClick={() => deleteMed(med.id)}
                          className="p-2 rounded-lg text-red-300 hover:bg-red-50"
                        >
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                            <path d="M10 11v6M14 11v6"/>
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Notification info */}
            <div className="mt-6 bg-blue-50 rounded-2xl p-4 text-sm text-blue-700">
              <p className="font-semibold mb-1">💡 알림 설정 방법</p>
              <p className="text-xs text-blue-600 leading-relaxed">
                iPhone 단축어 앱에서 <strong>자동화 → 시간 기준</strong>으로 복용 시간에
                "약 먹었나요?" 알림을 만들 수 있습니다. 또는 아이폰 기본 시계 앱의
                <strong> 알람</strong>을 아침·점심·저녁에 설정해두는 방법이 가장 간단합니다.
              </p>
            </div>
          </>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-sm px-4 py-2.5 rounded-full shadow-lg z-50 whitespace-nowrap">
          {toast}
        </div>
      )}
    </div>
  )
}
