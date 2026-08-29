import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/* eslint-disable @typescript-eslint/no-explicit-any */

const assertPlatformAdmin = async (supabase: any) => {
  const { data, error } = await supabase.rpc("is_platform_admin");
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Accès réservé aux administrateurs de la plateforme.");
};

/**
 * STRIPE SAAS — abonnements Kobyde uniquement.
 * Ne touche jamais les comptes Stripe connectés des entreprises.
 */
export const saasStripeOverview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertPlatformAdmin(context.supabase);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;

    const { data: connector } = await db
      .from("platform_connectors")
      .select("is_enabled,status,secrets,last_test_at,last_error")
      .eq("key", "stripe")
      .maybeSingle();

    const secrets = (connector?.secrets ?? {}) as Record<string, string>;
    const [subs, payments, logs, connected] = await Promise.all([
      db
        .from("subscriptions")
        .select("id,org_id,status,price_id,current_period_end,created_at")
        .order("created_at", { ascending: false })
        .limit(50),
      db
        .from("payments")
        .select("id,org_id,amount,currency,status,method,paid_at,created_at")
        .order("created_at", { ascending: false })
        .limit(50),
      db
        .from("audit_logs")
        .select("id,org_id,action,entity,created_at")
        .like("action", "stripe%")
        .order("created_at", { ascending: false })
        .limit(50),
      db.from("org_stripe_accounts").select("org_id", { count: "exact", head: true }),
    ]);

    return {
      configured: Boolean(secrets["secret_key"]),
      enabled: Boolean(connector?.is_enabled),
      status: (connector?.status as string | undefined) ?? "non_configure",
      hasWebhookSecret: Boolean(secrets["webhook_secret"]),
      connectReady: Boolean(secrets["connect_client_id"]),
      connectWebhookReady: Boolean(secrets["connect_webhook_secret"]),
      lastTestAt: (connector?.last_test_at as string | null) ?? null,
      lastError: (connector?.last_error as string | null) ?? null,
      connectedOrgs: connected?.count ?? 0,
      subscriptions: subs.data ?? [],
      payments: payments.data ?? [],
      logs: logs.data ?? [],
    };
  });

/** Test en direct de la clé Stripe du SaaS. */
export const testSaasStripe = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertPlatformAdmin(context.supabase);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;
    try {
      const { stripeFetch } = await import("./stripe-connect.server");
      const account = await stripeFetch("/v1/account");
      await db
        .from("platform_connectors")
        .update({ status: "actif", last_test_at: new Date().toISOString(), last_error: null })
        .eq("key", "stripe");
      return {
        ok: true,
        message: `Compte Stripe SaaS : ${account?.settings?.dashboard?.display_name ?? account?.id}`,
      };
    } catch (e) {
      const message = e instanceof Error ? e.message : "Test impossible.";
      await db
        .from("platform_connectors")
        .update({ status: "erreur", last_test_at: new Date().toISOString(), last_error: message })
        .eq("key", "stripe");
      return { ok: false, message };
    }
  });

/** Active / désactive le Stripe du SaaS. */
export const toggleSaasStripe = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { enabled: boolean }) => ({ enabled: Boolean(d?.enabled) }))
  .handler(async ({ data, context }) => {
    await assertPlatformAdmin(context.supabase);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await (supabaseAdmin as any)
      .from("platform_connectors")
      .update({ is_enabled: data.enabled, updated_at: new Date().toISOString() })
      .eq("key", "stripe");
    return { ok: true };
  });
