// src/lib/db/queries.ts
import { prisma } from './prisma'
import { Prisma } from '@prisma/client'
import { getLimits, withinLimit } from '@/lib/limits'
import type { Plan } from '@prisma/client'
import type { MtoSystem, SavedJob, LibraryItem, GlobalTag, MaterialSpec, Report, Profile, ActivityLibraryItem, Supplier } from '@/types'

/** Narrow domain arrays/objects to Prisma's InputJsonValue in one place */
function asJson<T>(value: T): Prisma.InputJsonValue { return value as unknown as Prisma.InputJsonValue }

// ─── Ownership guard ─────────────────────────────────────────────────────────
// Verifies a record belongs to the company before update/delete.

async function verifyOwnership(
  model: { findFirst: (args: any) => Promise<any> },
  id: string,
  companyId: string,
  label: string,
) {
  const record = await model.findFirst({ where: { id, companyId }, select: { id: true } })
  if (!record) throw new Error(`${label} not found`)
}

// ─── Company helpers ───────────────────────────────────────────────────────────

export async function getUserCompany(userId: string) {
  const member = await prisma.companyMember.findFirst({
    where:   { userId },
    include: { company: true },
  })
  return member?.company ?? null
}

export async function getCompanyPlan(userId: string): Promise<Plan> {
  const member = await prisma.companyMember.findFirst({
    where:  { userId },
    select: { company: { select: { plan: true } } },
  })
  return member?.company?.plan ?? 'FREE'
}

export async function getCompanyPlanById(companyId: string): Promise<Plan> {
  const company = await prisma.company.findUnique({
    where:  { id: companyId },
    select: { plan: true },
  })
  return company?.plan ?? 'FREE'
}

// ─── Plan helper (kept for compatibility — reads from Company) ─────────────────

export async function getUserWithPlan(userId: string) {
  return prisma.user.findUnique({
    where:   { id: userId },
    include: { profile: true, companyMembers: { include: { company: true } } },
  })
}

// ─── User ─────────────────────────────────────────────────────────────────────

export async function upsertUser(id: string, email: string, name?: string | null) {
  const user = await prisma.user.upsert({
    where:  { id },
    update: { email, name },
    create: { id, email, name },
  })

  // Auto-provision a Company for new users if they don't have one yet
  const existingMember = await prisma.companyMember.findFirst({ where: { userId: id } })
  if (!existingMember) {
    const baseSlug = (name ?? email).replace(/[^a-z0-9]/gi, '-').toLowerCase().slice(0, 20)
    const slug     = `${baseSlug}-${id.slice(0, 6)}`
    const company  = await prisma.company.create({
      data: { name: name ?? email, slug },
    })
    await prisma.companyMember.create({
      data: {
        companyId: company.id,
        userId: id,
        role: 'OWNER',
        permissions: { systems: 'write', library: 'write', reports: 'write', logistics: 'write', tenders: 'write' },
      },
    })

    // Seed sample systems so new users have data to explore
    await seedSampleSystems(company.id, id)
  }

  return user
}

async function seedSampleSystems(companyId: string, userId: string) {
  const { SAMPLE_SYSTEMS } = await import('@/lib/sample-systems')
  try {
    await prisma.mtoSystem.createMany({
      data: SAMPLE_SYSTEMS.map(s => ({
        companyId,
        createdById:    userId,
        name:           s.template.name        ?? s.label,
        description:    s.template.description  ?? s.description,
        icon:           s.template.icon         ?? '📦',
        color:          s.template.color        ?? '#7917de',
        inputModel:     s.template.inputModel   ?? 'linear',
        materials:      asJson(s.template.materials      ?? []),
        customDims:     asJson(s.template.customDims     ?? []),
        customCriteria: asJson(s.template.customCriteria ?? []),
        variants:       asJson(s.template.variants       ?? []),
        warnings:       asJson(s.template.warnings       ?? []),
        customBrackets: asJson(s.template.customBrackets ?? []),
        workActivities: asJson(s.template.workActivities ?? []),
      })),
    })
  } catch {
    // Non-critical — don't block signup if seeding fails
  }
}

// ─── Profile ──────────────────────────────────────────────────────────────────

export async function getProfile(userId: string) {
  return prisma.profile.findUnique({ where: { userId } })
}

export async function upsertProfile(userId: string, data: Partial<Profile>) {
  return prisma.profile.upsert({
    where:  { userId },
    update: data as any,
    create: { userId, ...(data as any) },
  })
}

// ─── MTO Systems ──────────────────────────────────────────────────────────────

export async function getMtoSystems(companyId: string) {
  return prisma.mtoSystem.findMany({
    where:   { companyId, isArchived: false },
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true, name: true, description: true,
      icon: true, color: true, inputModel: true,
      createdAt: true, updatedAt: true,
      _count: { select: { mtoJobs: true } },
    },
  })
}

export async function getMtoSystem(id: string, companyId: string) {
  return prisma.mtoSystem.findFirst({ where: { id, companyId } })
}

