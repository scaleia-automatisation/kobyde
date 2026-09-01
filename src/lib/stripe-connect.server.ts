/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * STRIPE ENTREPRISE (Stripe Connect).
 *
 * Isolation stricte :
 *  - Le Stripe du SaaS (abonnements Kobyde) vit dans `stripe.server.ts` + `payments.functions.ts`.
 *  - Ce module ne sert QU'AUX paiements des clients des entreprises utilisatrices,
 *    via le compte Stripe connecté de chaque organisation (`Stripe-Account`).
 */

const STRIPE_API = "https://api.stripe.com";

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as any;
}

export type PlatformStripeConfig = {
  secretKey: string;
  connectClientId: string | null;
  connectWebhookSecret: string | null;
};

/** Clés de la plateforme (configurées par le Super Admin dans Connecteurs → Stripe). */
export async function getPlatformStripeConfig(): Promise<PlatformStripeConfig> {
  const db = await admin();
  const { data } = await db
    .from("platform_connectors")
    .select("secrets,is_enabled")
    .eq("key", "stripe")
    .maybeSingle();

  const secrets = (data?.secrets ?? {}) as Record<string, string>;
  const secretKey = secrets["secret_key"] || process.env["STRIPE_SECRET_KEY"] || "";
  if (!secretKey) {
    throw new Error("Stripe n'est pas configuré par l'administrateur de la plateforme.");
  }
  return {
    secretKey,
    connectClientId: secrets["connect_client_id"] || process.env["STRIPE_CONNECT_CLIENT_ID"] || null,
    connectWebhookSecret:
      secrets["connect_webhook_secret"] || process.env["STRIPE_CONNECT_WEBHOOK_SECRET"] || null,
  };
}

/** Appel Stripe brut, éventuellement au nom d'un compte connecté. */
export async function stripeFetch(
  path: string,
  options: {
    method?: "GET" | "POST";
    body?: URLSearchParams;
    stripeAccount?: string | null;
    secretKey?: string;
  } = {},
) {
  const secretKey = options.secretKey ?? (await getPlatformStripeConfig()).secretKey;
  const headers: Record<string, string> = {
    authorization: `Bearer ${secretKey}`,
    "content-type": "application/x-www-form-urlencoded",
  };
  if (options.stripeAccount) headers["stripe-account"] = options.stripeAccount;

  const res = await fetch(`${STRIPE_API}${path}`, {
    method: options.method ?? (options.body ? "POST" : "GET"),
    headers,
    ...(options.body ? { body: options.body } : {}),
  });
  const json = (await res.json().catch(() => ({}))) as any;
  if (!res.ok) {
    throw new Error(json?.error?.message ?? `Stripe (${res.status})`);
  }
  return json;
}

/* ------------------------------------------------------------------ */
/* OAuth Stripe Connect                                                */
/* ------------------------------------------------------------------ */

export async function buildConnectUrl(orgId: string, userId: string, origin: string) {
  const cfg = await getPlatformStripeConfig();
  if (!cfg.connectClientId) {
    throw new Error(
      "Stripe Connect n'est pas encore activé par l'administrateur (Client ID Connect manquant).",
    );
  }
  const db = await admin();
  const state = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
  await db.from("org_stripe_oauth_states").insert({ state, org_id: orgId, user_id: userId });

  // L'URI de redirection doit toujours être le domaine canonique déclaré
  // dans le tableau de bord Stripe (https://kobyde.com), jamais une URL d'aperçu.
  const { oauthBaseUrl } = await import("./connectors.server");
  const params = new URLSearchParams({
    response_type: "code",
    client_id: cfg.connectClientId,
    scope: "read_write",
    redirect_uri: `${oauthBaseUrl(origin)}/api/public/stripe/connect/callback`,
    state,
  });
  return `https://connect.stripe.com/oauth/authorize?${params.toString()}`;
}

