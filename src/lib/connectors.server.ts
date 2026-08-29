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
    // La connexion reste active tant que l'admin ne la déconnecte pas :
    // un test en échec n'invalide plus le connecteur configuré.
    status: requiredOk ? "configure" : row?.last_error ? "erreur" : "non_configure",
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

type Probe = { ok: boolean; status: number; json: any; text: string };

/** Appelle réellement l'API du fournisseur et renvoie le statut + le corps de la réponse. */
async function probe(url: string, init?: RequestInit): Promise<Probe> {
  const r = await fetch(url, {
    ...init,
    signal: AbortSignal.timeout(15000),
  });
  const text = await r.text().catch(() => "");
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  return { ok: r.ok, status: r.status, json, text };
}

/** Message d'erreur lisible extrait de la réponse du fournisseur. */
function providerError(name: string, p: Probe) {
  const detail =
    p.json?.error?.message ??
    p.json?.error_description ??
    p.json?.message ??
    (typeof p.json?.error === "string" ? p.json.error : null) ??
    p.text.slice(0, 200);
  return `${name} a répondu ${p.status}${detail ? ` : ${detail}` : ""}.`;
}

/** Jeton JWT HS256 attendu par l'API officielle Kling AI. */
async function klingJwt(accessKey: string, secretKey: string): Promise<string> {
  const enc = new TextEncoder();
  const b64 = (bytes: Uint8Array) => {
    let bin = "";
    for (const b of bytes) bin += String.fromCharCode(b);
    return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  };
  const now = Math.floor(Date.now() / 1000);
  const head = b64(enc.encode(JSON.stringify({ alg: "HS256", typ: "JWT" })));
  const payload = b64(enc.encode(JSON.stringify({ iss: accessKey, exp: now + 1800, nbf: now - 5 })));
  const k = await crypto.subtle.importKey("raw", enc.encode(secretKey), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
  ]);
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", k, enc.encode(`${head}.${payload}`)));
  return `${head}.${payload}.${b64(sig)}`;
}



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
  const need = (field: string, label: string) =>
    s[field] ? null : finish(false, `Clé manquante : renseignez ${label} avant de tester.`);

  try {
    if (key === "openai") {
      const miss = await need("api_key", "la clé API OpenAI");
      if (miss) return miss;
      const p = await probe("https://api.openai.com/v1/models", {
        headers: { Authorization: `Bearer ${s["api_key"]}` },
      });
      if (!p.ok) return finish(false, providerError("OpenAI", p));
      const n = Array.isArray(p.json?.data) ? p.json.data.length : 0;
      return finish(true, `Appel API OpenAI réussi (200) — ${n} modèles disponibles.`);
    }
    if (key === "gemini") {
      const miss = await need("api_key", "la clé API Gemini");
      if (miss) return miss;
      const p = await probe(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(s["api_key"] ?? "")}`,
      );
      if (!p.ok) return finish(false, providerError("Gemini", p));
      const n = Array.isArray(p.json?.models) ? p.json.models.length : 0;
      return finish(true, `Appel API Gemini réussi (200) — ${n} modèles disponibles.`);
    }
    if (key === "stripe") {
      const miss = await need("secret_key", "la clé secrète Stripe");
      if (miss) return miss;
      const p = await probe("https://api.stripe.com/v1/balance", {
        headers: { Authorization: `Bearer ${s["secret_key"]}` },
      });
      if (!p.ok) return finish(false, providerError("Stripe", p));
      const cur = p.json?.available?.[0]?.currency?.toUpperCase?.() ?? "";
      return finish(true, `Appel API Stripe réussi (200)${cur ? ` — solde en ${cur}` : ""}.`);
    }
    if (key === "resend") {
      const miss = await need("api_key", "la clé API Resend");
      if (miss) return miss;
      const p = await probe("https://api.resend.com/domains", {
        headers: { Authorization: `Bearer ${s["api_key"]}` },
      });
      if (!p.ok) return finish(false, providerError("Resend", p));
      const n = Array.isArray(p.json?.data) ? p.json.data.length : 0;
      return finish(true, `Appel API Resend réussi (200) — ${n} domaine(s) configuré(s).`);
    }
    if (key === "apify") {
      const miss = await need("api_token", "le jeton API Apify");
      if (miss) return miss;
      const p = await probe(`https://api.apify.com/v2/users/me?token=${encodeURIComponent(s["api_token"] ?? "")}`);
      if (!p.ok) return finish(false, providerError("Apify", p));
      const u = p.json?.data?.username ?? "";
      return finish(true, `Appel API Apify réussi (200)${u ? ` — compte ${u}` : ""}.`);
    }
    if (key === "meta") {
      const p = await probe(
        `https://graph.facebook.com/oauth/access_token?client_id=${encodeURIComponent(
          conf.config["app_id"] ?? "",
        )}&client_secret=${encodeURIComponent(s["app_secret"] ?? "")}&grant_type=client_credentials`,
      );
      if (!p.ok) return finish(false, providerError("Meta", p));
      return finish(true, "Appel API Meta réussi (200) — jeton d'application obtenu.");
    }
    if (key === "notion") {
      const { clientId, clientSecret } = appCredentials(conf);
      if (!clientId || !clientSecret) {
        return finish(false, "Configuration OAuth incomplète : renseignez le Client ID et le Client Secret Notion.");
      }
      return finish(
        true,
        "Configuration OAuth Notion complète — les utilisateurs pourront connecter leur espace depuis « Mes connexions ».",
      );
    }
    if (key === "slack") {
      const tok = s["bot_token"] ?? s["access_token"] ?? s["api_key"] ?? "";
      if (!tok) return finish(false, "Clé manquante : renseignez le jeton Slack avant de tester.");
      const p = await probe("https://slack.com/api/auth.test", { headers: { Authorization: `Bearer ${tok}` } });
      if (!p.json?.ok) return finish(false, `Slack a répondu ${p.status} : ${p.json?.error ?? "échec"}.`);
      return finish(true, `Appel API Slack réussi (200) — espace ${p.json?.team ?? ""}.`);
    }
    if (key === "grok") {
      const miss = await need("api_key", "la clé API xAI");
      if (miss) return miss;
      const p = await probe("https://api.x.ai/v1/models", { headers: { Authorization: `Bearer ${s["api_key"]}` } });
      if (!p.ok) return finish(false, providerError("xAI", p));
      const n = Array.isArray(p.json?.data) ? p.json.data.length : 0;
      return finish(true, `Appel API xAI réussi (200) — ${n} modèle(s) disponible(s).`);
    }
    if (key === "seedance") {
      const miss = await need("api_key", "la clé API Seedance");
      if (miss) return miss;
      const key = s["api_key"] ?? "";
      if (!key.startsWith("ark-")) {
        return finish(
          false,
          "Format de clé Seedance incorrect. ModelArk attend une clé commençant par 'ark-'. La clé actuelle ne sera pas acceptée.",
        );
      }
      const base = conf.config["api_base"] || "https://ark.ap-southeast.bytepluses.com/api/v3";
      const p = await probe(`${base}/contents/generations/tasks?page_size=1`, {
        headers: { Authorization: `Bearer ${key}` },
      });
      if (!p.ok) return finish(false, providerError("Seedance", p));
      return finish(true, "Appel API Seedance réussi (200) — clé valide.");
    }
    if (key === "kling") {
      const apiKey = s["api_key"] ?? "";
      const ak = conf.config["access_key"] ?? s["access_key"] ?? "";
      const sk = s["secret_key"] ?? "";
      const token = apiKey ? apiKey : ak && sk ? await klingJwt(ak, sk) : "";
      if (!token) return finish(false, "Clé manquante : renseignez la clé API Kling ou la paire Access Key + Secret Key.");
      const base = conf.config["api_base"] || "https://api-singapore.klingai.com";
      const p = await probe(`${base}/v1/videos/text2video?pageNum=1&pageSize=1`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!p.ok) return finish(false, providerError("Kling", p));
      return finish(true, "Appel API Kling réussi (200) — identifiants valides.");
    }
    const def = CONNECTOR_MAP.get(key);

    const requiredOk = (def?.fields ?? []).every((x) =>
      x.secret ? Boolean(s[x.key]) : Boolean(conf.config[x.key]),
    );
    return finish(
      requiredOk,
      requiredOk
        ? "Configuration complète (aucun appel API de test disponible pour ce connecteur)."
        : "Champs obligatoires manquants.",
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erreur de connexion.";
    return finish(false, msg.includes("timed out") ? "Le fournisseur n'a pas répondu (délai dépassé)." : msg);
  }
}


