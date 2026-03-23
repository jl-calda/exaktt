// src/app/mto/system/[id]/page.tsx — MTO calculator
import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getMtoSystem, getMtoJobs, getGlobalTags, getUserWithPlan, getProfile } from '@/lib/db/queries'
import SystemShellSaaS from '@/components/calculator/SystemShellSaaS'

interface PageProps { params: Promise<{ id: string }> }

export default async function MtoSystemPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const [system, jobs, tags, userData, profile] = await Promise.all([
    getMtoSystem(id, user.id),
    getMtoJobs(user.id, id),
    getGlobalTags(user.id),
    getUserWithPlan(user.id),
    getProfile(user.id),
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
    />
  )
}