/** Échange le code OAuth et enregistre le compte connecté de l'entreprise. */
export async function completeConnect(code: string, state: string) {
  const db = await admin();
  const { data: row } = await db
    .from("org_stripe_oauth_states")
    .select("org_id,user_id,expires_at")
    .eq("state", state)
    .maybeSingle();
  if (!row) throw new Error("Session de connexion Stripe invalide ou expirée.");
  await db.from("org_stripe_oauth_states").delete().eq("state", state);
  if (new Date(row.expires_at).getTime() < Date.now()) {
    throw new Error("Session de connexion Stripe expirée.");
  }

  const cfg = await getPlatformStripeConfig();
  const token = await stripeFetch("/v1/oauth/token", {
    body: new URLSearchParams({ grant_type: "authorization_code", code }),
    secretKey: cfg.secretKey,
  });

  const accountId: string = token.stripe_user_id;
  const account = await stripeFetch(`/v1/accounts/${accountId}`, { secretKey: cfg.secretKey });

  await db.from("org_stripe_accounts").upsert(
    {
      org_id: row.org_id,
      stripe_account_id: accountId,
      livemode: Boolean(token.livemode),
      scope: token.scope ?? "read_write",
      business_name: account?.business_profile?.name ?? account?.settings?.dashboard?.display_name ?? null,
      country: account?.country ?? null,
      default_currency: account?.default_currency ?? null,
      charges_enabled: Boolean(account?.charges_enabled),
      payouts_enabled: Boolean(account?.payouts_enabled),
      status: "connected",
      connected_by: row.user_id,
      connected_at: new Date().toISOString(),
      last_synced_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "org_id" },
  );

  return { orgId: row.org_id as string, accountId };
}

export async function getOrgStripeAccount(orgId: string) {
  const db = await admin();
  const { data } = await db
    .from("org_stripe_accounts")
    .select("*")
    .eq("org_id", orgId)
    .maybeSingle();
  return data ?? null;
}

export async function findOrgByStripeAccount(accountId: string) {
  const db = await admin();
  const { data } = await db
    .from("org_stripe_accounts")
    .select("org_id")
    .eq("stripe_account_id", accountId)
    .maybeSingle();
  return (data?.org_id as string | undefined) ?? null;
}

