import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/* eslint-disable @typescript-eslint/no-explicit-any */

/** Rédige (ou régénère) le texte d'une facture avec Audrey, à partir des données de l'entreprise. */
export const generateInvoiceDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        orgId: z.string().uuid(),
        baseText: z.string().min(20),
        instruction: z.string().max(2000).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;

    const { data: member } = await supabase
      .from("memberships")
      .select("id")
      .eq("org_id", data.orgId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!member) throw new Error("Accès refusé.");

    const { data: org } = await supabase
      .from("organizations")
      .select("*")
      .eq("id", data.orgId)
      .maybeSingle();

    const { writeInvoiceDocument } = await import("./invoices.server");
    const text = await writeInvoiceDocument({
      baseText: data.baseText,
      org,
      ...(data.instruction ? { instruction: data.instruction } : {}),
    });
    return { text };
  });
