/* eslint-disable @typescript-eslint/no-explicit-any */
/** Connecteurs plateforme : configuration Super Admin, OAuth utilisateur, coûts et logs. Serveur uniquement. */

import { CONNECTORS, CONNECTOR_MAP, maskSecret, type ConnectorDef } from "./connectors.catalog";

export async function db() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as any;
}

/* ------------------------------------------------------------------ URLs */

export function productionBaseUrl() {
  return (process.env["PUBLIC_APP_URL"] ?? "https://kobyde.com").replace(/\/$/, "");
}
export function devBaseUrl() {
  return "http://localhost:8080";
}
export const callbackPath = (key: string) => `/api/public/connectors/${key}/callback`;
export const webhookPath = (key: string) => `/api/public/connectors/${key}/webhook`;

export function connectorUrls(key: string) {
  return {
    redirectProd: `${productionBaseUrl()}${callbackPath(key)}`,
    redirectDev: `${devBaseUrl()}${callbackPath(key)}`,
    webhookProd: `${productionBaseUrl()}${webhookPath(key)}`,
    webhookDev: `${devBaseUrl()}${webhookPath(key)}`,
  };
}

/* ------------------------------------------------- Configuration Super Admin */

const publicRow = (def: ConnectorDef, row: any) => {
  const secrets = (row?.secrets ?? {}) as Record<string, string>;
  const config = (row?.config ?? {}) as Record<string, string>;
  const masked: Record<string, string> = {};
  [...def.fields, ...(def.optionalFields ?? [])].forEach((field) => {
    const value = field.secret ? secrets[field.key] : config[field.key];
    masked[field.key] = field.secret ? maskSecret(value) : (value ?? "");
  });
  const requiredOk = def.fields
    .filter((x) => x.required !== false)
    .every((x) => (x.secret ? secrets[x.key] : config[x.key]));
  return {
    key: def.key,
    name: def.name,
    category: def.category,
    description: def.description,
    authType: def.authType,
    userConnect: Boolean(def.userConnect),
    webhook: Boolean(def.webhook),
    fields: def.fields,
    optionalFields: def.optionalFields ?? [],
    servicesCatalog: def.services ?? [],
    services: (row?.services ?? def.services?.map((s) => s.key) ?? []) as string[],
    values: masked,
    isEnabled: Boolean(row?.is_enabled),
    status: row?.last_error ? "erreur" : requiredOk ? "configure" : "non_configure",
    lastTestAt: row?.last_test_at ?? null,
    lastError: row?.last_error ?? null,
    urls: connectorUrls(def.key),
  };
};

export async function listConnectors() {
  const supabase = await db();
  const { data } = await supabase.from("platform_connectors").select("*");
  const rows = new Map<string, any>((data ?? []).map((r: any) => [r.key, r]));
  const known = CONNECTORS.map((def) => publicRow(def, rows.get(def.key)));
  const custom = (data ?? [])
    .filter((r: any) => !CONNECTOR_MAP.has(r.key))
    .map((r: any) =>
      publicRow(
        {
          key: r.key,
          name: r.name,
          category: (r.category ?? "custom") as ConnectorDef["category"],
          description: r.description ?? "",
          authType: (r.auth_type ?? "api_key") as ConnectorDef["authType"],
          fields: ((r.config?.__fields as any[]) ?? [
            { key: "api_key", label: "API Key", secret: true, required: true },
          ]) as any,
        },
        r,
      ),
    );
  return [...known, ...custom];
}

export async function saveConnector(input: {
  key: string;
  values: Record<string, string>;
  services?: string[];
  isEnabled?: boolean;
}) {
  const supabase = await db();
  const def = CONNECTOR_MAP.get(input.key);
  const { data: existing } = await supabase
    .from("platform_connectors")
    .select("*")
    .eq("key", input.key)
    .maybeSingle();

  const secrets = { ...((existing?.secrets as any) ?? {}) };
  const config = { ...((existing?.config as any) ?? {}) };
  const fields = [...(def?.fields ?? []), ...(def?.optionalFields ?? [])];
  const fieldMap = new Map(fields.map((x) => [x.key, x]));

  Object.entries(input.values ?? {}).forEach(([k, v]) => {
    const field = fieldMap.get(k);
    const isSecret = field ? Boolean(field.secret) : true;
    if (v === "" || v == null) return; // champ laissé vide = valeur conservée
    if (v.includes("•")) return; // valeur masquée non modifiée
    if (isSecret) secrets[k] = v;
    else config[k] = v;
  });

  const payload = {
    key: input.key,
    name: def?.name ?? existing?.name ?? input.key,
    category: def?.category ?? existing?.category ?? "custom",
    description: def?.description ?? existing?.description ?? null,
    auth_type: def?.authType ?? existing?.auth_type ?? "api_key",
    secrets,
    config,
    services: input.services ?? existing?.services ?? def?.services?.map((s) => s.key) ?? [],
    is_enabled: input.isEnabled ?? existing?.is_enabled ?? false,
    last_error: null,
  };

  const { error } = await supabase.from("platform_connectors").upsert(payload, { onConflict: "key" });
  if (error) throw new Error(error.message);
  return { ok: true };
}