export async function createMtoSystem(companyId: string, createdById: string, data: Partial<MtoSystem>) {
  const plan   = await getCompanyPlanById(companyId)
  const limits = getLimits(plan)
  return prisma.$transaction(async (tx) => {
    const count = await tx.mtoSystem.count({ where: { companyId, isArchived: false } })
    if (!withinLimit(count, limits.maxSystems)) {
      throw new LimitError('maxSystems')
    }
    return tx.mtoSystem.create({
      data: {
        companyId,
        createdById,
        name:           data.name        ?? 'New System',
        description:    data.description ?? '',
        icon:           data.icon        ?? '📦',
        color:          data.color       ?? '#7917de',
        inputModel:     data.inputModel  ?? 'linear',
        materials:      asJson(data.materials      ?? []),
        customDims:     asJson(data.customDims     ?? []),
        customCriteria: asJson(data.customCriteria ?? []),
        variants:       asJson(data.variants       ?? []),
        warnings:       asJson(data.warnings       ?? []),
        customBrackets: asJson(data.customBrackets ?? []),
        workActivities: asJson(data.workActivities ?? []),
      },
    })
  })
}

export async function updateMtoSystem(id: string, companyId: string, data: Partial<MtoSystem> & { materials?: any }) {
  await verifyOwnership(prisma.mtoSystem, id, companyId, 'System')
  if (data.materials !== undefined) {
    const plan   = await getCompanyPlanById(companyId)
    const limits = getLimits(plan)
    const mats   = Array.isArray(data.materials) ? data.materials : []
    if (!withinLimit(mats.length - 1, limits.maxMaterials)) {
      throw new LimitError('maxMaterials')
    }
  }
  return prisma.mtoSystem.update({
    where: { id },
    data: {
      ...(data.name           !== undefined && { name:           data.name }),
      ...(data.shortName      !== undefined && { shortName:      data.shortName }),
      ...(data.description    !== undefined && { description:    data.description }),
      ...(data.icon           !== undefined && { icon:           data.icon }),
      ...(data.color          !== undefined && { color:          data.color }),
      ...(data.inputModel     !== undefined && { inputModel:     data.inputModel }),
      ...(data.materials      !== undefined && { materials:      asJson(data.materials) }),
      ...(data.customDims     !== undefined && { customDims:     asJson(data.customDims) }),
      ...(data.customCriteria !== undefined && { customCriteria: asJson(data.customCriteria) }),
      ...(data.variants       !== undefined && { variants:       asJson(data.variants) }),
      ...(data.warnings       !== undefined && { warnings:       asJson(data.warnings) }),
      ...(data.customBrackets !== undefined && { customBrackets: asJson(data.customBrackets) }),
      ...(data.workActivities !== undefined && { workActivities: asJson(data.workActivities) }),
      ...(data.isLocked         !== undefined && { isLocked:         data.isLocked }),
      ...(data.materialSnapshot !== undefined && { materialSnapshot: data.materialSnapshot === null ? Prisma.JsonNull : asJson(data.materialSnapshot) }),
    },
  })
}

export async function archiveMtoSystem(id: string, companyId: string) {
  await verifyOwnership(prisma.mtoSystem, id, companyId, 'System')
  return prisma.mtoSystem.update({ where: { id }, data: { isArchived: true } })
}

// ─── MTO Jobs ─────────────────────────────────────────────────────────────────

export async function getMtoJobs(companyId: string, mtoSystemId?: string) {
  return prisma.mtoJob.findMany({
    where:   { companyId, isArchived: false, ...(mtoSystemId && { mtoSystemId }) },
    orderBy: { updatedAt: 'desc' },
    select:  {
      id: true, name: true, mtoSystemId: true, calculatedAt: true, createdAt: true, updatedAt: true,
      mtoSystem: { select: { id: true, name: true, icon: true, color: true } },
    },
  })
}

export async function getMtoJob(id: string, companyId: string) {
  return prisma.mtoJob.findFirst({ where: { id, companyId } })
}

export async function createMtoJob(companyId: string, createdById: string, mtoSystemId: string, data: Partial<SavedJob>) {
  const plan   = await getCompanyPlanById(companyId)
  const limits = getLimits(plan)

  const runs = data.runs ?? []
  if (!withinLimit(runs.length - 1, limits.maxRuns)) throw new LimitError('maxRuns')

  return prisma.$transaction(async (tx) => {
    const count = await tx.mtoJob.count({ where: { companyId, isArchived: false } })
    if (!withinLimit(count, limits.maxJobs)) throw new LimitError('maxJobs')

    return tx.mtoJob.create({
      data: {
        companyId, createdById, mtoSystemId,
        name:           data.name           ?? 'Untitled Job',
        runs:           asJson(data.runs           ?? []),
        criteriaState:  asJson(data.criteriaState  ?? {}),
        variantState:   asJson(data.variantState   ?? {}),
        stockOptimMode: data.stockOptimMode  ?? 'min_waste',
        calculatedAt:   data.calculatedAt    ? new Date(data.calculatedAt) : null,
        matVersions:    asJson(data.matVersions    ?? {}),
        lastResults:    asJson(data.lastResults    ?? null),
      },
    })
  })
}

