// src/app/mto/system/[id]/page.tsx — MTO calculator
import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getMtoSystem, getMtoJobs, getGlobalTags, getUserWithPlan, getProfile, getUserCompany, getRunDraft } from '@/lib/db/queries'
import SystemShellSaaS from '@/components/calculator/SystemShellSaaS'

interface PageProps { params: Promise<{ id: string }> }

export default async function MtoSystemPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const company = await getUserCompany(user.id)
  if (!company) redirect('/auth/login')
  const companyId = company.id

  const [system, jobs, tags, userData, profile, draft] = await Promise.all([
    getMtoSystem(id, companyId),
    getMtoJobs(companyId, id),
    getGlobalTags(companyId),
    getUserWithPlan(user.id),
    getProfile(user.id),
    getRunDraft(user.id, id),
  ])

  if (!system) notFound()

  const plan = userData?.companyMembers?.[0]?.company?.plan ?? 'FREE'

  const sys = {
    ...system,
    materials:      (system.materials      as any[]) ?? [],
    customDims:     (system.customDims     as any[]) ?? [],
    customCriteria: (system.customCriteria as any[]) ?? [],
    variants:       (system.variants       as any[]) ?? [],
    warnings:       (system.warnings       as any[]) ?? [],
    customBrackets: (system.customBrackets as any[]) ?? [],
    workActivities: (system.workActivities as any[]) ?? [],
  }

  return (
    <SystemShellSaaS
      system={sys}
      initialJobs={jobs as any[]}
      globalTags={tags as any[]}
      userId={user.id}
      plan={plan}
      profile={profile as any}
      initialDraft={draft as any}
    />
  )
}
