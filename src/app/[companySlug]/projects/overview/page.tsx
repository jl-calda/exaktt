// src/app/(app)/projects/overview/page.tsx
export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getProjects, getUserCompany, getWorkTeams } from '@/lib/db/queries'
import OverviewClient from './OverviewClient'

export default async function ProjectsOverviewPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  const company = await getUserCompany(user.id)
  if (!company) redirect('/auth/login')

  const [projects, teams] = await Promise.all([
    getProjects(company.id),
    getWorkTeams(company.id),
  ])

  return <OverviewClient projects={projects as any[]} teams={teams as any[]} />
}
