'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const PRIMARY = '#2e6da4'
const INACTIVE = '#9ca3af'

const NAV_ITEMS = [
  {
    href: '/',
    label: '대시보드',
    icon: (c: string) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1.5"/>
        <rect x="14" y="3" width="7" height="7" rx="1.5"/>
        <rect x="3" y="14" width="7" height="7" rx="1.5"/>
        <rect x="14" y="14" width="7" height="7" rx="1.5"/>
      </svg>
    ),
  },
  {
    href: '/glucose',
    label: '혈당',
    icon: (c: string) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/>
        <rect x="9" y="3" width="6" height="4" rx="1"/>
        <path d="M9 12h6M9 16h4"/>
      </svg>
    ),
  },
  {
    href: '/meals',
    label: '식단',
    icon: (c: string) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 6h18M3 11h18M3 16h12"/>
        <circle cx="6" cy="6" r="1" fill={c}/>
        <circle cx="6" cy="11" r="1" fill={c}/>
        <circle cx="6" cy="16" r="1" fill={c}/>
      </svg>
    ),
  },
  {
    href: '/exercise',
    label: '운동',
    icon: (c: string) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M13 2 4.09 12.26A1 1 0 0 0 5 14h6v8l8.91-10.26A1 1 0 0 0 19 10h-6V2z"/>
      </svg>
    ),
  },
  {
    href: '/weight',
    label: '몸무게',
    icon: (c: string) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 17 7 9l4 5 3-3 4 6"/>
        <line x1="3" y1="21" x2="21" y2="21"/>
      </svg>
    ),
  },
  {
    href: '/trends',
    label: '트렌드',
    icon: (c: string) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
      </svg>
    ),
  },
]

export default function NavBar() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-50"
      style={{ boxShadow: '0 -4px 20px rgba(0,0,0,0.06)' }}>
      <div className="max-w-lg mx-auto flex items-center justify-around h-16 px-1">
        {NAV_ITEMS.map(({ href, label, icon }) => {
          const active = href === '/' ? pathname === '/' : pathname.startsWith(href)
          const color = active ? PRIMARY : INACTIVE
          return (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center justify-center gap-1 min-w-[44px] py-1"
            >
              <div
                className="w-10 h-7 flex items-center justify-center rounded-lg transition-colors"
                style={active ? { backgroundColor: '#e8f0f9' } : {}}
              >
                {icon(color)}
              </div>
              <span
                className="text-[9.5px] font-medium transition-colors"
                style={{ color }}
              >
                {label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
