import type { Metadata } from 'next'
import Link from 'next/link'
import './globals.css'

export const metadata: Metadata = {
  title: '혈당 트래커',
  description: '당뇨 관리 앱',
  manifest: '/manifest.json',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko" className="h-full">
      <body className="min-h-full flex flex-col bg-[#f5f7fa]">
        <main className="flex-1 pb-20">{children}</main>

        {/* 하단 네비게이션 바 */}
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
          <div className="max-w-lg mx-auto flex items-center justify-around h-16 px-1">
            <NavItem href="/" icon="🏠" label="대시보드" />
            <NavItem href="/glucose" icon="💉" label="혈당" />
            <NavItem href="/meals" icon="🍽️" label="식단" />
            <NavItem href="/exercise" icon="🏃" label="운동" />
            <NavItem href="/weight" icon="⚖️" label="몸무게" />
            <NavItem href="/trends" icon="📊" label="트렌드" />
          </div>
        </nav>
      </body>
    </html>
  )
}

function NavItem({ href, icon, label }: { href: string; icon: string; label: string }) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center justify-center gap-0.5 min-w-[44px] py-1 text-gray-500 hover:text-[#2e6da4] transition-colors"
    >
      <span className="text-2xl leading-none">{icon}</span>
      <span className="text-[10px] font-medium">{label}</span>
    </Link>
  )
}
