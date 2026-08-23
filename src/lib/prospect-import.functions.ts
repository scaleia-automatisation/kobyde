import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { parseFromImage, parseFromText } from "./prospect-import.server";

export const parseProspectImport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        orgId: z.string().uuid(),
        text: z.string().max(60000).optional(),
        imageDataUrl: z.string().max(8_000_000).optional(),
      })
      .refine((d) => !!d.text || !!d.imageDataUrl, "Aucune donnée à analyser.")
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { data: membership } = await context.supabase
      .from("memberships")
      .select("id")
      .eq("org_id", data.orgId)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (!membership) throw new Error("Accès refusé à cette organisation.");

    const prospects = data.imageDataUrl
      ? await parseFromImage(data.imageDataUrl)
      : await parseFromText(data.text!);

    return { prospects };
  });