export async function toggleConnector(key: string, enabled: boolean) {
  const supabase = await db();
  const { error } = await supabase
    .from("platform_connectors")
    .upsert({ key, name: CONNECTOR_MAP.get(key)?.name ?? key, is_enabled: enabled }, { onConflict: "key" });
  if (error) throw new Error(error.message);
  return { ok: true, enabled };
}

export async function deleteConnector(key: string) {
  const supabase = await db();
  await supabase.from("platform_connectors").delete().eq("key", key);
  return { ok: true };
}

export async function createCustomConnector(input: {
  key: string;
  name: string;
  description?: string;
  baseUrl?: string;
  authType: "api_key" | "oauth" | "custom";
  category?: string;
}) {
  const supabase = await db();
  const fields =
    input.authType === "oauth"
      ? [
          { key: "client_id", label: "Client ID", secret: false, required: true },
          { key: "client_secret", label: "Client Secret", secret: true, required: true },
        ]
      : input.authType === "custom"
        ? [
            { key: "username", label: "Username", secret: false, required: true },
            { key: "password", label: "Password", secret: true, required: true },
          ]
        : [{ key: "api_key", label: "API Key / Access Token", secret: true, required: true }];
  const { error } = await supabase.from("platform_connectors").upsert(
    {
      key: input.key,
      name: input.name,
      description: input.description ?? null,
      category: input.category ?? "custom",
      auth_type: input.authType,
      config: { __fields: fields, base_url: input.baseUrl ?? "" },
      secrets: {},
      is_enabled: false,
    },
    { onConflict: "key" },
  );
  if (error) throw new Error(error.message);
  return { ok: true };
}

/** Récupère la configuration complète (secrets inclus) — usage strictement serveur. */
export async function getConnectorConfig(key: string) {
  const supabase = await db();
  const { data } = await supabase.from("platform_connectors").select("*").eq("key", key).maybeSingle();
  if (!data) return null;
  return {
    key,
    isEnabled: Boolean(data.is_enabled),
    secrets: (data.secrets ?? {}) as Record<string, string>,
    config: (data.config ?? {}) as Record<string, string>,
    services: (data.services ?? []) as string[],
  };
}

/* --------------------------------------------------------- Test de connexion */

