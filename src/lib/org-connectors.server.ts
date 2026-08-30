/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Identifiants de connexion propres à chaque entreprise (multi-tenant).
 * Serveur uniquement : les secrets sont chiffrés (AES-GCM) et ne sortent jamais du backend.
 */

import { ORG_CONNECTORS, ORG_CONNECTOR_MAP, type OrgConnectorDef } from "./org-connectors.catalog";
import { callbackPath, productionBaseUrl, logConnectorCall } from "./connectors.server";
import { CONNECTOR_MAP } from "./connectors.catalog";

async function db() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as any;
}

/* ------------------------------------------------------------- Chiffrement */

let cachedKey: CryptoKey | null = null;

async function cryptoKey(): Promise<CryptoKey> {
  if (cachedKey) return cachedKey;
  const raw = process.env["ORG_CONNECTOR_ENCRYPTION_KEY"];
  if (!raw) throw new Error("Chiffrement indisponible : clé de chiffrement absente du serveur.");
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
  cachedKey = await crypto.subtle.importKey("raw", digest, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
  return cachedKey;
}

const toB64 = (bytes: Uint8Array) => {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
};
const fromB64 = (v: string) => Uint8Array.from(atob(v), (c) => c.charCodeAt(0));

async function encryptSecrets(values: Record<string, string>): Promise<string> {
  const key = await cryptoKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(JSON.stringify(values))),
  );
  const out = new Uint8Array(iv.length + ct.length);
  out.set(iv);
  out.set(ct, iv.length);
  return toB64(out);
}

async function decryptSecrets(stored?: string | null): Promise<Record<string, string>> {
  if (!stored) return {};
  try {
    const key = await cryptoKey();
    const buf = fromB64(stored);
    const iv = buf.subarray(0, 12);
    const ct = buf.subarray(12);
    const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ct);
    return JSON.parse(new TextDecoder().decode(plain)) as Record<string, string>;
  } catch {
    return {};
  }
}

/* ------------------------------------------------------------------- Accès */

export const orgRedirectUri = (def: OrgConnectorDef, origin?: string) =>
  def.oauthKey ? `${(origin ?? productionBaseUrl()).replace(/\/$/, "")}${callbackPath(def.oauthKey)}` : null;

async function rowFor(orgId: string, provider: string) {
  const supabase = await db();
  const { data } = await supabase
    .from("org_connector_credentials")
    .select("*")
    .eq("org_id", orgId)
    .eq("provider", provider)
    .maybeSingle();
  return data ?? null;
}

/** Identifiants déchiffrés d'une entreprise — usage strictement serveur. */
export async function getOrgCredentials(orgId: string | null | undefined, provider: string) {
  if (!orgId) return null;
  const row = await rowFor(orgId, provider);
  if (!row) return null;
  const secrets = await decryptSecrets(row.secrets_encrypted);
  return {
    provider,
    config: (row.config ?? {}) as Record<string, string>,
    secrets,
    status: row.status as string,
    lastTestOk: row.last_test_ok as boolean | null,
  };
}

/** Client ID / Client Secret OAuth de l'entreprise (null si non configurés). */
export async function getOrgOAuthApp(orgId: string | null | undefined, connectorKey: string) {
  const def = ORG_CONNECTOR_MAP.get(connectorKey);
  if (!def || def.authType !== "oauth") return null;
  const creds = await getOrgCredentials(orgId, connectorKey);
  if (!creds) return null;
  const clientId = creds.config["client_id"] ?? creds.config["app_id"] ?? creds.config["client_key"] ?? "";
  const clientSecret = creds.secrets["client_secret"] ?? creds.secrets["app_secret"] ?? "";
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret };
}

/* --------------------------------------------------------- Liste & statuts */

const isComplete = (def: OrgConnectorDef, config: Record<string, string>, configured: string[]) =>
  def.fields
    .filter((f) => f.required)
    .every((f) => (f.secret ? configured.includes(f.key) : Boolean(config[f.key])));

