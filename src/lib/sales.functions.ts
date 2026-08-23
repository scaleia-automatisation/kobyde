import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { analyzeMeetingAI, followupEmailsAI, transcribeMeetingAudioAI } from "./sales.server";
import { completeCredits, refundCredits, reserveCredits } from "./credits.server";

const assertMember = async (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  orgId: string,
  userId: string,
) => {
  const { data } = await supabase
    .from("memberships")
    .select("id")
    .eq("org_id", orgId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!data) throw new Error("Accès refusé à cette organisation.");
};

/** Chemin B : réunion / transcription → analyse IA → besoins comparés au catalogue. */
export const analyzeMeeting = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        orgId: z.string().uuid(),
        idempotencyKey: z.string().min(8).max(64),
        title: z.string().trim().min(1).max(160),
        source: z.string().max(60).default("Texte libre"),
        transcript: z.string().trim().min(20).max(40000),
        clientId: z.string().uuid().nullable().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const supabase = context.supabase;
    await assertMember(supabase, data.orgId, context.userId);

    const tx = await reserveCredits(supabase, {
      orgId: data.orgId,
      actionKey: "quote.from_meeting",
      idempotencyKey: data.idempotencyKey,
    });

    try {
      const analysis = await analyzeMeetingAI(supabase, data.orgId, {
        transcript: data.transcript,
        source: data.source,
        title: data.title,
      });

      const { data: meeting, error } = await supabase
        .from("meetings")
        .insert({
          org_id: data.orgId,
          title: data.title,
          client_id: data.clientId ?? null,
          starts_at: new Date().toISOString(),
          duration_min: 60,
          source: data.source,
          transcript: data.transcript.slice(0, 40000),
          summary: analysis.resume,
          report: analysis.compte_rendu,
          analysis: analysis.besoins,
        })
        .select("id")
        .single();
      if (error) throw new Error(error.message);

      await completeCredits(supabase, tx, analysis.resume);
      return { meetingId: meeting.id as string, ...analysis };
    } catch (e) {
      const message = e instanceof Error ? e.message : "Échec de l'analyse de la réunion";
      await refundCredits(supabase, tx, message);
      throw new Error(message);
    }
  });

/** Relances automatiques J+3, J+7 et avant expiration, modifiables avant envoi. */
export const generateFollowups = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        orgId: z.string().uuid(),
        quoteId: z.string().uuid(),
        idempotencyKey: z.string().min(8).max(64),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const supabase = context.supabase;
    await assertMember(supabase, data.orgId, context.userId);

    const { data: quote, error: qErr } = await supabase
      .from("quotes")
      .select("id,number,title,total_ttc,valid_until,client_id,clients:client_id(full_name,company_name)")
      .eq("id", data.quoteId)
      .eq("org_id", data.orgId)
      .maybeSingle();
    if (qErr) throw new Error(qErr.message);
    if (!quote) throw new Error("Devis introuvable.");

    const tx = await reserveCredits(supabase, {
      orgId: data.orgId,
      actionKey: "quote.followup",
      idempotencyKey: data.idempotencyKey,
    });

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const c = quote.clients as any;
      const emails = await followupEmailsAI(supabase, data.orgId, {
        number: quote.number,
        title: quote.title,
        total_ttc: Number(quote.total_ttc ?? 0),
        client: c?.company_name || c?.full_name || "votre client",
        valid_until: quote.valid_until,
      });

      const now = Date.now();
      const rows = emails.map((e) => ({
        org_id: data.orgId,
        quote_id: data.quoteId,
        kind: e.kind,
        subject: e.subject,
        body: e.body,
        status: "planifiee",
        scheduled_at: new Date(
          e.kind === "j3" ? now + 3 * 864e5 : e.kind === "j7" ? now + 7 * 864e5 : now + 25 * 864e5,
        ).toISOString(),
      }));

      await supabase.from("quote_followups").delete().eq("quote_id", data.quoteId).eq("status", "planifiee");
      const { error } = await supabase.from("quote_followups").insert(rows);
      if (error) throw new Error(error.message);

      await completeCredits(supabase, tx, `3 relances préparées pour ${quote.number}`);
      return { ok: true, count: rows.length };
    } catch (e) {
      const message = e instanceof Error ? e.message : "Échec de la préparation des relances";
      await refundCredits(supabase, tx, message);
      throw new Error(message);
    }
  });

/** Chemin A : enregistrement audio → transcription → analyse → devis. */
export const analyzeMeetingAudio = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        orgId: z.string().uuid(),
        idempotencyKey: z.string().min(8).max(64),
        title: z.string().trim().min(1).max(160),
        clientId: z.string().uuid().nullable().optional(),
        audio: z.object({
          name: z.string().max(200),
          mime: z.string().max(120).default(""),
          base64: z.string().max(20_000_000),
        }),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const supabase = context.supabase;
    await assertMember(supabase, data.orgId, context.userId);

    const tx = await reserveCredits(supabase, {
      orgId: data.orgId,
      actionKey: "meeting.audio_analysis",
      idempotencyKey: data.idempotencyKey,
    });

    try {
      const transcript = await transcribeMeetingAudioAI(data.audio);
      const analysis = await analyzeMeetingAI(supabase, data.orgId, {
        transcript,
        source: "Audio",
        title: data.title,
      });

      const { data: meeting, error } = await supabase
        .from("meetings")
        .insert({
          org_id: data.orgId,
          title: data.title,
          client_id: data.clientId ?? null,
          starts_at: new Date().toISOString(),
          duration_min: 60,
          source: "Audio",
          transcript,
          summary: analysis.resume,
          report: analysis.compte_rendu,
          analysis: analysis.besoins,
        })
        .select("id")
        .single();
      if (error) throw new Error(error.message);

      await completeCredits(supabase, tx, analysis.resume);
      return { meetingId: meeting.id as string, transcript, ...analysis };
    } catch (e) {
      const message = e instanceof Error ? e.message : "Échec de l'analyse de l'audio";
      await refundCredits(supabase, tx, message);
      throw new Error(message);
    }
  });