export async function updateMtoJob(id: string, companyId: string, data: Partial<SavedJob>) {
  await verifyOwnership(prisma.mtoJob, id, companyId, 'Job')
  if (data.runs !== undefined) {
    const limits = getLimits(await getCompanyPlanById(companyId))
    if (!(data.runs.length <= limits.maxRuns || limits.maxRuns === -1)) {
      throw new LimitError('maxRuns')
    }
  }
  return prisma.mtoJob.update({
    where: { id },
    data: {
      ...(data.name           !== undefined && { name:           data.name }),
      ...(data.runs           !== undefined && { runs:           asJson(data.runs) }),
      ...(data.criteriaState  !== undefined && { criteriaState:  asJson(data.criteriaState) }),
      ...(data.variantState   !== undefined && { variantState:   asJson(data.variantState) }),
      ...(data.stockOptimMode !== undefined && { stockOptimMode: data.stockOptimMode }),
      ...(data.calculatedAt   !== undefined && { calculatedAt:   data.calculatedAt ? new Date(data.calculatedAt) : null }),
      ...(data.matVersions    !== undefined && { matVersions:    asJson(data.matVersions) }),
    },
  })
}

export async function archiveMtoJob(id: string, companyId: string) {
  await verifyOwnership(prisma.mtoJob, id, companyId, 'Job')
  return prisma.mtoJob.update({ where: { id }, data: { isArchived: true } })
}

// ─── Run Drafts (auto-save) ──────────────────────────────────────────────────

export async function getRunDraft(userId: string, mtoSystemId: string) {
  return prisma.mtoRunDraft.findUnique({
    where: { userId_mtoSystemId: { userId, mtoSystemId } },
  })
}

export async function upsertRunDraft(
  companyId: string,
  userId: string,
  mtoSystemId: string,
  data: { runs: any[]; stockOptimMode: string },
) {
  return prisma.mtoRunDraft.upsert({
    where: { userId_mtoSystemId: { userId, mtoSystemId } },
    update: {
      runs: asJson(data.runs),
      stockOptimMode: data.stockOptimMode,
    },
    create: {
      companyId,
      userId,
      mtoSystemId,
      runs: asJson(data.runs),
      stockOptimMode: data.stockOptimMode,
    },
  })
}

export async function deleteRunDraft(userId: string, mtoSystemId: string) {
  return prisma.mtoRunDraft.deleteMany({
    where: { userId, mtoSystemId },
  })
}

// ─── Material Specs ───────────────────────────────────────────────────────────

export async function getMaterialSpecs(companyId: string) {
  return prisma.materialSpec.findMany({ where: { companyId }, orderBy: { updatedAt: 'desc' } })
}

export async function upsertMaterialSpec(companyId: string, createdById: string, data: Partial<MaterialSpec>) {
  const key = data.productCode ? { companyId, productCode: data.productCode } : null
  if (key) {
    return prisma.materialSpec.upsert({
      where:  { companyId_productCode: key },
      update: data as any,
      create: { companyId, createdById, ...(data as any) },
    })
  }
  return prisma.materialSpec.create({ data: { companyId, createdById, ...(data as any) } })
}

export async function deleteMaterialSpec(id: string, companyId: string) {
  await verifyOwnership(prisma.materialSpec, id, companyId, 'MaterialSpec')
  return prisma.materialSpec.delete({ where: { id } })
}

// ─── Reports ──────────────────────────────────────────────────────────────────

export async function getReports(companyId: string) {
  return prisma.report.findMany({
    where:   { companyId, isArchived: false },
    orderBy: { createdAt: 'desc' },
    select:  { id: true, title: true, jobRef: true, reportDate: true, systemName: true, isPublic: true, publicToken: true, createdAt: true },
  })
}

export async function getReport(id: string, companyId: string) {
  return prisma.report.findFirst({ where: { id, companyId } })
}

export async function getReportByToken(token: string) {
  return prisma.report.findFirst({ where: { publicToken: token, isPublic: true, isArchived: false } })
}

export async function createReport(companyId: string, createdById: string, data: Partial<Report>) {
  const { nanoid } = await import('nanoid')
  return prisma.report.create({
    data: {
      companyId,
      createdById,
      title:            data.title       ?? 'MTO Report',
      jobRef:           data.jobRef,
      preparedBy:       data.preparedBy,
      preparedFor:      data.preparedFor,
      reportDate:       data.reportDate  ? new Date(data.reportDate) : new Date(),
      revisionNo:       data.revisionNo  ?? 'A',
      notes:            data.notes,
      isPublic:         data.isPublic    ?? false,
      publicToken:      data.isPublic    ? nanoid(12) : null,
      companyName:      data.companyName,
      companyLogo:      data.companyLogo,
      companyAddr:      data.companyAddr,
      abn:              data.abn,
      showPricing:      data.showPricing ?? false,
      showWeights:      data.showWeights ?? false,
      currency:         data.currency    ?? 'SGD',
      mtoSystemId:      data.systemId,
      mtoJobId:         data.jobId,
      systemName:       data.systemName,
      resultsSnapshot:  asJson(data.resultsSnapshot),
      specsSnapshot:    asJson(data.specsSnapshot),
    },
  })
}

