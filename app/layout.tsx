import type { Metadata } from 'next'
import './globals.css'
import NavBar from './components/NavBar'

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
        <NavBar />
      </body>
    </html>
  )
}
