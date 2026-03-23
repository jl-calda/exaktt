// src/app/billing/page.tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getUserWithPlan } from '@/lib/db/queries'
import BillingClient from './BillingClient'

export default async function BillingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  const dbUser  = await getUserWithPlan(user.id)
  const company = dbUser?.companyMembers?.[0]?.company ?? null
  return (
    <BillingClient
      plan={company?.plan ?? 'FREE'}
      stripeCustomerId={company?.stripeCustomerId ?? null}
      planExpiresAt={company?.planExpiresAt ?? null}
    />
  )
}
