// src/app/(app)/projects/[id]/page.tsx
export const dynamic = 'force-dynamic'

import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getProject, getUserCompany, getWorkTeams, getProjectAssets, getActivityCategories } from '@/lib/db/queries'
import ProjectDetailClient from './ProjectDetailClient'

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  const company = await getUserCompany(user.id)
  if (!company) redirect('/auth/login')

  const [project, teams, assets, categories] = await Promise.all([
    getProject(id, company.id),
    getWorkTeams(company.id),
    getProjectAssets(company.id),
    getActivityCategories(company.id),
  ])
  if (!project) notFound()

  return <ProjectDetailClient project={project as any} teams={teams as any[]} assets={assets as any[]} categories={categories as any[]} />
}
