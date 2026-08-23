import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { loadCompanyMemory, runAgent, runEric } from "./eric.server";
import { completeCredits, refundCredits, reserveCredits } from "./credits.server";

export const askEric = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        prompt: z.string().min(3).max(2000),
        orgId: z.string().uuid(),
        idempotencyKey: z.string().min(8).max(64),
      })
      .parse(data),
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

    // Éric ne facture que l'analyse IA de la demande, jamais l'orchestration.
    const tx = await reserveCredits(supabase, {
      orgId: data.orgId,
      actionKey: "eric.analyze_request",
      idempotencyKey: data.idempotencyKey,
    });

    let plan;
    try {
      const memory = await loadCompanyMemory(supabase, data.orgId);
      plan = await runEric(data.prompt, memory);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Échec de l'analyse";
      await refundCredits(supabase, tx, message);
      throw new Error(message);
    }
    await completeCredits(supabase, tx, plan.reponse);


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
      credits_used: tx ? Math.abs(tx.amount) : 0,
      credits_left: tx ? tx.balance_after : null,
      taches: inserted.map(({ task, agent }, i) => ({
        ...task,
        id: ids[i] ?? null,
        agent_name: agent!.name as string,
        agent_role: agent!.role_title as string,
      })),
    };

  });

/** Parler directement à un agent, sans passer par Éric. */
export const askAgent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        orgId: z.string().uuid(),
        agentKey: z.string().min(2).max(40),
        prompt: z.string().min(3).max(2000),
        idempotencyKey: z.string().min(8).max(64),
        actionKey: z.string().min(2).max(60).optional(),
      })
      .parse(data),
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

    const { data: agent } = await supabase
      .from("agents")
      .select("id,key,name,role_title,credits_used")
      .eq("org_id", data.orgId)
      .eq("key", data.agentKey)
      .maybeSingle();
    if (!agent) throw new Error("Agent introuvable.");

    const { data: task, error: taskError } = await supabase
      .from("agent_tasks")
      .insert({
        org_id: data.orgId,
        agent_id: agent.id,
        title: data.prompt.slice(0, 120),
        detail: data.prompt,
        status: "in_progress",
        priority: "normale",
        credits_used: 0,
        created_by: context.userId,
      })
      .select("id")
      .single();
    if (taskError) throw new Error(taskError.message);

    const tx = await reserveCredits(supabase, {
      orgId: data.orgId,
      actionKey: data.actionKey ?? "eric.task_run",
      idempotencyKey: data.idempotencyKey,
      agentId: agent.id as string,
      taskId: task.id as string,
    });
    const cost = tx ? Math.abs(tx.amount) : 0;

    const memory = await loadCompanyMemory(supabase, data.orgId);

    try {
      const result = await runAgent(
        { key: agent.key as string, name: agent.name as string, role: agent.role_title as string },
        { title: data.prompt.slice(0, 120), detail: data.prompt },
        memory,
      );
      await supabase
        .from("agent_tasks")
        .update({ status: "done", result, credits_used: cost })
        .eq("id", task.id);
      await supabase
        .from("agents")
        .update({ credits_used: Number(agent.credits_used ?? 0) + cost })
        .eq("id", agent.id);
      await completeCredits(supabase, tx, result, task.id as string);
      return {
        taskId: task.id as string,
        agentName: agent.name as string,
        result,
        credits_used: cost,
        credits_left: tx ? tx.balance_after : null,
      };
    } catch (e) {
      const message = e instanceof Error ? e.message : "Échec de la tâche";
      await refundCredits(supabase, tx, message);
      await supabase.from("agent_tasks").update({ status: "blocked", result: message }).eq("id", task.id);
      throw new Error(message);
    }
  });

/** Un agent exécute sa tâche : Éric suit la progression et récupère le résultat. */

export const runTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        taskId: z.string().uuid(),
        orgId: z.string().uuid(),
        idempotencyKey: z.string().min(8).max(64),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const supabase = context.supabase;

    const { data: task } = await supabase
      .from("agent_tasks")
      .select("id,title,detail,org_id,agent_id,agents(key,name,role_title)")
      .eq("id", data.taskId)
      .eq("org_id", data.orgId)
      .maybeSingle();
    if (!task) throw new Error("Tâche introuvable.");

    await supabase.from("agent_tasks").update({ status: "in_progress" }).eq("id", task.id);

    const agent = (task as unknown as {
      agents: { key: string; name: string; role_title: string } | null;
    }).agents;

    const tx = await reserveCredits(supabase, {
      orgId: data.orgId,
      actionKey: "eric.task_run",
      idempotencyKey: data.idempotencyKey,
      agentId: (task.agent_id as string | null) ?? null,
      taskId: task.id as string,
    });
    const cost = tx ? Math.abs(tx.amount) : 0;

    const memory = await loadCompanyMemory(supabase, data.orgId);

    try {
      const result = await runAgent(
        {
          key: agent?.key ?? "",
          name: agent?.name ?? "Agent",
          role: agent?.role_title ?? "",
        },
        { title: task.title as string, detail: (task.detail as string) ?? "" },
        memory,
        { userId: context.userId },
      );
      await supabase
        .from("agent_tasks")
        .update({ status: "done", result, credits_used: cost })
        .eq("id", task.id);
      await completeCredits(supabase, tx, result, task.id as string);
      return {
        id: task.id as string,
        status: "done" as const,
        result,
        credits_used: cost,
        credits_left: tx ? tx.balance_after : null,
      };
    } catch (e) {
      const message = e instanceof Error ? e.message : "Échec de la tâche";
      await refundCredits(supabase, tx, message);
      await supabase.from("agent_tasks").update({ status: "blocked", result: message }).eq("id", task.id);
      throw new Error(message);
    }

  });