/* ------------------------------------------------------------- OAuth utilisateur */

const splitScopes = (v?: string | null) => (v ?? "").split(/[\s,]+/).filter(Boolean);
const joinScopes = (v: string[]) => Array.from(new Set(v)).join(" ");

/** Identifiants d'application du connecteur (Super Admin uniquement). */
function appCredentials(conf: { config: Record<string, string>; secrets: Record<string, string> } | null) {
  const clientId =
    conf?.config["client_id"] ?? conf?.config["app_id"] ?? conf?.config["client_key"] ?? conf?.secrets["client_id"] ?? "";
  const clientSecret =
    conf?.secrets["client_secret"] ?? conf?.secrets["app_secret"] ?? conf?.secrets["client_key_secret"] ?? "";
  return { clientId, clientSecret };
}

/** Connexion utilisateur (ligne brute) — serveur uniquement. */
async function getConnectionRow(userId: string, connectorKey: string) {
  const supabase = await db();
  const { data } = await supabase
    .from("oauth_connections")
    .select("*")
    .eq("user_id", userId)
    .eq("provider", connectorKey)
    .maybeSingle();
  return data ?? null;
}

export async function buildAuthorizeUrl(input: {
  connectorKey: string;
  userId: string;
  orgId: string | null;
  origin?: string;
  scopes?: string[];
  redirectTo?: string;
}) {
  const def = CONNECTOR_MAP.get(input.connectorKey);
  if (!def?.oauth) throw new Error("Ce connecteur ne gère pas la connexion de compte.");
  const conf = await getConnectorConfig(input.connectorKey);
  if (!conf?.isEnabled) throw new Error("Ce connecteur n'est pas encore activé par l'administrateur.");
  const { clientId } = appCredentials(conf);
  if (!clientId) throw new Error("Connecteur incomplet : identifiant d'application manquant.");

  const base = (input.origin ?? productionBaseUrl()).replace(/\/$/, "");
  const redirectUri = `${base}${callbackPath(input.connectorKey)}`;
  const state = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");

  const supabase = await db();
  const catalog = def.oauth.scopeCatalog ?? [];
  const allowed = new Set(catalog.length ? catalog.map((s) => s.scope) : def.oauth.defaultScopes);
  const required = catalog.filter((s) => s.required).map((s) => s.scope);
  const chosen = (input.scopes ?? []).filter((s) => allowed.has(s));

  // Autorisations déjà accordées : on les conserve pour ne jamais les redemander "à zéro".
  const existing = await getConnectionRow(input.userId, input.connectorKey);
  const alreadyGranted = existing && !existing.revoked ? splitScopes(existing.scopes_granted ?? existing.scopes) : [];

  const selected = Array.from(
    new Set([...required, ...alreadyGranted, ...(chosen.length ? chosen : def.oauth.defaultScopes)]),
  );
  const isNewConsent = selected.some((s) => !alreadyGranted.includes(s));

  await supabase.from("oauth_states").insert({
    state,
    user_id: input.userId,
    org_id: input.orgId,
    connector_key: input.connectorKey,
    redirect_to: `${base}${input.redirectTo ?? "/mes-connexions"}`,
    scopes: selected.join(" "),
  });

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: selected.join(def.oauth.scopeSeparator ?? " "),
    state,
  });
  if (input.connectorKey === "google") {
    params.set("access_type", "offline");
    params.set("include_granted_scopes", "true");
    // Consentement redemandé uniquement lorsqu'une nouvelle autorisation est nécessaire
    // ou lorsqu'aucun refresh token n'est encore stocké.
    if (isNewConsent || !existing?.refresh_token) params.set("prompt", "consent");
  }
  if (input.connectorKey === "tiktok") {
    params.delete("client_id");
    params.set("client_key", clientId);
  }
  if (input.connectorKey === "notion") {
    params.delete("scope");
    params.set("owner", "user");
  }
  return { url: `${def.oauth.authorizeUrl}?${params.toString()}` };
}