export async function updateReport(id: string, companyId: string, data: Partial<Report>) {
  await verifyOwnership(prisma.report, id, companyId, 'Report')
  const { nanoid } = await import('nanoid')
  return prisma.report.update({
    where: { id },
    data: {
      ...(data.title        !== undefined && { title:        data.title }),
      ...(data.jobRef       !== undefined && { jobRef:       data.jobRef }),
      ...(data.preparedBy   !== undefined && { preparedBy:   data.preparedBy }),
      ...(data.preparedFor  !== undefined && { preparedFor:  data.preparedFor }),
      ...(data.notes        !== undefined && { notes:        data.notes }),
      ...(data.revisionNo   !== undefined && { revisionNo:   data.revisionNo }),
      ...(data.showPricing  !== undefined && { showPricing:  data.showPricing }),
      ...(data.showWeights  !== undefined && { showWeights:  data.showWeights }),
      ...(data.isPublic     !== undefined && {
        isPublic:    data.isPublic,
        publicToken: data.isPublic ? nanoid(12) : null,
      }),
    },
  })
}

export async function archiveReport(id: string, companyId: string) {
  await verifyOwnership(prisma.report, id, companyId, 'Report')
  return prisma.report.update({ where: { id }, data: { isArchived: true } })
}

// ─── Library ──────────────────────────────────────────────────────────────────

export async function getLibraryItems(companyId: string) {
  const [items, systems] = await Promise.all([
    prisma.libraryItem.findMany({
      where:   { companyId },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
      include: {
        grade:        { select: { id: true, name: true, materialType: true, density: true } },
        manufacturer: { select: { id: true, name: true } },
      },
    }),
    prisma.mtoSystem.findMany({ where: { companyId, isArchived: false }, select: { id: true, name: true, shortName: true, materials: true } }),
  ])

  // Build usedInSystems dynamically from the actual JSON — always accurate
  const usedIn = new Map<string, { id: string; name: string; shortName?: string | null }[]>()
  for (const sys of systems) {
    const mats = sys.materials as { libraryRef?: string | null }[]
    for (const mat of mats) {
      if (mat.libraryRef) {
        if (!usedIn.has(mat.libraryRef)) usedIn.set(mat.libraryRef, [])
        const list = usedIn.get(mat.libraryRef)!
        if (!list.some(s => s.id === sys.id)) {
          list.push({ id: sys.id, name: sys.name, shortName: sys.shortName })
        }
      }
    }
  }

  return items.map(item => ({ ...item, usedInSystems: usedIn.get(item.id) ?? [] }))
}

export async function createLibraryItem(companyId: string, createdById: string, data: Partial<LibraryItem>) {
  const plan   = await getCompanyPlanById(companyId)
  const limits = getLimits(plan)

  return prisma.$transaction(async (tx) => {
    const count = await tx.libraryItem.count({ where: { companyId } })
    if (!withinLimit(count, limits.maxLibraryItems)) throw new LimitError('maxLibraryItems')

    return tx.libraryItem.create({
      data: {
        companyId,
        createdById,
        name:           data.name ?? '',
        unit:           data.unit ?? 'each',
        notes:          data.notes,
        productCode:    data.productCode,
        category:       data.category ?? 'other',
        photo:          data.photo,
        properties:     asJson(data.properties ?? {}),
        ...(data.spec           !== undefined && { spec: asJson(data.spec) }),
        ...(data.gradeId        !== undefined && { gradeId: data.gradeId }),
        ...(data.manufacturerId !== undefined && { manufacturerId: data.manufacturerId }),
      },
    })
  })
}

export async function updateLibraryItem(id: string, companyId: string, data: Partial<LibraryItem>) {
  await verifyOwnership(prisma.libraryItem, id, companyId, 'LibraryItem')
  // Exclude computed/relational fields that can't be written directly
  const { grade, manufacturer, certifications, usedInSystems, ...rest } = data as any
  return prisma.libraryItem.update({ where: { id }, data: rest as any })
}

export async function deleteLibraryItem(id: string, companyId: string) {
  await verifyOwnership(prisma.libraryItem, id, companyId, 'LibraryItem')
  return prisma.libraryItem.delete({ where: { id } })
}

export async function addSystemToLibraryItem(id: string, sysId: string, companyId: string) {
  await verifyOwnership(prisma.libraryItem, id, companyId, 'LibraryItem')
  await verifyOwnership(prisma.mtoSystem, sysId, companyId, 'MtoSystem')
  const item = await prisma.libraryItem.findUnique({ where: { id }, select: { usedInSystems: true } })
  if (!item || item.usedInSystems.includes(sysId)) return
  return prisma.libraryItem.update({ where: { id }, data: { usedInSystems: { push: sysId } } })
}

