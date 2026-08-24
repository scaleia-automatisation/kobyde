/* eslint-disable @typescript-eslint/no-explicit-any */
/** Routage intelligent : choisit automatiquement le connecteur adapté à une tâche. Serveur uniquement. */

import { getConnectorConfig, db } from "./connectors.server";

export type Capability =
  | "web_search"
  | "prospect_search"
  | "maps_search"
  | "text_generation"
  | "image_generation"
  | "publish_facebook"
  | "publish_instagram"
  | "publish_linkedin"
  | "publish_tiktok"
  | "send_user_email"
  | "send_transactional_email"
  | "send_sms"
  | "payment"
  | "automation";

/** Ordre de préférence des connecteurs par capacité. */
export const CAPABILITY_ROUTES: Record<Capability, { connector: string; needsUserAccount?: boolean }[]> = {
  web_search: [{ connector: "gemini" }, { connector: "openai" }],
  prospect_search: [{ connector: "gemini" }, { connector: "apify" }, { connector: "phantombuster" }],
  maps_search: [{ connector: "apify" }],
  text_generation: [{ connector: "gemini" }, { connector: "openai" }],
  image_generation: [{ connector: "openai" }, { connector: "gemini" }],
  publish_facebook: [{ connector: "meta", needsUserAccount: true }],
  publish_instagram: [{ connector: "meta", needsUserAccount: true }],
  publish_linkedin: [{ connector: "linkedin", needsUserAccount: true }],
  publish_tiktok: [{ connector: "tiktok", needsUserAccount: true }],
  send_user_email: [
    { connector: "google", needsUserAccount: true },
    { connector: "microsoft", needsUserAccount: true },
  ],
  send_transactional_email: [{ connector: "resend" }, { connector: "brevo" }],
  send_sms: [{ connector: "twilio" }, { connector: "whatsapp" }],
  payment: [{ connector: "stripe" }],
  automation: [{ connector: "make" }],
};

async function userHasAccount(userId: string, connectorKey: string) {
  const supabase = await db();
  const { data } = await supabase
    .from("oauth_connections")
    .select("id,revoked,status,is_active")
    .eq("user_id", userId)
    .eq("provider", connectorKey)
    .maybeSingle();
  return Boolean(data && !data.revoked && data.is_active !== false);
}

/**
 * Résout le connecteur à utiliser pour une capacité donnée.
 * Vérifie : activation, configuration Super Admin, compte utilisateur connecté.
 */
export async function resolveConnector(capability: Capability, ctx: { userId?: string | null }) {
  const routes = CAPABILITY_ROUTES[capability] ?? [];
  const checked: { connector: string; reason: string }[] = [];
  for (const route of routes) {
    const conf = await getConnectorConfig(route.connector);
    if (!conf?.isEnabled) {
      checked.push({ connector: route.connector, reason: "non activé par l'administrateur" });
      continue;
    }
    if (route.needsUserAccount) {
      if (!ctx.userId || !(await userHasAccount(ctx.userId, route.connector))) {
        checked.push({ connector: route.connector, reason: "compte utilisateur non connecté ou connecteur désactivé" });
        continue;
      }
    }
    return { ok: true as const, connector: route.connector, requiresUserAccount: Boolean(route.needsUserAccount) };
  }
  return { ok: false as const, connector: null, checked };
}