export async function listOrgConnectors(orgId: string, origin?: string) {
  const supabase = await db();
  const { data } = await supabase.from("org_connector_credentials").select("*").eq("org_id", orgId);
  const rows = new Map<string, any>((data ?? []).map((r: any) => [r.provider, r]));

  const { data: connections } = await supabase
    .from("oauth_connections")
    .select("provider,account_label,provider_email,status,revoked,is_active,expires_at,last_used_at,connected_at,scopes_granted")
    .eq("org_id", orgId);
  const conns = new Map<string, any>((connections ?? []).map((r: any) => [r.provider, r]));

  return ORG_CONNECTORS.map((def) => {
    const row = rows.get(def.key);
    const config = (row?.config ?? {}) as Record<string, string>;
    const configured = (row?.configured_fields ?? []) as string[];
    const complete = row ? isComplete(def, config, configured) : false;
    const conn = def.oauthKey ? conns.get(def.oauthKey) : null;
    const connected = Boolean(conn && !conn.revoked && conn.is_active !== false);
    const expired = Boolean(conn && conn.status === "reconnect_required");

    let status: string = "non_configure";
    if (row && !complete) status = "incomplet";
    else if (complete) status = "configure";
    if (complete && row?.last_test_ok === false) status = "erreur";
    if (connected) status = "connecte";
    if (expired) status = "expire";

    return {
      key: def.key,
      name: def.name,
      description: def.description,
      authType: def.authType,
      docsUrl: def.docsUrl ?? null,
      fields: def.fields,
      /** Valeurs non secrètes uniquement — les secrets ne sont jamais renvoyés. */
      values: Object.fromEntries(def.fields.filter((f) => !f.secret).map((f) => [f.key, config[f.key] ?? ""])),
      configuredSecrets: def.fields.filter((f) => f.secret && configured.includes(f.key)).map((f) => f.key),
      redirectUri: orgRedirectUri(def, origin),
      status,
      complete,
      connected,
      account: conn?.account_label ?? conn?.provider_email ?? null,
      connectedAt: conn?.connected_at ?? null,
      lastUsedAt: conn?.last_used_at ?? null,
      lastTestAt: row?.last_test_at ?? null,
      lastTestOk: row?.last_test_ok ?? null,
      lastError: row?.last_error ?? null,
    };
  });
}

/* ------------------------------------------------------------ Enregistrement */

/**
 * Nettoie une valeur saisie : espaces, caractères invisibles, guillemets et surtout le préfixe
 * « http(s):// » que les navigateurs ajoutent parfois en collant un identifiant (client_id…).
 */