export async function removeSystemFromLibraryItem(id: string, sysId: string, companyId: string) {
  await verifyOwnership(prisma.libraryItem, id, companyId, 'LibraryItem')
  await verifyOwnership(prisma.mtoSystem, sysId, companyId, 'MtoSystem')
  const item = await prisma.libraryItem.findUnique({ where: { id }, select: { usedInSystems: true } })
  if (!item) return
  return prisma.libraryItem.update({ where: { id }, data: { usedInSystems: item.usedInSystems.filter(s => s !== sysId) } })
}

// ─── Tags ─────────────────────────────────────────────────────────────────────

export async function getGlobalTags(companyId: string) {
  return prisma.globalTag.findMany({ where: { companyId }, orderBy: { order: 'asc' } })
}

export async function upsertGlobalTags(companyId: string, createdById: string, tags: GlobalTag[]) {
  return prisma.$transaction([
    prisma.globalTag.deleteMany({ where: { companyId } }),
    ...tags.map((t, i) => prisma.globalTag.create({ data: { id: t.id, companyId, createdById, name: t.name, color: t.color, order: i } })),
  ])
}

// ─── Activity Library ─────────────────────────────────────────────────────────

export async function getActivityLibrary(companyId: string) {
  return prisma.activityLibraryItem.findMany({
    where:   { companyId },
    orderBy: [{ phase: 'asc' }, { name: 'asc' }],
  })
}

export async function createActivityLibraryItem(companyId: string, createdById: string, data: Partial<ActivityLibraryItem>) {
  return prisma.activityLibraryItem.create({
    data: {
      companyId,
      createdById,
      name:           data.name           ?? 'New Activity',
      phase:          data.phase          ?? 'installation',
      icon:           data.icon           ?? null,
      description:    data.description    ?? null,
      rateType:       data.rateType       ?? 'per_dim',
      defaultTimeMin: data.defaultTimeMin ?? null,
      speedMode:      data.speedMode      ?? null,
      defaultRate:    data.defaultRate    ?? null,
      workActivityRateId: data.workActivityRateId ?? null,
      supplier:       data.supplier       ?? null,
      supplierContact: data.supplierContact ?? null,
    },
  })
}

export async function updateActivityLibraryItem(id: string, companyId: string, data: Partial<ActivityLibraryItem>) {
  await verifyOwnership(prisma.activityLibraryItem, id, companyId, 'ActivityLibraryItem')
  return prisma.activityLibraryItem.update({ where: { id }, data: data as any })
}

export async function deleteActivityLibraryItem(id: string, companyId: string) {
  await verifyOwnership(prisma.activityLibraryItem, id, companyId, 'ActivityLibraryItem')
  return prisma.activityLibraryItem.delete({ where: { id } })
}

// ─── Suppliers ────────────────────────────────────────────────────────────────

export async function getSuppliers(companyId: string) {
  return prisma.supplier.findMany({ where: { companyId, isArchived: false }, orderBy: { name: 'asc' } })
}

export async function createSupplier(companyId: string, createdById: string, data: Partial<Supplier>) {
  return prisma.supplier.create({
    data: {
      companyId,
      createdById,
      name:          data.name          ?? '',
      contactPerson: data.contactPerson ?? null,
      email:         data.email         ?? null,
      phone:         data.phone         ?? null,
      address:       data.address       ?? null,
      paymentTerms:  data.paymentTerms  ?? null,
      notes:         data.notes         ?? null,
    },
  })
}

export async function updateSupplier(id: string, companyId: string, data: Partial<Supplier>) {
  await verifyOwnership(prisma.supplier, id, companyId, 'Supplier')
  return prisma.supplier.update({ where: { id }, data: data as any })
}

export async function deleteSupplier(id: string, companyId: string) {
  await verifyOwnership(prisma.supplier, id, companyId, 'Supplier')
  return prisma.supplier.update({ where: { id }, data: { isArchived: true } })
}

// ─── Purchase Orders ──────────────────────────────────────────────────────────

export async function getPurchaseOrders(companyId: string) {
  return prisma.purchaseOrder.findMany({
    where:   { companyId },
    orderBy: { createdAt: 'desc' },
    include: { lines: true, supplier: { select: { id: true, name: true } } },
  })
}

export async function createPurchaseOrder(companyId: string, createdById: string, data: any) {
  const { lines, ...header } = data
  return prisma.purchaseOrder.create({
    data: { companyId, createdById, ...header, lines: { create: lines ?? [] } },
    include: { lines: true },
  })
}

export async function updatePurchaseOrder(id: string, companyId: string, data: any) {
  await verifyOwnership(prisma.purchaseOrder, id, companyId, 'PurchaseOrder')
  const { lines, ...header } = data
  return prisma.$transaction(async (tx) => {
    if (lines !== undefined) {
      await tx.purchaseOrderLine.deleteMany({ where: { poId: id } })
      for (const l of lines) {
        await tx.purchaseOrderLine.create({ data: { poId: id, ...l } })
      }
    }
    return tx.purchaseOrder.update({ where: { id }, data: header, include: { lines: true } })
  })
}

