import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/* eslint-disable @typescript-eslint/no-explicit-any */

/** Entreprise courante de l'utilisateur + droit de gérer les identifiants. */
async function orgContext(supabase: any, userId: string, requireManage = false) {
  const { data: profile } = await supabase
    .from("profiles")
    .select("current_org_id")
    .eq("user_id", userId)
    .maybeSingle();
  const orgId = profile?.current_org_id as string | undefined;
  if (!orgId) throw new Error("Aucune entreprise associée à votre compte.");
  const { data: membership } = await supabase
    .from("memberships")
    .select("role")
    .eq("org_id", orgId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!membership) throw new Error("Accès refusé à cette entreprise.");
  const canManage = membership.role === "owner" || membership.role === "admin";
  if (requireManage && !canManage) {
    throw new Error("Seul le propriétaire ou un administrateur peut modifier les identifiants de connexion.");
  }
  return { orgId, canManage };
}

export const listMyOrgConnectors = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d?: { origin?: string }) => z.object({ origin: z.string().max(200).optional() }).parse(d ?? {}))
  .handler(async ({ data, context }) => {
    const { orgId, canManage } = await orgContext(context.supabase, context.userId);
    const { listOrgConnectors } = await import("./org-connectors.server");
    return { canManage, items: await listOrgConnectors(orgId, data.origin) };
  });

export const saveMyOrgConnector = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { provider: string; values: Record<string, string> }) =>
    z
      .object({
        provider: z.string().min(1).max(64),
        values: z.record(z.string(), z.string().max(4000)),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { orgId } = await orgContext(context.supabase, context.userId, true);
    const { saveOrgConnector } = await import("./org-connectors.server");
    return saveOrgConnector({ orgId, userId: context.userId, provider: data.provider, values: data.values });
  });

export const testMyOrgConnector = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { provider: string; origin?: string }) =>
    z.object({ provider: z.string().min(1).max(64), origin: z.string().max(200).optional() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { orgId } = await orgContext(context.supabase, context.userId);
    const { testOrgConnector } = await import("./org-connectors.server");
    return testOrgConnector({
      orgId,
      userId: context.userId,
      provider: data.provider,
      ...(data.origin ? { origin: data.origin } : {}),
    });
  });

export const deleteMyOrgConnector = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { provider: string }) => z.object({ provider: z.string().min(1).max(64) }).parse(d))
  .handler(async ({ data, context }) => {
    const { orgId } = await orgContext(context.supabase, context.userId, true);
    const { deleteOrgConnector } = await import("./org-connectors.server");
    return deleteOrgConnector(orgId, data.provider);
  });

/** Démarre l'autorisation OAuth avec les identifiants de l'entreprise. */
export const connectMyOrgConnector = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { provider: string; origin?: string }) =>
    z.object({ provider: z.string().min(1).max(64), origin: z.string().max(200).optional() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { orgId } = await orgContext(context.supabase, context.userId);
    const { ORG_CONNECTOR_MAP } = await import("./org-connectors.catalog");
    const def = ORG_CONNECTOR_MAP.get(data.provider);
    if (!def?.oauthKey) return { url: null, error: "Cette plateforme ne nécessite pas d'autorisation OAuth." };
    const { buildAuthorizeUrl } = await import("./connectors.server");
    try {
      const res = await buildAuthorizeUrl({
        connectorKey: def.oauthKey,
        userId: context.userId,
        orgId,
        ...(data.origin ? { origin: data.origin } : {}),
      });
      return { url: res.url as string | null, error: null as string | null };
    } catch (e) {
      return { url: null, error: e instanceof Error ? e.message : "Autorisation impossible." };
    }
  });
