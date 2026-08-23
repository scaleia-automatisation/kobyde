import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrgId, useProfile } from "@/lib/db";

export type CreditTransaction = {
  id: string;
  org_id: string;
  agent_id: string | null;
  user_id: string | null;
  amount: number;
  action_key: string | null;
  action_label: string | null;
  balance_before: number | null;
  balance_after: number | null;
  status: string;
  task_id: string | null;
  result: string | null;
  error: string | null;
  created_at: string;
};

/** Solde de crédits IA de l'entreprise, synchronisé avec la fiche entreprise. */
export function useCredits() {
  const { data: profile } = useProfile();
  const org = profile?.organizations as { credits?: number; credits_total?: number } | null;
  return { balance: org?.credits ?? 0, total: org?.credits_total ?? 1000 };
}

export function useCreditHistory(limit = 100) {
  const orgId = useOrgId();
  return useQuery<CreditTransaction[]>({
    queryKey: ["credit-history", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("credit_transactions")
        .select("*")
        .eq("org_id", orgId!)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as unknown as CreditTransaction[];
    },
  });
}

/** Supprime une transaction de crédits. */
export function useDeleteCreditTransaction() {
  const orgId = useOrgId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("credit_transactions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["credit-history", orgId] }),
  });
}

/** Supprime toutes les transactions de crédits de l'organisation. */
export function useDeleteAllCreditTransactions() {
  const orgId = useOrgId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("credit_transactions").delete().eq("org_id", orgId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["credit-history", orgId] }),
  });
}

export const newIdempotencyKey = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