/** Récupère l'identité du compte connecté chez le fournisseur (email / libellé). */
async function fetchAccountIdentity(connectorKey: string, token: string, payload: any) {
  try {
    if (connectorKey === "google") {
      const r = await probe("https://www.googleapis.com/oauth2/v3/userinfo", {
        headers: { Authorization: `Bearer ${token}` },
      });
      return { id: r.json?.sub ?? null, email: r.json?.email ?? null, label: r.json?.name ?? r.json?.email ?? null };
    }
    if (connectorKey === "linkedin") {
      const r = await probe("https://api.linkedin.com/v2/userinfo", { headers: { Authorization: `Bearer ${token}` } });
      return { id: r.json?.sub ?? null, email: r.json?.email ?? null, label: r.json?.name ?? null };
    }
    if (connectorKey === "meta") {
      const r = await probe(`https://graph.facebook.com/v20.0/me?fields=id,name,email&access_token=${encodeURIComponent(token)}`);
      return { id: r.json?.id ?? null, email: r.json?.email ?? null, label: r.json?.name ?? null };
    }
    if (connectorKey === "slack") {
      const r = await probe("https://slack.com/api/auth.test", { headers: { Authorization: `Bearer ${token}` } });
      return { id: r.json?.user_id ?? null, email: null, label: r.json?.team ?? null };
    }
    if (connectorKey === "notion") {
      return {
        id: payload?.owner?.user?.id ?? payload?.bot_id ?? null,
        email: payload?.owner?.user?.person?.email ?? null,
        label: payload?.workspace_name ?? null,
      };
    }
    if (connectorKey === "tiktok") {
      const r = await probe("https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name", {
        headers: { Authorization: `Bearer ${token}` },
      });
      return { id: r.json?.data?.user?.open_id ?? null, email: null, label: r.json?.data?.user?.display_name ?? null };
    }
  } catch {
    /* identité non bloquante */
  }
  return { id: null, email: null, label: null };
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
  const { clientId, clientSecret } = appCredentials(conf);
  const redirectUri = `${origin.replace(/\/$/, "")}${callbackPath(connectorKey)}`;

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    client_id: clientId,
    client_secret: clientSecret,
  });
  const headers: Record<string, string> = {
    "content-type": "application/x-www-form-urlencoded",
    accept: "application/json",
  };
  if (connectorKey === "tiktok") {
    body.delete("client_id");
    body.set("client_key", clientId);
  }
  if (connectorKey === "notion") {
    body.delete("client_id");
    body.delete("client_secret");
    headers["authorization"] = `Basic ${btoa(`${clientId}:${clientSecret}`)}`;
  }

  const res = await fetch(def.oauth.tokenUrl, { method: "POST", headers, body });
  const payload: any = await res.json().catch(() => ({}));
  if (!res.ok || (!payload.access_token && !payload?.data?.access_token)) {
    throw new Error(payload?.error_description ?? payload?.error ?? `Échange de jeton refusé (${res.status}).`);
  }
  const data = payload.access_token ? payload : (payload.data ?? payload);
  const token = data.access_token;
  const refresh = data.refresh_token ?? null;
  const expiresIn = Number(data.expires_in ?? 0);
  const refreshExpiresIn = Number(data.refresh_expires_in ?? data.refresh_token_expires_in ?? 0);

  const requested = splitScopes((st as any).scopes);
  // Le fournisseur renvoie les scopes réellement accordés lorsqu'il les expose.
  const granted = splitScopes(data.scope ?? data.scopes ?? payload.scope) ;
  const existing = await getConnectionRow(st.user_id, connectorKey);
  const previousGranted = existing && !existing.revoked ? splitScopes(existing.scopes_granted) : [];
  const grantedFinal = granted.length ? Array.from(new Set([...previousGranted, ...granted])) : requested;

  const identity = await fetchAccountIdentity(connectorKey, token, payload);

  await supabase.from("oauth_connections").upsert(
    {
      user_id: st.user_id,
      org_id: st.org_id,
      provider: connectorKey,
      connector_key: connectorKey,
      provider_user_id: String(identity.id ?? data.open_id ?? st.user_id),
      provider_account_id: identity.id ?? null,
      provider_email: identity.email ?? null,
      account_label: identity.label ?? identity.email ?? null,
      access_token: token,
      refresh_token: refresh ?? existing?.refresh_token ?? null,
      token_type: data.token_type ?? "Bearer",
      expires_at: expiresIn ? new Date(Date.now() + expiresIn * 1000).toISOString() : null,
      refresh_token_expires_at: refreshExpiresIn
        ? new Date(Date.now() + refreshExpiresIn * 1000).toISOString()
        : null,
      scopes: joinScopes(grantedFinal),
      scopes_requested: joinScopes(requested),
      scopes_granted: joinScopes(grantedFinal),
      status: "active",
      revoked: false,
      revoked_at: null,
      is_active: true,
      connected_at: existing?.connected_at ?? new Date().toISOString(),
      last_refresh_at: new Date().toISOString(),
      metadata: { connector: connectorKey },
    },
    { onConflict: "user_id,provider" },
  );

  await logConnectorCall({
    orgId: st.org_id,
    userId: st.user_id,
    provider: connectorKey,
    action: "oauth.connect",
    status: "ok",
    accountId: identity.id ?? null,
  });

  return { redirectTo: st.redirect_to ?? `${origin}/mes-connexions` };
}

