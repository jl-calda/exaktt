// src/app/layout.tsx
import type { Metadata } from 'next'
import { Toast } from '@/components/ui/Toast'
import ThemeProvider from '@/components/ThemeProvider'
import './globals.css'

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
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="bg-surface text-ink font-sans antialiased">
        <ThemeProvider>
          <Toast>{children}</Toast>
        </ThemeProvider>
      </body>
    </html>
  )
}
