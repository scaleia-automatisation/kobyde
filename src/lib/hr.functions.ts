import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { completeCredits, refundCredits, reserveCredits } from "./credits.server";
import { RETENTION_MONTHS } from "./hr";

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

const journal = async (
  supabase: any,
  args: { orgId: string; candidateId?: string | null; action: string; detail?: string; actor?: string },
) => {
  await supabase.from("hr_audit_log").insert({
    org_id: args.orgId,
    candidate_id: args.candidateId ?? null,
    action: args.action,
    detail: (args.detail ?? "").slice(0, 500),
    actor: args.actor ?? null,
  });
};

const base = z.object({ orgId: z.string().uuid(), idempotencyKey: z.string().min(6).max(80) });

const fileSchema = z.object({
  name: z.string().max(200),
  mime: z.string().max(120).default(""),
  base64: z.string().max(20_000_000),
});

/* ------------------------------- Offre d'emploi -------------------------------- */

/** Mariéme analyse une offre collée ou importée depuis un lien. */
export const analyzeJobOffer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    base
      .extend({
        mode: z.enum(["texte", "lien"]),
        content: z.string().max(30000).default(""),
        url: z.string().max(600).default(""),
        offerId: z.string().uuid().nullable().default(null),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    await assertMember(supabase, data.orgId, userId);
    const { analyzeJobOfferAI, fetchOfferFromUrl } = await import("./hr.server");

    const tx = await reserveCredits(supabase, {
      orgId: data.orgId,
      actionKey: "hr.job_analysis",
      idempotencyKey: data.idempotencyKey,
    });
    try {
      const text = data.mode === "lien" ? await fetchOfferFromUrl(data.url) : data.content;
      if (text.trim().length < 60) throw new Error("L'offre est trop courte pour être analysée.");
      const analysis = await analyzeJobOfferAI(supabase, data.orgId, text);

      const payload = {
        org_id: data.orgId,
        title: analysis.intitule || "Offre d'emploi",
        description: analysis.synthese,
        content: text.slice(0, 30000),
        source_url: data.mode === "lien" ? data.url : null,
        location: analysis.localisation,
        contract: analysis.contrat,
        analysis,
        status: "ouverte",
        created_by: userId,
      };

      const q = data.offerId
        ? supabase.from("job_offers").update(payload).eq("id", data.offerId).eq("org_id", data.orgId)
        : supabase.from("job_offers").insert(payload);
      const { data: row, error } = await q.select("*").single();
      if (error) throw new Error(error.message);

      await completeCredits(supabase, tx, "Analyse d'une offre d'emploi");
      await journal(supabase, {
        orgId: data.orgId,
        action: "offre_analysee",
        detail: row.title,
        actor: userId,
      });
      return { offer: row, analysis };
    } catch (e) {
      const message = e instanceof Error ? e.message : "Échec de l'analyse de l'offre";
      await refundCredits(supabase, tx, message);
      throw new Error(message);
    }
  });

/* ---------------------------------- Candidat ----------------------------------- */

/** Mariéme importe un CV (PDF/DOCX) et une lettre, puis extrait les informations. */
export const importCandidate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    base
      .extend({
        offerId: z.string().uuid().nullable().default(null),
        cv: fileSchema,
        letter: fileSchema.nullable().default(null),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    await assertMember(supabase, data.orgId, userId);
    const { extractCandidateAI, fileText, storeFile } = await import("./hr.server");

    const tx = await reserveCredits(supabase, {
      orgId: data.orgId,
      actionKey: "hr.cv_analysis",
      idempotencyKey: data.idempotencyKey,
    });
    try {
      const extraction = await extractCandidateAI(data.cv as any, (data.letter as any) ?? null);
      const cvPath = await storeFile(data.orgId, "cv", data.cv as any);
      const letterPath = data.letter ? await storeFile(data.orgId, "lettres", data.letter as any) : null;

      const retention = new Date();
      retention.setMonth(retention.getMonth() + RETENTION_MONTHS);

      const { data: row, error } = await supabase
        .from("candidates")
        .insert({
          org_id: data.orgId,
          job_offer_id: data.offerId,
          full_name: `${extraction.prenom} ${extraction.nom}`.trim() || data.cv.name,
          first_name: extraction.prenom,
          last_name: extraction.nom,
          email: extraction.email && extraction.email.includes("@") ? extraction.email : null,
          phone: extraction.telephone,
          location: extraction.localisation,
          status: "nouveau",
          stage: "candidature",
          cv_path: cvPath,
          cv_text: fileText(data.cv as any).slice(0, 20000),
          letter_path: letterPath,
          letter_text: data.letter ? fileText(data.letter as any).slice(0, 20000) : null,
          extraction,
          consent_at: new Date().toISOString(),
          retention_until: retention.toISOString().slice(0, 10),
          created_by: userId,
        })
        .select("*")
        .single();
      if (error) throw new Error(error.message);

      await completeCredits(supabase, tx, "Analyse d'un CV");
      await journal(supabase, {
        orgId: data.orgId,
        candidateId: row.id,
        action: "cv_importe",
        detail: data.cv.name,
        actor: userId,
      });
      return { candidate: row, extraction };
    } catch (e) {
      const message = e instanceof Error ? e.message : "Échec de l'import du candidat";
      await refundCredits(supabase, tx, message);
      throw new Error(message);
    }
  });

