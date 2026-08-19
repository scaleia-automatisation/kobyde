import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { analyzeEmailAI, generateSequenceAI } from "./emails.server";
import { completeCredits, refundCredits, reserveCredits } from "./credits.server";
import type { SequenceStep } from "./emails";

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

/** Clara analyse un email entrant, le route vers le bon agent et prépare une réponse. */
export const analyzeEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { orgId: string; emailId: string; idempotencyKey: string }) =>
    z
      .object({ orgId: z.string().uuid(), emailId: z.string().uuid(), idempotencyKey: z.string().min(6) })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    await assertMember(supabase, data.orgId, userId);

    const { data: email, error } = await supabase
      .from("emails")
      .select("*")
      .eq("id", data.emailId)
      .eq("org_id", data.orgId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!email) throw new Error("Email introuvable.");

    const tx = await reserveCredits(supabase, {
      orgId: data.orgId,
      actionKey: "email.analyze",
      idempotencyKey: data.idempotencyKey,
    });

    try {
      const a = await analyzeEmailAI(supabase, data.orgId, email);
      const { error: upErr } = await supabase
        .from("emails")
        .update({
          category: a.categorie,
          agent_key: a.agent_key,
          priority: a.priorite,
          summary: a.resume,
          suggested_action: a.action,
          draft_subject: a.reponse_objet,
          draft_body: a.reponse_corps,
          status: "a_valider",
          analysis: a as any,
        })
        .eq("id", data.emailId);
      if (upErr) throw new Error(upErr.message);

      await completeCredits(supabase, tx, `Email analysé et routé (${a.categorie})`);
      return { ok: true, analysis: a };
    } catch (e) {
      const message = e instanceof Error ? e.message : "Échec de l'analyse de l'email";
      await refundCredits(supabase, tx, message);
      throw new Error(message);
    }
  });

const stepSchema = z.object({
  kind: z.enum(["initial", "relance", "finale"]),
  day: z.number().int().min(0).max(365),
  condition: z.string().min(1),
  subject: z.string().default(""),
  body: z.string().default(""),
});

/** Clara rédige tous les emails d'une séquence. */
export const writeSequence = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      orgId: string;
      sequenceId: string;
      idempotencyKey: string;
    }) =>
      z
        .object({
          orgId: z.string().uuid(),
          sequenceId: z.string().uuid(),
          idempotencyKey: z.string().min(6),
        })
        .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    await assertMember(supabase, data.orgId, userId);

    const { data: seq, error } = await supabase
      .from("email_sequences")
      .select("*")
      .eq("id", data.sequenceId)
      .eq("org_id", data.orgId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!seq) throw new Error("Séquence introuvable.");

    const steps = z.array(stepSchema).min(1).parse(seq.steps ?? []) as SequenceStep[];
    const actionKey = steps.length > 3 ? "email.sequence_full" : "email.sequence_simple";

    const tx = await reserveCredits(supabase, {
      orgId: data.orgId,
      actionKey,
      idempotencyKey: data.idempotencyKey,
    });

    try {
      const written = await generateSequenceAI(supabase, data.orgId, {
        name: seq.name,
        objective: seq.objective ?? "",
        audience: seq.audience ?? "",
        steps,
      });

      const { error: upErr } = await supabase
        .from("email_sequences")
        .update({ steps: written as any, status: "prete" })
        .eq("id", data.sequenceId);
      if (upErr) throw new Error(upErr.message);

      await completeCredits(supabase, tx, `Séquence « ${seq.name} » rédigée (${written.length} emails)`);
      return { ok: true, steps: written };
    } catch (e) {
      const message = e instanceof Error ? e.message : "Échec de la rédaction de la séquence";
      await refundCredits(supabase, tx, message);
      throw new Error(message);
    }
  });
