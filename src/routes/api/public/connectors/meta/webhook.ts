import { createFileRoute } from "@tanstack/react-router";

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Webhook Meta (Facebook Pages + Instagram).
 * URL à déclarer côté Meta : https://kobyde.com/api/public/connectors/meta/webhook
 * - GET  : vérification du token (hub.challenge)
 * - POST : réception des messages, commentaires, mentions et publications
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

/** Secrets du connecteur Meta (repli sur Facebook / Instagram puis variables d'env). */
async function metaSecrets() {
  const { getConnectorConfig } = await import("@/lib/connectors.server");
  const [meta, facebook, instagram] = await Promise.all([
    getConnectorConfig("meta"),
    getConnectorConfig("facebook"),
    getConnectorConfig("instagram"),
  ]);
  const s = {
    ...((instagram?.secrets ?? {}) as Record<string, string>),
    ...((facebook?.secrets ?? {}) as Record<string, string>),
    ...((meta?.secrets ?? {}) as Record<string, string>),
  };
  return {
    verifyToken: s["webhook_verify_token"] || process.env["META_WEBHOOK_VERIFY_TOKEN"] || "",
    appSecret: s["app_secret"] || s["client_secret"] || process.env["META_APP_SECRET"] || "",
  };
}

/** Retrouve l'organisation propriétaire de la Page / du compte Instagram émetteur. */
async function findOrg(db: any, accountId: string | null) {
  const providers = ["meta", "facebook", "instagram"];
  if (accountId) {
    const { data } = await db
      .from("oauth_connections")
      .select("org_id")
      .in("provider", providers)
      .eq("is_active", true)
      .eq("provider_account_id", accountId)
      .limit(1);
    if (data?.[0]?.org_id) return data[0].org_id as string;
  }
  const { data } = await db
    .from("oauth_connections")
    .select("org_id")
    .in("provider", providers)
    .eq("is_active", true)
    .limit(1);
  return (data?.[0]?.org_id as string) ?? null;
}

export const Route = createFileRoute("/api/public/connectors/meta/webhook")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const mode = url.searchParams.get("hub.mode");
        const token = url.searchParams.get("hub.verify_token");
        const challenge = url.searchParams.get("hub.challenge") ?? "";
        const { verifyToken } = await metaSecrets();

        if (!verifyToken) return new Response("Webhook non configuré", { status: 503 });
        if (mode === "subscribe" && token === verifyToken) {
          return new Response(challenge, { headers: { "content-type": "text/plain" } });
        }
        return new Response("Forbidden", { status: 403 });
      },

      POST: async ({ request }) => {
        const body = await request.text();
        const { appSecret } = await metaSecrets();
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

        const object = String(payload?.object ?? "");
        const network = object.startsWith("instagram") ? "instagram" : "facebook";

        for (const entry of payload?.entry ?? []) {
          const orgId = await findOrg(db, entry?.id ? String(entry.id) : null);
          if (!orgId) continue;

          const entryTime = entry?.time ? new Date(Number(entry.time) * 1000).toISOString() : undefined;

          // Messagerie (Messenger / Instagram Direct)
          for (const m of entry?.messaging ?? []) {
            if (m?.message) {
              await ingestEvent(db, {
                orgId,
                source: network,
                channel: network,
                type: `${network}.message_received`,
                contact: m?.sender?.id ?? null,
                message: m?.message?.text ?? "[pièce jointe]",
                occurredAt: m?.timestamp ? new Date(Number(m.timestamp)).toISOString() : entryTime,
                payload: m,
              } as any);
            } else if (m?.postback) {
              await ingestEvent(db, {
                orgId,
                source: network,
                channel: network,
                type: `${network}.postback`,
                contact: m?.sender?.id ?? null,
                message: m?.postback?.title ?? m?.postback?.payload ?? null,
                occurredAt: m?.timestamp ? new Date(Number(m.timestamp)).toISOString() : entryTime,
                payload: m,
              } as any);
            }
          }

          // Changements de Page / compte Instagram (commentaires, mentions, publications, leads)
          for (const change of entry?.changes ?? []) {
            const field = String(change?.field ?? "");
            const value = change?.value ?? {};
            const itemType =
              field === "leadgen"
                ? "lead"
                : field === "mentions"
                  ? "mention"
                  : String(value?.item ?? (field === "comments" ? "comment" : field || "update"));

            const message =
              value?.message ??
              value?.text ??
              value?.comment_text ??
              (itemType === "lead" ? "Nouveau prospect reçu via formulaire" : null);

            await ingestEvent(db, {
              orgId,
              source: network,
              channel: network,
              type: `${network}.${itemType}`,
              contact: value?.from?.name ?? value?.from?.id ?? value?.sender_name ?? null,
              message,
              occurredAt: value?.created_time
                ? new Date(Number(value.created_time) * 1000).toISOString()
                : entryTime,
              payload: { field, ...value },
            } as any);
          }
        }

        return Response.json({ received: true });
      },
    },
  },
});
