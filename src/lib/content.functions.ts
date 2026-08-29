import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { completeCredits, refundCredits, reserveCredits } from "./credits.server";
import type { ContentModel } from "./content";
import {
  buildStrategyAI,
  detectIntentAI,
  generateCaptionsAI,
  generateImageB64,
  imagePrompt,
  loadStudioContext,
  pollVideoJob,
  signAsset,
  startVideoJob,
  storeAsset,
  storeImageB64,
  findConnection,
  type Strategy,
  type StudioContext,
} from "./content.server";

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

const loadModel = async (supabase: any, key: string, kind: "image" | "video"): Promise<ContentModel> => {
  const { data } = await supabase.from("content_models").select("*").eq("key", key).maybeSingle();
  if (!data) throw new Error("Modèle IA introuvable.");
  if (!data.is_active) throw new Error("Ce modèle n'est pas activé par l'administrateur.");
  if (data.kind !== kind) throw new Error("Ce modèle n'est pas compatible avec ce type de contenu.");
  return data as ContentModel;
};

const paramsSchema = z
  .object({
    ratio: z.string().max(20).optional(),
    resolution: z.string().max(20).optional(),
    quality: z.string().max(40).optional(),
    style: z.string().max(80).optional(),
    realism: z.string().max(80).optional(),
    count: z.number().min(1).max(4).optional(),
    duration: z.number().min(4).max(12).optional(),
    audio: z.boolean().optional(),
    camera: z.string().max(60).optional(),
    language: z.string().max(40).optional(),
    withText: z.boolean().optional(),
    prompt: z.string().max(2000).optional(),
  })
  .default({});

const configSchema = z.object({
  orgId: z.string().uuid(),
  idempotencyKey: z.string().min(6).max(80),
  kind: z.enum(["image", "carrousel", "video"]),
  slides: z.number().min(1).max(4).default(1),
  productIds: z.array(z.string().uuid()).max(10).default([]),
  objective: z.string().max(120).default(""),
  platforms: z.array(z.string().max(30)).max(4).default([]),
  tone: z.string().max(60).default(""),
  instructions: z.string().max(2000).default(""),
  modelKey: z.string().max(60),
  params: paramsSchema,
});

/** Analyse la demande de l'utilisateur et pré-sélectionne le format. */
export const detectContentIntent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ message: z.string().min(3).max(2000) }).parse(input))
  .handler(async ({ data }) => detectIntentAI(data.message));

/** Génère le contenu (image, carrousel ou vidéo) puis les légendes par plateforme. */
export const generateContent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => configSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    await assertMember(supabase, data.orgId, userId);

    const isVideo = data.kind === "video";
    const model = await loadModel(supabase, data.modelKey, isVideo ? "video" : "image");
    const units = data.kind === "carrousel" ? data.slides : 1;
    const cost = model.credits * units;

    const tx = await reserveCredits(supabase, {
      orgId: data.orgId,
      actionKey: isVideo ? "content.video" : data.kind === "carrousel" ? "content.carousel" : "content.image",
      idempotencyKey: data.idempotencyKey,
      label: `${data.kind} — ${model.label}`,
      cost,
    });

    try {
      const { memory, products } = await loadStudioContext(supabase, data.orgId, data.productIds);
      const ctx: StudioContext = {
        kind: data.kind,
        slides: units,
        objective: data.objective,
        platforms: data.platforms,
        tone: data.tone,
        instructions: data.instructions,
        products,
        memory,
        params: data.params,
      };

      const strategy = await buildStrategyAI(ctx);
      const captions = await generateCaptionsAI(ctx, strategy);
      const ratio = data.params.ratio ?? (isVideo ? "9:16" : "1:1");

      const base = {
        org_id: data.orgId,
        created_by: userId,
        kind: data.kind,
        slides: units,
        product_ids: data.productIds,
        objective: data.objective,
        platforms: data.platforms,
        tone: data.tone,
        instructions: data.instructions,
        model_key: model.key,
        model_label: model.label,
        params: data.params,
        strategy,
        captions,
        credits_used: cost,
      };

      if (isVideo) {
        const prompt = imagePrompt(strategy.slides[0]!, strategy, data.params, ratio);
        const jobId = await startVideoJob(model, prompt, data.params);
        const { data: row, error } = await supabase
          .from("content_creations")
          .insert({ ...base, status: "en_cours", assets: [{ type: "video", job_id: jobId, prompt }] })
          .select("*")
          .single();
        if (error) throw new Error(error.message);
        await completeCredits(supabase, tx, `Vidéo lancée (${model.label})`);
        return { creation: row, jobId, pending: true as const };
      }

      const assets: any[] = [];
      for (const slide of strategy.slides) {
        const prompt = imagePrompt(slide, strategy, data.params, ratio);
        const b64 = await generateImageB64(model, prompt, { ...data.params, ratio });
        const stored = await storeImageB64(data.orgId, b64);
        assets.push({ type: "image", path: stored.path, url: stored.url, prompt, slide });
      }

      const { data: row, error } = await supabase
        .from("content_creations")
        .insert({ ...base, status: "genere", assets })
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      await completeCredits(supabase, tx, `${data.kind} généré (${model.label})`);
      return { creation: row, pending: false as const };
    } catch (e) {
      const message = e instanceof Error ? e.message : "Échec de la génération du contenu";
      await refundCredits(supabase, tx, message);
      throw new Error(message);
    }
  });

