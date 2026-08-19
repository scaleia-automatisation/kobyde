import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/* eslint-disable @typescript-eslint/no-explicit-any */

const assertPlatformAdmin = async (supabase: any) => {
  const { data, error } = await supabase.rpc("is_platform_admin");
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Accès réservé aux administrateurs de la plateforme.");
};

export const amIPlatformAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await (context.supabase as any).rpc("is_platform_admin");
    return { isAdmin: Boolean(data) };
  });

export const getPlatformOverview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertPlatformAdmin(context.supabase);
    const { platformOverview } = await import("./admin.server");
    return platformOverview();
  });

export const listPlatformAccounts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { query?: string }) => z.object({ query: z.string().max(120).optional() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertPlatformAdmin(context.supabase);
    const { searchPlatformUsers } = await import("./admin.server");
    return searchPlatformUsers(data.query ?? "");
  });

export const suspendPlatformUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { userId: string; suspended: boolean; reason?: string }) =>
    z
      .object({ userId: z.string().uuid(), suspended: z.boolean(), reason: z.string().max(300).optional() })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertPlatformAdmin(context.supabase);
    const { setUserSuspended } = await import("./admin.server");
    return setUserSuspended(data.userId, data.suspended, data.reason);
  });

export const changePlatformUserPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { userId: string; plan: string }) =>
    z.object({ userId: z.string().uuid(), plan: z.enum(["gratuit", "starter", "business", "pro"]) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertPlatformAdmin(context.supabase);
    const { setUserPlan } = await import("./admin.server");
    return setUserPlan(data.userId, data.plan);
  });
