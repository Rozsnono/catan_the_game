import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Catan Online (API polling)',
  description: 'Next.js + MongoDB Catan MVP (no realtime)'
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="hu">
      <body>
        <div className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900">
          <div className="mx-auto max-w-[1800px] px-3 py-4 md:px-4 md:py-5">
            {children}
          </div>
        </div>
      </body>
    </html>
  )
}
