import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";

/* eslint-disable @typescript-eslint/no-explicit-any */

function verifySignature(payload: string, header: string, secret: string) {
  const parts = Object.fromEntries(
    header.split(",").map((p) => {
      const [k, v] = p.split("=");
      return [k?.trim() ?? "", v?.trim() ?? ""];
    }),
  );
  const timestamp = parts["t"];
  const signature = parts["v1"];
  if (!timestamp || !signature) return false;
  const expected = createHmac("sha256", secret).update(`${timestamp}.${payload}`).digest("hex");
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export const Route = createFileRoute("/api/public/webhooks/stripe")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["STRIPE_WEBHOOK_SECRET"];
        const body = await request.text();
        const header = request.headers.get("stripe-signature") ?? "";

        if (!secret) return new Response("Webhook non configuré", { status: 503 });
        if (!verifySignature(body, header, secret)) {
          return new Response("Signature invalide", { status: 401 });
        }

        let event: any;
        try {
          event = JSON.parse(body);
        } catch {
          return new Response("Payload invalide", { status: 400 });
        }

        const handled = ["checkout.session.completed", "payment_intent.succeeded"];
        if (!handled.includes(event?.type)) return new Response("ok");

        const object = event?.data?.object ?? {};
        const requestId: string | undefined =
          object?.metadata?.payment_request_id ?? object?.client_reference_id ?? undefined;
        if (!requestId) return new Response("ok");

        const { confirmPayment } = await import("@/lib/portal.server");
        await confirmPayment(requestId, {
          method: "stripe",
          stripeIntent: object?.payment_intent ?? object?.id ?? null,
          stripeEvent: event?.id ?? null,
        });

        return new Response("ok");
      },
    },
  },
});
