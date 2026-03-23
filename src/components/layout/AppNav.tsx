// src/components/layout/AppNav.tsx
'use client'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { LogOut, Settings } from 'lucide-react'

interface AppNavProps {
  userEmail?: string
  children:   React.ReactNode
}

export function AppNav({ userEmail, children }: AppNavProps) {
  const router   = useRouter()
  const supabase = createClient()

  const signOut = async () => {
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  return (
    <div className="flex items-center gap-2">
      {userEmail && <span className="text-xs text-white/40 hidden sm:block">{userEmail}</span>}
      <button onClick={() => router.push('/settings')}
        className="text-white/50 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
        title="Settings">
        <Settings className="w-4 h-4" />
      </button>
      <button onClick={signOut}
        className="text-white/50 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
        title="Sign out">
        <LogOut className="w-4 h-4" />
      </button>
      {children}
    </div>
  )
}
