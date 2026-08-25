import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/* eslint-disable @typescript-eslint/no-explicit-any */

const assertMember = async (supabase: any, orgId: string, userId: string) => {
  const { data } = await supabase
    .from("memberships")
    .select("id")
    .eq("org_id", orgId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!data) throw new Error("Accès refusé à cette organisation.");
};

/** Vérifier avant de créer : renvoie les éléments similaires et l'action recommandée. */
export const checkDuplicates = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        orgId: z.string().uuid(),
        entity: z.string().min(2).max(40),
        candidate: z.record(z.string(), z.any()),
        recentDays: z.number().int().min(1).max(365).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const supabase = context.supabase as any;
    await assertMember(supabase, data.orgId, context.userId);
    const { checkExisting } = await import("./context-engine.server");
    const report = await checkExisting(supabase, data.orgId, data.entity, data.candidate, {
      ...(data.recentDays ? { recentDays: data.recentDays } : {}),
    });
    return report;
  });

/** Enregistre une action dans la mémoire commune des agents. */
export const logAgentAction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        orgId: z.string().uuid(),
        agentKey: z.string().max(40).nullable().optional(),
        actionType: z.string().min(2).max(60),
        entityType: z.string().min(2).max(40),
        entityId: z.string().uuid().nullable().optional(),
        entityLabel: z.string().max(200).nullable().optional(),
        status: z.string().max(40).optional(),
        result: z.string().max(4000).nullable().optional(),
        metadata: z.record(z.string(), z.any()).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const supabase = context.supabase as any;
    await assertMember(supabase, data.orgId, context.userId);
    const { recordAction } = await import("./context-engine.server");
    return recordAction(supabase, {
      orgId: data.orgId,
      userId: context.userId,
      agentKey: data.agentKey ?? null,
      actionType: data.actionType,
      entityType: data.entityType,
      entityId: data.entityId ?? null,
      entityLabel: data.entityLabel ?? null,
      ...(data.status ? { status: data.status } : {}),
      result: data.result ?? null,
      ...(data.metadata ? { metadata: data.metadata } : {}),
    });
  });

/** Historique complet d'un élément (tunnel prospect → client, suivi projet…). */
export const getEntityTimeline = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        orgId: z.string().uuid(),
        entityType: z.string().min(2).max(40),
        entityId: z.string().uuid(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const supabase = context.supabase as any;
    await assertMember(supabase, data.orgId, context.userId);
    const { entityTimeline } = await import("./context-engine.server");
    return { timeline: await entityTimeline(supabase, data.orgId, data.entityType, data.entityId) };
  });