/** Mariéme note un candidat par rapport à l'offre (score global + sous-scores). */
export const scoreCandidate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    base.extend({ candidateId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    await assertMember(supabase, data.orgId, userId);
    const { scoreCandidateAI } = await import("./hr.server");

    const { data: candidate } = await supabase
      .from("candidates")
      .select("*")
      .eq("id", data.candidateId)
      .eq("org_id", data.orgId)
      .maybeSingle();
    if (!candidate) throw new Error("Candidat introuvable.");

    let offer: any = null;
    if (candidate.job_offer_id) {
      const { data: o } = await supabase
        .from("job_offers")
        .select("title,analysis")
        .eq("id", candidate.job_offer_id)
        .maybeSingle();
      offer = o;
    }

    const tx = await reserveCredits(supabase, {
      orgId: data.orgId,
      actionKey: "hr.candidate_score",
      idempotencyKey: data.idempotencyKey,
    });
    try {
      const scoring = await scoreCandidateAI({
        offer: offer?.analysis ?? { intitule: candidate.position ?? "Poste non précisé" },
        extraction: candidate.extraction,
        letterText: candidate.letter_text ?? "",
      });
      const { data: row, error } = await supabase
        .from("candidates")
        .update({ scoring, score: scoring.score, stage: candidate.stage === "candidature" ? "selection" : candidate.stage })
        .eq("id", data.candidateId)
        .eq("org_id", data.orgId)
        .select("*")
        .single();
      if (error) throw new Error(error.message);

      await completeCredits(supabase, tx, "Scoring d'un candidat");
      await journal(supabase, {
        orgId: data.orgId,
        candidateId: data.candidateId,
        action: "candidat_score",
        detail: `Score ${scoring.score}/100`,
        actor: userId,
      });
      return { candidate: row, scoring };
    } catch (e) {
      const message = e instanceof Error ? e.message : "Échec du scoring";
      await refundCredits(supabase, tx, message);
      throw new Error(message);
    }
  });

/** Édition libre d'un candidat : étape du pipeline, statut, notes (gratuit). */
export const updateCandidate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        orgId: z.string().uuid(),
        candidateId: z.string().uuid(),
        stage: z.string().max(30).optional(),
        status: z.string().max(30).optional(),
        notes: z.string().max(4000).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    await assertMember(supabase, data.orgId, userId);
    const patch: Record<string, unknown> = {};
    if (data.stage !== undefined) patch["stage"] = data.stage;
    if (data.status !== undefined) patch["status"] = data.status;
    if (data.notes !== undefined) patch["notes"] = data.notes;

    const { error } = await supabase
      .from("candidates")
      .update(patch)
      .eq("id", data.candidateId)
      .eq("org_id", data.orgId);
    if (error) throw new Error(error.message);
    await journal(supabase, {
      orgId: data.orgId,
      candidateId: data.candidateId,
      action: "candidat_modifie",
      detail: JSON.stringify(patch).slice(0, 300),
      actor: userId,
    });
    return { ok: true };
  });

/* --------------------------------- Entretiens ---------------------------------- */

