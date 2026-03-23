// src/app/api/billing/checkout/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createCheckoutSession, PRICES } from '@/lib/stripe'
import { getUserCompany } from '@/lib/db/queries'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const company = await getUserCompany(user.id)
  if (!company) return NextResponse.json({ error: 'No company found for user' }, { status: 400 })

  const { priceId, successUrl, cancelUrl } = await req.json()

  const validPrices = Object.values(PRICES)
  if (!validPrices.includes(priceId)) {
    return NextResponse.json({ error: 'Invalid price' }, { status: 400 })
  }

  const session = await createCheckoutSession({
    companyId:  company.id,
    email:      user.email!,
    name:       user.user_metadata?.full_name,
    priceId,
    successUrl: successUrl ?? `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?upgraded=1`,
    cancelUrl:  cancelUrl  ?? `${process.env.NEXT_PUBLIC_APP_URL}/billing`,
  })

  return NextResponse.json({ url: session.url })
}
