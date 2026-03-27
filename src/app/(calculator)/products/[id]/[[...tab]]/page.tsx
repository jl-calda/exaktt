// src/app/(calculator)/products/[id]/[[...tab]]/page.tsx
import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getMtoSystem, getMtoJobs, getGlobalTags, getUserWithPlan, getProfile, getUserCompany, getRunDraft } from '@/lib/db/queries'
import SystemShellSaaS from '@/components/calculator/SystemShellSaaS'

type Tab = 'setup' | 'calculator' | 'runs'
type SetupSubTab = 'setup' | 'materials' | 'subassemblies' | 'library' | 'dependency'

const SLUG_MAP: Record<string, { tab: Tab; subTab?: SetupSubTab }> = {
  setup:         { tab: 'setup', subTab: 'setup' },
  materials:     { tab: 'setup', subTab: 'materials' },
  subassemblies: { tab: 'setup', subTab: 'subassemblies' },
  library:       { tab: 'setup', subTab: 'library' },
  dependency:    { tab: 'setup', subTab: 'dependency' },
  calculator:    { tab: 'calculator' },
  runs:          { tab: 'runs' },
}

interface PageProps { params: Promise<{ id: string; tab?: string[] }> }

export default async function MtoSystemPage({ params }: PageProps) {
  const { id, tab: tabSegments } = await params
  const slug = tabSegments?.[0] ?? 'setup'
  const mapped = SLUG_MAP[slug] ?? { tab: 'setup' as Tab, subTab: 'setup' as SetupSubTab }
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
      initialTab={mapped.tab}
      initialSubTab={mapped.subTab}
    />
  )
}
