import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Webhook générique des connecteurs à abonnement (Meta / WhatsApp Business
 * Cloud API aujourd'hui). Deux responsabilités distinctes exigées par Meta :
 *
 * - GET  : handshake de vérification (hub.mode / hub.verify_token / hub.challenge)
 *   https://developers.facebook.com/docs/graph-api/webhooks/getting-started#verification-requests
 * - POST : réception des événements (messages, statuts de livraison…), signés
 *   avec l'App Secret de l'application Meta propriétaire du webhook.
 *   https://developers.facebook.com/docs/graph-api/webhooks/getting-started#validating-payloads
 *
 * Toujours répondre 200 après une signature valide, même en cas d'erreur de
 * traitement interne : Meta réessaie agressivement et peut désactiver le
 * webhook après trop d'échecs consécutifs. Les erreurs sont journalisées
 * dans connector_webhook_events.error plutôt que renvoyées au client.
 */

function timingSafeEqualHex(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "hex");
  const bufB = Buffer.from(b, "hex");
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

function verifySignature(raw: string, header: string | null, appSecret: string): boolean {
  if (!header) return false;
  const [scheme, sig] = header.split("=");
  if (scheme !== "sha256" || !sig) return false;
  const expected = createHmac("sha256", appSecret).update(raw, "utf8").digest("hex");
  try {
    return timingSafeEqualHex(sig, expected);
  } catch {
    return false;
  }
}

export const Route = createFileRoute("/api/public/connectors/$connector/webhook")({
  server: {
    handlers: {
      /** Vérification d'URL de webhook (une seule fois, quand l'admin enregistre l'URL dans Meta). */
      GET: async ({ request, params }) => {
        const url = new URL(request.url);
        const mode = url.searchParams.get("hub.mode");
        const token = url.searchParams.get("hub.verify_token");
        const challenge = url.searchParams.get("hub.challenge");

        const { getConnectorConfig } = await import("@/lib/connectors.server");
        const conf = await getConnectorConfig(params.connector);
        const expected = conf?.secrets?.["webhook_verify_token"];

        if (mode !== "subscribe" || !token || !expected || token !== expected) {
          return new Response("Forbidden", { status: 403 });
        }
        return new Response(challenge ?? "", {
          status: 200,
          headers: { "content-type": "text/plain" },
        });
      },

      /** Réception des événements (messages entrants, accusés de statut, deauth…). */
      POST: async ({ request, params }) => {
        const raw = await request.text();

        const { getConnectorConfig } = await import("@/lib/connectors.server");
        const conf = await getConnectorConfig(params.connector);
        // Meta signe toujours avec l'App Secret de l'application (pas un secret séparé) ;
        // on garde webhook_secret en repli pour un futur fournisseur non-Meta sur cette même route.
        const signingSecret = conf?.secrets?.["app_secret"] || conf?.secrets?.["webhook_secret"];
        if (!signingSecret) return new Response("Not configured", { status: 503 });

        const sig = request.headers.get("x-hub-signature-256");
        if (!verifySignature(raw, sig, signingSecret)) {
          return new Response("Invalid signature", { status: 401 });
        }

        // À partir d'ici, la requête est authentifiée : toujours répondre 200,
        // même si le traitement métier échoue (voir note en tête de fichier).
        let payload: any;
        try {
          payload = JSON.parse(raw);
        } catch {
          return Response.json({ received: true, ignored: "invalid_json" });
        }

        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const entries: any[] = Array.isArray(payload?.entry) ? payload.entry : [];

          for (const entry of entries) {
            const wabaId = String(entry?.id ?? "");
            const changes: any[] = Array.isArray(entry?.changes) ? entry.changes : [];

            if (payload?.object !== "whatsapp_business_account" || !changes.length) {
              // Autres objets Meta (page, instagram…) : on accuse réception sans traiter,
              // en gardant une trace pour audit / support.
              await supabaseAdmin.from("connector_webhook_events").insert({
                provider: params.connector,
                event_id: `${wabaId || "unknown"}:${Date.now()}:${Math.random().toString(36).slice(2)}`,
                waba_id: wabaId || null,
                payload: entry ?? {},
                processed: true,
              });
              continue;
            }

            // Une connexion WhatsApp est rattachée à une organisation via le WABA
            // stocké dans oauth_connections.metadata au moment de l'Embedded Signup.
            const { data: connection } = await supabaseAdmin
              .from("oauth_connections")
              .select("org_id")
              .in("provider", ["whatsapp", "meta"])
              .eq("metadata->>waba_id", wabaId)
              .not("org_id", "is", null)
              .maybeSingle();
            const orgId = connection?.org_id ?? null;

            for (const change of changes) {
              const value = change?.value ?? {};
              const messages: any[] = Array.isArray(value.messages) ? value.messages : [];
              const statuses: any[] = Array.isArray(value.statuses) ? value.statuses : [];
              const phoneNumberId = value?.metadata?.phone_number_id ?? null;
              const contact = value?.contacts?.[0] ?? null;

              for (const m of messages) {
                const eventId = `whatsapp:${m.id}`;
                const { error: insErr } = await supabaseAdmin
                  .from("connector_webhook_events")
                  .insert({
                    provider: "whatsapp",
                    event_id: eventId,
                    waba_id: wabaId,
                    org_id: orgId,
                    payload: m,
                    processed: false,
                  });
                // Conflit d'unicité = webhook déjà reçu (retry Meta) : on ignore silencieusement.
                if (insErr) continue;

                if (orgId) {
                  await supabaseAdmin.from("whatsapp_messages").insert({
                    org_id: orgId,
                    waba_id: wabaId,
                    phone_number_id: phoneNumberId ?? "",
                    wa_message_id: m.id,
                    direction: "inbound",
                    contact_phone: m.from ?? null,
                    contact_name: contact?.profile?.name ?? null,
                    message_type: m.type ?? null,
                    body: m.text?.body ?? null,
                    status: "received",
                    raw: m,
                  });
                  await supabaseAdmin.from("notifications").insert({
                    org_id: orgId,
                    title: "Nouveau message WhatsApp",
                    body: m.text?.body
                      ? m.text.body.slice(0, 200)
                      : `Message ${m.type ?? ""} reçu.`,
                    kind: "info",
                  });
                }
                await supabaseAdmin
                  .from("connector_webhook_events")
                  .update({ processed: true })
                  .eq("provider", "whatsapp")
                  .eq("event_id", eventId);
              }

              for (const s of statuses) {
                const eventId = `whatsapp:status:${s.id}:${s.status}`;
                const { error: insErr } = await supabaseAdmin
                  .from("connector_webhook_events")
                  .insert({
                    provider: "whatsapp",
                    event_id: eventId,
                    waba_id: wabaId,
                    org_id: orgId,
                    payload: s,
                    processed: true,
                  });
                if (insErr) continue;
                if (orgId && s.id) {
                  await supabaseAdmin
                    .from("whatsapp_messages")
                    .update({ status: s.status ?? "unknown" })
                    .eq("wa_message_id", s.id);
                }
              }
            }
          }
        } catch (e) {
          console.error("[connectors/webhook] processing error", params.connector, e);
        }

        return Response.json({ received: true });
      },
    },
  },
});
