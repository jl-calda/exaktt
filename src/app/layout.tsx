// src/app/layout.tsx
import type { Metadata, Viewport } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import { Toast } from '@/components/ui/Toast'
import ThemeProvider from '@/components/ThemeProvider'
import TaskFAB from '@/components/tasks/TaskFAB'
import TaskDrawer from '@/components/tasks/TaskDrawer'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-jetbrains',
})

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export const metadata: Metadata = {
  title:       'Exakt — Material Take-Off Platform',
  description: 'Professional material take-off, tendering and logistics platform.',
}

// Prevent flash of unstyled theme — reads localStorage before React hydrates
const themeScript = `
try {
  var t = localStorage.getItem('exakt-theme') || 'default';
  var d = localStorage.getItem('exakt-dark') === 'true';
  document.documentElement.setAttribute('data-theme', t);
  if (d) document.documentElement.classList.add('dark');
} catch(e) {}
`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="bg-surface text-ink font-sans antialiased">
        <ThemeProvider>
          <Toast>{children}</Toast>
          <TaskFAB />
          <TaskDrawer />
        </ThemeProvider>
      </body>
    </html>
  )
}
