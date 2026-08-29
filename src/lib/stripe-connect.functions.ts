import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function currentOrgId(context: { supabase: any; userId: string }): Promise<string> {
  const { data: profile } = await context.supabase
    .from("profiles")
    .select("current_org_id")
    .eq("user_id", context.userId)
    .maybeSingle();
  const orgId = profile?.current_org_id as string | undefined;
  if (!orgId) throw new Error("Aucune entreprise liée à votre profil.");
  return orgId;
}

/** État de la connexion Stripe de l'entreprise (aucune clé secrète n'est exposée). */
export const myOrgStripe = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const orgId = await currentOrgId(context as never);
    const { getOrgStripeAccount, getPlatformStripeConfig } = await import("./stripe-connect.server");
    const acc = await getOrgStripeAccount(orgId);
    let available = true;
    try {
      const cfg = await getPlatformStripeConfig();
      available = Boolean(cfg.connectClientId);
    } catch {
      available = false;
    }
    return {
      available,
      connected: Boolean(acc),
      account: acc
        ? {
            accountId: acc.stripe_account_id as string,
            businessName: (acc.business_name as string | null) ?? null,
            country: (acc.country as string | null) ?? null,
            currency: ((acc.default_currency as string | null) ?? "eur").toUpperCase(),
            livemode: Boolean(acc.livemode),
            chargesEnabled: Boolean(acc.charges_enabled),
            payoutsEnabled: Boolean(acc.payouts_enabled),
            connectedAt: acc.connected_at as string,
          }
        : null,
    };
  });

/** Démarre l'autorisation Stripe Connect (aucune clé à copier pour l'entreprise). */
export const startOrgStripeConnect = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ origin: z.string().url().max(300) }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const orgId = await currentOrgId(context as never);
    const { buildConnectUrl } = await import("./stripe-connect.server");
    try {
      const url = await buildConnectUrl(orgId, (context as never as { userId: string }).userId, data.origin);
      return { url, error: null as string | null };
    } catch (e) {
      return { url: null as string | null, error: e instanceof Error ? e.message : "Connexion impossible." };
    }
  });

export const disconnectOrgStripeAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const orgId = await currentOrgId(context as never);
    const { disconnectOrgStripe } = await import("./stripe-connect.server");
    return disconnectOrgStripe(orgId);
  });

export const refreshOrgStripeAccountFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const orgId = await currentOrgId(context as never);
    const { refreshOrgStripeAccount } = await import("./stripe-connect.server");
    await refreshOrgStripeAccount(orgId);
    return { ok: true };
  });

/** Transactions Stripe de l'entreprise (agent comptabilité). */
export const orgStripePayments = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const orgId = await currentOrgId(context as never);
    const { listOrgPayments } = await import("./stripe-connect.server");
    try {
      return await listOrgPayments(orgId);
    } catch {
      return [];
    }
  });
