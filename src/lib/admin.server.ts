/* eslint-disable @typescript-eslint/no-explicit-any */
/** Agrégations Super Admin (plateforme). Serveur uniquement. */

export async function adminDb() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as any;
}

const PLAN_PRICE: Record<string, number> = { gratuit: 0, starter: 49, business: 79, pro: 149 };
const CREDIT_COST_EUR = 0.02; // coût IA estimé par crédit consommé

const days = (n: number) => new Date(Date.now() - n * 86400000).toISOString();
const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : 0);

export async function listPlatformUsers() {
  const db = await adminDb();
  const users: any[] = [];
  for (let page = 1; page <= 10; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(error.message);
    users.push(...(data?.users ?? []));
    if ((data?.users?.length ?? 0) < 200) break;
  }
  return users;
}

/** Vue d'ensemble temps réel de la plateforme. */
export async function platformOverview() {
  const db = await adminDb();
  const users = await listPlatformUsers();

  const [orgsRes, txRes, paymentsRes, invoicesRes, subsRes, tasksRes, agentsRes, eventsRes, profilesRes] =
    await Promise.all([
      db.from("organizations").select("id,name,plan,credits,credits_total,created_at,is_suspended,created_by"),
      db.from("credit_transactions").select("org_id,agent_id,amount,status,action_key,created_at").limit(5000),
      db.from("payments").select("amount,status,paid_at,created_at").limit(5000),
      db.from("invoices").select("amount_ttc,status,created_at").limit(5000),
      db.from("subscriptions").select("plan,status,created_at,current_period_end").limit(2000),
      db.from("agent_tasks").select("agent_id,status,credits_used,created_at,updated_at").limit(5000),
      db.from("agents").select("id,org_id,key,name,credits_used").limit(5000),
      db.from("user_events").select("user_id,name,created_at").limit(20000),
      db.from("profiles").select("user_id,full_name,email,current_org_id,created_at").limit(5000),
    ]);

  const orgs: any[] = orgsRes.data ?? [];
  const tx: any[] = txRes.data ?? [];
  const payments: any[] = paymentsRes.data ?? [];
  const invoices: any[] = invoicesRes.data ?? [];
  const subs: any[] = subsRes.data ?? [];
  const tasks: any[] = tasksRes.data ?? [];
  const agents: any[] = agentsRes.data ?? [];
  const events: any[] = eventsRes.data ?? [];
  const profiles: any[] = profilesRes.data ?? [];

  const d30 = days(30);
  const d7 = days(7);

  // --- Utilisateurs
  const activeUserIds = new Set(events.filter((e) => e.created_at >= d30).map((e) => e.user_id));
  const paidOrgIds = new Set(orgs.filter((o) => o.plan && o.plan !== "gratuit").map((o) => o.id));
  const paidUsers = profiles.filter((p) => p.current_org_id && paidOrgIds.has(p.current_org_id)).length;
  const canceled = events.filter((e) => e.name === "subscription_canceled" && e.created_at >= d30).length;
  const subscribers = paidUsers;

  const usersBlock = {
    registered: users.length,
    active30: activeUserIds.size,
    new30: users.filter((u) => u.created_at >= d30).length,
    new7: users.filter((u) => u.created_at >= d7).length,
    free: Math.max(users.length - paidUsers, 0),
    paid: paidUsers,
    churnRate: pct(canceled, Math.max(subscribers + canceled, 1)),
    subscriptions: subs.filter((s) => s.status === "active").length || paidUsers,
  };

  // --- Entreprises
  const activeOrgIds = new Set(tx.filter((t) => t.created_at >= d30).map((t) => t.org_id));
  const orgsBlock = {
    total: orgs.length,
    new30: orgs.filter((o) => o.created_at >= d30).length,
    active: activeOrgIds.size,
    inactive: Math.max(orgs.length - activeOrgIds.size, 0),
    suspended: orgs.filter((o) => o.is_suspended).length,
  };

  // --- Revenus
  const mrr = orgs.reduce((s, o) => s + (PLAN_PRICE[o.plan as string] ?? 0), 0);
  const paidPayments = payments.filter((p) => p.status === "paid" || p.status === "succeeded");
  const revenueBlock = {
    mrr,
    arr: mrr * 12,
    revenue: paidPayments.reduce((s, p) => s + Number(p.amount ?? 0), 0),
    payments: paidPayments.length,
    pendingPayments: payments.filter((p) => p.status === "pending").length,
    refunds: payments.filter((p) => p.status === "refunded").length,
    invoices: invoices.length,
    arpu: users.length > 0 ? Math.round((mrr / users.length) * 100) / 100 : 0,
  };

  // --- Utilisation IA
  const spent = tx.filter((t) => t.status !== "refunded").reduce((s, t) => s + Math.min(0, t.amount), 0);
  const creditsConsumed = Math.abs(spent);
  const creditsLeft = orgs.reduce((s, o) => s + Number(o.credits ?? 0), 0);
  const actionCount = new Map<string, number>();
  tx.forEach((t) => {
    if (!t.action_key) return;
    actionCount.set(t.action_key, (actionCount.get(t.action_key) ?? 0) + 1);
  });
  const aiBlock = {
    creditsConsumed,
    creditsLeft,
    agentsUsed: new Set(tx.map((t) => t.agent_id).filter(Boolean)).size,
    actionsUsed: actionCount.size,
    estimatedCostEur: Math.round(creditsConsumed * CREDIT_COST_EUR * 100) / 100,
    costPerUser:
      users.length > 0
        ? Math.round((creditsConsumed * CREDIT_COST_EUR * 100) / users.length) / 100
        : 0,
    topActions: [...actionCount.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([key, count]) => ({ key, count })),
  };

  // --- Agents (agrégés par clé d'agent, toutes entreprises confondues)
  const agentById = new Map(agents.map((a) => [a.id, a]));
  const byKey = new Map<string, { key: string; name: string; tasks: number; errors: number; credits: number; totalMs: number; done: number }>();
  const bucket = (id: string | null) => {
    const a = id ? agentById.get(id) : null;
    const key = a?.key ?? "inconnu";
    if (!byKey.has(key))
      byKey.set(key, { key, name: a?.name ?? "—", tasks: 0, errors: 0, credits: 0, totalMs: 0, done: 0 });
    return byKey.get(key)!;
  };
  tasks.forEach((t) => {
    const b = bucket(t.agent_id);
    b.tasks += 1;
    b.credits += Number(t.credits_used ?? 0);
    if (t.status === "failed" || t.status === "error") b.errors += 1;
    if (t.updated_at && t.created_at) {
      const ms = new Date(t.updated_at).getTime() - new Date(t.created_at).getTime();
      if (ms > 0 && ms < 3600000) {
        b.totalMs += ms;
        b.done += 1;
      }
    }
  });
  tx.forEach((t) => {
    if (!t.agent_id) return;
    const b = bucket(t.agent_id);
    if (t.status === "refunded") b.errors += 1;
  });
  const agentStats = [...byKey.values()]
    .map((b) => ({
      key: b.key,
      name: b.name,
      tasks: b.tasks,
      errors: b.errors,
      credits: b.credits,
      avgSeconds: b.done > 0 ? Math.round(b.totalMs / b.done / 100) / 10 : 0,
    }))
    .sort((a, b) => b.tasks - a.tasks);

  // --- Funnel SaaS
  const count = (name: string) => new Set(events.filter((e) => e.name === name).map((e) => e.user_id)).size;
  const visitors = Math.max(count("visit"), users.length);
  const signups = users.length;
  const onboarded = orgs.filter((o: any) => o.credits_total != null).length;
  const onboardingDone = Math.max(count("onboarding_completed"), 0);
  const activation = new Set(tx.map((t) => t.org_id)).size;
  const funnel = [
    { step: "Visiteur", value: visitors },
    { step: "Inscription", value: signups },
    { step: "Onboarding", value: onboardingDone || Math.min(onboarded, signups) },
    { step: "Activation", value: activation },
    { step: "Essai", value: Math.max(count("first_generation"), activation) },
    { step: "Abonnement", value: paidUsers },
    { step: "Utilisation", value: activeUserIds.size },
    { step: "Renouvellement", value: count("plan_renewal") },
  ].map((s, i, arr) => ({
    ...s,
    rate: i === 0 ? 100 : pct(s.value, arr[0]!.value),
    stepRate: i === 0 ? 100 : pct(s.value, arr[i - 1]!.value || 1),
  }));

  // --- Comportement utilisateur (parcours + cohortes mensuelles)
  const journeySteps = [
    "signup",
    "login",
    "onboarding_completed",
    "first_action",
    "first_agent_used",
    "first_generation",
    "first_prospect",
    "first_quote",
    "first_payment",
    "returning_user",
    "subscription_started",
    "subscription_canceled",
  ];
  const journey = journeySteps.map((name) => ({ name, users: count(name) }));

  const cohortMap = new Map<string, { month: string; signups: number; activated: number; paid: number; retained: number }>();
  users.forEach((u) => {
    const month = String(u.created_at).slice(0, 7);
    if (!cohortMap.has(month)) cohortMap.set(month, { month, signups: 0, activated: 0, paid: 0, retained: 0 });
    const c = cohortMap.get(month)!;
    c.signups += 1;
    const ev = events.filter((e) => e.user_id === u.id);
    if (ev.some((e) => e.name === "first_action" || e.name === "first_generation")) c.activated += 1;
    if (ev.some((e) => e.name === "subscription_started")) c.paid += 1;
    if (activeUserIds.has(u.id)) c.retained += 1;
  });
  const cohorts = [...cohortMap.values()].sort((a, b) => (a.month < b.month ? 1 : -1)).slice(0, 12);

  return {
    users: usersBlock,
    orgs: orgsBlock,
    revenue: revenueBlock,
    ai: aiBlock,
    agents: agentStats,
    funnel,
    journey,
    cohorts,
    generatedAt: new Date().toISOString(),
  };
}