export async function deletePurchaseOrder(id: string, companyId: string) {
  await verifyOwnership(prisma.purchaseOrder, id, companyId, 'PurchaseOrder')
  return prisma.purchaseOrder.delete({ where: { id } })
}

// ─── Delivery Orders ──────────────────────────────────────────────────────────

export async function getDeliveryOrders(companyId: string) {
  return prisma.deliveryOrder.findMany({
    where:   { companyId },
    orderBy: { createdAt: 'desc' },
    include: { lines: true, po: { select: { id: true, ref: true, supplierName: true } } },
  })
}

export async function createDeliveryOrder(companyId: string, createdById: string, data: any) {
  const { lines, ...header } = data
  return prisma.deliveryOrder.create({
    data: { companyId, createdById, ...header, lines: { create: lines ?? [] } },
    include: { lines: true, po: { select: { id: true, ref: true, supplierName: true } } },
  })
}

export async function updateDeliveryOrder(id: string, companyId: string, data: any) {
  await verifyOwnership(prisma.deliveryOrder, id, companyId, 'DeliveryOrder')
  const { lines, ...header } = data
  return prisma.$transaction(async (tx) => {
    if (lines !== undefined) {
      await tx.deliveryOrderLine.deleteMany({ where: { doId: id } })
      for (const l of lines) {
        await tx.deliveryOrderLine.create({ data: { doId: id, ...l } })
      }
    }
    return tx.deliveryOrder.update({
      where: { id }, data: header,
      include: { lines: true, po: { select: { id: true, ref: true, supplierName: true } } },
    })
  })
}

export async function deleteDeliveryOrder(id: string, companyId: string) {
  await verifyOwnership(prisma.deliveryOrder, id, companyId, 'DeliveryOrder')
  return prisma.deliveryOrder.delete({ where: { id } })
}

// ─── Material Categories ──────────────────────────────────────────────────────

export async function getMaterialCategories(companyId: string) {
  return prisma.materialCategory.findMany({
    where:   { companyId },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
  })
}

export async function createMaterialCategory(companyId: string, createdById: string, data: { name: string; icon?: string }) {
  return prisma.materialCategory.create({
    data: { companyId, createdById, name: data.name.trim().toLowerCase(), icon: data.icon ?? '📦' },
  })
}

export async function updateMaterialCategory(id: string, companyId: string, data: { name?: string; icon?: string; sortOrder?: number }) {
  await verifyOwnership(prisma.materialCategory, id, companyId, 'MaterialCategory')
  return prisma.materialCategory.update({ where: { id }, data })
}

export async function deleteMaterialCategory(id: string, companyId: string) {
  await verifyOwnership(prisma.materialCategory, id, companyId, 'MaterialCategory')
  return prisma.materialCategory.delete({ where: { id } })
}

// ─── Material Grades ──────────────────────────────────────────────────────────

export async function getMaterialGrades(companyId: string) {
  return prisma.materialGrade.findMany({ where: { companyId }, orderBy: { name: 'asc' } })
}

export async function createMaterialGrade(companyId: string, createdById: string, data: { name: string; materialType?: string; standard?: string; density?: number; notes?: string }) {
  return prisma.materialGrade.create({
    data: { companyId, createdById, name: data.name.trim(), materialType: data.materialType ?? null, standard: data.standard ?? null, density: data.density ?? null, notes: data.notes ?? null },
  })
}

export async function updateMaterialGrade(id: string, companyId: string, data: { name?: string; materialType?: string | null; standard?: string | null; density?: number | null; notes?: string | null }) {
  await verifyOwnership(prisma.materialGrade, id, companyId, 'MaterialGrade')
  return prisma.materialGrade.update({ where: { id }, data })
}

export async function deleteMaterialGrade(id: string, companyId: string) {
  await verifyOwnership(prisma.materialGrade, id, companyId, 'MaterialGrade')
  return prisma.materialGrade.delete({ where: { id } })
}

// ─── Manufacturers ────────────────────────────────────────────────────────────

export async function getManufacturers(companyId: string) {
  return prisma.manufacturer.findMany({ where: { companyId, isArchived: false }, orderBy: { name: 'asc' } })
}

export async function createManufacturer(companyId: string, createdById: string, data: { name: string; contactPerson?: string; email?: string; phone?: string; country?: string; website?: string; notes?: string }) {
  return prisma.manufacturer.create({
    data: { companyId, createdById, name: data.name.trim(), contactPerson: data.contactPerson ?? null, email: data.email ?? null, phone: data.phone ?? null, country: data.country ?? null, website: data.website ?? null, notes: data.notes ?? null },
  })
}

export async function updateManufacturer(id: string, companyId: string, data: { name?: string; contactPerson?: string | null; email?: string | null; phone?: string | null; country?: string | null; website?: string | null; notes?: string | null }) {
  await verifyOwnership(prisma.manufacturer, id, companyId, 'Manufacturer')
  return prisma.manufacturer.update({ where: { id }, data })
}

