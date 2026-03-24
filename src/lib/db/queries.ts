// src/lib/db/queries.ts
import { prisma } from './prisma'
import { getLimits, withinLimit } from '@/lib/limits'
import type { Plan } from '@prisma/client'
import type { MtoSystem, SavedJob, LibraryItem, GlobalTag, MaterialSpec, Report, Profile, ActivityLibraryItem, Supplier } from '@/types'

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

/** @deprecated Use getCompanyPlan instead */
export async function getUserPlan(userId: string): Promise<Plan> {
  return getCompanyPlan(userId)
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
        materials:      (s.template.materials      ?? []) as any,
        customDims:     (s.template.customDims     ?? []) as any,
        customCriteria: (s.template.customCriteria ?? []) as any,
        variants:       (s.template.variants       ?? []) as any,
        warnings:       (s.template.warnings       ?? []) as any,
        customBrackets: (s.template.customBrackets ?? []) as any,
        workActivities: (s.template.workActivities ?? []) as any,
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
  const count  = await prisma.mtoSystem.count({ where: { companyId, isArchived: false } })
  if (!withinLimit(count, limits.maxSystems)) {
    throw new LimitError('maxSystems')
  }
  return prisma.mtoSystem.create({
    data: {
      companyId,
      createdById,
      name:           data.name        ?? 'New System',
      description:    data.description ?? '',
      icon:           data.icon        ?? '📦',
      color:          data.color       ?? '#7917de',
      inputModel:     data.inputModel  ?? 'linear',
      materials:      (data.materials      ?? []) as any,
      customDims:     (data.customDims     ?? []) as any,
      customCriteria: (data.customCriteria ?? []) as any,
      variants:       (data.variants       ?? []) as any,
      warnings:       (data.warnings       ?? []) as any,
      customBrackets: (data.customBrackets ?? []) as any,
      workActivities: (data.workActivities ?? []) as any,
    },
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
      ...(data.materials      !== undefined && { materials:      data.materials as any }),
      ...(data.customDims     !== undefined && { customDims:     data.customDims as any }),
      ...(data.customCriteria !== undefined && { customCriteria: data.customCriteria as any }),
      ...(data.variants       !== undefined && { variants:       data.variants as any }),
      ...(data.warnings       !== undefined && { warnings:       data.warnings as any }),
      ...(data.customBrackets !== undefined && { customBrackets: data.customBrackets as any }),
      ...(data.workActivities !== undefined && { workActivities: data.workActivities as any }),
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
  const count  = await prisma.mtoJob.count({ where: { companyId, isArchived: false } })
  if (!withinLimit(count, limits.maxJobs)) throw new LimitError('maxJobs')

  const runs = data.runs ?? []
  if (!withinLimit(runs.length - 1, limits.maxRuns)) throw new LimitError('maxRuns')

  return prisma.mtoJob.create({
    data: {
      companyId, createdById, mtoSystemId,
      name:           data.name           ?? 'Untitled Job',
      runs:           (data.runs           ?? []) as any,
      criteriaState:  (data.criteriaState  ?? {}) as any,
      variantState:   (data.variantState   ?? {}) as any,
      stockOptimMode: data.stockOptimMode  ?? 'min_waste',
      calculatedAt:   data.calculatedAt    ? new Date(data.calculatedAt) : null,
      matVersions:    (data.matVersions    ?? {}) as any,
      lastResults:    (data.lastResults    ?? null) as any,
    },
  })
}

export async function updateMtoJob(id: string, companyId: string, data: Partial<SavedJob>) {
  await verifyOwnership(prisma.mtoJob, id, companyId, 'Job')
  return prisma.mtoJob.update({
    where: { id },
    data: {
      ...(data.name           !== undefined && { name:           data.name }),
      ...(data.runs           !== undefined && { runs:           data.runs as any }),
      ...(data.criteriaState  !== undefined && { criteriaState:  data.criteriaState as any }),
      ...(data.variantState   !== undefined && { variantState:   data.variantState as any }),
      ...(data.stockOptimMode !== undefined && { stockOptimMode: data.stockOptimMode }),
      ...(data.calculatedAt   !== undefined && { calculatedAt:   data.calculatedAt ? new Date(data.calculatedAt) : null }),
      ...(data.matVersions    !== undefined && { matVersions:    data.matVersions as any }),
    },
  })
}

export async function archiveMtoJob(id: string, companyId: string) {
  await verifyOwnership(prisma.mtoJob, id, companyId, 'Job')
  return prisma.mtoJob.update({ where: { id }, data: { isArchived: true } })
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
      resultsSnapshot:  data.resultsSnapshot as any,
      specsSnapshot:    data.specsSnapshot  as any,
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
    const mats = sys.materials as any[]
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
  const count  = await prisma.libraryItem.count({ where: { companyId } })
  if (!withinLimit(count, limits.maxLibraryItems)) throw new LimitError('maxLibraryItems')

  return prisma.libraryItem.create({
    data: {
      companyId,
      createdById,
      name:           data.name ?? '',
      unit:           data.unit ?? 'each',
      notes:          data.notes,
      productCode:    data.productCode,
      category:       data.category ?? 'other',
      photo:          data.photo,
      properties:     (data.properties ?? {}) as any,
      ...(data.spec           !== undefined && { spec: data.spec as any }),
      ...(data.gradeId        !== undefined && { gradeId: data.gradeId }),
      ...(data.manufacturerId !== undefined && { manufacturerId: data.manufacturerId }),
    },
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
  const item = await prisma.libraryItem.findUnique({ where: { id }, select: { usedInSystems: true } })
  if (!item || item.usedInSystems.includes(sysId)) return
  return prisma.libraryItem.update({ where: { id }, data: { usedInSystems: { push: sysId } } })
}

export async function removeSystemFromLibraryItem(id: string, sysId: string, companyId: string) {
  await verifyOwnership(prisma.libraryItem, id, companyId, 'LibraryItem')
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
      labourCategory: data.labourCategory ?? null,
      labourRateHr:   data.labourRateHr   ?? null,
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
  if (lines !== undefined) {
    await prisma.$transaction([
      prisma.purchaseOrderLine.deleteMany({ where: { poId: id } }),
      ...lines.map((l: any) => prisma.purchaseOrderLine.create({ data: { poId: id, ...l } })),
    ])
  }
  return prisma.purchaseOrder.update({ where: { id }, data: header, include: { lines: true } })
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
  if (lines !== undefined) {
    await prisma.$transaction([
      prisma.deliveryOrderLine.deleteMany({ where: { doId: id } }),
      ...lines.map((l: any) => prisma.deliveryOrderLine.create({ data: { doId: id, ...l } })),
    ])
  }
  return prisma.deliveryOrder.update({
    where: { id }, data: header,
    include: { lines: true, po: { select: { id: true, ref: true, supplierName: true } } },
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

// ─── LimitError ───────────────────────────────────────────────────────────────

export class LimitError extends Error {
  feature: string
  constructor(feature: string) {
    super('Plan limit reached: ' + feature)
    this.feature = feature
    this.name    = 'LimitError'
  }
}