export async function testConnector(key: string) {
  const conf = await getConnectorConfig(key);
  const supabase = await db();
  const finish = async (ok: boolean, message: string) => {
    await supabase
      .from("platform_connectors")
      .upsert(
        { key, name: CONNECTOR_MAP.get(key)?.name ?? key, last_test_at: new Date().toISOString(), last_error: ok ? null : message },
        { onConflict: "key" },
      );
    return { ok, message };
  };
  if (!conf) return finish(false, "Connecteur non configuré.");
  const s = conf.secrets;

  try {
    if (key === "openai") {
      const r = await fetch("https://api.openai.com/v1/models", {
        headers: { Authorization: `Bearer ${s["api_key"]}` },
      });
      return finish(r.ok, r.ok ? "Connexion OpenAI réussie." : `OpenAI a répondu ${r.status}.`);
    }
    if (key === "gemini") {
      const r = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(s["api_key"] ?? "")}`,
      );
      return finish(r.ok, r.ok ? "Connexion Gemini réussie." : `Gemini a répondu ${r.status}.`);
    }
    if (key === "stripe") {
      const r = await fetch("https://api.stripe.com/v1/balance", {
        headers: { Authorization: `Bearer ${s["secret_key"]}` },
      });
      return finish(r.ok, r.ok ? "Connexion Stripe réussie." : `Stripe a répondu ${r.status}.`);
    }
    if (key === "resend") {
      const r = await fetch("https://api.resend.com/domains", {
        headers: { Authorization: `Bearer ${s["api_key"]}` },
      });
      return finish(r.ok, r.ok ? "Connexion Resend réussie." : `Resend a répondu ${r.status}.`);
    }
    if (key === "apify") {
      const r = await fetch(`https://api.apify.com/v2/users/me?token=${encodeURIComponent(s["api_token"] ?? "")}`);
      return finish(r.ok, r.ok ? "Connexion Apify réussie." : `Apify a répondu ${r.status}.`);
    }
    if (key === "meta") {
      const r = await fetch(
        `https://graph.facebook.com/oauth/access_token?client_id=${encodeURIComponent(
          conf.config["app_id"] ?? "",
        )}&client_secret=${encodeURIComponent(s["app_secret"] ?? "")}&grant_type=client_credentials`,
      );
      return finish(r.ok, r.ok ? "Application Meta valide." : `Meta a répondu ${r.status}.`);
    }
    const def = CONNECTOR_MAP.get(key);
    const requiredOk = (def?.fields ?? []).every((x) =>
      x.secret ? Boolean(s[x.key]) : Boolean(conf.config[x.key]),
    );
    return finish(requiredOk, requiredOk ? "Configuration complète." : "Champs obligatoires manquants.");
  } catch (e) {
    return finish(false, e instanceof Error ? e.message : "Erreur de connexion.");
  }
}

/* ------------------------------------------------------------- OAuth utilisateur */

export async function buildAuthorizeUrl(input: {
  connectorKey: string;
  userId: string;
  orgId: string | null;
  origin?: string;
}) {
  const def = CONNECTOR_MAP.get(input.connectorKey);
  if (!def?.oauth) throw new Error("Ce connecteur ne gère pas la connexion de compte.");
  const conf = await getConnectorConfig(input.connectorKey);
  if (!conf?.isEnabled) throw new Error("Ce connecteur n'est pas encore activé par l'administrateur.");

  const clientId =
    conf.config["client_id"] ?? conf.config["app_id"] ?? conf.config["client_key"] ?? conf.secrets["client_id"];
  if (!clientId) throw new Error("Connecteur incomplet : identifiant d'application manquant.");

  const base = (input.origin ?? productionBaseUrl()).replace(/\/$/, "");
  const redirectUri = `${base}${callbackPath(input.connectorKey)}`;
  const state = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");

  const supabase = await db();
  await supabase.from("oauth_states").insert({
    state,
    user_id: input.userId,
    org_id: input.orgId,
    connector_key: input.connectorKey,
    redirect_to: `${base}/connexions`,
  });

  const scopes = def.oauth.defaultScopes.join(def.oauth.scopeSeparator ?? " ");
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: scopes,
    state,
  });
  if (input.connectorKey === "google" || input.connectorKey === "google_business") {
    params.set("access_type", "offline");
    params.set("prompt", "consent");
  }
  if (input.connectorKey === "tiktok") {
    params.delete("client_id");
    params.set("client_key", clientId);
  }
  return { url: `${def.oauth.authorizeUrl}?${params.toString()}` };
}

