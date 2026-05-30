export const DEFAULT_TZ = 'Asia/Seoul'

export const TIMEZONE_OPTIONS = [
  { value: 'Asia/Seoul', label: '서울 / 서울특별시 (UTC+9)' },
  { value: 'Asia/Tokyo', label: '도쿄 (UTC+9)' },
  { value: 'Asia/Shanghai', label: '상하이 (UTC+8)' },
  { value: 'America/New_York', label: '뉴욕 (UTC-5/4)' },
  { value: 'America/Los_Angeles', label: '로스앤젤레스 (UTC-8/7)' },
  { value: 'Europe/London', label: '런던 (UTC+0/1)' },
  { value: 'UTC', label: 'UTC' },
]

export function getStoredTZ(): string {
  if (typeof window === 'undefined') return DEFAULT_TZ
  return localStorage.getItem('userTimezone') ?? DEFAULT_TZ
}

export function setStoredTZ(tz: string): void {
  localStorage.setItem('userTimezone', tz)
}

export function formatTimeInTZ(iso: string, tz: string = DEFAULT_TZ): string {
  try {
    return new Intl.DateTimeFormat('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: tz,
    }).format(new Date(iso))
  } catch {
    return ''
  }
}

export function getTodayInTZ(tz: string = DEFAULT_TZ): string {
  // 'sv' locale returns YYYY-MM-DD format
  return new Intl.DateTimeFormat('sv', { timeZone: tz }).format(new Date())
}

// 사용자가 입력한 로컬 시각(선택된 타임존 기준)을 UTC ISO 문자열로 변환
export function localToUTCIso(dateStr: string, timeStr: string, tz: string): string {
  const probe = new Date(`${dateStr}T${timeStr}:00Z`)
  const inTZStr = probe.toLocaleString('sv', { timeZone: tz }) // "YYYY-MM-DD HH:MM:SS"
  const inTZ = new Date(inTZStr + 'Z')
  const offsetMs = probe.getTime() - inTZ.getTime()
  return new Date(probe.getTime() + offsetMs).toISOString()
}
