// src/app/settings/page.tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getUserWithPlan, getProfile, getGlobalTags } from '@/lib/db/queries'
import SettingsClient from './SettingsClient'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  const [dbUser, profile, tags] = await Promise.all([
    getUserWithPlan(user.id),
    getProfile(user.id),
    getGlobalTags(user.id),
  ])
  const plan = dbUser?.companyMembers?.[0]?.company?.plan ?? 'FREE'
  return (
    <SettingsClient
      user={{ id: user.id, email: user.email ?? '', name: dbUser?.name, subscription: { plan } }}
      initialProfile={profile as any}
      initialTags={tags as any[]}
    />
  )
}