export async function completeOAuth(connectorKey: string, code: string, state: string, origin: string) {
  const def = CONNECTOR_MAP.get(connectorKey);
  if (!def?.oauth) throw new Error("Connecteur inconnu.");
  const supabase = await db();

  const { data: st } = await supabase.from("oauth_states").select("*").eq("state", state).maybeSingle();
  if (!st) throw new Error("Session d'autorisation invalide ou expirée.");
  await supabase.from("oauth_states").delete().eq("state", state);
  if (new Date(st.expires_at).getTime() < Date.now()) throw new Error("Session d'autorisation expirée.");

  const conf = await getConnectorConfig(connectorKey);
  const clientId = conf?.config["client_id"] ?? conf?.config["app_id"] ?? conf?.config["client_key"] ?? "";
  const clientSecret = conf?.secrets["client_secret"] ?? conf?.secrets["app_secret"] ?? "";
  const redirectUri = `${origin.replace(/\/$/, "")}${callbackPath(connectorKey)}`;

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    client_id: clientId,
    client_secret: clientSecret,
  });
  if (connectorKey === "tiktok") {
    body.delete("client_id");
    body.delete("client_secret");
    body.set("client_key", clientId);
    body.set("client_secret", clientSecret);
  }

  const res = await fetch(def.oauth.tokenUrl, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", accept: "application/json" },
    body,
  });
  const payload: any = await res.json().catch(() => ({}));
  if (!res.ok || (!payload.access_token && !payload?.data?.access_token)) {
    throw new Error(payload?.error_description ?? payload?.error ?? `Échange de jeton refusé (${res.status}).`);
  }
  const token = payload.access_token ?? payload?.data?.access_token;
  const refresh = payload.refresh_token ?? payload?.data?.refresh_token ?? null;
  const expiresIn = Number(payload.expires_in ?? payload?.data?.expires_in ?? 0);

  await supabase.from("oauth_connections").upsert(
    {
      user_id: st.user_id,
      org_id: st.org_id,
      provider: connectorKey,
      connector_key: connectorKey,
      provider_user_id: String(payload.open_id ?? payload?.data?.open_id ?? payload.user_id ?? st.user_id),
      access_token: token,
      refresh_token: refresh,
      expires_at: expiresIn ? new Date(Date.now() + expiresIn * 1000).toISOString() : null,
      scopes: def.oauth.defaultScopes.join(" "),
      status: "active",
      revoked: false,
      metadata: { connector: connectorKey },
    },
    { onConflict: "user_id,provider" },
  );

  return { redirectTo: st.redirect_to ?? `${origin}/parametres` };
}

export async function listUserConnections(userId: string) {
  const supabase = await db();
  const { data } = await supabase
    .from("oauth_connections")
    .select("id,provider,connector_key,provider_email,account_label,scopes,expires_at,status,revoked,created_at,last_used_at")
    .eq("user_id", userId);
  const rows = new Map<string, any>((data ?? []).map((r: any) => [r.connector_key ?? r.provider, r]));

  const connectors = await listConnectors();
  return connectors
    .filter((c) => c.userConnect)
    .map((c) => {
      const row = rows.get(c.key);
      return {
        key: c.key,
        name: c.name,
        description: c.description,
        category: c.category,
        available: c.isEnabled && c.status === "configure",
        connected: Boolean(row && !row.revoked && row.status === "active"),
        account: row?.account_label ?? row?.provider_email ?? null,
        scopes: row?.scopes ?? "",
        expiresAt: row?.expires_at ?? null,
        connectedAt: row?.created_at ?? null,
        services: c.servicesCatalog,
      };
    });
}

export async function disconnectUserConnection(userId: string, connectorKey: string) {
  const supabase = await db();
  await supabase
    .from("oauth_connections")
    .update({ revoked: true, status: "revoked", access_token: null, refresh_token: null })
    .eq("user_id", userId)
    .eq("provider", connectorKey);
  return { ok: true };
}

/* --------------------------------------------- Connexion manuelle (jetons saisis) */

export async function saveUserManualConnection(input: {
  userId: string;
  orgId: string | null;
  connectorKey: string;
  values: Record<string, string>;
}) {
  const def = CONNECTOR_MAP.get(input.connectorKey);
  if (!def) throw new Error("Connecteur inconnu.");

  const values = Object.fromEntries(
    Object.entries(input.values).map(([k, v]) => [k, (v ?? "").trim()]).filter(([, v]) => v !== ""),
  ) as Record<string, string>;

  const missing = (def.fields ?? [])
    .filter((fd) => fd.required !== false && !values[fd.key])
    .map((fd) => fd.label);
  if (missing.length) throw new Error(`Champs obligatoires manquants : ${missing.join(", ")}.`);

  const token =
    values["access_token"] ?? values["api_key"] ?? values["api_token"] ?? values["client_secret"] ??
    values["app_secret"] ?? Object.values(values)[0] ?? "";
  const label = values["account_label"] ?? values["email"] ?? null;

  const supabase = await db();
  const { error } = await supabase.from("oauth_connections").upsert(
    {
      user_id: input.userId,
      org_id: input.orgId,
      provider: input.connectorKey,
      connector_key: input.connectorKey,
      provider_user_id: input.userId,
      access_token: token,
      account_label: label,
      status: "active",
      revoked: false,
      scopes: (def.oauth?.defaultScopes ?? []).join(" "),
      metadata: { connector: input.connectorKey, mode: "manual", fields: Object.keys(values) },
    },
    { onConflict: "user_id,provider" },
  );
  if (error) throw new Error(error.message);
  return { ok: true };
}
