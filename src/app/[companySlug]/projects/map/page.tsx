// src/app/(app)/projects/map/page.tsx
export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getProjectsForMap, getUserCompany, getWorkTeams, getProjectAssets } from '@/lib/db/queries'
import ProjectsMapClient from './ProjectsMapClient'

export default async function ProjectsMapPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  const company = await getUserCompany(user.id)
  if (!company) redirect('/auth/login')

  const [projects, teams, assets] = await Promise.all([
    getProjectsForMap(company.id),
    getWorkTeams(company.id),
    getProjectAssets(company.id),
  ])

  return (
    <ProjectsMapClient
      projects={projects as any[]}
      teams={teams as any[]}
      assets={assets as any[]}
    />
  )
}