function sanitizeCredential(fieldKey: string, raw: string) {
  let v = String(raw ?? "")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .trim()
    .replace(/^["'`]+|["'`]+$/g, "")
    .trim();
  if (!/url/i.test(fieldKey)) v = v.replace(/^https?:\/\//i, "").replace(/\/+$/, "");
  return v;
}

export async function saveOrgConnector(input: {

  orgId: string;
  userId: string;
  provider: string;
  values: Record<string, string>;
}) {
  const def = ORG_CONNECTOR_MAP.get(input.provider);
  if (!def) throw new Error("Plateforme inconnue.");
  const supabase = await db();
  const row = await rowFor(input.orgId, input.provider);

  const config = { ...((row?.config ?? {}) as Record<string, string>) };
  const secrets = await decryptSecrets(row?.secrets_encrypted);

  for (const field of def.fields) {
    const raw = input.values[field.key];
    if (raw === undefined) continue;
    const value = sanitizeCredential(field.key, raw);
    if (field.secret) {
      if (!value) continue; // champ laissé vide = secret existant conservé
      secrets[field.key] = value;
    } else {
      config[field.key] = value;
    }
  }


  const configured = Object.keys(secrets).filter((k) => secrets[k]);
  const complete = isComplete(def, config, configured);

  const { error } = await supabase.from("org_connector_credentials").upsert(
    {
      org_id: input.orgId,
      provider: input.provider,
      config,
      secrets_encrypted: await encryptSecrets(secrets),
      configured_fields: configured,
      status: complete ? "configure" : "incomplet",
      last_error: null,
      updated_by: input.userId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "org_id,provider" },
  );
  if (error) throw new Error(error.message);
  return { ok: true, complete };
}

export async function deleteOrgConnector(orgId: string, provider: string) {
  const supabase = await db();
  await supabase.from("org_connector_credentials").delete().eq("org_id", orgId).eq("provider", provider);
  const def = ORG_CONNECTOR_MAP.get(provider);
  if (def?.oauthKey) {
    await supabase
      .from("oauth_connections")
      .update({
        revoked: true,
        revoked_at: new Date().toISOString(),
        status: "revoked",
        is_active: false,
        access_token: null,
        refresh_token: null,
      })
      .eq("org_id", orgId)
      .eq("provider", def.oauthKey);
  }
  return { ok: true };
}

/* ------------------------------------------------------- Test de connexion */

type Probe = { ok: boolean; status: number; json: any; text: string };

async function probe(url: string, init?: RequestInit): Promise<Probe> {
  const r = await fetch(url, { ...init, signal: AbortSignal.timeout(15000) });
  const text = await r.text().catch(() => "");
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  return { ok: r.ok, status: r.status, json, text };
}

const detailOf = (p: Probe) =>
  p.json?.error?.message ??
  p.json?.error_description ??
  p.json?.message ??
  (typeof p.json?.error === "string" ? p.json.error : null) ??
  p.text.slice(0, 160);

/**
 * Vérifie de vrais identifiants OAuth en appelant l'endpoint de jeton avec un code volontairement
 * invalide : le fournisseur distingue « client inconnu / secret faux » de « code invalide ».
 */
async function verifyOAuthClient(opts: {
  tokenUrl: string;
  body: URLSearchParams;
  headers?: Record<string, string>;
  clientErrors: string[];
  name: string;
}) {
  const p = await probe(opts.tokenUrl, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", accept: "application/json", ...(opts.headers ?? {}) },
    body: opts.body,
  });
  const code = String(p.json?.error ?? p.json?.data?.error ?? "").toLowerCase();
  const message = String(detailOf(p) ?? "").toLowerCase();
  const clientRejected = opts.clientErrors.some((e) => code.includes(e) || message.includes(e));
  if (clientRejected) {
    return { ok: false, message: `${opts.name} refuse ces identifiants : ${detailOf(p) || code}.` };
  }
  return {
    ok: true,
    message: `${opts.name} reconnaît votre application (identifiants valides). Autorisez maintenant votre compte.`,
  };
}

export async function testOrgConnector(input: { orgId: string; userId: string; provider: string; origin?: string }) {
  const def = ORG_CONNECTOR_MAP.get(input.provider);
  if (!def) throw new Error("Plateforme inconnue.");
  const supabase = await db();
  const creds = await getOrgCredentials(input.orgId, input.provider);

  const finish = async (ok: boolean, message: string) => {
    await supabase
      .from("org_connector_credentials")
      .update({ last_test_at: new Date().toISOString(), last_test_ok: ok, last_error: ok ? null : message })
      .eq("org_id", input.orgId)
      .eq("provider", input.provider);
    await logConnectorCall({
      orgId: input.orgId,
      userId: input.userId,
      provider: input.provider,
      action: "org.test",
      status: ok ? "ok" : "error",
      error: ok ? null : message,
    });
    return { ok, message };
  };

  if (!creds) return { ok: false, message: "Aucun identifiant enregistré pour cette plateforme." };
  const config = creds.config;
  const secrets = creds.secrets;
  const missing = def.fields
    .filter((f) => f.required && !(f.secret ? secrets[f.key] : config[f.key]))
    .map((f) => f.label);
  if (missing.length) return finish(false, `Configuration incomplète : ${missing.join(", ")}.`);

  const redirectUri = orgRedirectUri(def, input.origin) ?? "";

  try {
    /* --- Comptes déjà autorisés : on teste avec le vrai jeton utilisateur --- */
    if (def.oauthKey) {
      const { data: conn } = await supabase
        .from("oauth_connections")
        .select("access_token,revoked,is_active,provider,scopes_granted")
        .eq("org_id", input.orgId)
        .eq("provider", def.oauthKey)
        .maybeSingle();
      const token = conn && !conn.revoked && conn.is_active !== false ? conn.access_token : null;
      if (token) {
        const live = await testLiveToken(def.key, token);
        if (live && live.ok) {
          const scopes = checkScopes(def.oauthKey, (conn?.scopes_granted ?? []) as string[]);
          if (scopes && scopes.missing.length) {
            return finish(
              false,
              `${live.message} Mais ${scopes.missing.length} autorisation(s) ne sont pas accordées par la plateforme : ${scopes.missing.join(", ")}. Reconnectez le compte pour les activer.`,
            );
          }
          return finish(
            true,
            scopes
              ? `${live.message} Toutes les autorisations demandées (${scopes.total}) sont accordées.`
              : live.message,
          );
        }
        if (live) return finish(false, live.message);
      }
    }


    if (input.provider === "google") {
      const r = await verifyOAuthClient({
        tokenUrl: "https://oauth2.googleapis.com/token",
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code: "kobyde-connection-test",
          redirect_uri: redirectUri,
          client_id: config["client_id"] ?? "",
          client_secret: secrets["client_secret"] ?? "",
        }),
        clientErrors: ["invalid_client", "unauthorized_client"],
        name: "Google",
      });
      return finish(r.ok, r.message);
    }


    if (input.provider === "meta") {
      const p = await probe(
        `https://graph.facebook.com/oauth/access_token?client_id=${encodeURIComponent(
          config["app_id"] ?? "",
        )}&client_secret=${encodeURIComponent(secrets["app_secret"] ?? "")}&grant_type=client_credentials`,
      );
      if (!p.ok) return finish(false, `Meta a répondu ${p.status} : ${detailOf(p)}.`);
      return finish(true, "Appel API Meta réussi (200) — application authentifiée.");
    }

    if (input.provider === "linkedin") {
      const r = await verifyOAuthClient({
        tokenUrl: "https://www.linkedin.com/oauth/v2/accessToken",
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code: "kobyde-connection-test",
          redirect_uri: redirectUri,
          client_id: config["client_id"] ?? "",
          client_secret: secrets["client_secret"] ?? "",
        }),
        clientErrors: ["invalid_client", "client_id", "client authentication failed"],
        name: "LinkedIn",
      });
      return finish(r.ok, r.message);
    }

    if (input.provider === "tiktok") {
      const r = await verifyOAuthClient({
        tokenUrl: "https://open.tiktokapis.com/v2/oauth/token/",
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code: "kobyde-connection-test",
          redirect_uri: redirectUri,
          client_key: config["client_key"] ?? "",
          client_secret: secrets["client_secret"] ?? "",
        }),
        clientErrors: ["invalid_client", "client_key"],
        name: "TikTok",
      });
      return finish(r.ok, r.message);
    }

    if (input.provider === "slack") {
      const p = await probe("https://slack.com/api/oauth.v2.access", {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code: "kobyde-connection-test",
          client_id: config["client_id"] ?? "",
          client_secret: secrets["client_secret"] ?? "",
          redirect_uri: redirectUri,
        }),
      });
      const err = String(p.json?.error ?? "");
      if (err === "invalid_client_id" || err === "bad_client_secret") {
        return finish(false, `Slack refuse ces identifiants : ${err}.`);
      }
      return finish(true, "Slack reconnaît votre application (identifiants valides).");
    }

    if (input.provider === "notion") {
      const p = await probe("https://api.notion.com/v1/oauth/token", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Basic ${btoa(`${config["client_id"] ?? ""}:${secrets["client_secret"] ?? ""}`)}`,
        },
        body: JSON.stringify({
          grant_type: "authorization_code",
          code: "kobyde-connection-test",
          redirect_uri: redirectUri,
        }),
      });
      if (p.status === 401) return finish(false, `Notion refuse ces identifiants : ${detailOf(p)}.`);
      return finish(true, "Notion reconnaît votre intégration (identifiants valides).");
    }

    if (input.provider === "whatsapp") {
      const p = await probe(
        `https://graph.facebook.com/v20.0/${encodeURIComponent(config["phone_number_id"] ?? "")}?fields=display_phone_number,verified_name`,
        { headers: { Authorization: `Bearer ${secrets["access_token"] ?? ""}` } },
      );
      if (!p.ok) return finish(false, `WhatsApp a répondu ${p.status} : ${detailOf(p)}.`);
      return finish(
        true,
        `Appel API WhatsApp réussi (200) — numéro ${p.json?.display_phone_number ?? config["phone_number_id"]}.`,
      );
    }

    if (input.provider === "stripe_connect") {
      const p = await probe("https://api.stripe.com/v1/account", {
        headers: { Authorization: `Bearer ${secrets["secret_key"] ?? ""}` },
      });
      if (!p.ok) return finish(false, `Stripe a répondu ${p.status} : ${detailOf(p)}.`);
      const label = p.json?.business_profile?.name ?? p.json?.email ?? p.json?.id ?? "";
      return finish(true, `Appel API Stripe réussi (200)${label ? ` — compte ${label}` : ""}.`);
    }

    return finish(false, "Aucun test disponible pour cette plateforme.");
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erreur de connexion.";
    return finish(false, msg.includes("timed out") ? "La plateforme n'a pas répondu (délai dépassé)." : msg);
  }
}

