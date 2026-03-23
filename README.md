# MaterialMTO SaaS

Professional material take-off calculator for QS and logistics teams — with Free, Pro, and Max tiers.

## Tech Stack

| Layer        | Technology |
|---|---|
| Framework    | Next.js 16.1.7 (App Router, Turbopack) |
| Language     | TypeScript 5 (strict) |
| Styling      | Tailwind CSS v4 (CSS-first config) |
| Auth         | Supabase Auth (Google + Email/Password) |
| Database     | PostgreSQL via Supabase + Prisma 6 |
| State        | Zustand 5 |
| Billing      | Stripe (Checkout + Billing Portal + Webhooks) |
| PDF          | @react-pdf/renderer (server-side) |
| Excel        | xlsx (Max plan) |

## Plan Limits

| Feature | Free | Pro | Max |
|---|---|---|---|
| Systems | 1 | 5 | Unlimited |
| Materials/system | 5 | 50 | Unlimited |
| Runs/job | 1 | 5 | Unlimited |
| Saved jobs | 5 | 50 | Unlimited |
| Library items | 10 | 100 | Unlimited |
| Tags | — | ✓ | ✓ |
| Pricing/costing | — | ✓ | ✓ |
| Stock info | — | ✓ | ✓ |
| Branded reports | — | ✓ | ✓ |
| Share reports | — | ✓ | ✓ |
| Custom dims/variants | — | ✓ | ✓ |
| Excel export | — | — | ✓ |
| API access | — | — | ✓ |
| Team members | 1 | 1 | 5 |

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── systems/[id]/     CRUD for systems
│   │   ├── jobs/[id]/        CRUD for jobs
│   │   ├── reports/[id]/     CRUD + PDF download + publish
│   │   ├── library/          Material library CRUD
│   │   ├── tags/             Global tags
│   │   ├── profile/          Company profile
│   │   ├── limits/           Current usage + limits
│   │   └── billing/          Checkout, portal, Stripe webhooks
│   ├── auth/                 Login + OAuth callback
│   ├── dashboard/            Systems + reports overview
│   ├── system/[id]/          System editor + calculator
│   ├── report/[id]/          Public shared report (no auth)
│   ├── billing/              Pricing page + plan management
│   └── settings/             Profile, tags, account
├── components/
│   ├── calculator/           System shell, tabs, panels
│   ├── report/ReportBuilder  Report config + live preview
│   ├── billing/UpgradePrompt Inline paywall component
│   └── ui/                   Button, Input, Modal, Toast, etc.
├── lib/
│   ├── engine/               MTO calculation engine (TypeScript)
│   ├── db/                   Prisma client + all query helpers
│   ├── limits/               Plan limits, prices, enforcement
│   ├── stripe/               Stripe client + webhook handlers
│   ├── pdf/                  @react-pdf/renderer report template
│   └── supabase/             Browser + server clients
├── store/                    Zustand stores
└── types/                    Complete domain types
```

## Quick Start

### 1. Supabase setup

1. Create project at [supabase.com](https://supabase.com)
2. Enable Google OAuth: Authentication → Providers → Google
3. Add redirect URL: `https://your-domain.com/auth/callback`

### 2. Stripe setup

1. Create account at [stripe.com](https://stripe.com)
2. Create 4 products in the Stripe Dashboard:
   - **Pro Monthly** → copy price ID → `STRIPE_PRICE_PRO_MONTHLY`
   - **Pro Annual** → copy price ID → `STRIPE_PRICE_PRO_ANNUAL`
   - **Max Monthly** → copy price ID → `STRIPE_PRICE_MAX_MONTHLY`
   - **Max Annual** → copy price ID → `STRIPE_PRICE_MAX_ANNUAL`
3. Set up webhook endpoint: `https://your-domain.com/api/billing/webhook`
   - Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`

### 3. Configure environment

```bash
cp .env.example .env.local
# Fill in all values
```

### 4. Database

```bash
npm install
npx prisma generate
npx prisma db push
```

### 5. Supabase Row Level Security

Run in Supabase SQL Editor:

```sql
alter table users         enable row level security;
alter table subscriptions enable row level security;
alter table profiles      enable row level security;
alter table systems       enable row level security;
alter table jobs          enable row level security;
alter table reports       enable row level security;
alter table library_items enable row level security;
alter table global_tags   enable row level security;

-- Users can only access their own data
create policy "own" on users         for all using (id = auth.uid());
create policy "own" on subscriptions for all using (user_id = auth.uid());
create policy "own" on profiles      for all using (user_id = auth.uid());
create policy "own" on systems       for all using (user_id = auth.uid());
create policy "own" on jobs          for all using (user_id = auth.uid());
create policy "own" on reports       for all using (user_id = auth.uid());
create policy "own" on library_items for all using (user_id = auth.uid());
create policy "own" on global_tags   for all using (user_id = auth.uid());

-- Public shared reports readable by anyone
create policy "public_share" on reports
  for select using (status = 'PUBLISHED' and share_token is not null);
```

### 6. Run

```bash
npm run dev

# In another terminal (for Stripe webhooks):
npm run stripe:listen
```

## Pricing (SGD)

Adjust in `src/lib/limits/index.ts`:

```ts
PRO: { monthly: 2900, annual: 1900, annualTotal: 22800 }  // S$29/mo or S$19/mo annual
MAX: { monthly: 7900, annual: 4900, annualTotal: 58800 }  // S$79/mo or S$49/mo annual
```

## Deployment (Vercel)

```bash
vercel deploy
```

Set all environment variables in Vercel dashboard. Add production URL to:
- Supabase OAuth redirect allowlist
- Stripe webhook endpoint
- `NEXT_PUBLIC_APP_URL`

## Key Design Decisions

**Limits enforced server-side**: `src/lib/limits/index.ts` is the single source of truth. Every API route calls `checkLimit()` before writing — the UI shows limits but cannot bypass them.

**JSON columns for nested data**: Materials, rules, dims, variants are stored as JSON in the `systems` table. This avoids a deeply relational schema for data that is always read/written as a whole unit.

**PDF server-side**: Reports are generated in a Next.js route handler using `@react-pdf/renderer`. No browser print dialog — direct PDF download.

**Free tier watermark**: Reports have `watermark: true` set server-side in `createReport()` based on the user's plan — cannot be spoofed from the client.
