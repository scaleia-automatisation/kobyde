/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * WhatsApp Business Cloud API — logique spécifique Meta Embedded Signup.
 * Serveur uniquement : ne jamais importer ce fichier depuis un composant client.
 *
 * Contrairement à la plupart des fournisseurs OAuth, Meta ne délivre pas de
 * refresh_token : le jeton utilisateur obtenu après l'échange du "code" est
 * un jeton de courte durée (~1h à 2h) qu'il faut immédiatement échanger
 * contre un jeton longue durée (~60 jours), puis ré-échanger périodiquement
 * avant expiration (le jeton actuel doit encore être valide). C'est ce que
 * gèrent `exchangeLongLivedToken` et `renewLongLivedToken` ci-dessous.
 *
 * Doc officielle :
 * - Embedded Signup : https://developers.facebook.com/docs/whatsapp/embedded-signup
 * - Jetons longue durée : https://developers.facebook.com/docs/facebook-login/guides/access-tokens/get-long-lived
 * - Webhooks Cloud API : https://developers.facebook.com/docs/graph-api/webhooks/getting-started
 */

const GRAPH_VERSION = "v21.0";
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;

async function graphGet(path: string, params: Record<string, string>) {
  const url = new URL(`${GRAPH_BASE}${path}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString(), { signal: AbortSignal.timeout(15000) });
  const json: any = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, json };
}

async function graphPost(path: string, params: Record<string, string>) {
  const url = new URL(`${GRAPH_BASE}${path}`);
  const res = await fetch(url.toString(), {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", accept: "application/json" },
    body: new URLSearchParams(params),
    signal: AbortSignal.timeout(15000),
  });
  const json: any = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, json };
}

/** Preuve d'appel serveur exigée par Meta pour sécuriser les appels avec un jeton utilisateur. */
async function appSecretProof(token: string, appSecret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(appSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(token));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export type LongLivedToken = { accessToken: string; expiresIn: number };

/**
 * Échange un jeton (court terme après le code OAuth, ou long terme encore
 * valide) contre un nouveau jeton longue durée (~60 jours). Fonctionne aussi
 * bien pour le renouvellement que pour l'échange initial : Meta accepte un
 * jeton longue durée encore valide en entrée de ce même appel.
 */
export async function exchangeLongLivedToken(
  appId: string,
  appSecret: string,
  currentToken: string,
): Promise<LongLivedToken | null> {
  const r = await graphGet("/oauth/access_token", {
    grant_type: "fb_exchange_token",
    client_id: appId,
    client_secret: appSecret,
    fb_exchange_token: currentToken,
  });
  if (!r.ok || !r.json?.access_token) return null;
  return {
    accessToken: r.json.access_token as string,
    expiresIn: Number(r.json.expires_in ?? 5184000),
  };
}

export type DebugTokenInfo = {
  valid: boolean;
  appId: string | null;
  userId: string | null;
  expiresAt: number | null;
  scopes: string[];
  wabaIds: string[];
};

/** Inspecte un jeton pour retrouver les WABA autorisés (granular_scopes). */
export async function debugToken(
  appId: string,
  appSecret: string,
  token: string,
): Promise<DebugTokenInfo> {
  const r = await graphGet("/debug_token", {
    input_token: token,
    access_token: `${appId}|${appSecret}`,
  });
  const data = r.json?.data ?? {};
  const granular: any[] = Array.isArray(data.granular_scopes) ? data.granular_scopes : [];
  const wabaScope = granular.find((s) => s.scope === "whatsapp_business_management");
  return {
    valid: Boolean(data.is_valid),
    appId: data.app_id ?? null,
    userId: data.user_id ?? null,
    expiresAt: typeof data.expires_at === "number" ? data.expires_at : null,
    scopes: Array.isArray(data.scopes) ? data.scopes : [],
    wabaIds: Array.isArray(wabaScope?.target_ids) ? wabaScope.target_ids.map(String) : [],
  };
}

export type WabaPhoneNumber = {
  id: string;
  displayPhoneNumber: string | null;
  verifiedName: string | null;
  qualityRating: string | null;
  status: string | null;
};

/** Liste les numéros de téléphone rattachés à un compte WhatsApp Business (WABA). */
export async function fetchWabaPhoneNumbers(
  wabaId: string,
  token: string,
  appSecret: string,
): Promise<WabaPhoneNumber[]> {
  const proof = await appSecretProof(token, appSecret);
  const r = await graphGet(`/${encodeURIComponent(wabaId)}/phone_numbers`, {
    fields: "id,display_phone_number,verified_name,quality_rating,status",
    access_token: token,
    appsecret_proof: proof,
  });
  if (!r.ok || !Array.isArray(r.json?.data)) return [];
  return r.json.data.map((p: any) => ({
    id: String(p.id),
    displayPhoneNumber: p.display_phone_number ?? null,
    verifiedName: p.verified_name ?? null,
    qualityRating: p.quality_rating ?? null,
    status: p.status ?? null,
  }));
}

/** Récupère le nom du compte WhatsApp Business (affichage seulement). */
export async function fetchWabaName(
  wabaId: string,
  token: string,
  appSecret: string,
): Promise<string | null> {
  const proof = await appSecretProof(token, appSecret);
  const r = await graphGet(`/${encodeURIComponent(wabaId)}`, {
    fields: "id,name",
    access_token: token,
    appsecret_proof: proof,
  });
  return r.ok ? (r.json?.name ?? null) : null;
}

/**
 * Abonne l'application Kobyde aux webhooks de ce WABA (messages, statuts…).
 * Nécessaire une fois par WABA : sans cet appel, Meta n'envoie aucun webhook
 * même si l'URL de callback est configurée au niveau de l'application.
 */
export async function subscribeAppToWaba(
  wabaId: string,
  token: string,
): Promise<{ ok: boolean; error?: string }> {
  const r = await graphPost(`/${encodeURIComponent(wabaId)}/subscribed_apps`, {
    access_token: token,
  });
  if (r.ok && r.json?.success) return { ok: true };
  return {
    ok: false,
    error: r.json?.error?.message ?? `Échec de l'abonnement webhook (${r.status}).`,
  };
}