/** Vérifie l'avancement d'une vidéo et l'enregistre une fois terminée. */
export const checkVideoContent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ orgId: z.string().uuid(), creationId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    await assertMember(supabase, data.orgId, userId);
    const { data: row } = await supabase
      .from("content_creations")
      .select("*")
      .eq("id", data.creationId)
      .eq("org_id", data.orgId)
      .maybeSingle();
    if (!row) throw new Error("Contenu introuvable.");
    if (row.status !== "en_cours") return { status: row.status, creation: row };

    const jobId = (row.assets as any[])?.[0]?.job_id;
    if (!jobId) throw new Error("Génération vidéo introuvable.");

    const job = await pollVideoJob(jobId);
    if (job.status === "in_progress") return { status: "en_cours", creation: row };
    if (job.status === "failed") {
      await supabase
        .from("content_creations")
        .update({ status: "echec", error: job.error ?? "Génération échouée." })
        .eq("id", row.id);
      throw new Error(job.error ?? "Génération vidéo échouée.");
    }

    const stored = await storeAsset(data.orgId, job.bytes!, "mp4");
    const assets = [{ ...(row.assets as any[])[0], type: "video", path: stored.path, url: stored.url }];
    const { data: updated } = await supabase
      .from("content_creations")
      .update({ status: "genere", assets })
      .eq("id", row.id)
      .select("*")
      .single();
    return { status: "genere", creation: updated };
  });

/** Régénère un visuel précis (ou tout le carrousel) d'une création existante. */
export const regenerateSlide = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        orgId: z.string().uuid(),
        creationId: z.string().uuid(),
        index: z.number().min(0).max(3),
        idempotencyKey: z.string().min(6).max(80),
        prompt: z.string().max(2000).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    await assertMember(supabase, data.orgId, userId);
    const { data: row } = await supabase
      .from("content_creations")
      .select("*")
      .eq("id", data.creationId)
      .eq("org_id", data.orgId)
      .maybeSingle();
    if (!row) throw new Error("Contenu introuvable.");
    if (row.kind === "video") throw new Error("Utilisez « Régénérer » pour relancer une vidéo.");

    const model = await loadModel(supabase, row.model_key, "image");
    const tx = await reserveCredits(supabase, {
      orgId: data.orgId,
      actionKey: "content.image",
      idempotencyKey: data.idempotencyKey,
      label: `Régénération visuel — ${model.label}`,
      cost: model.credits,
    });
    try {
      const assets = [...(row.assets as any[])];
      const current = assets[data.index];
      if (!current) throw new Error("Visuel introuvable.");
      const prompt = data.prompt?.trim() || current.prompt;
      const savedParams = (row.params ?? {}) as Record<string, unknown>;
      const b64 = await generateImageB64(model, prompt, savedParams as any);
      const stored = await storeImageB64(data.orgId, b64);
      assets[data.index] = { ...current, prompt, path: stored.path, url: stored.url };
      const { data: updated } = await supabase
        .from("content_creations")
        .update({ assets })
        .eq("id", row.id)
        .select("*")
        .single();
      await completeCredits(supabase, tx, "Visuel régénéré");
      return { creation: updated };
    } catch (e) {
      const message = e instanceof Error ? e.message : "Échec de la régénération";
      await refundCredits(supabase, tx, message);
      throw new Error(message);
    }
  });