/** Propose 3 créneaux au candidat et génère son lien sécurisé (sans compte). */
export const proposeInterview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        orgId: z.string().uuid(),
        candidateId: z.string().uuid(),
        round: z.number().int().min(1).max(3).default(1),
        slots: z.array(z.string().min(10).max(40)).min(1).max(3),
        message: z.string().max(1500).default(""),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    await assertMember(supabase, data.orgId, userId);

    const { data: interview, error } = await supabase
      .from("hr_interviews")
      .insert({
        org_id: data.orgId,
        candidate_id: data.candidateId,
        round: data.round,
        status: "propose",
        created_by: userId,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);

    const token = `${crypto.randomUUID()}${crypto.randomUUID()}`.replace(/-/g, "").slice(0, 40);
    const { data: invite, error: e2 } = await supabase
      .from("hr_interview_invites")
      .insert({
        org_id: data.orgId,
        candidate_id: data.candidateId,
        interview_id: interview.id,
        token,
        slots: data.slots,
        message: data.message,
        status: "envoye",
      })
      .select("*")
      .single();
    if (e2) throw new Error(e2.message);

    await journal(supabase, {
      orgId: data.orgId,
      candidateId: data.candidateId,
      action: "entretien_propose",
      detail: `${data.slots.length} créneaux — entretien ${data.round}`,
      actor: userId,
    });
    return { interview, invite };
  });

/** Enregistre la note et le commentaire d'un entretien (gratuit). */
export const updateInterview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        orgId: z.string().uuid(),
        interviewId: z.string().uuid(),
        status: z.string().max(20).optional(),
        rating: z.number().int().min(0).max(10).nullable().optional(),
        comment: z.string().max(4000).optional(),
        scheduledAt: z.string().max(40).nullable().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    await assertMember(supabase, data.orgId, userId);
    const patch: Record<string, unknown> = {};
    if (data.status !== undefined) patch["status"] = data.status;
    if (data.rating !== undefined) patch["rating"] = data.rating;
    if (data.comment !== undefined) patch["comment"] = data.comment;
    if (data.scheduledAt !== undefined) patch["scheduled_at"] = data.scheduledAt;

    const { error } = await supabase
      .from("hr_interviews")
      .update(patch)
      .eq("id", data.interviewId)
      .eq("org_id", data.orgId);
    if (error) throw new Error(error.message);
    await journal(supabase, { orgId: data.orgId, action: "entretien_modifie", actor: userId });
    return { ok: true };
  });

/** Mariéme transcrit et analyse l'enregistrement audio d'un entretien. */
export const analyzeInterviewAudio = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    base
      .extend({
        interviewId: z.string().uuid(),
        audio: fileSchema,
        notes: z.string().max(2000).default(""),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    await assertMember(supabase, data.orgId, userId);
    const { analyzeInterviewAudioAI, storeFile } = await import("./hr.server");

    const { data: interview } = await supabase
      .from("hr_interviews")
      .select("*, candidates:candidate_id(full_name,extraction,job_offer_id)")
      .eq("id", data.interviewId)
      .eq("org_id", data.orgId)
      .maybeSingle();
    if (!interview) throw new Error("Entretien introuvable.");

    let offer: any = null;
    if (interview.candidates?.job_offer_id) {
      const { data: o } = await supabase
        .from("job_offers")
        .select("analysis")
        .eq("id", interview.candidates.job_offer_id)
        .maybeSingle();
      offer = o?.analysis ?? null;
    }

    const tx = await reserveCredits(supabase, {
      orgId: data.orgId,
      actionKey: "hr.interview_audio",
      idempotencyKey: data.idempotencyKey,
    });
    try {
      const analysis = await analyzeInterviewAudioAI({
        audio: data.audio as any,
        offer: offer ?? {},
        candidate: interview.candidates?.extraction ?? {},
        notes: data.notes,
      });
      const audioPath = await storeFile(data.orgId, "entretiens", data.audio as any);

      const { data: row, error } = await supabase
        .from("hr_interviews")
        .update({ analysis, audio_path: audioPath, status: "realise" })
        .eq("id", data.interviewId)
        .eq("org_id", data.orgId)
        .select("*")
        .single();
      if (error) throw new Error(error.message);

      await completeCredits(supabase, tx, "Analyse d'un entretien audio");
      await journal(supabase, {
        orgId: data.orgId,
        candidateId: interview.candidate_id,
        action: "entretien_analyse",
        detail: `Score ${analysis.score}/100`,
        actor: userId,
      });
      return { interview: row, analysis };
    } catch (e) {
      const message = e instanceof Error ? e.message : "Échec de l'analyse de l'entretien";
      await refundCredits(supabase, tx, message);
      throw new Error(message);
    }
  });