/** Désabonne l'application (utilisé à la déconnexion du compte). */
export async function unsubscribeAppFromWaba(wabaId: string, token: string): Promise<void> {
  try {
    await fetch(
      `${GRAPH_BASE}/${encodeURIComponent(wabaId)}/subscribed_apps?access_token=${encodeURIComponent(token)}`,
      {
        method: "DELETE",
        signal: AbortSignal.timeout(10000),
      },
    );
  } catch {
    /* best-effort : la déconnexion ne doit jamais être bloquée par cet appel */
  }
}

/**
 * Enregistre le numéro pour l'API Cloud (2FA). Un numéro déjà enregistré
 * renvoie une erreur Meta que l'on ignore sciemment (idempotent en pratique).
 */
export async function registerPhoneNumber(
  phoneNumberId: string,
  token: string,
  pin: string,
): Promise<{ ok: boolean; alreadyRegistered?: boolean; error?: string }> {
  const r = await graphPost(`/${encodeURIComponent(phoneNumberId)}/register`, {
    messaging_product: "whatsapp",
    pin,
    access_token: token,
  });
  if (r.ok && r.json?.success) return { ok: true };
  const message = String(r.json?.error?.message ?? "");
  const already = /already registered|already verified/i.test(message);
  return {
    ok: already,
    ...(already ? { alreadyRegistered: true } : { error: message || `Échec (${r.status}).` }),
  };
}

/** Génère un PIN à 6 chiffres cryptographiquement aléatoire pour l'enregistrement Cloud API. */
export function generateRegistrationPin(): string {
  const bytes = crypto.getRandomValues(new Uint32Array(1));
  return String(100000 + (bytes[0]! % 900000));
}

/**
 * Finalise une connexion WhatsApp Business après l'échange OAuth initial :
 * jeton longue durée, découverte du WABA + numéro, abonnement aux webhooks,
 * enregistrement Cloud API. Ne lève jamais d'exception : chaque étape est
 * best-effort et le résultat détaille ce qui a réussi ou non, pour laisser
 * `completeOAuth` stocker la connexion même en cas d'échec partiel (le
 * compte reste alors visible avec un message clair plutôt que de bloquer
 * toute la connexion sur un problème secondaire, ex. numéro déjà enregistré
 * ailleurs).
 */
export async function finalizeWhatsappConnection(input: {
  appId: string;
  appSecret: string;
  shortLivedToken: string;
}): Promise<{
  accessToken: string;
  expiresIn: number;
  wabaId: string | null;
  phoneNumberId: string | null;
  phoneNumbers: WabaPhoneNumber[];
  wabaName: string | null;
  warnings: string[];
}> {
  const warnings: string[] = [];

  const longLived = await exchangeLongLivedToken(
    input.appId,
    input.appSecret,
    input.shortLivedToken,
  );
  const accessToken = longLived?.accessToken ?? input.shortLivedToken;
  const expiresIn = longLived?.expiresIn ?? 3600;
  if (!longLived)
    warnings.push(
      "Échange du jeton longue durée impossible : reconnexion plus fréquente à prévoir.",
    );

  const info = await debugToken(input.appId, input.appSecret, accessToken);
  const wabaId = info.wabaIds[0] ?? null;
  if (!wabaId) {
    warnings.push(
      "Aucun compte WhatsApp Business (WABA) détecté sur ce jeton : l'utilisateur n'a peut-être pas terminé l'Embedded Signup jusqu'au bout.",
    );
    return {
      accessToken,
      expiresIn,
      wabaId: null,
      phoneNumberId: null,
      phoneNumbers: [],
      wabaName: null,
      warnings,
    };
  }

  const [wabaName, phoneNumbers] = await Promise.all([
    fetchWabaName(wabaId, accessToken, input.appSecret),
    fetchWabaPhoneNumbers(wabaId, accessToken, input.appSecret),
  ]);

  const sub = await subscribeAppToWaba(wabaId, accessToken);
  if (!sub.ok) warnings.push(`Abonnement aux webhooks du WABA échoué : ${sub.error}`);

  const phoneNumberId = phoneNumbers[0]?.id ?? null;
  if (phoneNumbers.length > 1) {
    warnings.push(
      `${phoneNumbers.length} numéros trouvés sur ce WABA : le premier (${phoneNumbers[0]?.displayPhoneNumber ?? phoneNumbers[0]?.id}) a été sélectionné automatiquement.`,
    );
  }

  if (phoneNumberId) {
    const pin = generateRegistrationPin();
    const reg = await registerPhoneNumber(phoneNumberId, accessToken, pin);
    if (!reg.ok) warnings.push(`Enregistrement Cloud API du numéro échoué : ${reg.error}`);
  }

  return { accessToken, expiresIn, wabaId, phoneNumberId, phoneNumbers, wabaName, warnings };
}
