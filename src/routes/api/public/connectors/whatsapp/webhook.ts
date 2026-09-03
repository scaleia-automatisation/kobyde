import { createFileRoute } from "@tanstack/react-router";

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Webhook WhatsApp Business (Meta Cloud API).
 * URL à déclarer côté Meta : https://kobyde.com/api/public/connectors/whatsapp/webhook
 * - GET  : vérification du token (hub.challenge)
 * - POST : réception des messages entrants et des statuts de livraison
 */

const encoder = new TextEncoder();

async function verifyMetaSignature(body: string, header: string | null, appSecret: string) {
  if (!header) return false;
  const provided = header.startsWith("sha256=") ? header.slice(7) : header;
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(appSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
  const expected = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  if (expected.length !== provided.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ provided.charCodeAt(i);
  return diff === 0;
}

/** Secrets du connecteur WhatsApp, avec repli sur le connecteur Meta puis les variables d'env. */
async function whatsappSecrets() {
  const { getConnectorConfig } = await import("@/lib/connectors.server");
  const wa = await getConnectorConfig("whatsapp");
  const meta = await getConnectorConfig("meta");
  const s = { ...(meta?.secrets ?? {}), ...(wa?.secrets ?? {}) } as Record<string, string>;
  return {
    verifyToken:
      s["webhook_verify_token"] || process.env["WHATSAPP_WEBHOOK_VERIFY_TOKEN"] || "",
    appSecret: s["app_secret"] || s["client_secret"] || process.env["META_APP_SECRET"] || "",
  };
}

/** Retrouve l'organisation propriétaire du compte WhatsApp émetteur. */
async function findOrg(db: any, wabaId: string | null) {
  const q = db
    .from("oauth_connections")
    .select("org_id,provider_account_id")
    .eq("provider", "whatsapp")
    .eq("is_active", true);
  if (wabaId) {
    const { data } = await q.eq("provider_account_id", wabaId).limit(1);
    if (data?.[0]?.org_id) return data[0].org_id as string;
  }
  const { data } = await db
    .from("oauth_connections")
    .select("org_id")
    .eq("provider", "whatsapp")
    .eq("is_active", true)
    .limit(1);
  return (data?.[0]?.org_id as string) ?? null;
}

export const Route = createFileRoute("/api/public/connectors/whatsapp/webhook")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const mode = url.searchParams.get("hub.mode");
        const token = url.searchParams.get("hub.verify_token");
        const challenge = url.searchParams.get("hub.challenge") ?? "";
        const { verifyToken } = await whatsappSecrets();

        if (!verifyToken) return new Response("Webhook non configuré", { status: 503 });
        if (mode === "subscribe" && token === verifyToken) {
          return new Response(challenge, { headers: { "content-type": "text/plain" } });
        }
        return new Response("Forbidden", { status: 403 });
      },

      POST: async ({ request }) => {
        const body = await request.text();
        const { appSecret } = await whatsappSecrets();
        if (!appSecret) return new Response("Webhook non configuré", { status: 503 });

        const ok = await verifyMetaSignature(body, request.headers.get("x-hub-signature-256"), appSecret);
        if (!ok) return new Response("Signature invalide", { status: 401 });

        let payload: any;
        try {
          payload = JSON.parse(body);
        } catch {
          return new Response("Payload invalide", { status: 400 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const db = supabaseAdmin as any;
        const { ingestEvent } = await import("@/lib/app-events.server");

        for (const entry of payload?.entry ?? []) {
          const orgId = await findOrg(db, entry?.id ?? null);
          if (!orgId) continue;

          for (const change of entry?.changes ?? []) {
            const value = change?.value ?? {};

            for (const message of value?.messages ?? []) {
              const text =
                message?.text?.body ??
                message?.button?.text ??
                message?.interactive?.button_reply?.title ??
                message?.interactive?.list_reply?.title ??
                `[${message?.type ?? "message"}]`;
              await ingestEvent(db, {
                orgId,
                source: "whatsapp",
                channel: "whatsapp",
                type: "whatsapp.received",
                contact: message?.from ?? value?.contacts?.[0]?.wa_id ?? null,
                message: text,
                occurredAt: message?.timestamp
                  ? new Date(Number(message.timestamp) * 1000).toISOString()
                  : undefined,
                payload: message,
              } as any);
            }

            for (const status of value?.statuses ?? []) {
              const map: Record<string, string> = {
                sent: "whatsapp.sent",
                delivered: "whatsapp.delivered",
                read: "whatsapp.read",
                failed: "whatsapp.failed",
              };
              const type = map[String(status?.status ?? "")] ?? null;
              if (!type) continue;
              await ingestEvent(db, {
                orgId,
                source: "whatsapp",
                channel: "whatsapp",
                type,
                contact: status?.recipient_id ?? null,
                occurredAt: status?.timestamp
                  ? new Date(Number(status.timestamp) * 1000).toISOString()
                  : undefined,
                payload: status,
              } as any);
            }
          }
        }

        return Response.json({ received: true });
      },
    },
  },
});
