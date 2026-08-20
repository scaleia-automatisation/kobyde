import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { runAutomationEngine } from "./automations.server";

export const runAutomations = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ orgId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const supabase = context.supabase;

    const { data: membership } = await supabase
      .from("memberships")
      .select("id")
      .eq("org_id", data.orgId)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (!membership) throw new Error("Accès refusé à cette organisation.");

    const { data: rules } = await (supabase.from("automation_rules" as never) as never as {
      select: (c: string) => {
        eq: (a: string, b: string) => Promise<{ data: { rule_key: string; is_active: boolean }[] | null }>;
      };
    })
      .select("rule_key,is_active")
      .eq("org_id", data.orgId);

    const activeKeys = (rules ?? []).filter((r) => r.is_active).map((r) => r.rule_key);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return runAutomationEngine(supabase as any, data.orgId, activeKeys);
  });