/** Vérifie que toutes les autorisations du catalogue sont bien accordées par la plateforme. */
function checkScopes(oauthKey: string, granted: string[]): { missing: string[]; total: number } | null {
  const def = CONNECTOR_MAP.get(oauthKey);
  const catalog = def?.oauth?.scopeCatalog ?? [];
  const wanted = catalog.length ? catalog.map((s) => s.scope) : (def?.oauth?.defaultScopes ?? []);
  if (!wanted.length) return null;
  const has = new Set((granted ?? []).map((s) => String(s)));
  const missing = wanted
    .filter((s) => !has.has(s))
    .map((s) => catalog.find((c) => c.scope === s)?.label ?? s);
  return { missing, total: wanted.length };
}

/** Test réel avec le jeton du compte déjà autorisé. */

async function testLiveToken(provider: string, token: string): Promise<{ ok: boolean; message: string } | null> {
  if (provider === "google") {
    const p = await probe("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${token}` },
    });
    return p.ok
      ? { ok: true, message: `Connexion réussie — compte ${p.json?.email ?? "Google"}.` }
      : { ok: false, message: `Google a répondu ${p.status} : ${detailOf(p)}.` };
  }
  if (provider === "linkedin") {
    const p = await probe("https://api.linkedin.com/v2/userinfo", { headers: { Authorization: `Bearer ${token}` } });
    return p.ok
      ? { ok: true, message: `Connexion réussie — compte ${p.json?.name ?? "LinkedIn"}.` }
      : { ok: false, message: `LinkedIn a répondu ${p.status} : ${detailOf(p)}.` };
  }
  if (provider === "meta") {
    const p = await probe(`https://graph.facebook.com/v20.0/me?fields=id,name&access_token=${encodeURIComponent(token)}`);
    return p.ok
      ? { ok: true, message: `Connexion réussie — compte ${p.json?.name ?? "Meta"}.` }
      : { ok: false, message: `Meta a répondu ${p.status} : ${detailOf(p)}.` };
  }
  if (provider === "slack") {
    const p = await probe("https://slack.com/api/auth.test", { headers: { Authorization: `Bearer ${token}` } });
    return p.json?.ok
      ? { ok: true, message: `Connexion réussie — espace ${p.json?.team ?? "Slack"}.` }
      : { ok: false, message: `Slack a répondu : ${p.json?.error ?? "échec"}.` };
  }
  if (provider === "notion") {
    const p = await probe("https://api.notion.com/v1/users/me", {
      headers: { Authorization: `Bearer ${token}`, "Notion-Version": "2022-06-28" },
    });
    return p.ok
      ? { ok: true, message: `Connexion réussie — espace ${p.json?.bot?.workspace_name ?? "Notion"}.` }
      : { ok: false, message: `Notion a répondu ${p.status} : ${detailOf(p)}.` };
  }
  if (provider === "tiktok") {
    const p = await probe("https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name", {
      headers: { Authorization: `Bearer ${token}` },
    });
    return p.ok && !p.json?.error?.code
      ? { ok: true, message: `Connexion réussie — compte ${p.json?.data?.user?.display_name ?? "TikTok"}.` }
      : { ok: false, message: `TikTok a répondu ${p.status} : ${detailOf(p)}.` };
  }
  return null;
}
