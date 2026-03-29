'use client'
import { useRouter } from 'next/navigation'
import type { Plan } from '@prisma/client'
import { PLAN_META } from '@/lib/limits'
import { createClient } from '@/lib/supabase/client'

interface Props {
  email: string
  plan: Plan
}

export default function SettingsAccountClient({ email, plan }: Props) {
  const router = useRouter()
  const supabase = createClient()

  return (
    <div className="space-y-5">
      <div className="card p-6">
        <h2 className="font-semibold text-[13px] text-ink mb-4">Account</h2>
        <div className="space-y-3 text-sm">
          <div className="flex items-center justify-between py-2 border-b border-surface-200">
            <span className="text-ink-muted">Email</span>
            <span className="text-ink font-medium">{email}</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-surface-200">
            <span className="text-ink-muted">Plan</span>
            <span className="font-bold" style={{ color: PLAN_META[plan].color }}>{PLAN_META[plan].name}</span>
          </div>
        </div>
      </div>

      <div className="card p-6">
        <h2 className="font-semibold text-[13px] text-ink mb-4 text-red-600">Danger Zone</h2>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-ink">Sign out</div>
            <div className="text-xs text-ink-faint">Sign out of your account on this device</div>
          </div>
          <button onClick={async () => { await supabase.auth.signOut(); router.push('/auth/login') }}
            className="btn-secondary text-sm">Sign out</button>
        </div>
      </div>
    </div>
  )
}