export async function deleteManufacturer(id: string, companyId: string) {
  await verifyOwnership(prisma.manufacturer, id, companyId, 'Manufacturer')
  return prisma.manufacturer.update({ where: { id }, data: { isArchived: true } })
}

// ─── Material Certifications ──────────────────────────────────────────────────

export async function getCertifications(libraryItemId: string, companyId: string) {
  return prisma.materialCertification.findMany({
    where:   { libraryItemId, companyId },
    orderBy: { createdAt: 'desc' },
  })
}

export async function createCertification(companyId: string, createdById: string, data: {
  libraryItemId: string; type: string; certNumber?: string; issuedBy?: string
  issuedDate?: Date; expiryDate?: Date; fileUrl?: string; fileName?: string; notes?: string
}) {
  await verifyOwnership(prisma.libraryItem, data.libraryItemId, companyId, 'LibraryItem')
  return prisma.materialCertification.create({ data: { companyId, createdById, ...data } })
}

export async function deleteCertification(id: string, companyId: string) {
  // Return the cert first so the caller can delete the file from storage
  const cert = await prisma.materialCertification.findFirst({ where: { id, companyId } })
  if (cert) await prisma.materialCertification.delete({ where: { id } })
  return cert
}

// ─── Tenders ──────────────────────────────────────────────────────────────────

export async function getTenders(companyId: string) {
  return prisma.tender.findMany({
    where:   { companyId, isArchived: false },
    select:  {
      id: true, name: true, clientName: true, clientId: true,
      client: { select: { id: true, name: true } },
      reference: true,
      submissionDate: true, status: true, createdAt: true, updatedAt: true,
      _count: { select: { items: true } },
    },
    orderBy: { updatedAt: 'desc' },
  })
}

export async function getTender(id: string, companyId: string) {
  return prisma.tender.findFirst({
    where:   { id, companyId, isArchived: false },
    include: {
      client: { select: { id: true, name: true, contactPerson: true, email: true, phone: true } },
      items: {
        orderBy: { sortOrder: 'asc' },
        include: {
          system: { select: { id: true, name: true, icon: true, color: true } },
          job:    { select: { id: true, name: true, calculatedAt: true, lastResults: true } },
        },
      },
    },
  })
}

export async function createTender(companyId: string, createdById: string, data: {
  name: string; clientId?: string | null; clientName?: string | null;
  projectName?: string; reference?: string; submissionDate?: Date | null; notes?: string;
}) {
  return prisma.tender.create({ data: { companyId, createdById, ...data } })
}

export async function updateTender(id: string, companyId: string, data: Partial<{
  name: string; clientId: string | null; clientName: string | null;
  projectName: string; reference: string;
  submissionDate: Date | null; status: string; notes: string;
}>) {
  await verifyOwnership(prisma.tender, id, companyId, 'Tender')
  return prisma.tender.update({ where: { id }, data: data as any })
}

// ─── Clients ──────────────────────────────────────────────────────────────────

export async function getClients(companyId: string) {
  return prisma.client.findMany({
    where:   { companyId, isArchived: false },
    select:  { id: true, name: true, contactPerson: true, email: true, phone: true, address: true, notes: true, createdAt: true, _count: { select: { tenders: true } } },
    orderBy: { name: 'asc' },
  })
}

export async function getClient(id: string, companyId: string) {
  return prisma.client.findFirst({ where: { id, companyId } })
}

export async function createClient(companyId: string, createdById: string, data: {
  name: string; contactPerson?: string; email?: string; phone?: string;
  address?: string; notes?: string;
}) {
  return prisma.client.create({ data: { companyId, createdById, ...data } })
}

export async function updateClient(id: string, companyId: string, data: Partial<{
  name: string; contactPerson: string | null; email: string | null; phone: string | null;
  address: string | null; notes: string | null;
}>) {
  await verifyOwnership(prisma.client, id, companyId, 'Client')
  return prisma.client.update({ where: { id }, data: data as any })
}

export async function archiveClient(id: string, companyId: string) {
  await verifyOwnership(prisma.client, id, companyId, 'Client')
  return prisma.client.update({ where: { id }, data: { isArchived: true } })
}

export async function archiveTender(id: string, companyId: string) {
  await verifyOwnership(prisma.tender, id, companyId, 'Tender')
  return prisma.tender.update({ where: { id }, data: { isArchived: true } })
}

export async function addTenderItem(companyId: string, tenderId: string, data: {
  systemId?: string; jobId?: string; notes?: string; sortOrder?: number;
}) {
  // Verify ownership
  const tender = await prisma.tender.findFirst({ where: { id: tenderId, companyId } })
  if (!tender) throw new Error('Tender not found')
  return prisma.tenderItem.create({ data: { tenderId, ...data } })
}

