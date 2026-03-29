export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getUserCompany } from '@/lib/db/queries'
import { prisma } from '@/lib/db/prisma'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const company = await getUserCompany(authUser.id)
    if (!company) return NextResponse.json({ error: 'No company' }, { status: 403 })

    const [dbUser, employee] = await Promise.all([
      prisma.user.findUnique({
        where: { id: authUser.id },
        select: { id: true, email: true, name: true, avatarUrl: true, phone: true, bio: true, dateOfBirth: true, nationality: true },
      }),
      prisma.employee.findUnique({
        where: { userId: authUser.id },
        include: { department: { select: { id: true, name: true, color: true } } },
      }),
    ])

    return NextResponse.json({ user: dbUser, employee })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const company = await getUserCompany(authUser.id)
    if (!company) return NextResponse.json({ error: 'No company' }, { status: 403 })

    const body = await request.json()
    const { userFields, employeeFields } = body

    // Update in transaction
    const result = await prisma.$transaction(async (tx) => {
      let updatedUser = null
      let updatedEmployee = null

      if (userFields && Object.keys(userFields).length > 0) {
        const allowed = ['name', 'phone', 'bio', 'dateOfBirth', 'nationality'] as const
        const data: Record<string, unknown> = {}
        for (const key of allowed) {
          if (userFields[key] !== undefined) {
            if (key === 'dateOfBirth') {
              data[key] = userFields[key] ? new Date(userFields[key]) : null
            } else {
              data[key] = userFields[key]
            }
          }
        }
        updatedUser = await tx.user.update({ where: { id: authUser.id }, data })
      }

      if (employeeFields && Object.keys(employeeFields).length > 0) {
        // Ensure employee record exists
        let employee = await tx.employee.findUnique({ where: { userId: authUser.id } })
        if (!employee) {
          employee = await tx.employee.create({
            data: {
              companyId: company.id,
              userId: authUser.id,
              firstName: employeeFields.firstName || authUser.email?.split('@')[0] || '',
              lastName: employeeFields.lastName || '',
            },
          })
        }

        const allowed = [
          'firstName', 'middleName', 'lastName', 'suffix',
          'jobTitle', 'departmentId', 'employeeId', 'ethnicity',
          'nricFin', 'workPassType',
          'salaryType', 'salaryAmount', 'currency', 'bankName', 'bankAccountNo',
          'cpfAccountNo', 'cpfContribRate',
          'education', 'certifications', 'skills', 'benefits',
          'emergencyName', 'emergencyPhone', 'emergencyRelation',
        ] as const
        const data: Record<string, unknown> = {}
        for (const key of allowed) {
          if (employeeFields[key] !== undefined) {
            data[key] = employeeFields[key]
          }
        }
        // Handle date fields separately
        if (employeeFields.hireDate !== undefined) {
          data.hireDate = employeeFields.hireDate ? new Date(employeeFields.hireDate) : null
        }
        if (employeeFields.workPassExpiry !== undefined) {
          data.workPassExpiry = employeeFields.workPassExpiry ? new Date(employeeFields.workPassExpiry) : null
        }

        updatedEmployee = await tx.employee.update({
          where: { userId: authUser.id },
          data,
          include: { department: { select: { id: true, name: true, color: true } } },
        })
      }

      return { user: updatedUser, employee: updatedEmployee }
    })

    return NextResponse.json(result)
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const formData = await request.formData()
    const file = formData.get('avatar') as File | null
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'File must be an image' }, { status: 400 })
    }

    // Upload to Supabase Storage
    const ext = file.name.split('.').pop() || 'jpg'
    const path = `${authUser.id}.${ext}`
    const buffer = Buffer.from(await file.arrayBuffer())

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, buffer, {
        contentType: file.type,
        upsert: true,
      })

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 })
    }

    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)

    // Update user avatar URL
    await prisma.user.update({
      where: { id: authUser.id },
      data: { avatarUrl: publicUrl },
    })

    return NextResponse.json({ avatarUrl: publicUrl })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
