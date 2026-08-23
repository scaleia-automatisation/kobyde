import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      setLoading(false);
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return { session, loading, user: session?.user ?? null };
}

export function useProfile() {
  const { user } = useSession();
  return useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*, organizations:current_org_id(*)")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useOrgId() {
  const { data } = useProfile();
  return (data?.current_org_id as string | undefined) ?? undefined;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export function useRows<T = any>(table: string, opts?: { order?: string; limit?: number }) {
  const orgId = useOrgId();
  return useQuery<T[]>({
    queryKey: ["rows", table, orgId],
    enabled: !!orgId,
    queryFn: async () => {
      let q = (supabase.from(table as any) as any)
        .select("*")
        .eq("org_id", orgId)
        .order(opts?.order ?? "created_at", { ascending: false });
      if (opts?.limit) q = q.limit(opts.limit);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as T[];
    },
  });
}

export function useCreateRow(table: string) {
  const orgId = useOrgId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: Record<string, unknown>) => {
      const { data, error } = await (supabase.from(table as any) as any)
        .insert({ ...values, org_id: orgId })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["rows", table, orgId] }),
  });
}

export function useUpdateRow(table: string) {
  const orgId = useOrgId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, values }: { id: string; values: Record<string, unknown> }) => {
      const { error } = await (supabase.from(table as any) as any).update(values).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["rows", table, orgId] }),
  });
}

export function useDeleteRow(table: string) {
  const orgId = useOrgId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from(table as any) as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["rows", table, orgId] }),
  });
}

/** Supprime toutes les lignes d'une table pour l'organisation courante. */
export function useDeleteAllRows(table: string) {
  const orgId = useOrgId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { error } = await (supabase.from(table as any) as any).delete().eq("org_id", orgId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["rows", table, orgId] }),
  });
}

export const euros = (n: number | null | undefined) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(
    Number(n ?? 0),
  );

/** Lignes filtrées par colonne (ex. les lignes d'un devis). */
export function useChildRows<T = any>(
  table: string,
  column: string,
  value: string | undefined,
  opts?: { order?: string; ascending?: boolean; select?: string },
) {
  return useQuery<T[]>({
    queryKey: ["child-rows", table, column, value],
    enabled: !!value,
    queryFn: async () => {
      const { data, error } = await (supabase.from(table as any) as any)
        .select(opts?.select ?? "*")
        .eq(column, value)
        .order(opts?.order ?? "created_at", { ascending: opts?.ascending ?? false });
      if (error) throw error;
      return (data ?? []) as T[];
    },
  });
}

/** Une ligne par id. */
export function useRow<T = any>(table: string, id: string | undefined, select = "*") {
  return useQuery<T | null>({
    queryKey: ["row", table, id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await (supabase.from(table as any) as any)
        .select(select)
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as T | null;
    },
  });
}

export const eur2 = (n: number | null | undefined) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(Number(n ?? 0));

export const frDate = (d: string | null | undefined) =>
  d ? new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }) : "—";
