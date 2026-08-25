import type { SupabaseClient } from "@supabase/supabase-js";
import { creditAction } from "./credit-catalog";

/* eslint-disable @typescript-eslint/no-explicit-any */

export type CreditTx = {
  id: string;
  amount: number;
  balance_before: number;
  balance_after: number;
  status: string;
};

/** Réserve (débite) les crédits de façon atomique et idempotente. Renvoie null si l'action est gratuite. */
export async function reserveCredits(
  supabase: SupabaseClient<any>,
  params: {
    orgId: string;
    actionKey: string;
    idempotencyKey: string;
    agentId?: string | null;
    taskId?: string | null;
    label?: string;
    /** Coût dynamique (catalogue de modèles IA administrable). */
    cost?: number;
  },
): Promise<CreditTx | null> {
  const action = creditAction(params.actionKey);
  const cost = params.cost ?? action.cost;
  if (cost <= 0) return null;

  const { data, error } = await (supabase as any).rpc("reserve_credits", {
    _org: params.orgId,
    _action_key: action.key,
    _action_label: params.label ?? action.label,
    _credits: cost,
    _idempotency_key: params.idempotencyKey,
    _agent_id: params.agentId ?? null,
    _task_id: params.taskId ?? null,
  });

  if (error) {
    if (/Crédits insuffisants/i.test(error.message)) throw new Error("Crédits IA insuffisants.");
    throw new Error(error.message);
  }
  return data as CreditTx;
}

export async function completeCredits(
  supabase: SupabaseClient<any>,
  tx: CreditTx | null,
  result?: string,
  taskId?: string | null,
) {
  if (!tx) return;
  await (supabase as any).rpc("complete_credits", {
    _tx: tx.id,
    _result: (result ?? "").slice(0, 2000),
    _task_id: taskId ?? null,
  });
}

/** Recrédite automatiquement en cas d'échec technique. */
export async function refundCredits(supabase: SupabaseClient<any>, tx: CreditTx | null, error: string) {
  if (!tx) return;
  await (supabase as any).rpc("refund_credits", { _tx: tx.id, _error: error.slice(0, 500) });
}