/* ------------------------------------------------- Renouvellement des jetons */

/** Renouvelle l'access token via le refresh token lorsque le fournisseur le permet. */
export async function refreshUserToken(userId: string, connectorKey: string) {
  const def = CONNECTOR_MAP.get(connectorKey);
  const row = await getConnectionRow(userId, connectorKey);
  if (!def?.oauth || !row?.refresh_token) return { ok: false, reason: "no_refresh_token" as const };

  const conf = await getConnectorConfig(connectorKey);
  const { clientId, clientSecret } = appCredentials(conf);
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: row.refresh_token,
    client_id: clientId,
    client_secret: clientSecret,
  });
  if (connectorKey === "tiktok") {
    body.delete("client_id");
    body.set("client_key", clientId);
  }

  const supabase = await db();
  try {
    const res = await fetch(def.oauth.tokenUrl, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded", accept: "application/json" },
      body,
    });
    const payload: any = await res.json().catch(() => ({}));
    const data = payload.access_token ? payload : (payload.data ?? payload);
    if (!res.ok || !data.access_token) {
      await supabase
        .from("oauth_connections")
        .update({ status: "reconnect_required" })
        .eq("user_id", userId)
        .eq("provider", connectorKey);
      return { ok: false as const, reason: "refresh_failed" as const };
    }
    const expiresIn = Number(data.expires_in ?? 0);
    await supabase
      .from("oauth_connections")
      .update({
        access_token: data.access_token,
        refresh_token: data.refresh_token ?? row.refresh_token,
        expires_at: expiresIn ? new Date(Date.now() + expiresIn * 1000).toISOString() : null,
        last_refresh_at: new Date().toISOString(),
        status: "active",
      })
      .eq("user_id", userId)
      .eq("provider", connectorKey);
    return { ok: true as const, accessToken: data.access_token as string };
  } catch {
    return { ok: false as const, reason: "refresh_failed" as const };
  }
}

