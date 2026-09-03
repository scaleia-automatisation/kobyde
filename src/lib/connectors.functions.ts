import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/* eslint-disable @typescript-eslint/no-explicit-any */

const assertPlatformAdmin = async (supabase: any) => {
  const { data, error } = await supabase.rpc("is_platform_admin");
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Accès réservé aux administrateurs de la plateforme.");
};

/* ---------------------------------------------------------- Super Admin */

export const adminListConnectors = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertPlatformAdmin(context.supabase);
    const { listConnectors } = await import("./connectors.server");
    return listConnectors();
  });

export const adminSaveConnector = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { key: string; values: Record<string, string>; services?: string[]; isEnabled?: boolean }) =>
    z
      .object({
        key: z.string().min(1).max(64),
        values: z.record(z.string(), z.string()),
        services: z.array(z.string()).optional(),
        isEnabled: z.boolean().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertPlatformAdmin(context.supabase);
    const { saveConnector } = await import("./connectors.server");
    return saveConnector(data as any);
  });

export const adminToggleConnector = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { key: string; enabled: boolean }) =>
    z.object({ key: z.string().min(1), enabled: z.boolean() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertPlatformAdmin(context.supabase);
    const { toggleConnector } = await import("./connectors.server");
    return toggleConnector(data.key, data.enabled);
  });

export const adminTestConnector = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { key: string }) => z.object({ key: z.string().min(1) }).parse(d))
  .handler(async ({ data, context }) => {
    await assertPlatformAdmin(context.supabase);
    const { testConnector } = await import("./connectors.server");
    return testConnector(data.key);
  });

export const adminCreateCustomConnector = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: { key: string; name: string; description?: string; baseUrl?: string; authType: string; category?: string }) =>
      z
        .object({
          key: z
            .string()
            .min(2)
            .max(40)
            .regex(/^[a-z0-9_]+$/, "Utilisez uniquement des lettres minuscules, chiffres et _"),
          name: z.string().min(2).max(80),
          description: z.string().max(300).optional(),
          baseUrl: z.string().max(300).optional(),
          authType: z.enum(["api_key", "oauth", "custom"]),
          category: z.string().max(40).optional(),
        })
        .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertPlatformAdmin(context.supabase);
    const { createCustomConnector } = await import("./connectors.server");
    return createCustomConnector(data as any);
  });

export const adminDeleteConnector = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { key: string }) => z.object({ key: z.string().min(1) }).parse(d))
  .handler(async ({ data, context }) => {
    await assertPlatformAdmin(context.supabase);
    const { deleteConnector } = await import("./connectors.server");
    return deleteConnector(data.key);
  });

/* ------------------------------------------------------- Coûts & tarifs */

export const adminCostOverview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertPlatformAdmin(context.supabase);
    const { costOverview } = await import("./usage.server");
    return costOverview();
  });

export const adminListPricing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertPlatformAdmin(context.supabase);
    const { listPricing } = await import("./usage.server");
    return listPricing();
  });

export const adminUpsertPricing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: {
      id?: string;
      connectorKey: string;
      model?: string;
      unit: string;
      unitPrice: number;
      currency?: string;
      effectiveFrom?: string;
      isActive?: boolean;
    }) =>
      z
        .object({
          id: z.string().uuid().optional(),
          connectorKey: z.string().min(1),
          model: z.string().max(80).optional(),
          unit: z.string().min(1).max(40),
          unitPrice: z.number().min(0),
          currency: z.string().max(5).optional(),
          effectiveFrom: z.string().optional(),
          isActive: z.boolean().optional(),
        })
        .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertPlatformAdmin(context.supabase);
    const { upsertPricing } = await import("./usage.server");
    return upsertPricing(data as any);
  });

export const adminDeletePricing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertPlatformAdmin(context.supabase);
    const { deletePricing } = await import("./usage.server");
    return deletePricing(data.id);
  });

export const adminListLogs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { connectorKey?: string; agentKey?: string; status?: string; orgId?: string }) =>
    z
      .object({
        connectorKey: z.string().optional(),
        agentKey: z.string().optional(),
        status: z.string().optional(),
        orgId: z.string().uuid().optional(),
      })
      .parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    await assertPlatformAdmin(context.supabase);
    const { listUsageLogs } = await import("./usage.server");
    return listUsageLogs(data as any);
  });

export const adminListBudgets = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertPlatformAdmin(context.supabase);
    const { listBudgets } = await import("./usage.server");
    return listBudgets();
  });

export const adminUpsertBudget = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: {
      id?: string;
      scope: string;
      scopeRef?: string;
      connectorKey?: string;
      period: string;
      amountEur: number;
      actionOnLimit: string;
    }) =>
      z
        .object({
          id: z.string().uuid().optional(),
          scope: z.enum(["global", "connector", "agent", "org", "user"]),
          scopeRef: z.string().max(80).optional(),
          connectorKey: z.string().max(64).optional(),
          period: z.enum(["daily", "monthly"]),
          amountEur: z.number().min(0),
          actionOnLimit: z.enum(["continue", "notify", "validate", "throttle", "disable"]),
        })
        .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertPlatformAdmin(context.supabase);
    const { upsertBudget } = await import("./usage.server");
    return upsertBudget(data as any);
  });

