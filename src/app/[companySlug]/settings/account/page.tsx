import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getUserWithPlan } from '@/lib/db/queries'
import SettingsAccountClient from './SettingsAccountClient'

export default async function SettingsAccountPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const dbUser = await getUserWithPlan(user.id)
  const plan = dbUser?.companyMembers?.[0]?.company?.plan ?? 'FREE'

  return (
    <SettingsAccountClient
      email={user.email ?? ''}
      plan={plan}
    />
  )
}
