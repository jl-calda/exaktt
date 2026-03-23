// src/app/invite/[token]/page.tsx
import { prisma } from '@/lib/db/prisma'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AcceptInviteForm from './accept-form'

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params

  const invite = await prisma.companyInvite.findUnique({
    where: { token },
    include: { company: { select: { name: true } } },
  })

  if (!invite) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Invalid Invite</h1>
          <p className="mt-2 text-gray-500">This invite link is not valid.</p>
        </div>
      </div>
    )
  }

  if (invite.acceptedAt) {
    redirect('/dashboard')
  }

  if (invite.expiresAt < new Date()) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Invite Expired</h1>
          <p className="mt-2 text-gray-500">This invite has expired. Please ask for a new one.</p>
        </div>
      </div>
    )
  }

  // Check if user is logged in
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/auth/login?next=/invite/${token}`)
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-sm rounded-lg border p-6 shadow-sm">
        <h1 className="text-2xl font-bold">Join {invite.company.name}</h1>
        <p className="mt-2 text-gray-500">
          You have been invited to join as <strong>{invite.role.toLowerCase()}</strong>.
        </p>
        <AcceptInviteForm token={token} companyName={invite.company.name} />
      </div>
    </div>
  )
}
