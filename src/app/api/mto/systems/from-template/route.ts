// src/app/api/mto/systems/from-template/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createMtoSystem, LimitError } from '@/lib/db/queries'
import { getSampleSystem } from '@/lib/sample-systems'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { templateKey } = await req.json()
  const sample = getSampleSystem(templateKey)
  if (!sample) return NextResponse.json({ error: 'Unknown template' }, { status: 400 })

  try {
    const system = await createMtoSystem(user.id, sample.template)
    return NextResponse.json({ data: system }, { status: 201 })
  } catch (err) {
    if (err instanceof LimitError) return NextResponse.json({ error: err.message, limitCheck: err.feature }, { status: 402 })
    throw err
  }
}
