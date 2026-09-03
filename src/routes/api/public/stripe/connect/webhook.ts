import { createFileRoute } from "@tanstack/react-router";

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Webhooks STRIPE ENTREPRISE — paiements des clients des entreprises utilisatrices.
 * Totalement séparé du webhook des abonnements SaaS (/api/public/payments/webhook).
 */
export const Route = createFileRoute("/api/public/stripe/connect/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = await request.text();
        const header = request.headers.get("stripe-signature");

        const { getPlatformStripeConfig, verifyStripeSignature, findOrgByStripeAccount } =
          await import("@/lib/stripe-connect.server");

        let secret: string | null = null;
        try {
          secret = (await getPlatformStripeConfig()).connectWebhookSecret;
        } catch {
          secret = null;
        }
        if (!secret) return new Response("Webhook Connect non configuré", { status: 503 });
        if (!(await verifyStripeSignature(body, header, secret))) {
          return new Response("Signature invalide", { status: 401 });
        }

        let event: any;
        try {
          event = JSON.parse(body);
        } catch {
          return new Response("Payload invalide", { status: 400 });
        }

        // Évènement Connect : compte émetteur. Évènement direct (entreprise
        // avec ses propres clés Stripe) : on résout via les métadonnées.
        const connectedAccountId: string | undefined = event?.account;
        const metaOrgId: string | undefined = event?.data?.object?.metadata?.organization_id;

        const orgId = connectedAccountId
          ? await findOrgByStripeAccount(connectedAccountId)
          : (metaOrgId ?? null);
        if (!orgId) return Response.json({ received: true, ignored: "unknown account" });

        const object = event?.data?.object ?? {};
        const succeeded = ["checkout.session.completed", "payment_intent.succeeded"].includes(event?.type);
        const failed = ["payment_intent.payment_failed", "checkout.session.async_payment_failed"].includes(
          event?.type,
        );

        if (event?.type === "account.updated") {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          await (supabaseAdmin as any)
            .from("org_stripe_accounts")
            .update({
              charges_enabled: Boolean(object?.charges_enabled),
              payouts_enabled: Boolean(object?.payouts_enabled),
              last_synced_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq("org_id", orgId);
          return Response.json({ received: true });
        }

        if (!succeeded && !failed) return Response.json({ received: true, ignored: event?.type });
        if (event?.type === "checkout.session.completed" && object?.payment_status === "unpaid") {
          return Response.json({ received: true, pending: true });
        }

        const requestId: string | undefined =
          object?.metadata?.payment_request_id ?? object?.client_reference_id ?? undefined;

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const db = supabaseAdmin as any;

        if (succeeded && requestId) {
          const { confirmPayment } = await import("@/lib/portal.server");
          await confirmPayment(requestId, {
            method: "stripe",
            stripeIntent: object?.payment_intent ?? object?.id ?? null,
            stripeEvent: event?.id ?? null,
          });
        } else {
          // Paiement hors demande de paiement : on trace quand même l'encaissement.
          const amount =
            Number(object?.amount_received ?? object?.amount_total ?? object?.amount ?? 0) / 100;
          await db.from("payments").insert({
            org_id: orgId,
            client_id: object?.metadata?.client_id ?? null,
            invoice_id: object?.metadata?.invoice_id ?? null,
            amount,
            currency: String(object?.currency ?? "eur").toUpperCase(),
            method: "stripe",
            status: succeeded ? "paye" : "echec",
            stripe_payment_intent_id: object?.payment_intent ?? object?.id ?? null,
            stripe_event_id: event?.id ?? null,
            paid_at: succeeded ? new Date().toISOString() : null,
          });
        }

        await db.from("notifications").insert({
          org_id: orgId,
          title: succeeded ? "Paiement client reçu 🎉" : "Paiement client refusé",
          body: succeeded
            ? "Un paiement vient d'être encaissé sur votre compte Stripe."
            : "Un paiement client a échoué sur votre compte Stripe. Relancez le client.",
          kind: succeeded ? "success" : "warning",
        });

        await db.from("audit_logs").insert({
          org_id: orgId,
          action: `stripe_connect.${event?.type}`,
          entity: "payments",
        });

        return Response.json({ received: true });
      },
    },
  },
});
