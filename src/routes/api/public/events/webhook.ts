import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";
import { z } from "zod";

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Point d'écoute unique des événements externes : emails (envoi, ouverture, clic,
 * réponse, rebond), SMS, WhatsApp, portail client (devis accepté / refusé), etc.
 *
 * Authentification : en-tête `x-kobyde-signature` (HMAC-SHA256 hex du corps brut)
 * ou `authorization: Bearer <APP_EVENTS_WEBHOOK_SECRET>`.
 */

const eventSchema = z.object({
  org_id: z.string().uuid(),
  type: z.string().min(2),
  source: z.string().max(60).optional(),
  channel: z.enum(["email", "sms", "whatsapp", "portail", "autre"]).optional(),
  quote_id: z.string().uuid().nullish(),
  quote_number: z.string().max(60).nullish(),
  contact: z.string().max(200).nullish(),
  message: z.string().max(5000).nullish(),
  occurred_at: z.string().max(60).nullish(),
  payload: z.record(z.string(), z.unknown()).optional(),
});

const bodySchema = z.union([eventSchema, z.object({ events: z.array(eventSchema).min(1).max(50) })]);

function authorized(request: Request, raw: string, secret: string) {
  const bearer = request.headers.get("authorization");
  if (bearer && bearer === `Bearer ${secret}`) return true;

  const signature = request.headers.get("x-kobyde-signature");
  if (!signature) return false;
  const expected = createHmac("sha256", secret).update(raw).digest("hex");
  const a = Buffer.from(signature.replace(/^sha256=/, ""));
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export const Route = createFileRoute("/api/public/events/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["APP_EVENTS_WEBHOOK_SECRET"];
        if (!secret) return new Response("Not configured", { status: 500 });

        const raw = await request.text();
        if (!authorized(request, raw, secret)) return new Response("Invalid signature", { status: 401 });

        let parsed: z.infer<typeof bodySchema>;
        try {
          parsed = bodySchema.parse(JSON.parse(raw));
        } catch {
          return new Response("Invalid payload", { status: 400 });
        }

        const events = "events" in parsed ? parsed.events : [parsed];

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { ingestEvent } = await import("@/lib/app-events.server");

        const results: unknown[] = [];
        for (const e of events) {
          try {
            results.push(
              await ingestEvent(supabaseAdmin as any, {
                orgId: e.org_id,
                type: e.type,
                source: e.source ?? "webhook",
                channel: e.channel ?? undefined,
                quoteId: e.quote_id ?? null,
                quoteNumber: e.quote_number ?? null,
                contact: e.contact ?? null,
                message: e.message ?? null,
                occurredAt: e.occurred_at ?? null,
                payload: (e.payload ?? {}) as Record<string, unknown>,
              }),
            );
          } catch (err) {
            console.error("[events] ingest failed", err);
            results.push({ ok: false });
          }
        }

        return Response.json({ received: events.length, results });
      },
    },
  },
});
