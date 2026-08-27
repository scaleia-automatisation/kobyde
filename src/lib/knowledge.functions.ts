import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/* eslint-disable @typescript-eslint/no-explicit-any */

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

    const [catalog, connections, docs] = await Promise.all([
      supabase
        .from("products")
        .select("name,kind,description,price_ht,vat_rate,unit,category,terms")
        .eq("org_id", data.orgId)
        .limit(200),
      supabase.from("oauth_connections").select("provider,account_label").eq("org_id", data.orgId).eq("is_active", true),
      supabase.from("documents").select("name,kind").eq("org_id", data.orgId).limit(50),
    ]);

    const rows = (catalog?.data ?? []) as any[];
    const { generateKnowledgeAI } = await import("./knowledge.server");
    const result = await generateKnowledgeAI(org, data.mode === "update" ? org.knowledge_base : null, data.mode, {
      produits: rows.filter((r) => r.kind !== "service"),
      services: rows.filter((r) => r.kind === "service"),
      connecteurs: ((connections?.data ?? []) as any[]).map((c) => c.provider),
      documents: ((docs?.data ?? []) as any[]).map((d) => [d.name, d.kind].filter(Boolean).join(" — ")),
    });

    const { error: upErr } = await supabase
      .from("organizations")
      .update({
        knowledge_base: result.markdown,
        knowledge_json: result.data,
        knowledge_updated_at: new Date().toISOString(),
      })
      .eq("id", data.orgId);
    if (upErr) throw new Error(upErr.message);
    return { knowledge: result.markdown, pages: result.pages, structured: result.data };
  });


/** Ajoute un fichier ou un texte collé à la base de connaissance. */
export const importKnowledgeBase = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        orgId: z.string().uuid(),
        pasted: z.string().optional().nullable(),
        file: z
          .object({
            name: z.string().min(1),
            mime: z.string().default(""),
            base64: z.string().min(10),
          })
          .optional()
          .nullable(),
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
