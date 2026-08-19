import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { loadCompanyMemory, runEric } from "./eric.server";

export const askEric = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ prompt: z.string().min(3).max(2000), orgId: z.string().uuid() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const supabase = context.supabase;

    const { data: membership } = await supabase
      .from("memberships")
      .select("id")
      .eq("org_id", data.orgId)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (!membership) throw new Error("Accès refusé à cette organisation.");

    const memory = await loadCompanyMemory(supabase, data.orgId);
    const plan = await runEric(data.prompt, memory);

    const { data: agentRows } = await supabase
      .from("agents")
      .select("id,key,name,role_title")
      .eq("org_id", data.orgId);
    const byKey = new Map((agentRows ?? []).map((a) => [a.key, a]));

    const inserted = plan.taches
      .map((t) => ({ task: t, agent: byKey.get(t.agent_key) }))
      .filter((x) => x.agent);

    let ids: string[] = [];
    if (inserted.length) {
      const { data: rows, error } = await supabase
        .from("agent_tasks")
        .insert(
          inserted.map(({ task, agent }) => ({
            org_id: data.orgId,
            agent_id: agent!.id,
            title: task.title,
            detail: task.detail,
            status: "todo",
            priority: task.priority,
            credits_used: 1,
            created_by: context.userId,
          })),
        )
        .select("id");
      if (error) throw new Error(error.message);
      ids = (rows ?? []).map((r: { id: string }) => r.id);
    }

    const lead = byKey.get("directeur");
    const { error: convError } = await supabase.from("conversations").insert({
      org_id: data.orgId,
      agent_id: lead?.id ?? null,
      title: data.prompt.slice(0, 80),
      created_by: context.userId,
      messages: [
        { role: "user", content: data.prompt },
        { role: "assistant", content: plan.reponse, plan },
      ],
    });
    if (convError) throw new Error(convError.message);

    return {
      ...plan,
      taches: inserted.map(({ task, agent }) => ({
        ...task,
        agent_name: agent!.name as string,
        agent_role: agent!.role_title as string,
      })),
    };
  });
