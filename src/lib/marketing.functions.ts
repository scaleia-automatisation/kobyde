import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  generatePromiseAI,
  generateSiteBriefAI,
  generateSiteContentAI,
  generateValuePropAI,
} from "./marketing.server";
import { completeCredits, refundCredits, reserveCredits } from "./credits.server";

/* eslint-disable @typescript-eslint/no-explicit-any */

const assertMember = async (supabase: any, orgId: string, userId: string) => {
  const { data } = await supabase
    .from("memberships")
    .select("id")
    .eq("org_id", orgId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!data) throw new Error("Accès refusé.");
};

const saveAsset = async (
  supabase: any,
  args: { orgId: string; userId: string; kind: string; title: string; summary: string; data: any; params: any },
) => {
  const { data: row, error } = await supabase
    .from("marketing_assets")
    .insert({
      org_id: args.orgId,
      kind: args.kind,
      title: args.title.slice(0, 200) || args.kind,
      summary: args.summary.slice(0, 500),
      data: args.data,
      params: args.params,
      created_by: args.userId,
    })
    .select("id,kind,title,summary,data,params,created_at")
    .single();
  if (error) throw new Error(error.message);
  return row;
};

const base = z.object({ orgId: z.string().uuid(), idempotencyKey: z.string().min(6).max(80) });

/** Lamine génère la promesse marketing (principale, variantes, versions, bénéfice, crédibilité). */
export const generatePromise = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    base
      .extend({
        offer: z.string().max(400).default(""),
        audience: z.string().max(400).default(""),
        notes: z.string().max(2000).default(""),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    await assertMember(supabase, data.orgId, userId);
    const tx = await reserveCredits(supabase, {
      orgId: data.orgId,
      actionKey: "mkt.promise",
      idempotencyKey: data.idempotencyKey,
    });
    try {
      const result = await generatePromiseAI(supabase, data.orgId, data);
      const row = await saveAsset(supabase, {
        orgId: data.orgId,
        userId,
        kind: "promesse",
        title: result.promesse || "Promesse",
        summary: result.version_courte,
        data: result,
        params: data,
      });
      await completeCredits(supabase, tx, "Promesse générée");
      return { asset: row, result };
    } catch (e) {
      const message = e instanceof Error ? e.message : "Échec de la génération de la promesse";
      await refundCredits(supabase, tx, message);
      throw new Error(message);
    }
  });

const VP_ACTION: Record<string, string> = {
  generer: "mkt.value_prop",
  optimiser: "mkt.value_prop_optimize",
  concurrents: "mkt.competitor_props",
};

/** Lamine génère, optimise ou compare la proposition de valeur. */
export const generateValueProp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    base
      .extend({
        mode: z.enum(["generer", "optimiser", "concurrents"]),
        offer: z.string().max(400).default(""),
        audience: z.string().max(400).default(""),
        notes: z.string().max(2000).default(""),
        current: z.string().max(2000).default(""),
        competitors: z.string().max(2000).default(""),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    await assertMember(supabase, data.orgId, userId);
    const tx = await reserveCredits(supabase, {
      orgId: data.orgId,
      actionKey: VP_ACTION[data.mode] ?? "mkt.value_prop",
      idempotencyKey: data.idempotencyKey,
    });
    try {
      const result = await generateValuePropAI(supabase, data.orgId, data);
      const row = await saveAsset(supabase, {
        orgId: data.orgId,
        userId,
        kind: "proposition",
        title: result.proposition || "Proposition de valeur",
        summary: result.accroche,
        data: result,
        params: data,
      });
      await completeCredits(supabase, tx, "Proposition de valeur");
      return { asset: row, result };
    } catch (e) {
      const message = e instanceof Error ? e.message : "Échec de la proposition de valeur";
      await refundCredits(supabase, tx, message);
      throw new Error(message);
    }
  });

/** Lamine rédige un briefing de site (vitrine ou e-commerce). */
export const generateSiteBrief = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    base
      .extend({
        siteType: z.string().max(40).default("vitrine"),
        product: z.string().max(600).default(""),
        notes: z.string().max(3000).default(""),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    await assertMember(supabase, data.orgId, userId);
    const tx = await reserveCredits(supabase, {
      orgId: data.orgId,
      actionKey: "mkt.site_brief",
      idempotencyKey: data.idempotencyKey,
    });
    try {
      const result = await generateSiteBriefAI(supabase, data.orgId, data);
      const row = await saveAsset(supabase, {
        orgId: data.orgId,
        userId,
        kind: "briefing",
        title: `Briefing ${data.siteType === "ecommerce" ? "e-commerce" : "site vitrine"} — ${data.product || "offre principale"}`,
        summary: result["objectifs"] ?? "",
        data: result,
        params: data,
      });
      await completeCredits(supabase, tx, "Briefing de site");
      return { asset: row, result };
    } catch (e) {
      const message = e instanceof Error ? e.message : "Échec du briefing de site";
      await refundCredits(supabase, tx, message);
      throw new Error(message);
    }
  });

/** Lamine produit le contenu complet du site, page par page et section par section. */
export const generateSiteContent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    base
      .extend({
        siteType: z.string().max(40).default("vitrine"),
        pages: z.string().max(600).default(""),
        product: z.string().max(600).default(""),
        brief: z.string().max(12000).default(""),
        audience: z.string().max(400).default(""),
        goal: z.string().max(400).default(""),
        tone: z.string().max(80).default("Professionnel"),
        location: z.string().max(200).default(""),
        keywords: z.string().max(600).default(""),
        language: z.string().max(60).default("Français"),
        font: z.string().max(120).default(""),
        palette: z.string().max(200).default(""),
        style: z.string().max(120).default(""),
        cta: z.string().max(200).default(""),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    await assertMember(supabase, data.orgId, userId);
    const tx = await reserveCredits(supabase, {
      orgId: data.orgId,
      actionKey: "mkt.site_content",
      idempotencyKey: data.idempotencyKey,
    });
    try {
      const result = await generateSiteContentAI(supabase, data.orgId, data);
      const row = await saveAsset(supabase, {
        orgId: data.orgId,
        userId,
        kind: "contenu",
        title: `Contenu ${data.siteType === "ecommerce" ? "e-commerce" : "site vitrine"} — ${data.product || "offre principale"}`,
        summary: result.strategie,
        data: result,
        params: data,
      });
      await completeCredits(supabase, tx, "Contenu de site");
      return { asset: row, result };
    } catch (e) {
      const message = e instanceof Error ? e.message : "Échec de la génération du contenu";
      await refundCredits(supabase, tx, message);
      throw new Error(message);
    }
  });

/** Mise à jour manuelle d'un livrable marketing (édition libre, gratuite). */
export const updateMarketingAsset = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        orgId: z.string().uuid(),
        assetId: z.string().uuid(),
        title: z.string().max(200).optional(),
        data: z.record(z.string(), z.any()).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    await assertMember(supabase, data.orgId, userId);
    const { error } = await supabase
      .from("marketing_assets")
      .update({
        updated_at: new Date().toISOString(),
        ...(data.title !== undefined ? { title: data.title } : {}),
        ...(data.data !== undefined ? { data: data.data } : {}),
      })
      .eq("id", data.assetId)
      .eq("org_id", data.orgId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
