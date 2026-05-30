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

// Fixed UTC offsets in minutes (no DST). Seoul/Tokyo have no DST so this is exact.
// DST zones (NY, LA, London) are approximate but acceptable for primary Korean user base.
const TZ_OFFSETS: Record<string, number> = {
  'Asia/Seoul': 540,
  'Asia/Tokyo': 540,
  'Asia/Shanghai': 480,
  'America/New_York': -300,
  'America/Los_Angeles': -480,
  'Europe/London': 0,
  'UTC': 0,
}

export function getStoredTZ(): string {
  if (typeof window === 'undefined') return DEFAULT_TZ
  return localStorage.getItem('userTimezone') ?? DEFAULT_TZ
}

export function setStoredTZ(tz: string): void {
  localStorage.setItem('userTimezone', tz)
}

export function formatTimeInTZ(iso: string, tz: string = DEFAULT_TZ): string {
  try {
    const offsetMs = (TZ_OFFSETS[tz] ?? 0) * 60000
    // Supabase may return timestamps without timezone indicator (e.g. "2026-05-30T05:29:00").
    // Without a suffix, new Date() parses as browser local time, causing double-offset on Seoul devices.
    // Force UTC by appending Z when no timezone marker is present after the seconds position.
    const normalized = iso.includes('Z') || iso.indexOf('+', 10) !== -1 ? iso : iso.replace(' ', 'T') + 'Z'
    const local = new Date(new Date(normalized).getTime() + offsetMs)
    return `${String(local.getUTCHours()).padStart(2, '0')}:${String(local.getUTCMinutes()).padStart(2, '0')}`
  } catch {
    return ''
  }
}

export function getCurrentTimeInTZ(tz: string = DEFAULT_TZ): string {
  const offsetMs = (TZ_OFFSETS[tz] ?? 0) * 60000
  const local = new Date(Date.now() + offsetMs)
  return `${String(local.getUTCHours()).padStart(2, '0')}:${String(local.getUTCMinutes()).padStart(2, '0')}`
}

export function getTodayInTZ(tz: string = DEFAULT_TZ): string {
  const offsetMs = (TZ_OFFSETS[tz] ?? 0) * 60000
  const local = new Date(Date.now() + offsetMs)
  const y = local.getUTCFullYear()
  const m = String(local.getUTCMonth() + 1).padStart(2, '0')
  const d = String(local.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

// Converts user-entered local time (in the selected timezone) to a UTC ISO string
export function localToUTCIso(dateStr: string, timeStr: string, tz: string): string {
  const offsetMs = (TZ_OFFSETS[tz] ?? 0) * 60000
  const localAsUTC = new Date(`${dateStr}T${timeStr}:00Z`)
  return new Date(localAsUTC.getTime() - offsetMs).toISOString()
}
