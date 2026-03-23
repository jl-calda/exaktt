// src/app/(app)/tenders/[id]/page.tsx
export const dynamic = 'force-dynamic'

import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getTender, getMtoJobs } from '@/lib/db/queries'
import TenderDetailClient from './TenderDetailClient'

interface PageProps { params: Promise<{ id: string }> }

export default async function TenderDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const [tender, allJobs] = await Promise.all([
    getTender(id, user.id),
    getMtoJobs(user.id),
  ])

  if (!tender) notFound()

  return (
    <TenderDetailClient
      tender={tender as any}
      allJobs={allJobs as any[]}
    />
  )
}
