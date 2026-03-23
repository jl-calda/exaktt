// src/app/people/page.tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ComingSoon from '@/components/platform/ComingSoon'

export default async function PeoplePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  return <ComingSoon module="People" emoji="👥" description="HR management — staff records, timesheets, and compliance." color="#be185d" />
}
