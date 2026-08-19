import { createFileRoute } from "@tanstack/react-router";

/**
 * Stripe webhook — /api/public/stripe/webhook
 * Verifies the Stripe signature, ignores duplicate events, then updates the
 * payment, the invoice and the client, and creates a notification.
 */
const encoder = new TextEncoder();

async function verifyStripeSignature(payload: string, header: string | null, secret: string) {
  if (!header) return false;
  const parts = Object.fromEntries(
    header.split(",").map((p) => {
      const [k, ...v] = p.split("=");
      return [(k ?? "").trim(), v.join("=")];
    }),
  ) as { t?: string; v1?: string };
  if (!parts.t || !parts.v1) return false;

  // Reject events older than 5 minutes (replay protection)
  if (Math.abs(Date.now() / 1000 - Number(parts.t)) > 300) return false;

  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(`${parts.t}.${payload}`));
  const expected = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  if (expected.length !== parts.v1.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ parts.v1.charCodeAt(i);
  return diff === 0;
}

export const Route = createFileRoute("/api/public/stripe/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["STRIPE_WEBHOOK_SECRET"];
        if (!secret) return new Response("Webhook not configured", { status: 503 });

        const body = await request.text();
        const ok = await verifyStripeSignature(body, request.headers.get("stripe-signature"), secret);
        if (!ok) return new Response("Invalid signature", { status: 401 });

        /* eslint-disable @typescript-eslint/no-explicit-any */
        const event = JSON.parse(body) as { id: string; type: string; data: { object: any } };
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // Duplicate protection: the event id is unique on payments
        const { data: existing } = await supabaseAdmin
          .from("payments")
          .select("id")
          .eq("stripe_event_id", event.id)
          .maybeSingle();
        if (existing) return Response.json({ received: true, duplicate: true });

        const obj = event.data.object ?? {};
        const orgId: string | undefined = obj.metadata?.org_id;
        const invoiceId: string | undefined = obj.metadata?.invoice_id;
        const clientId: string | undefined = obj.metadata?.client_id;

        const succeeded = [
          "payment_intent.succeeded",
          "checkout.session.completed",
          "invoice.payment_succeeded",
        ].includes(event.type);
        const failed = ["payment_intent.payment_failed", "invoice.payment_failed"].includes(event.type);

        if (!orgId || (!succeeded && !failed)) {
          return Response.json({ received: true, ignored: event.type });
        }

        const amount = Number(obj.amount_received ?? obj.amount_total ?? obj.amount_paid ?? 0) / 100;

        await supabaseAdmin.from("payments").insert({
          org_id: orgId,
          invoice_id: invoiceId ?? null,
          client_id: clientId ?? null,
          amount,
          currency: (obj.currency ?? "eur").toUpperCase(),
          method: "stripe",
          status: succeeded ? "paye" : "echec",
          stripe_payment_intent_id: obj.payment_intent ?? obj.id ?? null,
          stripe_event_id: event.id,
          paid_at: succeeded ? new Date().toISOString() : null,
        });

        if (succeeded && invoiceId) {
          await supabaseAdmin
            .from("invoices")
            .update({ status: "payee", paid_at: new Date().toISOString() })
            .eq("id", invoiceId);
        }

        if (succeeded && clientId) {
          const { data: client } = await supabaseAdmin
            .from("clients")
            .select("total_revenue")
            .eq("id", clientId)
            .maybeSingle();
          await supabaseAdmin
            .from("clients")
            .update({ total_revenue: Number(client?.total_revenue ?? 0) + amount, status: "actif" })
            .eq("id", clientId);
        }

        await supabaseAdmin.from("notifications").insert({
          org_id: orgId,
          title: succeeded ? "Paiement reçu 🎉" : "Paiement refusé",
          body: succeeded
            ? `Un paiement de ${amount.toFixed(2)} € vient d'être encaissé.`
            : `Un paiement de ${amount.toFixed(2)} € a échoué. Relancez le client.`,
          kind: succeeded ? "success" : "warning",
        });

        await supabaseAdmin.from("audit_logs").insert({
          org_id: orgId,
          action: `stripe.${event.type}`,
          entity: "payments",
        });

        return Response.json({ received: true });
      },
    },
  },
});
