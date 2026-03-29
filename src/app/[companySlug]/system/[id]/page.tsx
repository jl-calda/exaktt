// src/app/system/[id]/page.tsx
// Backward-compat redirect — calculator moved to /mto/system/[id]
import { redirect } from 'next/navigation'

interface PageProps { params: Promise<{ id: string }> }

export default async function SystemRedirectPage({ params }: PageProps) {
  const { id } = await params
  redirect(`/products/${id}`)
}
