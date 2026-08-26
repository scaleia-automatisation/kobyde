import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/* eslint-disable @typescript-eslint/no-explicit-any */

const fileSchema = z.object({
  name: z.string().min(1),
  mime: z.string().default(""),
  base64: z.string().min(10),
});

/** Génère la base de connaissance de l'organisation à partir de sa fiche entreprise. */
export const generateKnowledgeBase = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ orgId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context as any;
    const { data: org, error } = await supabase
      .from("organizations")
      .select("*")
      .eq("id", data.orgId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!org) throw new Error("Accès refusé.");

    const { generateKnowledgeAI } = await import("./knowledge.server");
    const text = await generateKnowledgeAI(org, org.knowledge_base);
    const { error: upErr } = await supabase
      .from("organizations")
      .update({ knowledge_base: text })
      .eq("id", data.orgId);
    if (upErr) throw new Error(upErr.message);
    return { knowledge: text };
  });

/** Ajoute un fichier ou un texte collé à la base de connaissance. */
export const importKnowledgeBase = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        orgId: z.string().uuid(),
        pasted: z.string().optional().nullable(),
        file: fileSchema.optional().nullable(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context as any;
    if (!data.file && !data.pasted?.trim()) throw new Error("Ajoutez un fichier ou collez un texte.");
    const { data: org, error } = await supabase
      .from("organizations")
      .select("id, knowledge_base")
      .eq("id", data.orgId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!org) throw new Error("Accès refusé.");

    const { importKnowledgeAI } = await import("./knowledge.server");
    const text = await importKnowledgeAI({
      existing: org.knowledge_base,
      pasted: data.pasted ?? null,
      file: data.file ?? null,
    });
    const { error: upErr } = await supabase
      .from("organizations")
      .update({ knowledge_base: text })
      .eq("id", data.orgId);
    if (upErr) throw new Error(upErr.message);
    return { knowledge: text };
  });