/** Recherche et fiches utilisateurs pour la gestion Super Admin. */
export async function searchPlatformUsers(query: string) {
  const db = await adminDb();
  const users = await listPlatformUsers();
  const q = query.trim().toLowerCase();

  const [{ data: profiles }, { data: orgs }, { data: memberships }] = await Promise.all([
    db.from("profiles").select("user_id,full_name,email,current_org_id").limit(5000),
    db
      .from("organizations")
      .select("id,name,plan,credits,credits_total,is_suspended,suspended_reason,created_at")
      .limit(5000),
    db.from("memberships").select("user_id,org_id,role").limit(5000),
  ]);

  const profileByUser = new Map((profiles ?? []).map((p: any) => [p.user_id, p]));
  const orgById = new Map((orgs ?? []).map((o: any) => [o.id, o]));
  const membershipByUser = new Map((memberships ?? []).map((m: any) => [m.user_id, m]));

  return users
    .map((u: any) => {
      const profile: any = profileByUser.get(u.id);
      const orgId = profile?.current_org_id ?? membershipByUser.get(u.id)?.org_id ?? null;
      const org: any = orgId ? orgById.get(orgId) : null;
      return {
        id: u.id,
        email: u.email ?? profile?.email ?? "—",
        fullName: profile?.full_name ?? "—",
        createdAt: u.created_at,
        lastSignInAt: u.last_sign_in_at ?? null,
        banned: Boolean(u.banned_until && new Date(u.banned_until) > new Date()),
        orgId,
        orgName: org?.name ?? "—",
        plan: org?.plan ?? "gratuit",
        credits: org?.credits ?? 0,
        orgSuspended: Boolean(org?.is_suspended),
      };
    })
    .filter(
      (u) =>
        !q ||
        u.email.toLowerCase().includes(q) ||
        u.fullName.toLowerCase().includes(q) ||
        u.orgName.toLowerCase().includes(q),
    )
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .slice(0, 200);
}

