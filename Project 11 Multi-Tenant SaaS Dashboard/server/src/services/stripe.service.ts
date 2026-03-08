import Stripe from 'stripe';
import { Plan } from '@prisma/client';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);

// Resolved at call time so dotenv has definitely loaded.
export const planToPriceId = (plan: 'PRO' | 'ENTERPRISE'): string =>
  plan === 'PRO'
    ? (process.env.STRIPE_PRICE_PRO as string)
    : (process.env.STRIPE_PRICE_ENTERPRISE as string);

export const priceIdToPlan = (priceId: string): Plan => {
  if (priceId === process.env.STRIPE_PRICE_PRO) return 'PRO';
  if (priceId === process.env.STRIPE_PRICE_ENTERPRISE) return 'ENTERPRISE';
  return 'FREE';
};
