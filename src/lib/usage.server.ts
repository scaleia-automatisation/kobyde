/* eslint-disable @typescript-eslint/no-explicit-any */
/** Suivi d'utilisation, coûts API, tarifs, budgets et logs. Serveur uniquement. */

import { db } from "./connectors.server";

const monthStart = () => {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString();
};
const prevMonthStart = () => {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - 1, 1)).toISOString();
};
const dayStart = () => {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())).toISOString();
};
const round = (n: number, p = 4) => Math.round(n * 10 ** p) / 10 ** p;

/* ------------------------------------------------------------------ Tarifs */

export async function listPricing() {
  const supabase = await db();
  const { data } = await supabase
    .from("api_pricing")
    .select("*")
    .order("connector_key")
    .order("effective_from", { ascending: false });
  return (data ?? []) as any[];
}

export async function upsertPricing(input: {
  id?: string;
  connectorKey: string;
  model?: string | null;
  unit: string;
  unitPrice: number;
  currency?: string;
  effectiveFrom?: string;
  isActive?: boolean;
  note?: string | null;
}) {
  const supabase = await db();
  const row: any = {
    connector_key: input.connectorKey,
    model: input.model ?? null,
    unit: input.unit,
    unit_price: input.unitPrice,
    currency: input.currency ?? "EUR",
    effective_from: input.effectiveFrom ?? new Date().toISOString(),
    is_active: input.isActive ?? true,
    note: input.note ?? null,
  };
  if (input.id) row.id = input.id;
  const { error } = await supabase.from("api_pricing").upsert(row);
  if (error) throw new Error(error.message);
  return { ok: true };
}

export async function deletePricing(id: string) {
  const supabase = await db();
  await supabase.from("api_pricing").delete().eq("id", id);
  return { ok: true };
}

/** Tarif applicable à une date donnée (historisé). */
export async function resolvePrice(connectorKey: string, unit: string, model?: string | null, at?: string) {
  const supabase = await db();
  const { data } = await supabase
    .from("api_pricing")
    .select("*")
    .eq("connector_key", connectorKey)
    .eq("unit", unit)
    .eq("is_active", true)
    .lte("effective_from", at ?? new Date().toISOString())
    .order("effective_from", { ascending: false })
    .limit(20);
  const rows = (data ?? []) as any[];
  return rows.find((r) => (model ? r.model === model : true)) ?? rows.find((r) => !r.model) ?? null;
}

/* ------------------------------------------------- Enregistrement d'utilisation */

export async function recordUsage(input: {
  orgId?: string | null;
  userId?: string | null;
  agentKey?: string | null;
  feature?: string | null;
  connectorKey?: string | null;
  model?: string | null;
  actionType?: string | null;
  quantity?: number;
  unit?: string;
  credits?: number;
  realCostEur?: number | null;
  durationMs?: number | null;
  status?: "success" | "error";
  error?: string | null;
}) {
  const supabase = await db();
  const quantity = input.quantity ?? 1;
  const unit = input.unit ?? "request";
  let estimated = 0;
  if (input.connectorKey) {
    const price = await resolvePrice(input.connectorKey, unit, input.model ?? null);
    if (price) estimated = round(Number(price.unit_price) * quantity, 6);
  }
  const { error } = await supabase.from("api_usage_events").insert({
    org_id: input.orgId ?? null,
    user_id: input.userId ?? null,
    agent_key: input.agentKey ?? null,
    feature: input.feature ?? null,
    connector_key: input.connectorKey ?? null,
    model: input.model ?? null,
    action_type: input.actionType ?? null,
    quantity,
    unit,
    estimated_cost_eur: estimated,
    real_cost_eur: input.realCostEur ?? null,
    credits: input.credits ?? 0,
    duration_ms: input.durationMs ?? null,
    status: input.status ?? "success",
    error: input.error ?? null,
  });
  if (error) console.error("[usage] ", error.message);
  return { ok: true, estimated };
}

/* ------------------------------------------------------------ Dashboard coûts */

