import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { z } from 'zod';
import type Stripe from 'stripe';
import { type StripeEnv, createStripeClient, getStripeErrorMessage } from '@/lib/stripe.server';


/* eslint-disable @typescript-eslint/no-explicit-any */

type CheckoutSessionResult = { clientSecret: string } | { error: string };

async function resolveOrCreateCustomer(
  stripe: ReturnType<typeof createStripeClient>,
  options: { email: string | undefined; orgId: string },
): Promise<string> {
  if (!/^[a-zA-Z0-9_-]+$/.test(options.orgId)) {
    throw new Error('Invalid orgId');
  }

  const found = await stripe.customers.search({
    query: `metadata['orgId']:'${options.orgId}'`,
    limit: 1,
  });
  if (found.data.length && found.data[0]) return found.data[0].id;

  const created = await stripe.customers.create({
    ...(options.email ? { email: options.email } : {}),
    metadata: { orgId: options.orgId },
  });
  return created.id;
}

export const createCheckoutSession = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        priceId: z.string().regex(/^[a-zA-Z0-9_-]+$/),
        quantity: z.number().int().min(1).default(1),
        returnUrl: z.string().url(),
        environment: z.enum(['sandbox', 'live']),
      })
      .parse(data),
  )
  .handler(async ({ data, context }): Promise<CheckoutSessionResult> => {
    try {
      const stripe = createStripeClient(data.environment);
      const prices = await stripe.prices.list({ lookup_keys: [data.priceId] });
      if (!prices.data.length) throw new Error('Price not found');
      const stripePrice = prices.data[0];
      if (!stripePrice) throw new Error('Price not found');
      const isRecurring = stripePrice.type === 'recurring';

      const { data: { user } } = await context.supabase.auth.getUser();
      const { data: profile } = await context.supabase
        .from('profiles')
        .select('current_org_id')
        .eq('user_id', context.userId)
        .maybeSingle();
      const orgId = profile?.current_org_id;
      if (!orgId) throw new Error('Aucune entreprise liée au profil.');

      const customerId = await resolveOrCreateCustomer(stripe, {
        email: user?.email ?? undefined,
        orgId,
      });

      let productDescription: string | undefined;
      if (!isRecurring) {
        const productId = typeof stripePrice.product === 'string'
          ? stripePrice.product
          : stripePrice.product?.id;
        if (productId) {
          const product = await stripe.products.retrieve(productId);
          productDescription = product.name;
        }
      }

      const session = await stripe.checkout.sessions.create({
        line_items: [{ price: stripePrice.id, quantity: data.quantity }],
        mode: isRecurring ? 'subscription' : 'payment',
        ui_mode: 'embedded_page',
        return_url: data.returnUrl,
        customer: customerId,
        saved_payment_method_options: { payment_method_save: 'enabled' },
        ...(!isRecurring && productDescription ? { payment_intent_data: { description: productDescription } } : {}),
        metadata: { orgId, priceId: data.priceId },
        ...(isRecurring ? { subscription_data: { metadata: { orgId } } } : {}),
      } as Stripe.Checkout.SessionCreateParams);

      return { clientSecret: session.client_secret ?? '' };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });

export const markPaymentReceived = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        requestId: z.string().uuid(),
        method: z.string().max(40).default('virement'),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { data: pr, error } = await context.supabase
      .from('payment_requests')
      .select('id')
      .eq('id', data.requestId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!pr) throw new Error('Demande de paiement introuvable ou hors de votre entreprise.');

    const { confirmPayment } = await import('./portal.server');
    return confirmPayment(data.requestId, { method: data.method });
  });
