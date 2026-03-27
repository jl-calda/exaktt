// src/app/(app)/projects/map/page.tsx
export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getProjects, getUserCompany } from '@/lib/db/queries'
import ProjectsMapClient from './ProjectsMapClient'

export default async function ProjectsMapPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  const company = await getUserCompany(user.id)
  if (!company) redirect('/auth/login')

  const projects = await getProjects(company.id)

  return <ProjectsMapClient projects={projects as any[]} />
}
