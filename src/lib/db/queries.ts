// src/lib/db/queries.ts
import { prisma } from './prisma'
import { getLimits, withinLimit } from '@/lib/limits'
import type { Plan } from '@prisma/client'
import type { MtoSystem, SavedJob, LibraryItem, GlobalTag, MaterialSpec, Report, Profile, ActivityLibraryItem, Supplier } from '@/types'

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
      data: { companyId: company.id, userId: id, role: 'OWNER' },
    })
  }

  return user
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

export async function getMtoSystems(userId: string) {
  return prisma.mtoSystem.findMany({
    where:   { userId, isArchived: false },
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true, name: true, description: true,
      icon: true, color: true, inputModel: true,
      createdAt: true, updatedAt: true,
      _count: { select: { mtoJobs: true } },
    },
  })
}

export async function getMtoSystem(id: string, userId: string) {
  return prisma.mtoSystem.findFirst({ where: { id, userId } })
}

export async function createMtoSystem(userId: string, data: Partial<MtoSystem>) {
  const plan   = await getCompanyPlan(userId)
  const limits = getLimits(plan)
  const count  = await prisma.mtoSystem.count({ where: { userId, isArchived: false } })
  if (!withinLimit(count, limits.maxSystems)) {
    throw new LimitError('maxSystems')
  }
  return prisma.mtoSystem.create({
    data: {
      userId,
      name:           data.name        ?? 'New System',
      description:    data.description ?? '',
      icon:           data.icon        ?? '📦',
      color:          data.color       ?? '#7917de',
      inputModel:     data.inputModel  ?? 'simple_dims',
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

export async function updateMtoSystem(id: string, userId: string, data: Partial<MtoSystem> & { materials?: any }) {
  if (data.materials !== undefined) {
    const plan   = await getCompanyPlan(userId)
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

export async function archiveMtoSystem(id: string, userId: string) {
  return prisma.mtoSystem.update({ where: { id }, data: { isArchived: true } })
}

// ─── MTO Jobs ─────────────────────────────────────────────────────────────────

export async function getMtoJobs(userId: string, mtoSystemId?: string) {
  return prisma.mtoJob.findMany({
    where:   { userId, isArchived: false, ...(mtoSystemId && { mtoSystemId }) },
    orderBy: { updatedAt: 'desc' },
    select:  {
      id: true, name: true, mtoSystemId: true, calculatedAt: true, createdAt: true, updatedAt: true,
      mtoSystem: { select: { id: true, name: true, icon: true, color: true } },
    },
  })
}

export async function getMtoJob(id: string, userId: string) {
  return prisma.mtoJob.findFirst({ where: { id, userId } })
}

export async function createMtoJob(userId: string, mtoSystemId: string, data: Partial<SavedJob>) {
  const plan   = await getCompanyPlan(userId)
  const limits = getLimits(plan)
  const count  = await prisma.mtoJob.count({ where: { userId, isArchived: false } })
  if (!withinLimit(count, limits.maxJobs)) throw new LimitError('maxJobs')

  const runs = data.runs ?? []
  if (!withinLimit(runs.length - 1, limits.maxRuns)) throw new LimitError('maxRuns')

  return prisma.mtoJob.create({
    data: {
      userId, mtoSystemId,
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

export async function updateMtoJob(id: string, userId: string, data: Partial<SavedJob>) {
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

export async function archiveMtoJob(id: string, userId: string) {
  return prisma.mtoJob.update({ where: { id }, data: { isArchived: true } })
}

// ─── Material Specs ───────────────────────────────────────────────────────────

export async function getMaterialSpecs(userId: string) {
  return prisma.materialSpec.findMany({ where: { userId }, orderBy: { updatedAt: 'desc' } })
}

export async function upsertMaterialSpec(userId: string, data: Partial<MaterialSpec>) {
  const key = data.productCode ? { userId, productCode: data.productCode } : null
  if (key) {
    return prisma.materialSpec.upsert({
      where:  { userId_productCode: key },
      update: data as any,
      create: { userId, ...(data as any) },
    })
  }
  return prisma.materialSpec.create({ data: { userId, ...(data as any) } })
}

export async function deleteMaterialSpec(id: string, userId: string) {
  return prisma.materialSpec.delete({ where: { id } })
}

// ─── Reports ──────────────────────────────────────────────────────────────────

export async function getReports(userId: string) {
  return prisma.report.findMany({
    where:   { userId, isArchived: false },
    orderBy: { createdAt: 'desc' },
    select:  { id: true, title: true, jobRef: true, reportDate: true, systemName: true, isPublic: true, publicToken: true, createdAt: true },
  })
}

export async function getReport(id: string, userId: string) {
  return prisma.report.findFirst({ where: { id, userId } })
}

export async function getReportByToken(token: string) {
  return prisma.report.findFirst({ where: { publicToken: token, isPublic: true, isArchived: false } })
}

export async function createReport(userId: string, data: Partial<Report>) {
  const { nanoid } = await import('nanoid')
  return prisma.report.create({
    data: {
      userId,
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

export async function updateReport(id: string, userId: string, data: Partial<Report>) {
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

export async function archiveReport(id: string, userId: string) {
  return prisma.report.update({ where: { id }, data: { isArchived: true } })
}

// ─── Library ──────────────────────────────────────────────────────────────────

export async function getLibraryItems(userId: string) {
  const [items, systems] = await Promise.all([
    prisma.libraryItem.findMany({
      where:   { userId },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
      include: {
        grade:        { select: { id: true, name: true, materialType: true, density: true } },
        manufacturer: { select: { id: true, name: true } },
      },
    }),
    prisma.mtoSystem.findMany({ where: { userId, isArchived: false }, select: { id: true, name: true, shortName: true, materials: true } }),
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

export async function createLibraryItem(userId: string, data: Partial<LibraryItem>) {
  const plan   = await getCompanyPlan(userId)
  const limits = getLimits(plan)
  const count  = await prisma.libraryItem.count({ where: { userId } })
  if (!withinLimit(count, limits.maxLibraryItems)) throw new LimitError('maxLibraryItems')

  return prisma.libraryItem.create({
    data: {
      userId,
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

export async function updateLibraryItem(id: string, userId: string, data: Partial<LibraryItem>) {
  // Exclude computed/relational fields that can't be written directly
  const { grade, manufacturer, certifications, usedInSystems, ...rest } = data as any
  return prisma.libraryItem.update({ where: { id }, data: rest as any })
}

export async function deleteLibraryItem(id: string, userId: string) {
  return prisma.libraryItem.delete({ where: { id } })
}

export async function addSystemToLibraryItem(id: string, sysId: string) {
  const item = await prisma.libraryItem.findUnique({ where: { id }, select: { usedInSystems: true } })
  if (!item || item.usedInSystems.includes(sysId)) return
  return prisma.libraryItem.update({ where: { id }, data: { usedInSystems: { push: sysId } } })
}

export async function removeSystemFromLibraryItem(id: string, sysId: string) {
  const item = await prisma.libraryItem.findUnique({ where: { id }, select: { usedInSystems: true } })
  if (!item) return
  return prisma.libraryItem.update({ where: { id }, data: { usedInSystems: item.usedInSystems.filter(s => s !== sysId) } })
}

// ─── Tags ─────────────────────────────────────────────────────────────────────

export async function getGlobalTags(userId: string) {
  return prisma.globalTag.findMany({ where: { userId }, orderBy: { order: 'asc' } })
}

export async function upsertGlobalTags(userId: string, tags: GlobalTag[]) {
  return prisma.$transaction([
    prisma.globalTag.deleteMany({ where: { userId } }),
    ...tags.map((t, i) => prisma.globalTag.create({ data: { id: t.id, userId, name: t.name, color: t.color, order: i } })),
  ])
}

// ─── Activity Library ─────────────────────────────────────────────────────────

export async function getActivityLibrary(userId: string) {
  return prisma.activityLibraryItem.findMany({
    where:   { userId },
    orderBy: [{ phase: 'asc' }, { name: 'asc' }],
  })
}

export async function createActivityLibraryItem(userId: string, data: Partial<ActivityLibraryItem>) {
  return prisma.activityLibraryItem.create({
    data: {
      userId,
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

export async function updateActivityLibraryItem(id: string, userId: string, data: Partial<ActivityLibraryItem>) {
  return prisma.activityLibraryItem.update({ where: { id }, data: data as any })
}

export async function deleteActivityLibraryItem(id: string, userId: string) {
  return prisma.activityLibraryItem.delete({ where: { id } })
}

// ─── Suppliers ────────────────────────────────────────────────────────────────

export async function getSuppliers(userId: string) {
  return prisma.supplier.findMany({ where: { userId, isArchived: false }, orderBy: { name: 'asc' } })
}

export async function createSupplier(userId: string, data: Partial<Supplier>) {
  return prisma.supplier.create({
    data: {
      userId,
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

export async function updateSupplier(id: string, userId: string, data: Partial<Supplier>) {
  return prisma.supplier.update({ where: { id }, data: data as any })
}

export async function deleteSupplier(id: string, userId: string) {
  return prisma.supplier.update({ where: { id }, data: { isArchived: true } })
}

// ─── Purchase Orders ──────────────────────────────────────────────────────────

export async function getPurchaseOrders(userId: string) {
  return prisma.purchaseOrder.findMany({
    where:   { userId },
    orderBy: { createdAt: 'desc' },
    include: { lines: true, supplier: { select: { id: true, name: true } } },
  })
}

export async function createPurchaseOrder(userId: string, data: any) {
  const { lines, ...header } = data
  return prisma.purchaseOrder.create({
    data: { userId, ...header, lines: { create: lines ?? [] } },
    include: { lines: true },
  })
}

export async function updatePurchaseOrder(id: string, userId: string, data: any) {
  const { lines, ...header } = data
  if (lines !== undefined) {
    await prisma.$transaction([
      prisma.purchaseOrderLine.deleteMany({ where: { poId: id } }),
      ...lines.map((l: any) => prisma.purchaseOrderLine.create({ data: { poId: id, ...l } })),
    ])
  }
  return prisma.purchaseOrder.update({ where: { id }, data: header, include: { lines: true } })
}

export async function deletePurchaseOrder(id: string, userId: string) {
  return prisma.purchaseOrder.delete({ where: { id } })
}

// ─── Delivery Orders ──────────────────────────────────────────────────────────

export async function getDeliveryOrders(userId: string) {
  return prisma.deliveryOrder.findMany({
    where:   { userId },
    orderBy: { createdAt: 'desc' },
    include: { lines: true, po: { select: { id: true, ref: true, supplierName: true } } },
  })
}

export async function createDeliveryOrder(userId: string, data: any) {
  const { lines, ...header } = data
  return prisma.deliveryOrder.create({
    data: { userId, ...header, lines: { create: lines ?? [] } },
    include: { lines: true, po: { select: { id: true, ref: true, supplierName: true } } },
  })
}

export async function updateDeliveryOrder(id: string, userId: string, data: any) {
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

export async function deleteDeliveryOrder(id: string, userId: string) {
  return prisma.deliveryOrder.delete({ where: { id } })
}

// ─── Material Categories ──────────────────────────────────────────────────────

export async function getMaterialCategories(userId: string) {
  return prisma.materialCategory.findMany({
    where:   { userId },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
  })
}

export async function createMaterialCategory(userId: string, data: { name: string; icon?: string }) {
  return prisma.materialCategory.create({
    data: { userId, name: data.name.trim().toLowerCase(), icon: data.icon ?? '📦' },
  })
}

export async function updateMaterialCategory(id: string, userId: string, data: { name?: string; icon?: string; sortOrder?: number }) {
  return prisma.materialCategory.update({ where: { id }, data })
}

export async function deleteMaterialCategory(id: string, userId: string) {
  return prisma.materialCategory.delete({ where: { id } })
}

// ─── Material Grades ──────────────────────────────────────────────────────────

export async function getMaterialGrades(userId: string) {
  return prisma.materialGrade.findMany({ where: { userId }, orderBy: { name: 'asc' } })
}

export async function createMaterialGrade(userId: string, data: { name: string; materialType?: string; standard?: string; density?: number; notes?: string }) {
  return prisma.materialGrade.create({
    data: { userId, name: data.name.trim(), materialType: data.materialType ?? null, standard: data.standard ?? null, density: data.density ?? null, notes: data.notes ?? null },
  })
}

export async function updateMaterialGrade(id: string, userId: string, data: { name?: string; materialType?: string | null; standard?: string | null; density?: number | null; notes?: string | null }) {
  return prisma.materialGrade.update({ where: { id }, data })
}

export async function deleteMaterialGrade(id: string, userId: string) {
  return prisma.materialGrade.delete({ where: { id } })
}

// ─── Manufacturers ────────────────────────────────────────────────────────────

export async function getManufacturers(userId: string) {
  return prisma.manufacturer.findMany({ where: { userId, isArchived: false }, orderBy: { name: 'asc' } })
}

export async function createManufacturer(userId: string, data: { name: string; contactPerson?: string; email?: string; phone?: string; country?: string; website?: string; notes?: string }) {
  return prisma.manufacturer.create({
    data: { userId, name: data.name.trim(), contactPerson: data.contactPerson ?? null, email: data.email ?? null, phone: data.phone ?? null, country: data.country ?? null, website: data.website ?? null, notes: data.notes ?? null },
  })
}

export async function updateManufacturer(id: string, userId: string, data: { name?: string; contactPerson?: string | null; email?: string | null; phone?: string | null; country?: string | null; website?: string | null; notes?: string | null }) {
  return prisma.manufacturer.update({ where: { id }, data })
}

export async function deleteManufacturer(id: string, userId: string) {
  return prisma.manufacturer.update({ where: { id }, data: { isArchived: true } })
}

// ─── Material Certifications ──────────────────────────────────────────────────

export async function getCertifications(libraryItemId: string, userId: string) {
  return prisma.materialCertification.findMany({
    where:   { libraryItemId, userId },
    orderBy: { createdAt: 'desc' },
  })
}

export async function createCertification(userId: string, data: {
  libraryItemId: string; type: string; certNumber?: string; issuedBy?: string
  issuedDate?: Date; expiryDate?: Date; fileUrl?: string; fileName?: string; notes?: string
}) {
  return prisma.materialCertification.create({ data: { userId, ...data } })
}

export async function deleteCertification(id: string, userId: string) {
  // Return the cert first so the caller can delete the file from storage
  const cert = await prisma.materialCertification.findFirst({ where: { id, userId } })
  if (cert) await prisma.materialCertification.delete({ where: { id } })
  return cert
}

// ─── Tenders ──────────────────────────────────────────────────────────────────

export async function getTenders(userId: string) {
  return prisma.tender.findMany({
    where:   { userId, isArchived: false },
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

export async function getTender(id: string, userId: string) {
  return prisma.tender.findFirst({
    where:   { id, userId, isArchived: false },
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

export async function createTender(userId: string, data: {
  name: string; clientId?: string | null; clientName?: string | null;
  projectName?: string; reference?: string; submissionDate?: Date | null; notes?: string;
}) {
  return prisma.tender.create({ data: { userId, ...data } })
}

export async function updateTender(id: string, userId: string, data: Partial<{
  name: string; clientId: string | null; clientName: string | null;
  projectName: string; reference: string;
  submissionDate: Date | null; status: string; notes: string;
}>) {
  return prisma.tender.update({ where: { id }, data: data as any })
}

// ─── Clients ──────────────────────────────────────────────────────────────────

export async function getClients(userId: string) {
  return prisma.client.findMany({
    where:   { userId, isArchived: false },
    select:  { id: true, name: true, contactPerson: true, email: true, phone: true, address: true, notes: true, createdAt: true, _count: { select: { tenders: true } } },
    orderBy: { name: 'asc' },
  })
}

export async function getClient(id: string, userId: string) {
  return prisma.client.findFirst({ where: { id, userId } })
}

export async function createClient(userId: string, data: {
  name: string; contactPerson?: string; email?: string; phone?: string;
  address?: string; notes?: string;
}) {
  return prisma.client.create({ data: { userId, ...data } })
}

export async function updateClient(id: string, userId: string, data: Partial<{
  name: string; contactPerson: string | null; email: string | null; phone: string | null;
  address: string | null; notes: string | null;
}>) {
  return prisma.client.update({ where: { id }, data: data as any })
}

export async function archiveClient(id: string, userId: string) {
  return prisma.client.update({ where: { id }, data: { isArchived: true } })
}

export async function archiveTender(id: string, userId: string) {
  return prisma.tender.update({ where: { id }, data: { isArchived: true } })
}

export async function addTenderItem(userId: string, tenderId: string, data: {
  systemId?: string; jobId?: string; notes?: string; sortOrder?: number;
}) {
  // Verify ownership
  const tender = await prisma.tender.findFirst({ where: { id: tenderId, userId } })
  if (!tender) throw new Error('Tender not found')
  return prisma.tenderItem.create({ data: { tenderId, ...data } })
}

export async function removeTenderItem(id: string, userId: string) {
  const item = await prisma.tenderItem.findFirst({
    where: { id },
    include: { tender: { select: { userId: true } } },
  })
  if (!item || item.tender.userId !== userId) throw new Error('Not found')
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
