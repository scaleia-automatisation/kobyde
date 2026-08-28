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
      const tok = s["api_key"] ?? s["access_token"] ?? s["token"] ?? "";
      if (!tok) return finish(false, "Clé manquante : renseignez le jeton d'intégration Notion avant de tester.");
      const p = await probe("https://api.notion.com/v1/users/me", {
        headers: { Authorization: `Bearer ${tok}`, "Notion-Version": "2022-06-28" },
      });
      if (!p.ok) return finish(false, providerError("Notion", p));
      return finish(true, `Appel API Notion réussi (200)${p.json?.name ? ` — ${p.json.name}` : ""}.`);
    }
    if (key === "slack") {
      const tok = s["bot_token"] ?? s["access_token"] ?? s["api_key"] ?? "";
      if (!tok) return finish(false, "Clé manquante : renseignez le jeton Slack avant de tester.");
      const p = await probe("https://slack.com/api/auth.test", { headers: { Authorization: `Bearer ${tok}` } });
      if (!p.json?.ok) return finish(false, `Slack a répondu ${p.status} : ${p.json?.error ?? "échec"}.`);
      return finish(true, `Appel API Slack réussi (200) — espace ${p.json?.team ?? ""}.`);
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

export async function buildAuthorizeUrl(input: {
  connectorKey: string;
  userId: string;
  orgId: string | null;
  origin?: string;
  scopes?: string[];
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
  const catalog = def.oauth.scopeCatalog ?? [];
  const allowed = new Set(catalog.length ? catalog.map((s) => s.scope) : def.oauth.defaultScopes);
  const required = catalog.filter((s) => s.required).map((s) => s.scope);
  const chosen = (input.scopes ?? []).filter((s) => allowed.has(s));
  const selected = Array.from(new Set([...required, ...(chosen.length ? chosen : def.oauth.defaultScopes)]));

  await supabase.from("oauth_states").insert({
    state,
    user_id: input.userId,
    org_id: input.orgId,
    connector_key: input.connectorKey,
    redirect_to: `${base}/mes-connexions`,
    scopes: selected.join(" "),
  });

  const scopes = selected.join(def.oauth.scopeSeparator ?? " ");
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
      scopes: (st as any).scopes ?? def.oauth.defaultScopes.join(" "),
      status: "active",
      revoked: false,
      is_active: true,
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
    .select("id,provider,connector_key,provider_email,account_label,scopes,expires_at,status,revoked,is_active,created_at,last_used_at,metadata")
    .eq("user_id", userId);
  const rows = new Map<string, any>((data ?? []).map((r: any) => [r.connector_key ?? r.provider, r]));

  const connectors = await listConnectors();
  return connectors
    // Côté utilisateur : tous les connecteurs du catalogue destinés aux utilisateurs.
    // Les clés API, identifiants client/secret et serveurs MCP restent gérés
    // exclusivement par l'administrateur dans l'onglet Connecteurs.
    .filter((c) => c.userConnect || c.isEnabled)
    .map((c) => {
      const row = rows.get(c.key);
      const saved = ((row?.metadata as any)?.values ?? {}) as Record<string, string>;
      const def = CONNECTOR_MAP.get(c.key);
      const savedValues: Record<string, string> = {};
      [...(def?.fields ?? []), ...(def?.optionalFields ?? [])].forEach((fd) => {
        const v = saved[fd.key];
        if (!v) return;
        savedValues[fd.key] = fd.secret ? maskSecret(v) : v;
      });
      if (row?.account_label) savedValues["account_label"] = row.account_label;
      return {
        key: c.key,
        name: c.name,
        description: c.description,
        category: c.category,
        authType: c.authType,
        /** true = autorisation OAuth du compte utilisateur ; false = accès fourni par l'administrateur */
        oauth: c.authType === "oauth",
        available: c.isEnabled && c.status === "configure",
        connected: Boolean(row && !row.revoked),
        isActive: row ? row.is_active !== false : false,
        lastError: (row?.metadata as any)?.last_error ?? null,
        managedByAdmin: Boolean((row?.metadata as any)?.managed_by_admin),
        savedValues,
        account: row?.account_label ?? row?.provider_email ?? null,
        scopes: row?.scopes ?? "",
        expiresAt: row?.expires_at ?? null,
        connectedAt: row?.created_at ?? null,
        services: c.servicesCatalog,
      };
    });

}

/**
 * Active pour l'utilisateur un connecteur non-OAuth (clé API, MCP…) déjà configuré
 * par l'administrateur : aucun identifiant à saisir, l'accès utilise la configuration centrale.
 */
export async function enableManagedUserConnection(input: {
  userId: string;
  orgId: string | null;
  connectorKey: string;
  services?: string[];
}) {
  const def = CONNECTOR_MAP.get(input.connectorKey);
  if (!def) throw new Error("Connecteur inconnu.");
  if (def.authType === "oauth") throw new Error("Ce connecteur nécessite une autorisation OAuth.");
  const conf = await getConnectorConfig(input.connectorKey);
  if (!conf?.isEnabled) throw new Error("Ce connecteur n'est pas encore activé par votre administrateur.");

  const supabase = await db();
  const { error } = await supabase.from("oauth_connections").upsert(
    {
      user_id: input.userId,
      org_id: input.orgId,
      provider: input.connectorKey,
      connector_key: input.connectorKey,
      provider_user_id: input.userId,
      account_label: `${def.name} (accès administrateur)`,
      scopes: (input.services ?? (def.services ?? []).map((s) => s.key)).join(" "),
      status: "active",
      revoked: false,
      is_active: true,
      metadata: { connector: input.connectorKey, managed_by_admin: true },
    },
    { onConflict: "user_id,provider" },
  );
  if (error) throw new Error(error.message);
  return { ok: true };
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

export async function disconnectUserConnection(userId: string, connectorKey: string) {
  const supabase = await db();
  await supabase
    .from("oauth_connections")
    .update({ revoked: true, status: "revoked", is_active: false, access_token: null, refresh_token: null })
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

  const supabase = await db();

  const { data: existingRow } = await supabase
    .from("oauth_connections")
    .select("metadata, account_label, access_token")
    .eq("user_id", input.userId)
    .eq("provider", input.connectorKey)
    .maybeSingle();
  const previous = ((existingRow?.metadata as any)?.values ?? {}) as Record<string, string>;

  const incoming = Object.fromEntries(
    Object.entries(input.values)
      .map(([k, v]) => [k, (v ?? "").trim()] as const)
      .filter(([, v]) => v !== "" && !v.includes("•")),
  ) as Record<string, string>;

  // Champ laissé vide ou valeur masquée = on conserve l'ancienne valeur.
  const values = { ...previous, ...incoming };

  const missing = (def.fields ?? [])
    .filter((fd) => fd.required !== false && !values[fd.key])
    .map((fd) => fd.label);
  if (missing.length) throw new Error(`Champs obligatoires manquants : ${missing.join(", ")}.`);

  const token =
    values["access_token"] ?? values["api_key"] ?? values["api_token"] ?? values["client_secret"] ??
    values["app_secret"] ?? Object.values(values)[0] ?? "";
  const label = values["account_label"] ?? values["email"] ?? existingRow?.account_label ?? null;

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
      is_active: true,
      scopes: (def.oauth?.defaultScopes ?? []).join(" "),
      metadata: {
        connector: input.connectorKey,
        mode: "manual",
        fields: Object.keys(values),
        values,
      },

    },
    { onConflict: "user_id,provider" },
  );
  if (error) throw new Error(error.message);
  return { ok: true };
}

/* ------------------------------------------- Test de la connexion utilisateur */

export async function testUserConnection(userId: string, connectorKey: string) {
  const def = CONNECTOR_MAP.get(connectorKey);
  const supabase = await db();
  const { data: row } = await supabase
    .from("oauth_connections")
    .select("access_token, metadata, revoked, status")
    .eq("user_id", userId)
    .eq("provider", connectorKey)
    .maybeSingle();

  if (!row || row.revoked || !row.access_token) {
    return { ok: false, message: "Aucun identifiant enregistré pour ce connecteur." };
  }

  const token = row.access_token as string;
  const meta = (row.metadata ?? {}) as Record<string, any>;
  const values = (meta["values"] ?? {}) as Record<string, string>;
  const savedFields = ((meta["fields"] as string[] | undefined) ?? []);
  const isAppCredential =
    meta["mode"] === "manual" &&
    !values["access_token"] &&
    (Boolean(values["client_secret"] || values["app_secret"]) || savedFields.includes("client_secret") || savedFields.includes("app_secret"));
  const accessToken = values["access_token"] ?? (isAppCredential ? "" : token);
  const finish = async (ok: boolean, message: string) => {
    await supabase
      .from("oauth_connections")
      .update({
        status: ok ? "active" : "error",
        metadata: { ...meta, last_test_at: new Date().toISOString(), last_error: ok ? null : message },
      })
      .eq("user_id", userId)
      .eq("provider", connectorKey);
    return { ok, message };
  };

  try {
    // Identifiants d'application OAuth (client_id + client_secret) : on valide l'app, pas un jeton utilisateur.
    if (!accessToken && values["client_id"] && values["client_secret"]) {
      if (connectorKey === "google" || connectorKey === "google_ads" || connectorKey === "youtube" || connectorKey === "google_business") {
        const r = await fetch("https://oauth2.googleapis.com/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_id: values["client_id"]!,
            client_secret: values["client_secret"]!,
            grant_type: "refresh_token",
            refresh_token: "kobyde-connection-test",
          }),
        });
        const j = (await r.json().catch(() => ({}))) as { error?: string; error_description?: string };
        if (j.error === "invalid_client") {
          return finish(false, "Identifiants Google refusés : client_id ou client_secret invalide.");
        }
        // invalid_grant = l'app est reconnue par Google, seul le faux refresh_token est rejeté.
        return finish(
          true,
          "Identifiants d'application Google valides. Autorisez maintenant votre compte via « Connecter mon compte » pour accéder aux données.",
        );
      }
      return finish(
        true,
        `Identifiants d'application ${def?.name ?? connectorKey} enregistrés. Lancez l'autorisation OAuth pour accéder aux données.`,
      );
    }

    // Ancienne connexion enregistrée avant le stockage des champs : identifiants incomplets.
    if (!accessToken && ((meta["fields"] as string[] | undefined) ?? []).includes("client_secret")) {
      return finish(
        false,
        "Identifiants incomplets : ré-enregistrez votre client_id et client_secret via « Connecter mon compte » pour activer le test.",
      );
    }

    // Connecteurs par clé API (saisie manuelle par l'utilisateur).
    const apiKey = values["api_key"] ?? values["secret_key"] ?? values["api_token"] ?? (accessToken || "");
    if (connectorKey === "gemini") {
      const p = await probe(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`);
      if (!p.ok) return finish(false, providerError("Gemini", p));
      const n = Array.isArray(p.json?.models) ? p.json.models.length : 0;
      return finish(true, `Appel API Gemini réussi (200) — ${n} modèles disponibles.`);
    }
    if (connectorKey === "openai") {
      const p = await probe("https://api.openai.com/v1/models", { headers: { Authorization: `Bearer ${apiKey}` } });
      if (!p.ok) return finish(false, providerError("OpenAI", p));
      const n = Array.isArray(p.json?.data) ? p.json.data.length : 0;
      return finish(true, `Appel API OpenAI réussi (200) — ${n} modèles disponibles.`);
    }
    if (connectorKey === "resend") {
      const p = await probe("https://api.resend.com/domains", { headers: { Authorization: `Bearer ${apiKey}` } });
      if (!p.ok) return finish(false, providerError("Resend", p));
      return finish(true, "Appel API Resend réussi (200).");
    }
    if (connectorKey === "apify") {
      const p = await probe(`https://api.apify.com/v2/users/me?token=${encodeURIComponent(apiKey)}`);
      if (!p.ok) return finish(false, providerError("Apify", p));
      return finish(true, `Appel API Apify réussi (200)${p.json?.data?.username ? ` — compte ${p.json.data.username}` : ""}.`);
    }
    if (connectorKey === "meta") {
      const p = await probe(`https://graph.facebook.com/v20.0/me?access_token=${encodeURIComponent(accessToken)}`);
      if (!p.ok) return finish(false, providerError("Meta", p));
      return finish(true, `Appel API Meta réussi (200)${p.json?.name ? ` — ${p.json.name}` : ""}.`);
    }
    if (connectorKey === "google" || connectorKey === "google_ads" || connectorKey === "youtube" || connectorKey === "google_business") {
      const p = await probe("https://www.googleapis.com/oauth2/v3/userinfo", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!p.ok) return finish(false, providerError("Google", p));
      return finish(true, `Appel API Google réussi (200)${p.json?.email ? ` — ${p.json.email}` : ""}.`);
    }
    if (connectorKey === "linkedin") {
      const p = await probe("https://api.linkedin.com/v2/userinfo", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!p.ok) return finish(false, providerError("LinkedIn", p));
      return finish(true, `Appel API LinkedIn réussi (200)${p.json?.name ? ` — ${p.json.name}` : ""}.`);
    }
    if (connectorKey === "microsoft" || connectorKey === "outlook") {
      const p = await probe("https://graph.microsoft.com/v1.0/me", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!p.ok) return finish(false, providerError("Microsoft", p));
      return finish(true, `Appel API Microsoft réussi (200)${p.json?.displayName ? ` — ${p.json.displayName}` : ""}.`);
    }
    if (connectorKey === "slack") {
      const p = await probe("https://slack.com/api/auth.test", { headers: { Authorization: `Bearer ${accessToken}` } });
      if (!p.json?.ok) return finish(false, `Slack a répondu ${p.status} : ${p.json?.error ?? "échec"}.`);
      return finish(true, `Appel API Slack réussi (200) — espace ${p.json?.team ?? ""}.`);
    }
    if (connectorKey === "stripe") {
      const p = await probe("https://api.stripe.com/v1/balance", { headers: { Authorization: `Bearer ${apiKey}` } });
      if (!p.ok) return finish(false, providerError("Stripe", p));
      return finish(true, "Appel API Stripe réussi (200).");
    }
    if (connectorKey === "notion") {
      const p = await probe("https://api.notion.com/v1/users/me", {
        headers: { Authorization: `Bearer ${accessToken || apiKey}`, "Notion-Version": "2022-06-28" },
      });
      if (!p.ok) return finish(false, providerError("Notion", p));
      return finish(true, `Appel API Notion réussi (200)${p.json?.name ? ` — ${p.json.name}` : ""}.`);
    }
    return finish(true, `Identifiants ${def?.name ?? connectorKey} enregistrés (aucun appel API de test disponible).`);

  } catch (e) {
    return finish(false, e instanceof Error ? e.message : "Erreur de connexion.");
  }
}
