// src/app/(app)/projects/teams/[id]/page.tsx
export const dynamic = 'force-dynamic'

import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getWorkTeam, getUserCompany, getProjectAssets } from '@/lib/db/queries'
import TeamScheduleClient from './TeamScheduleClient'

export default async function TeamSchedulePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  const company = await getUserCompany(user.id)
  if (!company) redirect('/auth/login')

  const team = await getWorkTeam(id, company.id)
  if (!team) notFound()

  return <TeamScheduleClient team={team as any} />
}
