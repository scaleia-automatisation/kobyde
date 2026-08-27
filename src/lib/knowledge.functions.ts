import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/* eslint-disable @typescript-eslint/no-explicit-any */

const fileSchema = z.object({
  name: z.string().min(1),
  mime: z.string().default(""),
  base64: z.string().min(10),
});

/** Remplit la fiche entreprise à partir du site web (sans jamais inventer d'information). */
export const fillCompanyFromWebsite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ orgId: z.string().uuid(), website: z.string().min(4) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context as any;
    const { data: org, error } = await supabase
      .from("organizations")
      .select("id")
      .eq("id", data.orgId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!org) throw new Error("Accès refusé.");

    try {
      const { fillCompanyFromSite } = await import("./company-fill.server");
      return { ok: true as const, values: await fillCompanyFromSite(data.website.trim()) };
    } catch (error) {
      return {
        ok: false as const,
        error: error instanceof Error ? error.message : "Lecture du site impossible.",
      };
    }
  });

/** Génère (ou met à jour) la base de connaissance de l'organisation. */
export const generateKnowledgeBase = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ orgId: z.string().uuid(), mode: z.enum(["generate", "update"]).default("generate") }).parse(input),
  )
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
    const text = await generateKnowledgeAI(org, data.mode === "update" ? org.knowledge_base : null, data.mode);
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