export const adminDeleteBudget = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertPlatformAdmin(context.supabase);
    const { deleteBudget } = await import("./usage.server");
    return deleteBudget(data.id);
  });

/* ------------------------------------------------- Connexions utilisateur */

export const myConnections = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { listUserConnections } = await import("./connectors.server");
    return listUserConnections(context.userId);
  });

export const startConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { connectorKey: string; origin?: string; scopes?: string[] }) =>
    z
      .object({
        connectorKey: z.string().min(1).max(64),
        origin: z.string().max(200).optional(),
        scopes: z.array(z.string().max(200)).max(50).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: profile } = await (context.supabase as any)
      .from("profiles")
      .select("current_org_id")
      .eq("user_id", context.userId)
      .maybeSingle();
    const { buildAuthorizeUrl } = await import("./connectors.server");
    try {
      const res = await buildAuthorizeUrl({
        connectorKey: data.connectorKey,
        userId: context.userId,
        orgId: profile?.current_org_id ?? null,
        userEmail: (context as any).claims?.email ?? null,
        ...(data.origin ? { origin: data.origin } : {}),
        ...(data.scopes ? { scopes: data.scopes } : {}),
      });
      return { url: res.url as string | null, error: null as string | null };
    } catch (e) {
      // Pas d'OAuth disponible (connecteur non activé, incomplet…) : l'UI bascule sur la saisie manuelle.
      return { url: null, error: e instanceof Error ? e.message : "Connexion OAuth indisponible." };
    }
  });

export const validatePlatformScopes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { connectorKey: string; scopes: string[] }) =>
    z
      .object({ connectorKey: z.string().min(1).max(64), scopes: z.array(z.string().max(200)).max(50) })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { validatePlatformConnector } = await import("./connectors.server");
    return validatePlatformConnector(context.userId, data.connectorKey, data.scopes);
  });

export const disconnectConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { connectorKey: string }) => z.object({ connectorKey: z.string().min(1).max(64) }).parse(d))
  .handler(async ({ data, context }) => {
    const { disconnectUserConnection } = await import("./connectors.server");
    return disconnectUserConnection(context.userId, data.connectorKey);
  });

export const toggleMyConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { connectorKey: string; active: boolean }) =>
    z.object({ connectorKey: z.string().min(1).max(64), active: z.boolean() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { setUserConnectionActive } = await import("./connectors.server");
    return setUserConnectionActive(context.userId, data.connectorKey, data.active);
  });

export const adminConnectorLogs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { provider?: string; userId?: string; orgId?: string; agentKey?: string; status?: string; since?: string }) =>
    z
      .object({
        provider: z.string().max(64).optional(),
        userId: z.string().uuid().optional(),
        orgId: z.string().uuid().optional(),
        agentKey: z.string().max(64).optional(),
        status: z.string().max(32).optional(),
        since: z.string().max(40).optional(),
      })
      .parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    await assertPlatformAdmin(context.supabase);
    const { listConnectorLogs } = await import("./connectors.server");
    return listConnectorLogs(data as any);
  });

export const adminConnectorStats = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertPlatformAdmin(context.supabase);
    const { connectorStats } = await import("./connectors.server");
    return connectorStats();
  });

/** Teste un appel API réel avec les identifiants OAuth de l'utilisateur. */
export const testMyConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { connectorKey: string }) => z.object({ connectorKey: z.string().min(1).max(64) }).parse(d))
  .handler(async ({ data, context }) => {
    const { testUserConnection } = await import("./connectors.server");
    return testUserConnection(context.userId, data.connectorKey);
  });

/* ------------------------------------------- WhatsApp Embedded Signup */

/** Expose l'App ID Meta et le Configuration ID (non secrets) pour initialiser le SDK Facebook. */
export const whatsappEmbeddedConfig = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { getConnectorConfig } = await import("./connectors.server");
    const conf = await getConnectorConfig("whatsapp");
    const read = (key: string) =>
      (conf?.secrets as Record<string, string> | null)?.[key] ??
      (conf?.config as Record<string, string> | null)?.[key] ??
      null;
    return { appId: read("app_id"), configId: read("config_id"), enabled: Boolean(conf?.isEnabled) };
  });

/** Enregistre l'autorisation renvoyée par FB.login (code ou jeton Embedded Signup). */
export const completeWhatsappSignup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { code?: string; accessToken?: string }) =>
    z
      .object({
        code: z.string().min(1).max(4096).optional(),
        accessToken: z.string().min(1).max(8192).optional(),
      })
      .refine((value) => Boolean(value.code || value.accessToken), "Autorisation Meta manquante.")
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: profile } = await (context.supabase as any)
      .from("profiles")
      .select("current_org_id")
      .eq("user_id", context.userId)
      .maybeSingle();
    const { completeWhatsAppEmbeddedSignup } = await import("./connectors.server");
    const authorization: { code?: string; accessToken?: string } = {};
    if (data.code) authorization.code = data.code;
    if (data.accessToken) authorization.accessToken = data.accessToken;
    return completeWhatsAppEmbeddedSignup(context.userId, profile?.current_org_id ?? null, authorization);
  });
