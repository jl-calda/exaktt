import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getUserCompany, getProfile, getUserWithPlan } from '@/lib/db/queries'
import SettingsInfoClient from './SettingsInfoClient'

export default async function SettingsInfoPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  const company = await getUserCompany(user.id)
  if (!company) redirect('/auth/login')
  const [dbUser, profile] = await Promise.all([
    getUserWithPlan(user.id),
    getProfile(user.id),
  ])
  const plan = dbUser?.companyMembers?.[0]?.company?.plan ?? 'FREE'
  return <SettingsInfoClient initialProfile={profile as any} plan={plan} />
}