export async function removeTenderItem(id: string, companyId: string) {
  const item = await prisma.tenderItem.findFirst({
    where: { id },
    include: { tender: { select: { companyId: true } } },
  })
  if (!item || item.tender.companyId !== companyId) throw new Error('Not found')
  return prisma.tenderItem.delete({ where: { id } })
}

// ─── Labour Rates ─────────────────────────────────────────────────────────────

export async function getLabourRates(companyId: string) {
  return prisma.labourRate.findMany({ where: { companyId, isArchived: false }, orderBy: [{ category: 'asc' }, { name: 'asc' }] })
}

export async function createLabourRate(companyId: string, createdById: string, data: Partial<{ name: string; category: string; unitType: string; unitLabel: string; rate: number; notes: string }>) {
  return prisma.labourRate.create({
    data: {
      companyId,
      createdById,
      name:      data.name      ?? '',
      category:  data.category  ?? '',
      unitType:  data.unitType  ?? 'per_hour',
      unitLabel: data.unitLabel ?? 'hr',
      rate:      data.rate      ?? 0,
      notes:     data.notes     ?? null,
    },
  })
}

export async function updateLabourRate(id: string, companyId: string, data: any) {
  await verifyOwnership(prisma.labourRate, id, companyId, 'LabourRate')
  return prisma.labourRate.update({ where: { id }, data })
}

export async function deleteLabourRate(id: string, companyId: string) {
  await verifyOwnership(prisma.labourRate, id, companyId, 'LabourRate')
  return prisma.labourRate.update({ where: { id }, data: { isArchived: true } })
}

// ─── Work Categories ─────────────────────────────────────────────────────────

export async function getWorkCategories(companyId: string) {
  return prisma.workCategory.findMany({ where: { companyId, isArchived: false }, orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] })
}

export async function createWorkCategory(companyId: string, createdById: string, data: Partial<{ name: string; icon: string; color: string; description: string; sortOrder: number }>) {
  return prisma.workCategory.create({
    data: {
      companyId,
      createdById,
      name:        data.name        ?? '',
      icon:        data.icon        ?? '🔧',
      color:       data.color       ?? '#7c3aed',
      description: data.description ?? null,
      sortOrder:   data.sortOrder   ?? 0,
    },
  })
}

export async function updateWorkCategory(id: string, companyId: string, data: any) {
  await verifyOwnership(prisma.workCategory, id, companyId, 'WorkCategory')
  return prisma.workCategory.update({ where: { id }, data })
}

export async function deleteWorkCategory(id: string, companyId: string) {
  await verifyOwnership(prisma.workCategory, id, companyId, 'WorkCategory')
  return prisma.workCategory.update({ where: { id }, data: { isArchived: true } })
}

// ─── Work Activity Rates ─────────────────────────────────────────────────────

export async function getWorkActivityRates(companyId: string) {
  return prisma.workActivityRate.findMany({ where: { companyId, isArchived: false }, orderBy: [{ categoryName: 'asc' }, { name: 'asc' }] })
}

export async function createWorkActivityRate(
  companyId: string,
  createdById: string,
  data: Partial<{
    name: string; workCategoryId: string; labourRateId: string
    categoryName: string; categoryIcon: string
    rateName: string; rateValue: number; rateUnitType: string; rateUnitLabel: string
    speedMode: string; defaultTimePerUnit: number; defaultRatePerHr: number; crewSize: number
    notes: string
  }>
) {
  return prisma.workActivityRate.create({
    data: {
      companyId,
      createdById,
      name:               data.name               ?? '',
      workCategoryId:     data.workCategoryId      ?? '',
      labourRateId:       data.labourRateId        ?? '',
      categoryName:       data.categoryName        ?? '',
      categoryIcon:       data.categoryIcon        ?? '🔧',
      rateName:           data.rateName            ?? '',
      rateValue:          data.rateValue           ?? 0,
      rateUnitType:       data.rateUnitType        ?? 'per_hour',
      rateUnitLabel:      data.rateUnitLabel       ?? 'hr',
      speedMode:          data.speedMode           ?? null,
      defaultTimePerUnit: data.defaultTimePerUnit  ?? null,
      defaultRatePerHr:   data.defaultRatePerHr    ?? null,
      crewSize:           data.crewSize            ?? 1,
      notes:              data.notes               ?? null,
      systemTags:         asJson(data.systemTags   ?? []),
    },
  })
}

export async function updateWorkActivityRate(id: string, companyId: string, data: any) {
  await verifyOwnership(prisma.workActivityRate, id, companyId, 'WorkActivityRate')
  return prisma.workActivityRate.update({ where: { id }, data })
}

export async function deleteWorkActivityRate(id: string, companyId: string) {
  await verifyOwnership(prisma.workActivityRate, id, companyId, 'WorkActivityRate')
  return prisma.workActivityRate.update({ where: { id }, data: { isArchived: true } })
}

// ─── LimitError ───────────────────────────────────────────────────────────────

export class LimitError extends Error {
  feature: string
  constructor(feature: string) {
    super('Plan limit reached: ' + feature)
    this.feature = feature
    this.name    = 'LimitError'
  }
}