export async function refreshOrgStripeAccount(orgId: string) {
  const acc = await getOrgStripeAccount(orgId);
  if (!acc) return null;
  const account = await stripeFetch(`/v1/accounts/${acc.stripe_account_id}`);
  const db = await admin();
  await db
    .from("org_stripe_accounts")
    .update({
      charges_enabled: Boolean(account?.charges_enabled),
      payouts_enabled: Boolean(account?.payouts_enabled),
      business_name: account?.business_profile?.name ?? acc.business_name,
      default_currency: account?.default_currency ?? acc.default_currency,
      last_synced_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("org_id", orgId);
  return { ...acc, charges_enabled: Boolean(account?.charges_enabled) };
}

export async function disconnectOrgStripe(orgId: string) {
  const acc = await getOrgStripeAccount(orgId);
  if (!acc) return { ok: true };
  const cfg = await getPlatformStripeConfig();
  if (cfg.connectClientId) {
    try {
      await stripeFetch("/v1/oauth/deauthorize", {
        body: new URLSearchParams({
          client_id: cfg.connectClientId,
          stripe_user_id: acc.stripe_account_id,
        }),
        secretKey: cfg.secretKey,
      });
    } catch {
      /* le compte a pu être déconnecté côté Stripe : on nettoie quand même */
    }
  }
  const db = await admin();
  await db.from("org_stripe_accounts").delete().eq("org_id", orgId);
  return { ok: true };
}

/* ------------------------------------------------------------------ */
/* Paiements clients sur le compte de l'entreprise                     */
/* ------------------------------------------------------------------ */

/**
 * Crée une session Checkout sur le compte Stripe connecté de l'entreprise.
 * Renvoie null si l'entreprise n'a pas connecté son Stripe (paiement manuel).
 */
export async function createOrgCheckoutSession(input: {
  orgId: string;
  amountTtc: number;
  label: string;
  currency?: string;
  successUrl: string;
  cancelUrl: string;
  metadata?: Record<string, string>;
  clientReferenceId?: string;
  customerEmail?: string | null;
}) {
  const acc = await getOrgStripeAccount(input.orgId);
  const ownKey = acc ? null : await getOrgStripeSecretKey(input.orgId);
  if (!acc && !ownKey) return null;

  const currency = (input.currency ?? acc?.default_currency ?? "eur").toLowerCase();
  const body = new URLSearchParams({
    mode: "payment",
    "line_items[0][quantity]": "1",
    "line_items[0][price_data][currency]": currency,
    "line_items[0][price_data][unit_amount]": String(Math.round(Number(input.amountTtc) * 100)),
    "line_items[0][price_data][product_data][name]": input.label || "Paiement",
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
    "metadata[organization_id]": input.orgId,
  });
  if (acc) body.set("metadata[connected_account_id]", acc.stripe_account_id);
  if (input.clientReferenceId) body.set("client_reference_id", input.clientReferenceId);
  if (input.customerEmail) body.set("customer_email", input.customerEmail);
  for (const [k, v] of Object.entries(input.metadata ?? {})) {
    if (v) body.set(`metadata[${k}]`, String(v));
  }

  const session = await stripeFetch("/v1/checkout/sessions", {
    body,
    ...(acc ? { stripeAccount: acc.stripe_account_id } : { secretKey: ownKey! }),
  });
  return {
    url: session.url as string,
    id: session.id as string,
    accountId: acc ? (acc.stripe_account_id as string) : null,
  };
}

/** Transactions récentes du compte Stripe de l'entreprise (agent comptabilité). */
export async function listOrgPayments(orgId: string, limit = 20) {
  const acc = await getOrgStripeAccount(orgId);
  const ownKey = acc ? null : await getOrgStripeSecretKey(orgId);
  if (!acc && !ownKey) return [];
  const res = await stripeFetch(`/v1/payment_intents?limit=${Math.min(limit, 100)}`, {
    ...(acc ? { stripeAccount: acc.stripe_account_id } : { secretKey: ownKey! }),
  });
  return (res.data ?? []).map((p: any) => ({
    id: p.id,
    amount: Number(p.amount ?? 0) / 100,
    currency: String(p.currency ?? "eur").toUpperCase(),
    status: p.status,
    description: p.description ?? null,
    created: new Date(Number(p.created ?? 0) * 1000).toISOString(),
  }));
}

/* ------------------------------------------------------------------ */
/* Vérification de signature webhook (Connect)                         */
/* ------------------------------------------------------------------ */

export async function verifyStripeSignature(payload: string, header: string | null, secret: string) {
  if (!header) return false;
  let timestamp: string | undefined;
  const signatures: string[] = [];
  for (const part of header.split(",")) {
    const [k, v] = part.split("=", 2);
    if (k?.trim() === "t" && v) timestamp = v;
    if (k?.trim() === "v1" && v) signatures.push(v);
  }
  if (!timestamp || signatures.length === 0) return false;
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signed = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${timestamp}.${payload}`));
  const expected = Array.from(new Uint8Array(signed))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return signatures.includes(expected);
}

/* ------------------------------------------------------------------ */
/* Clés Stripe saisies par l'entreprise (mode « Configurer »)          */
/* ------------------------------------------------------------------ */

export async function getOrgStripeKeys(orgId: string) {
  const db = await admin();
  const { data } = await db.from("org_stripe_keys").select("*").eq("org_id", orgId).maybeSingle();
  return data ?? null;
}

/** Clé secrète déchiffrée de l'entreprise (ou null si non configurée). */
export async function getOrgStripeSecretKey(orgId: string): Promise<string | null> {
  const row = await getOrgStripeKeys(orgId);
  if (!row) return null;
  const { decryptToken } = await import("./token-crypto.server");
  return await decryptToken(row.secret_key_encrypted as string);
}

/** Enregistre et vérifie les clés Stripe d'une entreprise. */
export async function saveOrgStripeKeys(input: {
  orgId: string;
  userId: string;
  secretKey: string;
  publishableKey: string;
}) {
  const secretKey = input.secretKey.trim();
  const publishableKey = input.publishableKey.trim();
  if (!/^(sk|rk)_(test|live)_/.test(secretKey)) {
    throw new Error("Clé secrète invalide : elle doit commencer par sk_test_, sk_live_ ou rk_.");
  }
  if (!/^pk_(test|live)_/.test(publishableKey)) {
    throw new Error("Clé publiable invalide : elle doit commencer par pk_test_ ou pk_live_.");
  }

  const account = await stripeFetch("/v1/account", { secretKey });

  const { encryptToken } = await import("./token-crypto.server");
  const db = await admin();
  await db.from("org_stripe_keys").upsert(
    {
      org_id: input.orgId,
      secret_key_encrypted: await encryptToken(secretKey),
      publishable_key: publishableKey,
      account_id: account?.id ?? null,
      business_name:
        account?.business_profile?.name ?? account?.settings?.dashboard?.display_name ?? null,
      livemode: secretKey.includes("_live_"),
      configured_by: input.userId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "org_id" },
  );

  return {
    accountId: (account?.id as string) ?? null,
    businessName:
      (account?.business_profile?.name as string | null) ??
      (account?.settings?.dashboard?.display_name as string | null) ??
      null,
    livemode: secretKey.includes("_live_"),
  };
}

export async function deleteOrgStripeKeys(orgId: string) {
  const db = await admin();
  await db.from("org_stripe_keys").delete().eq("org_id", orgId);
  return { ok: true };
}