/* ------------------------------------ RGPD ------------------------------------- */

/** Lien de téléchargement temporaire d'un fichier RH (CV, lettre, audio). */
export const getHrFileUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ orgId: z.string().uuid(), path: z.string().max(400) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    await assertMember(supabase, data.orgId, userId);
    if (!data.path.startsWith(`${data.orgId}/`)) throw new Error("Fichier hors de votre espace.");
    const { signedUrl } = await import("./hr.server");
    await journal(supabase, { orgId: data.orgId, action: "fichier_consulte", detail: data.path, actor: userId });
    return { url: await signedUrl(data.path) };
  });

/** Export RGPD complet des données d'un candidat. */
export const exportCandidate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ orgId: z.string().uuid(), candidateId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    await assertMember(supabase, data.orgId, userId);
    const [{ data: candidate }, { data: interviews }, { data: invites }, { data: logs }] = await Promise.all([
      supabase.from("candidates").select("*").eq("id", data.candidateId).eq("org_id", data.orgId).maybeSingle(),
      supabase.from("hr_interviews").select("*").eq("candidate_id", data.candidateId),
      supabase.from("hr_interview_invites").select("*").eq("candidate_id", data.candidateId),
      supabase.from("hr_audit_log").select("*").eq("candidate_id", data.candidateId),
    ]);
    if (!candidate) throw new Error("Candidat introuvable.");
    await journal(supabase, {
      orgId: data.orgId,
      candidateId: data.candidateId,
      action: "export_rgpd",
      actor: userId,
    });
    return {
      candidat: candidate,
      entretiens: interviews ?? [],
      invitations: invites ?? [],
      journal: logs ?? [],
      exporte_le: new Date().toISOString(),
    };
  });

/** Suppression RGPD : CV seul, audios seuls, ou dossier complet. */
export const deleteCandidateData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        orgId: z.string().uuid(),
        candidateId: z.string().uuid(),
        scope: z.enum(["cv", "audio", "tout"]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    await assertMember(supabase, data.orgId, userId);
    const { removeFiles } = await import("./hr.server");

    const { data: candidate } = await supabase
      .from("candidates")
      .select("id,cv_path,letter_path")
      .eq("id", data.candidateId)
      .eq("org_id", data.orgId)
      .maybeSingle();
    if (!candidate) throw new Error("Candidat introuvable.");

    const { data: interviews } = await supabase
      .from("hr_interviews")
      .select("id,audio_path")
      .eq("candidate_id", data.candidateId);
    const audios = (interviews ?? []).map((i: any) => i.audio_path).filter(Boolean);
    const docs = [candidate.cv_path, candidate.letter_path].filter(Boolean) as string[];

    if (data.scope === "cv" || data.scope === "tout") {
      await removeFiles(docs);
      await supabase
        .from("candidates")
        .update({ cv_path: null, cv_text: null, letter_path: null, letter_text: null })
        .eq("id", data.candidateId)
        .eq("org_id", data.orgId);
    }
    if (data.scope === "audio" || data.scope === "tout") {
      await removeFiles(audios);
      await supabase.from("hr_interviews").update({ audio_path: null }).eq("candidate_id", data.candidateId);
    }
    if (data.scope === "tout") {
      await supabase.from("candidates").delete().eq("id", data.candidateId).eq("org_id", data.orgId);
    }

    await journal(supabase, {
      orgId: data.orgId,
      candidateId: data.scope === "tout" ? null : data.candidateId,
      action: `suppression_${data.scope}`,
      detail: data.scope === "tout" ? `Dossier supprimé (${data.candidateId})` : "",
      actor: userId,
    });
    return { ok: true };
  });

/* ------------------------- Espace candidat (lien sécurisé) ---------------------- */

/** Le candidat consulte ses créneaux via un lien secret, sans créer de compte. */
export const getInterviewInvite = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ token: z.string().min(16).max(80) }).parse(input))
  .handler(async ({ data }) => {
    const { loadInvite } = await import("./hr.public.server");
    return loadInvite(data.token);
  });

/** Le candidat choisit un créneau, propose une autre date ou se retire. */
export const respondInterviewInvite = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        token: z.string().min(16).max(80),
        action: z.enum(["choisir", "autre", "refus"]),
        slot: z.string().max(40).default(""),
        proposal: z.string().max(600).default(""),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { respondInvite } = await import("./hr.public.server");
    return respondInvite(data);
  });
