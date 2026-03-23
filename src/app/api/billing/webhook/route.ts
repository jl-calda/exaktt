// src/app/api/billing/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { prisma } from '@/lib/db/prisma'
import type Stripe from 'stripe'

export const runtime = 'nodejs'

async function updateSubscription(sub: Stripe.Subscription) {
  const companyId = sub.metadata?.companyId
  if (!companyId) return

  const isActive = ['active', 'trialing'].includes(sub.status)
  const priceId  = sub.items.data[0]?.price.id ?? null

  await prisma.company.update({
    where: { id: companyId },
    data: {
      plan:          isActive ? 'PRO' : 'FREE',
      stripeSubId:   sub.id,
      stripePriceId: priceId,
      planExpiresAt: isActive
        ? new Date(sub.current_period_end * 1000)
        : null,
    },
  })
}

export async function POST(req: NextRequest) {
  const body      = await req.text()
  const signature = req.headers.get('stripe-signature')!

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.resumed':
        await updateSubscription(event.data.object as Stripe.Subscription)
        break

      case 'customer.subscription.deleted':
      case 'customer.subscription.paused': {
        const sub       = event.data.object as Stripe.Subscription
        const companyId = sub.metadata?.companyId
        if (companyId) {
          await prisma.company.update({
            where: { id: companyId },
            data:  { plan: 'FREE', planExpiresAt: null },
          })
        }
        break
      }

      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        if (session.mode === 'subscription' && session.subscription) {
          const sub = await stripe.subscriptions.retrieve(session.subscription as string)
          await updateSubscription(sub)
        }
        break
      }
    }
  } catch (err) {
    console.error('Webhook handler error:', err)
    return NextResponse.json({ error: 'Handler failed' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
