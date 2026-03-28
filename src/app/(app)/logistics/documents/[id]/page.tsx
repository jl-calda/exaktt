// src/app/(app)/logistics/documents/[id]/page.tsx
export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getDocumentById, getUserCompany } from '@/lib/db/queries'
import { prisma } from '@/lib/db/prisma'
import { createPOPreset, createDOPreset, createBlankPreset } from '@/lib/doc-builder/presets'
import type { DocBlock, DocBranding } from '@/lib/doc-builder/types'
import DocumentBuilderClient from './DocumentBuilderClient'

export default async function DocumentBuilderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  const company = await getUserCompany(user.id)
  if (!company) redirect('/auth/login')

  const doc = await getDocumentById(id, company.id)
  if (!doc) redirect('/logistics')

  const profile = await prisma.profile.findFirst({ where: { userId: user.id } })

  const branding: DocBranding = {
    companyName: doc.companyName ?? company.name,
    companyLogo: doc.companyLogo ?? profile?.logo ?? null,
    companyAddr: doc.companyAddr ?? profile?.address ?? null,
    registrationNo: doc.registrationNo ?? profile?.abn ?? null,
    registrationLabel: doc.registrationLabel ?? profile?.registrationLabel ?? null,
    accentColor: doc.accentColor ?? null,
    currency: doc.currency ?? 'SGD',
  }

  // If blocks are empty, generate preset blocks from source data
  let blocks = (doc.blocks ?? []) as DocBlock[]
  if (blocks.length === 0) {
    let sourceData: any = null
    if (doc.poId) {
      sourceData = await prisma.purchaseOrder.findUnique({
        where: { id: doc.poId },
        include: { lines: true, supplier: true },
      })
      blocks = createPOPreset({ branding, sourceData })
    } else if (doc.doId) {
      sourceData = await prisma.deliveryOrder.findUnique({
        where: { id: doc.doId },
        include: { lines: true, po: { select: { id: true, ref: true, supplierName: true } } },
      })
      blocks = createDOPreset({ branding, sourceData })
    } else {
      blocks = createBlankPreset()
    }

    // Persist the generated blocks
    await prisma.document.update({
      where: { id: doc.id },
      data: { blocks: blocks as any },
    })
  }

  return (
    <DocumentBuilderClient
      document={{ ...doc, blocks } as any}
      branding={branding}
    />
  )
}