export async function setUserSuspended(userId: string, suspended: boolean, reason?: string) {
  const db = await adminDb();
  const { error } = await db.auth.admin.updateUserById(userId, {
    ban_duration: suspended ? "876000h" : "none",
  });
  if (error) throw new Error(error.message);

  const { data: profile } = await db
    .from("profiles")
    .select("current_org_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (profile?.current_org_id) {
    await db
      .from("organizations")
      .update({
        is_suspended: suspended,
        suspended_at: suspended ? new Date().toISOString() : null,
        suspended_reason: suspended ? (reason ?? null) : null,
      })
      .eq("id", profile.current_org_id);
  }
  return { ok: true };
}

export async function setUserPlan(userId: string, plan: string) {
  const db = await adminDb();
  const credits: Record<string, number> = { gratuit: 10, starter: 100, business: 200, pro: 300 };
  if (!(plan in credits)) throw new Error("Formule inconnue");

  const { data: profile } = await db
    .from("profiles")
    .select("current_org_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (!profile?.current_org_id) throw new Error("Entreprise introuvable pour cet utilisateur.");

  const { data: org } = await db
    .from("organizations")
    .select("credits,credits_total")
    .eq("id", profile.current_org_id)
    .maybeSingle();

  const { error } = await db
    .from("organizations")
    .update({
      plan,
      plan_credits: credits[plan],
      plan_price_eur: PLAN_PRICE[plan] ?? 0,
      credits: Number(org?.credits ?? 0) + credits[plan]!,
      credits_total: Number(org?.credits_total ?? 0) + credits[plan]!,
      plan_renews_at: new Date(Date.now() + 30 * 86400000).toISOString(),
    })
    .eq("id", profile.current_org_id);
  if (error) throw new Error(error.message);

  await db.from("user_events").insert({
    user_id: userId,
    org_id: profile.current_org_id,
    name: plan === "gratuit" ? "subscription_canceled" : "subscription_started",
    payload: { plan, by: "super_admin" },
  });
  return { ok: true };
}
