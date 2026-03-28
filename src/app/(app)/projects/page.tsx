// src/app/(app)/projects/page.tsx
export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getProjects, getUserCompany, getWorkTeams, getClients, getCompanyMembers } from '@/lib/db/queries'
import ProjectsClient from './ProjectsClient'

export default async function ProjectsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  const company = await getUserCompany(user.id)
  if (!company) redirect('/auth/login')

  const [projects, teams, clients, members] = await Promise.all([
    getProjects(company.id),
    getWorkTeams(company.id),
    getClients(company.id),
    getCompanyMembers(company.id),
  ])

  return <ProjectsClient initialProjects={projects as any[]} teams={teams as any[]} clients={clients as any[]} members={members as any[]} />
}