/** Régénère les légendes adaptées à chaque plateforme. */
export const regenerateCaptions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        orgId: z.string().uuid(),
        creationId: z.string().uuid(),
        idempotencyKey: z.string().min(6).max(80),
        platforms: z.array(z.string().max(30)).max(4).optional(),
        tone: z.string().max(60).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    await assertMember(supabase, data.orgId, userId);
    const { data: row } = await supabase
      .from("content_creations")
      .select("*")
      .eq("id", data.creationId)
      .eq("org_id", data.orgId)
      .maybeSingle();
    if (!row) throw new Error("Contenu introuvable.");

    const tx = await reserveCredits(supabase, {
      orgId: data.orgId,
      actionKey: "content.caption",
      idempotencyKey: data.idempotencyKey,
    });
    try {
      const { memory, products } = await loadStudioContext(supabase, data.orgId, row.product_ids ?? []);
      const captions = await generateCaptionsAI(
        {
          kind: row.kind,
          slides: row.slides,
          objective: row.objective,
          platforms: data.platforms ?? row.platforms ?? [],
          tone: data.tone ?? row.tone,
          instructions: row.instructions,
          products,
          memory,
          params: row.params ?? {},
        },
        row.strategy as Strategy,
      );
      const { data: updated } = await supabase
        .from("content_creations")
        .update({ captions })
        .eq("id", row.id)
        .select("*")
        .single();
      await completeCredits(supabase, tx, "Légendes régénérées");
      return { creation: updated };
    } catch (e) {
      const message = e instanceof Error ? e.message : "Échec des légendes";
      await refundCredits(supabase, tx, message);
      throw new Error(message);
    }
  });

/** Modification manuelle (légendes, textes) : gratuite. */
export const updateCreation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        orgId: z.string().uuid(),
        creationId: z.string().uuid(),
        captions: z.record(z.string(), z.any()).optional(),
        strategy: z.record(z.string(), z.any()).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    await assertMember(supabase, data.orgId, userId);
    const { error } = await supabase
      .from("content_creations")
      .update({
        ...(data.captions ? { captions: data.captions } : {}),
        ...(data.strategy ? { strategy: data.strategy } : {}),
      })
      .eq("id", data.creationId)
      .eq("org_id", data.orgId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Rafraîchit les liens signés des visuels d'une création. */
export const refreshAssetUrls = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ orgId: z.string().uuid(), creationId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    await assertMember(supabase, data.orgId, userId);
    const { data: row } = await supabase
      .from("content_creations")
      .select("id,assets")
      .eq("id", data.creationId)
      .eq("org_id", data.orgId)
      .maybeSingle();
    if (!row) throw new Error("Contenu introuvable.");
    const assets = await Promise.all(
      ((row.assets as any[]) ?? []).map(async (a) => (a?.path ? { ...a, url: await signAsset(a.path) } : a)),
    );
    await supabase.from("content_creations").update({ assets }).eq("id", row.id);
    return { assets };
  });

/** Publie ou programme un contenu sur une plateforme connectée. */
export const publishContent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        orgId: z.string().uuid(),
        creationId: z.string().uuid(),
        platform: z.enum(["instagram", "facebook", "linkedin", "tiktok"]),
        caption: z.string().max(5000).default(""),
        scheduledAt: z.string().max(40).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    await assertMember(supabase, data.orgId, userId);

    const connection = await findConnection(supabase, userId, data.platform);
    if (!connection) {
      return {
        needsConnection: true as const,
        platform: data.platform,
        message: "Connectez votre compte pour publier ce contenu.",
      };
    }

    const scheduled = data.scheduledAt ? new Date(data.scheduledAt) : null;
    const isFuture = scheduled ? scheduled.getTime() > Date.now() + 60_000 : false;

    const { data: row, error } = await supabase
      .from("content_publications")
      .insert({
        org_id: data.orgId,
        creation_id: data.creationId,
        platform: data.platform,
        account_label: connection.account_label ?? null,
        caption: data.caption,
        scheduled_at: isFuture ? scheduled!.toISOString() : null,
        status: isFuture ? "programmee" : "en_file",
        created_by: userId,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);

    await supabase.from("content_creations").update({ status: "publie" }).eq("id", data.creationId);
    return { needsConnection: false as const, publication: row };
  });

/** Supprime une création (et ses publications). */
export const deleteCreation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ orgId: z.string().uuid(), creationId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    await assertMember(supabase, data.orgId, userId);
    const { error } = await supabase
      .from("content_creations")
      .delete()
      .eq("id", data.creationId)
      .eq("org_id", data.orgId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Super Admin : mise à jour d'un modèle du catalogue. */
export const updateContentModel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        key: z.string().max(60),
        is_active: z.boolean().optional(),
        credits: z.number().min(0).max(500).optional(),
        notes: z.string().max(500).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context as any;
    const { data: isAdmin } = await supabase.rpc("is_platform_admin");
    if (!isAdmin) throw new Error("Accès réservé au Super Admin.");
    const { error } = await supabase
      .from("content_models")
      .update({
        ...(data.is_active !== undefined ? { is_active: data.is_active } : {}),
        ...(data.credits !== undefined ? { credits: data.credits } : {}),
        ...(data.notes !== undefined ? { notes: data.notes } : {}),
      })
      .eq("key", data.key);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
