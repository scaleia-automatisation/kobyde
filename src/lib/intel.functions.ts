import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  analyzeReputationAI,
  draftReviewReplyAI,
  generateAnalysisAI,
  generateCompetitiveAI,
  runWatchAI,
} from "./intel.server";
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
  args: {
    orgId: string;
    userId: string;
    kind: string;
    title: string;
    summary: string;
    data: any;
    sources: any;
    params: any;
    topicId?: string | null;
  },
) => {
  const { data: row, error } = await supabase
    .from("intel_assets")
    .insert({
      org_id: args.orgId,
      kind: args.kind,
      title: args.title.slice(0, 200) || args.kind,
      summary: (args.summary ?? "").slice(0, 500),
      data: args.data,
      sources: args.sources ?? [],
      params: args.params,
      topic_id: args.topicId ?? null,
      created_by: args.userId,
    })
    .select("id,kind,title,summary,data,sources,params,topic_id,created_at")
    .single();
  if (error) throw new Error(error.message);
  return row;
};

const base = z.object({ orgId: z.string().uuid(), idempotencyKey: z.string().min(6).max(80) });

const ANALYSIS = {
  business_plan: { action: "analysis.business_plan", label: "Business plan" },
  market_study: { action: "analysis.market_study", label: "Étude de marché" },
  sector: { action: "analysis.sector", label: "Analyse sectorielle" },
} as const;

/** Ethan produit un business plan, une étude de marché ou une analyse sectorielle. */
export const generateAnalysis = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    base
      .extend({
        kind: z.enum(["business_plan", "market_study", "sector"]),
        scope: z.string().max(600).default(""),
        notes: z.string().max(3000).default(""),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    await assertMember(supabase, data.orgId, userId);
    const meta = ANALYSIS[data.kind];
    const tx = await reserveCredits(supabase, {
      orgId: data.orgId,
      actionKey: meta.action,
      idempotencyKey: data.idempotencyKey,
    });
    try {
      const result = await generateAnalysisAI(supabase, data.orgId, data.kind, data);
      const row = await saveAsset(supabase, {
        orgId: data.orgId,
        userId,
        kind: data.kind,
        title: `${meta.label}${data.scope ? ` — ${data.scope}` : ""}`,
        summary: result.synthese,
        data: result,
        sources: result.sources,
        params: data,
      });
      await completeCredits(supabase, tx, meta.label);
      return { asset: row, result };
    } catch (e) {
      const message = e instanceof Error ? e.message : `Échec — ${meta.label}`;
      await refundCredits(supabase, tx, message);
      throw new Error(message);
    }
  });

/** Ethan lance une analyse concurrentielle sourcée (recherche Google). */
export const generateCompetitive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    base
      .extend({
        competitors: z.string().max(1000).default(""),
        notes: z.string().max(3000).default(""),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    await assertMember(supabase, data.orgId, userId);
    const tx = await reserveCredits(supabase, {
      orgId: data.orgId,
      actionKey: "analysis.competitive",
      idempotencyKey: data.idempotencyKey,
    });
    try {
      const result = await generateCompetitiveAI(supabase, data.orgId, data);
      const row = await saveAsset(supabase, {
        orgId: data.orgId,
        userId,
        kind: "competitive",
        title: `Analyse concurrentielle — ${result.concurrents.map((c) => c.nom).slice(0, 3).join(", ") || "secteur"}`,
        summary: result.recommandations[0] ?? "",
        data: result,
        sources: result.sources,
        params: data,
      });
      await completeCredits(supabase, tx, "Analyse concurrentielle");
      return { asset: row, result };
    } catch (e) {
      const message = e instanceof Error ? e.message : "Échec de l'analyse concurrentielle";
      await refundCredits(supabase, tx, message);
      throw new Error(message);
    }
  });

const nextRun = (frequency: string) =>
  new Date(Date.now() + (frequency === "quotidienne" ? 1 : 7) * 86400000).toISOString();

/** Crée ou met à jour un sujet de veille programmée (gratuit). */
export const saveWatchTopic = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        orgId: z.string().uuid(),
        topicId: z.string().uuid().optional(),
        kind: z.enum(["concurrentielle", "generale"]).default("concurrentielle"),
        subject: z.string().min(3).max(600),
        competitors: z.string().max(1000).default(""),
        frequency: z.enum(["quotidienne", "hebdomadaire"]).default("hebdomadaire"),
        active: z.boolean().default(true),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    await assertMember(supabase, data.orgId, userId);
    const payload = {
      org_id: data.orgId,
      kind: data.kind,
      subject: data.subject,
      competitors: data.competitors,
      frequency: data.frequency,
      active: data.active,
      next_run_at: nextRun(data.frequency),
      created_by: userId,
    };
    const query = data.topicId
      ? supabase.from("watch_topics").update(payload).eq("id", data.topicId).eq("org_id", data.orgId)
      : supabase.from("watch_topics").insert(payload);
    const { data: row, error } = await query.select("*").single();
    if (error) throw new Error(error.message);
    return { topic: row };
  });

