// src/app/finance/page.tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ComingSoon from '@/components/platform/ComingSoon'

export default async function FinancePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  return <ComingSoon module="Finance" emoji="💰" description="Job costing, invoicing, and financial reporting for your projects." color="#b45309" />
}
