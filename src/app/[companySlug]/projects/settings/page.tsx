import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getUserCompany, getActivityCategories, getCompanyHoursPerDay } from '@/lib/db/queries'
import ProjectSettingsClient from './ProjectSettingsClient'

export default async function ProjectSettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  const company = await getUserCompany(user.id)
  if (!company) redirect('/auth/login')

  const [categories, hoursPerDay] = await Promise.all([
    getActivityCategories(company.id),
    getCompanyHoursPerDay(company.id),
  ])

  return (
    <ProjectSettingsClient
      initialCategories={categories as any[]}
      initialHoursPerDay={hoursPerDay}
    />
  )
}
