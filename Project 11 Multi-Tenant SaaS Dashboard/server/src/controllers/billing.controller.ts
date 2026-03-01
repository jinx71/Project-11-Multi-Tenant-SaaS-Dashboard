import { Request, Response, NextFunction } from 'express';
import Stripe from 'stripe';
import { z } from 'zod';
import { prisma } from '../config/prisma';
import { ok, fail } from '../utils/response';
import { stripe, planToPriceId, priceIdToPlan } from '../services/stripe.service';
import { TenantRequest } from '../middleware/rbac';

const checkoutSchema = z.object({ plan: z.enum(['PRO', 'ENTERPRISE']) });

// POST /api/workspaces/:workspaceId/billing/checkout  (ADMIN)
export const createCheckoutSession = async (
  req: TenantRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const parsed = checkoutSchema.safeParse(req.body);
    if (!parsed.success) return fail(res, 'Plan must be PRO or ENTERPRISE', 422);
    const workspaceId = req.params.workspaceId;

    const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } });
    if (!workspace) return fail(res, 'Workspace not found', 404);
    if (workspace.stripeSubscriptionId) {
      return fail(res, 'This workspace already has a subscription. Use Manage billing to change plans.', 409);
    }

    // Reuse the Stripe customer if one exists so invoices stay on one record.
    let customerId = workspace.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        name: workspace.name,
        metadata: { workspaceId },
      });
      customerId = customer.id;
      await prisma.workspace.update({
        where: { id: workspaceId },
        data: { stripeCustomerId: customerId },
      });
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: planToPriceId(parsed.data.plan), quantity: 1 }],
      success_url: `${process.env.CLIENT_URL}/billing?status=success`,
      cancel_url: `${process.env.CLIENT_URL}/billing?status=cancelled`,
      // metadata on BOTH the session and the subscription -- the webhook reads
      // whichever event arrives, so neither path can lose the workspace link.
      metadata: { workspaceId },
      subscription_data: { metadata: { workspaceId } },
    });

    return ok(res, { url: session.url }, 'Checkout session created');
  } catch (err) {
    next(err);
  }
};

// POST /api/workspaces/:workspaceId/billing/portal  (ADMIN)
export const createPortalSession = async (
  req: TenantRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const workspace = await prisma.workspace.findUnique({
      where: { id: req.params.workspaceId },
    });
    if (!workspace?.stripeCustomerId) {
      return fail(res, 'No billing account exists for this workspace yet', 404);
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: workspace.stripeCustomerId,
      return_url: `${process.env.CLIENT_URL}/billing`,
    });

    return ok(res, { url: session.url }, 'Portal session created');
  } catch (err) {
    next(err);
  }
};

// POST /api/billing/webhook  -- mounted with express.raw() BEFORE express.json()
export const webhookHandler = async (req: Request, res: Response) => {
  const signature = req.headers['stripe-signature'];
  if (!signature) return res.status(400).send('Missing stripe-signature header');

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET as string
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return res.status(400).send('Webhook signature verification failed');
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const workspaceId = session.metadata?.workspaceId;
        if (!workspaceId || !session.subscription) break;

        const subscription = await stripe.subscriptions.retrieve(
          session.subscription as string
        );
        const priceId = subscription.items.data[0].price.id;

        await prisma.workspace.update({
          where: { id: workspaceId },
          data: {
            plan: priceIdToPlan(priceId),
            stripeSubscriptionId: subscription.id,
            stripePriceId: priceId,
            stripeCurrentPeriodEnd: new Date(subscription.current_period_end * 1000),
          },
        });
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const workspace = await prisma.workspace.findUnique({
          where: { stripeSubscriptionId: subscription.id },
        });
        if (!workspace) break;

        const priceId = subscription.items.data[0].price.id;
        const active = subscription.status === 'active' || subscription.status === 'trialing';

        await prisma.workspace.update({
          where: { id: workspace.id },
          data: {
            plan: active ? priceIdToPlan(priceId) : 'FREE',
            stripePriceId: priceId,
            stripeCurrentPeriodEnd: new Date(subscription.current_period_end * 1000),
          },
        });
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const workspace = await prisma.workspace.findUnique({
          where: { stripeSubscriptionId: subscription.id },
        });
        if (!workspace) break;

        await prisma.workspace.update({
          where: { id: workspace.id },
          data: {
            plan: 'FREE',
            stripeSubscriptionId: null,
            stripePriceId: null,
            stripeCurrentPeriodEnd: null,
          },
        });
        break;
      }
    }

    // Always 200 once verified -- otherwise Stripe retries the event for days.
    return res.json({ received: true });
  } catch (err) {
    console.error('Webhook processing error:', err);
    return res.status(500).send('Webhook processing error');
  }
};
