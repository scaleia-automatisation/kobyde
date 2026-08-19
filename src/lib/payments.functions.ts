import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

/** Encaissement manuel (virement, espèces, chèque…) confirmé par un membre de l'entreprise. */
export const markPaymentReceived = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        requestId: z.string().uuid(),
        method: z.string().max(40).default("virement"),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { data: pr, error } = await context.supabase
      .from("payment_requests")
      .select("id")
      .eq("id", data.requestId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!pr) throw new Error("Demande de paiement introuvable ou hors de votre entreprise.");

    const { confirmPayment } = await import("./portal.server");
    return confirmPayment(data.requestId, { method: data.method });
  });