export type AccessResult =
  | { ok: true; accessToken: string; scopes: string[]; accountId: string | null; accountLabel: string | null }
  | { ok: false; reason: "not_connected" | "reconnect_required" | "missing_scopes"; missingScopes?: string[] };

/**
 * Jeton d'accès utilisateur prêt à l'emploi :
 * vérifie la connexion, les autorisations et renouvelle automatiquement le jeton si nécessaire.
 */
export async function getUserAccessToken(
  userId: string,
  connectorKey: string,
  requiredScopes: string[] = [],
): Promise<AccessResult> {
  const row = await getConnectionRow(userId, connectorKey);
  if (!row || row.revoked || row.is_active === false || !row.access_token) {
    return { ok: false, reason: "not_connected" };
  }
  const granted = splitScopes(row.scopes_granted ?? row.scopes);
  const missing = requiredScopes.filter((s) => !granted.includes(s));
  if (missing.length) return { ok: false, reason: "missing_scopes", missingScopes: missing };

  let token = row.access_token as string;
  const expiresAt = row.expires_at ? new Date(row.expires_at).getTime() : 0;
  // Renouvellement anticipé (2 minutes avant expiration).
  if (expiresAt && expiresAt - Date.now() < 120_000) {
    const refreshed = await refreshUserToken(userId, connectorKey);
    if (!refreshed.ok || !refreshed.accessToken) return { ok: false, reason: "reconnect_required" };
    token = refreshed.accessToken;
  }
  const supabase = await db();
  await supabase
    .from("oauth_connections")
    .update({ last_used_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("provider", connectorKey);

  return {
    ok: true,
    accessToken: token,
    scopes: granted,
    accountId: row.provider_account_id ?? null,
    accountLabel: row.account_label ?? row.provider_email ?? null,
  };
}

/* ------------------------------------------------------------------- Journal */

export async function logConnectorCall(input: {
  orgId?: string | null;
  userId?: string | null;
  agentKey?: string | null;
  provider: string;
  accountId?: string | null;
  action?: string;
  endpoint?: string;
  status?: string;
  durationMs?: number;
  costEur?: number;
  credits?: number;
  error?: string | null;
}) {
  try {
    const supabase = await db();
    await supabase.from("connector_call_logs").insert({
      org_id: input.orgId ?? null,
      user_id: input.userId ?? null,
      agent_key: input.agentKey ?? null,
      provider: input.provider,
      account_id: input.accountId ?? null,
      action: input.action ?? null,
      endpoint: input.endpoint ?? null,
      status: input.status ?? "ok",
      duration_ms: input.durationMs ?? null,
      cost_eur: input.costEur ?? null,
      credits: input.credits ?? null,
      error: input.error ?? null,
    });
  } catch {
    /* le journal ne doit jamais bloquer un appel */
  }
}

export async function listConnectorLogs(filters: {
  provider?: string;
  userId?: string;
  orgId?: string;
  agentKey?: string;
  status?: string;
  since?: string;
  limit?: number;
}) {
  const supabase = await db();
  let q = supabase.from("connector_call_logs").select("*").order("created_at", { ascending: false }).limit(filters.limit ?? 200);
  if (filters.provider) q = q.eq("provider", filters.provider);
  if (filters.userId) q = q.eq("user_id", filters.userId);
  if (filters.orgId) q = q.eq("org_id", filters.orgId);
  if (filters.agentKey) q = q.eq("agent_key", filters.agentKey);
  if (filters.status) q = q.eq("status", filters.status);
  if (filters.since) q = q.gte("created_at", filters.since);
  const { data } = await q;
  return data ?? [];
}

/** Statistiques par connecteur pour le tableau Super Admin. */
export async function connectorStats() {
  const supabase = await db();
  const since = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
  const { data } = await supabase
    .from("connector_call_logs")
    .select("provider,status,cost_eur,created_at")
    .gte("created_at", since);
  const stats: Record<string, { calls: number; errors: number; cost: number; lastUsedAt: string | null }> = {};
  for (const r of data ?? []) {
    const s = (stats[r.provider] ??= { calls: 0, errors: 0, cost: 0, lastUsedAt: null });
    s.calls += 1;
    if (r.status !== "ok") s.errors += 1;
    s.cost += Number(r.cost_eur ?? 0);
    if (!s.lastUsedAt || r.created_at > s.lastUsedAt) s.lastUsedAt = r.created_at;
  }
  return stats;
}

/* --------------------------------------------- Anti double exécution */

/** Exécute une action une seule fois pour une clé d'idempotence donnée. */
export async function runOnce<T>(
  key: string,
  meta: { userId?: string | null; orgId?: string | null; provider?: string; action?: string },
  fn: () => Promise<T>,
): Promise<T> {
  const supabase = await db();
  const { data: existing } = await supabase
    .from("connector_executions")
    .select("result")
    .eq("idempotency_key", key)
    .maybeSingle();
  if (existing) return (existing.result ?? null) as T;

  const { error } = await supabase.from("connector_executions").insert({
    idempotency_key: key,
    user_id: meta.userId ?? null,
    org_id: meta.orgId ?? null,
    provider: meta.provider ?? null,
    action: meta.action ?? null,
  });
  if (error) {
    // Insertion concurrente : une autre exécution a déjà pris la main.
    const { data: row } = await supabase
      .from("connector_executions")
      .select("result")
      .eq("idempotency_key", key)
      .maybeSingle();
    return (row?.result ?? null) as T;
  }
  const result = await fn();
  await supabase
    .from("connector_executions")
    .update({ result: (result ?? null) as any })
    .eq("idempotency_key", key);
  return result;
}

/* --------------------------------------------------- Connexions utilisateur */

export async function listUserConnections(userId: string) {
  const supabase = await db();
  const { data } = await supabase
    .from("oauth_connections")
    .select(
      "id,provider,connector_key,provider_email,account_label,scopes,scopes_granted,scopes_requested,expires_at,status,revoked,is_active,created_at,connected_at,last_used_at",
    )
    .eq("user_id", userId);
  const rows = new Map<string, any>((data ?? []).map((r: any) => [r.connector_key ?? r.provider, r]));

  const connectors = await listConnectors();
  return connectors
    // L'utilisateur ne voit que les plateformes nécessitant SON compte.
    // Les clés API (OpenAI, Gemini, Apify, Resend…) restent gérées par l'administrateur.
    .filter((c) => c.userConnect)
    .map((c) => {
      const row = rows.get(c.key);
      const granted = splitScopes(row?.scopes_granted ?? row?.scopes);
      const def = CONNECTOR_MAP.get(c.key);
      const catalog = def?.oauth?.scopeCatalog ?? [];
      return {
        key: c.key,
        name: c.name,
        description: c.description,
        category: c.category,
        authType: c.authType,
        oauth: c.authType === "oauth",
        available: c.isEnabled && c.status === "configure",
        connected: Boolean(row && !row.revoked),
        isActive: row ? row.is_active !== false : false,
        needsReconnect: row?.status === "reconnect_required",
        account: row?.account_label ?? row?.provider_email ?? null,
        grantedScopes: granted,
        grantedLabels: catalog.filter((s) => granted.includes(s.scope)).map((s) => s.label),
        missingLabels: catalog.filter((s) => !granted.includes(s.scope)).map((s) => s.label),
        expiresAt: row?.expires_at ?? null,
        connectedAt: row?.connected_at ?? row?.created_at ?? null,
        lastUsedAt: row?.last_used_at ?? null,
        services: c.servicesCatalog,
      };
    });
}

export async function setUserConnectionActive(userId: string, connectorKey: string, active: boolean) {
  const supabase = await db();
  const { error } = await supabase
    .from("oauth_connections")
    .update({ is_active: active })
    .eq("user_id", userId)
    .eq("provider", connectorKey);
  if (error) throw new Error(error.message);
  return { ok: true, isActive: active };
}

/** Révoque l'autorisation chez le fournisseur lorsque c'est possible, puis supprime les jetons. */
export async function disconnectUserConnection(userId: string, connectorKey: string) {
  const supabase = await db();
  const row = await getConnectionRow(userId, connectorKey);
  const def = CONNECTOR_MAP.get(connectorKey);
  if (row?.access_token) {
    try {
      if (connectorKey === "google" && def?.oauth?.revokeUrl) {
        await fetch(`${def.oauth.revokeUrl}?token=${encodeURIComponent(row.refresh_token ?? row.access_token)}`, {
          method: "POST",
          headers: { "content-type": "application/x-www-form-urlencoded" },
        });
      } else if (connectorKey === "meta") {
        await fetch(
          `https://graph.facebook.com/v20.0/me/permissions?access_token=${encodeURIComponent(row.access_token)}`,
          { method: "DELETE" },
        );
      } else if (connectorKey === "slack") {
        await fetch("https://slack.com/api/auth.revoke", {
          method: "POST",
          headers: { Authorization: `Bearer ${row.access_token}` },
        });
      }
    } catch {
      /* révocation best-effort */
    }
  }
  await supabase
    .from("oauth_connections")
    .update({
      revoked: true,
      revoked_at: new Date().toISOString(),
      status: "revoked",
      is_active: false,
      access_token: null,
      refresh_token: null,
      scopes_granted: null,
    })
    .eq("user_id", userId)
    .eq("provider", connectorKey);
  await logConnectorCall({ userId, provider: connectorKey, action: "oauth.disconnect", status: "ok" });
  return { ok: true };
}
