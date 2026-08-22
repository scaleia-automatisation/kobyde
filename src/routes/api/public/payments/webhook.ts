import { createFileRoute } from '@tanstack/react-router';
import { createClient } from '@supabase/supabase-js';
import { type StripeEnv, verifyWebhook } from '@/lib/stripe.server';

let _supabase: ReturnType<typeof createClient> | null = null;
function getSupabase() {
  if (!_supabase) {
    _supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
  }
  return _supabase;
}

const CREDITS_BY_PRICE: Record<string, number> = {
  credits_50: 50,
  credits_100: 100,
  credits_150: 150,
  credits_200: 200,
};

const PLAN_BY_PRICE: Record<string, string> = {
  starter_monthly: 'starter',
  business_monthly: 'business',
  pro_monthly: 'pro',
};

async function handleSubscriptionCreated(subscription: any, env: StripeEnv) {
  const orgId = subscription.metadata?.org_id;
  if (!orgId) {
    console.error('No org_id in subscription metadata');
    return;
  }

  const item = subscription.items?.data?.[0];
  const priceId = item?.price?.lookup_key
    || item?.price?.metadata?.lovable_external_id
    || item?.price?.id;
  const productId = item?.price?.product;
  const periodStart = item?.current_period_start ?? subscription.current_period_start;
  const periodEnd = item?.current_period_end ?? subscription.current_period_end;

  await getSupabase().from('subscriptions').upsert(
    {
      org_id: orgId,
      stripe_subscription_id: subscription.id,
      stripe_customer_id: subscription.customer,
      product_id: productId,
      price_id: priceId,
      status: subscription.status,
      current_period_start: periodStart ? new Date(periodStart * 1000).toISOString() : null,
      current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
      environment: env,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'stripe_subscription_id' },
  );
}

async function handleSubscriptionUpdated(subscription: any, env: StripeEnv) {
  const item = subscription.items?.data?.[0];
  const priceId = item?.price?.lookup_key
    || item?.price?.metadata?.lovable_external_id
    || item?.price?.id;
  const productId = item?.price?.product;
  const periodStart = item?.current_period_start ?? subscription.current_period_start;
  const periodEnd = item?.current_period_end ?? subscription.current_period_end;

  await getSupabase()
    .from('subscriptions')
    .update({
      status: subscription.status,
      product_id: productId,
      price_id: priceId,
      current_period_start: periodStart ? new Date(periodStart * 1000).toISOString() : null,
      current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
      cancel_at_period_end: subscription.cancel_at_period_end || false,
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', subscription.id)
    .eq('environment', env);
}

async function handleSubscriptionDeleted(subscription: any, env: StripeEnv) {
  await getSupabase()
    .from('subscriptions')
    .update({
      status: 'canceled',
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', subscription.id)
    .eq('environment', env);
}

async function handleCheckoutSessionCompleted(session: any) {
  const orgId = session.metadata?.org_id;
  if (!orgId) return;

  if (session.payment_status === 'unpaid') return;

  const priceId = session.metadata?.price_id;
  if (!priceId) return;

  const credits = CREDITS_BY_PRICE[priceId];
  if (credits) {
    const { data: org } = await getSupabase()
      .from('organizations')
      .select('credits, credits_total')
      .eq('id', orgId)
      .maybeSingle();
    if (org) {
      const newCredits = (org.credits ?? 0) + credits;
      const newTotal = (org.credits_total ?? 0) + credits;
      await getSupabase()
        .from('organizations')
        .update({ credits: newCredits, credits_total: newTotal })
        .eq('id', orgId);

      await getSupabase().from('credit_transactions').insert({
        org_id: orgId,
        amount: credits,
        reason: 'Achat de crédits Stripe',
        action_key: 'credits.purchase',
        action_label: `Pack ${credits} crédits (Stripe)`,
        balance_before: org.credits ?? 0,
        balance_after: newCredits,
        status: 'completed',
        idempotency_key: `stripe-credits-${session.id}`,
      });
    }
  }

  const plan = PLAN_BY_PRICE[priceId];
  if (plan) {
    await getSupabase()
      .from('organizations')
      .update({ plan })
      .eq('id', orgId);
  }
}

async function handleWebhook(req: Request, env: StripeEnv) {
  const event = await verifyWebhook(req, env);

  switch (event.type) {
    case 'customer.subscription.created':
      await handleSubscriptionCreated(event.data.object, env);
      break;
    case 'customer.subscription.updated':
      await handleSubscriptionUpdated(event.data.object, env);
      break;
    case 'customer.subscription.deleted':
      await handleSubscriptionDeleted(event.data.object, env);
      break;
    case 'checkout.session.completed': {
      await handleCheckoutSessionCompleted(event.data.object);
      break;
    }
    case 'checkout.session.async_payment_succeeded': {
      await handleCheckoutSessionCompleted(event.data.object);
      break;
    }
    default:
      console.log('Unhandled event:', event.type);
  }
}

export const Route = createFileRoute('/api/public/payments/webhook')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rawEnv = new URL(request.url).searchParams.get('env');
        if (rawEnv !== 'sandbox' && rawEnv !== 'live') {
          console.error('Webhook received with invalid or missing env query parameter:', rawEnv);
          return Response.json({ received: true, ignored: 'invalid env' });
        }
        const env: StripeEnv = rawEnv;
        try {
          await handleWebhook(request, env);
          return Response.json({ received: true });
        } catch (e) {
          console.error('Webhook error:', e);
          return new Response('Webhook error', { status: 400 });
        }
      },
    },
  },
});
