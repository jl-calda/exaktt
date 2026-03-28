-- Document Builder tables

-- documents table
CREATE TABLE IF NOT EXISTS "documents" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "companyId" TEXT NOT NULL,
  "createdById" TEXT NOT NULL,
  "docType" TEXT NOT NULL,
  "title" TEXT NOT NULL DEFAULT 'Untitled',
  "ref" TEXT,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "tenderId" TEXT,
  "poId" TEXT,
  "doId" TEXT,
  "blocks" JSONB NOT NULL DEFAULT '[]',
  "settings" JSONB,
  "companyName" TEXT,
  "companyLogo" TEXT,
  "companyAddr" TEXT,
  "registrationNo" TEXT,
  "registrationLabel" TEXT,
  "accentColor" TEXT,
  "currency" TEXT NOT NULL DEFAULT 'SGD',
  "isArchived" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT "documents_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "documents_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE,
  CONSTRAINT "documents_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE CASCADE,
  CONSTRAINT "documents_tenderId_fkey" FOREIGN KEY ("tenderId") REFERENCES "tenders"("id") ON DELETE SET NULL,
  CONSTRAINT "documents_poId_fkey" FOREIGN KEY ("poId") REFERENCES "purchase_orders"("id") ON DELETE SET NULL,
  CONSTRAINT "documents_doId_fkey" FOREIGN KEY ("doId") REFERENCES "delivery_orders"("id") ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS "documents_companyId_idx" ON "documents"("companyId");
CREATE INDEX IF NOT EXISTS "documents_tenderId_idx" ON "documents"("tenderId");
CREATE INDEX IF NOT EXISTS "documents_poId_idx" ON "documents"("poId");
CREATE INDEX IF NOT EXISTS "documents_doId_idx" ON "documents"("doId");

-- doc_sequences table (auto-reference numbering)
CREATE TABLE IF NOT EXISTS "doc_sequences" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "companyId" TEXT NOT NULL,
  "docType" TEXT NOT NULL,
  "year" INTEGER NOT NULL,
  "lastSeq" INTEGER NOT NULL DEFAULT 0,

  CONSTRAINT "doc_sequences_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "doc_sequences_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "doc_sequences_companyId_docType_year_key" ON "doc_sequences"("companyId", "docType", "year");
CREATE INDEX IF NOT EXISTS "doc_sequences_companyId_idx" ON "doc_sequences"("companyId");

-- Add docTemplates to companies
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "docTemplates" JSONB NOT NULL DEFAULT '[]';
