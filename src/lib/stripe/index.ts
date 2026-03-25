// src/lib/stripe/index.ts
import Stripe from 'stripe'

export const stripe: Stripe | null = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-02-24.acacia',
      typescript: true,
    })
  : null

export { PLANS } from '@/lib/plans'

export const PRICES = {
  pro_monthly: process.env.STRIPE_PRICE_PRO_MONTHLY!,
  pro_annual:  process.env.STRIPE_PRICE_PRO_ANNUAL!,
}

export async function getOrCreateStripeCustomer(companyId: string, email: string, name?: string | null) {
  if (!stripe) throw new Error('Stripe is not configured')
  const { prisma } = await import('@/lib/db/prisma')
  const company = await prisma.company.findUnique({ where: { id: companyId }, select: { stripeCustomerId: true } })

  if (company?.stripeCustomerId) {
    return company.stripeCustomerId
  }

  const customer = await stripe.customers.create({ email, name: name ?? undefined, metadata: { companyId } })
  await prisma.company.update({ where: { id: companyId }, data: { stripeCustomerId: customer.id } })
  return customer.id
}

export async function createCheckoutSession({
  companyId, email, name, priceId, successUrl, cancelUrl,
}: {
  companyId: string; email: string; name?: string | null
  priceId: string; successUrl: string; cancelUrl: string
}) {
  if (!stripe) throw new Error('Stripe is not configured')
  const customerId = await getOrCreateStripeCustomer(companyId, email, name)

  return stripe.checkout.sessions.create({
    customer:             customerId,
    mode:                 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url:  cancelUrl,
    metadata: { companyId },
    subscription_data: { metadata: { companyId } },
    allow_promotion_codes: true,
  })
}

export async function createPortalSession(customerId: string, returnUrl: string) {
  if (!stripe) throw new Error('Stripe is not configured')
  return stripe.billingPortal.sessions.create({
    customer:   customerId,
    return_url: returnUrl,
  })
}