export async function costOverview() {
  const supabase = await db();
  const since = prevMonthStart();
  const [{ data: eventsData }, { data: orgs }, { data: budgets }] = await Promise.all([
    supabase
      .from("api_usage_events")
      .select("*")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(20000),
    supabase.from("organizations").select("id,name,plan,credits"),
    supabase.from("cost_budgets").select("*").eq("is_active", true),
  ]);
  const events = (eventsData ?? []) as any[];
  const cost = (e: any) => Number(e.real_cost_eur ?? e.estimated_cost_eur ?? 0);

  const m = monthStart();
  const pm = prevMonthStart();
  const d = dayStart();
  const thisMonth = events.filter((e) => e.created_at >= m);
  const lastMonth = events.filter((e) => e.created_at >= pm && e.created_at < m);
  const today = events.filter((e) => e.created_at >= d);

  const sum = (list: any[]) => round(list.reduce((s, e) => s + cost(e), 0), 2);
  const monthCost = sum(thisMonth);
  const prevCost = sum(lastMonth);
  const dayOfMonth = Math.max(1, new Date().getUTCDate());

  const group = (list: any[], keyOf: (e: any) => string) => {
    const map = new Map<string, { key: string; requests: number; quantity: number; cost: number; credits: number; last: string }>();
    list.forEach((e) => {
      const key = keyOf(e) || "—";
      const b = map.get(key) ?? { key, requests: 0, quantity: 0, cost: 0, credits: 0, last: e.created_at };
      b.requests += 1;
      b.quantity += Number(e.quantity ?? 0);
      b.cost += cost(e);
      b.credits += Number(e.credits ?? 0);
      if (e.created_at > b.last) b.last = e.created_at;
      map.set(key, b);
    });
    return [...map.values()]
      .map((b) => ({ ...b, cost: round(b.cost, 2), avgCost: round(b.requests ? b.cost / b.requests : 0, 5) }))
      .sort((a, b) => b.cost - a.cost);
  };

  const orgNames = new Map((orgs ?? []).map((o: any) => [o.id, o.name]));
  const PLAN_PRICE: Record<string, number> = { gratuit: 0, starter: 49, business: 79, pro: 149 };
  const revenue = (orgs ?? []).reduce((s: number, o: any) => s + (PLAN_PRICE[o.plan] ?? 0), 0);

  const byOrg = group(thisMonth, (e) => e.org_id ?? "—").map((b) => ({
    ...b,
    name: orgNames.get(b.key) ?? "Inconnue",
  }));

  return {
    kpis: {
      today: sum(today),
      month: monthCost,
      previousMonth: prevCost,
      evolution: prevCost > 0 ? Math.round(((monthCost - prevCost) / prevCost) * 100) : 0,
      requests: thisMonth.length,
      avgPerRequest: round(thisMonth.length ? monthCost / thisMonth.length : 0, 5),
      avgPerUser: round(new Set(thisMonth.map((e) => e.user_id).filter(Boolean)).size ? monthCost / new Set(thisMonth.map((e) => e.user_id).filter(Boolean)).size : 0, 3),
      avgPerOrg: round(byOrg.length ? monthCost / byOrg.length : 0, 3),
      credits: thisMonth.reduce((s, e) => s + Number(e.credits ?? 0), 0),
      revenue,
      margin: round(revenue - monthCost, 2),
      projection: round((monthCost / dayOfMonth) * 30, 2),
    },
    byConnector: group(thisMonth, (e) => e.connector_key),
    byAgent: group(thisMonth, (e) => e.agent_key),
    byFeature: group(thisMonth, (e) => e.feature),
    byOrg,
    budgets: (budgets ?? []).map((b: any) => {
      const scoped = thisMonth.filter((e) =>
        b.connector_key ? e.connector_key === b.connector_key : b.scope === "org" ? e.org_id === b.scope_ref : true,
      );
      const spent = sum(scoped);
      const ratio = Number(b.amount_eur) > 0 ? Math.round((spent / Number(b.amount_eur)) * 100) : 0;
      return {
        ...b,
        spent,
        ratio,
        level: ratio >= 100 ? "critique" : ratio >= 85 ? "important" : ratio >= 70 ? "info" : "ok",
      };
    }),
    generatedAt: new Date().toISOString(),
  };
}

export async function listUsageLogs(filters: {
  connectorKey?: string;
  agentKey?: string;
  orgId?: string;
  status?: string;
  limit?: number;
}) {
  const supabase = await db();
  let q = supabase.from("api_usage_events").select("*").order("created_at", { ascending: false }).limit(filters.limit ?? 200);
  if (filters.connectorKey) q = q.eq("connector_key", filters.connectorKey);
  if (filters.agentKey) q = q.eq("agent_key", filters.agentKey);
  if (filters.orgId) q = q.eq("org_id", filters.orgId);
  if (filters.status) q = q.eq("status", filters.status);
  const { data } = await q;
  const orgIds = [...new Set((data ?? []).map((e: any) => e.org_id).filter(Boolean))];
  const { data: orgs } = orgIds.length
    ? await supabase.from("organizations").select("id,name").in("id", orgIds)
    : { data: [] as any[] };
  const names = new Map((orgs ?? []).map((o: any) => [o.id, o.name]));
  return (data ?? []).map((e: any) => ({ ...e, org_name: names.get(e.org_id) ?? null }));
}

/* ------------------------------------------------------------------ Budgets */

export async function listBudgets() {
  const supabase = await db();
  const { data } = await supabase.from("cost_budgets").select("*").order("created_at", { ascending: false });
  return (data ?? []) as any[];
}

export async function upsertBudget(input: {
  id?: string;
  scope: string;
  scopeRef?: string | null;
  connectorKey?: string | null;
  period: string;
  amountEur: number;
  actionOnLimit: string;
  isActive?: boolean;
}) {
  const supabase = await db();
  const row: any = {
    scope: input.scope,
    scope_ref: input.scopeRef ?? null,
    connector_key: input.connectorKey ?? null,
    period: input.period,
    amount_eur: input.amountEur,
    action_on_limit: input.actionOnLimit,
    is_active: input.isActive ?? true,
  };
  if (input.id) row.id = input.id;
  const { error } = await supabase.from("cost_budgets").upsert(row);
  if (error) throw new Error(error.message);
  return { ok: true };
}

export async function deleteBudget(id: string) {
  const supabase = await db();
  await supabase.from("cost_budgets").delete().eq("id", id);
  return { ok: true };
}

/* -------------------------------------------------------- Protection abus */

export async function checkAbuse(orgId: string) {
  const supabase = await db();
  const since = new Date(Date.now() - 3600000).toISOString();
  const { data } = await supabase
    .from("api_usage_events")
    .select("status,created_at")
    .eq("org_id", orgId)
    .gte("created_at", since)
    .limit(1000);
  const rows = (data ?? []) as any[];
  const errors = rows.filter((r) => r.status === "error").length;
  return {
    requestsLastHour: rows.length,
    errorsLastHour: errors,
    throttled: rows.length > 400 || errors > 50,
  };
}