/** Lance (ou actualise) une veille : recherche web récente, sources, analyse et synthèse. */
export const runWatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    base
      .extend({
        topicId: z.string().uuid().optional(),
        kind: z.enum(["concurrentielle", "generale"]).default("concurrentielle"),
        subject: z.string().min(3).max(600),
        competitors: z.string().max(1000).default(""),
        refresh: z.boolean().default(false),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    await assertMember(supabase, data.orgId, userId);
    const actionKey = data.refresh ? "watch.refresh" : data.kind === "concurrentielle" ? "watch.competitive" : "watch.web";
    const tx = await reserveCredits(supabase, {
      orgId: data.orgId,
      actionKey,
      idempotencyKey: data.idempotencyKey,
    });
    try {
      const result = await runWatchAI(supabase, data.orgId, {
        kind: data.kind,
        subject: data.subject,
        competitors: data.competitors,
      });
      const row = await saveAsset(supabase, {
        orgId: data.orgId,
        userId,
        kind: data.kind === "concurrentielle" ? "watch_competitive" : "watch_general",
        title: `Briefing — ${data.subject}`,
        summary: result.synthese,
        data: result,
        sources: result.sources,
        params: data,
        topicId: data.topicId ?? null,
      });
      if (data.topicId) {
        await supabase
          .from("watch_topics")
          .update({ last_run_at: new Date().toISOString(), last_asset_id: row.id })
          .eq("id", data.topicId)
          .eq("org_id", data.orgId);
      }
      await completeCredits(supabase, tx, "Veille");
      return { asset: row, result };
    } catch (e) {
      const message = e instanceof Error ? e.message : "Échec de la veille";
      await refundCredits(supabase, tx, message);
      throw new Error(message);
    }
  });

/** Analyse d'e-réputation : mentions réelles sourcées + synthèse. Enregistre les mentions. */
export const analyzeReputation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    base
      .extend({
        query: z.string().max(400).default(""),
        notes: z.string().max(2000).default(""),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    await assertMember(supabase, data.orgId, userId);
    const tx = await reserveCredits(supabase, {
      orgId: data.orgId,
      actionKey: "rep.analysis",
      idempotencyKey: data.idempotencyKey,
    });
    try {
      const result = await analyzeReputationAI(supabase, data.orgId, data);
      const row = await saveAsset(supabase, {
        orgId: data.orgId,
        userId,
        kind: "ereputation",
        title: `E-réputation — ${data.query || "entreprise"}`,
        summary: result.synthese,
        data: result,
        sources: result.mentions.map((m) => ({ titre: m.source, url: m.lien })),
        params: data,
      });

      if (result.mentions.length) {
        const { data: existing } = await supabase.from("reviews").select("url").eq("org_id", data.orgId);
        const known = new Set((existing ?? []).map((r: any) => r.url));
        const rows = result.mentions
          .filter((m) => m.lien && !known.has(m.lien))
          .map((m) => ({
            org_id: data.orgId,
            source: m.source,
            author: m.auteur || null,
            rating: m.note,
            content: m.resume,
            url: m.lien,
            page: m.page,
            section: m.section,
            topic: m.sujet,
            sentiment: m.sentiment,
            importance: m.importance,
            summary: m.resume,
            created_by: userId,
          }));
        if (rows.length) await supabase.from("reviews").insert(rows);
      }

      await completeCredits(supabase, tx, "Analyse d'e-réputation");
      return { asset: row, result };
    } catch (e) {
      const message = e instanceof Error ? e.message : "Échec de l'analyse d'e-réputation";
      await refundCredits(supabase, tx, message);
      throw new Error(message);
    }
  });

/** Prépare une réponse à un avis. Jamais publiée sans validation humaine. */
export const draftReviewReply = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    base.extend({ reviewId: z.string().uuid(), tone: z.string().max(120).default("") }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    await assertMember(supabase, data.orgId, userId);
    const { data: review, error } = await supabase
      .from("reviews")
      .select("*")
      .eq("id", data.reviewId)
      .eq("org_id", data.orgId)
      .single();
    if (error || !review) throw new Error("Avis introuvable.");

    const tx = await reserveCredits(supabase, {
      orgId: data.orgId,
      actionKey: "rep.review_reply",
      idempotencyKey: data.idempotencyKey,
    });
    try {
      const result = await draftReviewReplyAI(supabase, data.orgId, {
        author: review.author ?? "",
        rating: review.rating ?? null,
        content: review.content ?? review.summary ?? "",
        source: review.source ?? "Google",
        tone: data.tone,
      });
      await supabase
        .from("reviews")
        .update({ reply_draft: result.reponse, reply_status: "brouillon" })
        .eq("id", data.reviewId)
        .eq("org_id", data.orgId);
      await completeCredits(supabase, tx, "Réponse à un avis");
      return result;
    } catch (e) {
      const message = e instanceof Error ? e.message : "Échec de la réponse à l'avis";
      await refundCredits(supabase, tx, message);
      throw new Error(message);
    }
  });

/** Modification, validation ou publication humaine d'une réponse (gratuit). */
export const updateReviewReply = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        orgId: z.string().uuid(),
        reviewId: z.string().uuid(),
        replyDraft: z.string().max(4000).optional(),
        status: z.enum(["aucune", "brouillon", "valide", "publie"]).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    await assertMember(supabase, data.orgId, userId);

    if (data.status === "publie") {
      const { data: review } = await supabase
        .from("reviews")
        .select("reply_status,reply_draft")
        .eq("id", data.reviewId)
        .eq("org_id", data.orgId)
        .single();
      if (!review?.reply_draft?.trim()) throw new Error("Aucune réponse à publier.");
      if (review.reply_status !== "valide") throw new Error("La réponse doit d'abord être validée par un humain.");
    }

    const { error } = await supabase
      .from("reviews")
      .update({
        ...(data.replyDraft !== undefined ? { reply_draft: data.replyDraft } : {}),
        ...(data.status ? { reply_status: data.status } : {}),
        ...(data.status === "publie" ? { replied_at: new Date().toISOString() } : {}),
      })
      .eq("id", data.reviewId)
      .eq("org_id", data.orgId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
