import type { SupabaseClient } from "@supabase/supabase-js";
import { AUTOMATIONS } from "./automations";

/* eslint-disable @typescript-eslint/no-explicit-any */

type Notif = { title: string; body: string; kind: string };
type Planned = { rule: string; notif: Notif; task?: { agentKey: string; title: string; detail: string } };

const days = (n: number) => new Date(Date.now() - n * 86400000).toISOString();

/**
 * Exécute le moteur d'automatisation sur les données réelles de l'entreprise.
 * Aucune donnée inventée : chaque alerte provient d'une ligne existante en base.
 */
export async function runAutomationEngine(
  supabase: SupabaseClient<any>,
  orgId: string,
  activeKeys: string[],
) {
  const active = new Set(activeKeys.filter((k) => AUTOMATIONS.some((a) => a.key === k)));
  if (!active.size) return { created: 0, rules: [] as string[] };

  const q = (table: string) => (supabase.from(table as any) as any).select("*").eq("org_id", orgId);
  const planned: Planned[] = [];

  if (active.has("devis_accepte")) {
    const { data } = await q("quotes").eq("status", "accepte").limit(50);
    const { data: reqs } = await q("payment_requests").limit(200);
    const withReq = new Set((reqs ?? []).map((r: any) => r.quote_id));
    for (const quote of data ?? []) {
      if (withReq.has(quote.id)) continue;
      planned.push({
        rule: "devis_accepte",
        notif: {
          title: `Devis ${quote.number} accepté`,
          body: `Le devis « ${quote.title} » est accepté. Une demande de paiement est à envoyer.`,
          kind: "devis",
        },
        task: {
          agentKey: "devis",
          title: `Préparer la demande de paiement du devis ${quote.number}`,
          detail: `Montant TTC : ${quote.total_ttc} €. À valider avant envoi.`,
        },
      });
    }
  }

  if (active.has("paiement_recu")) {
    const { data } = await q("payments").in("status", ["paye", "paid", "succeeded"]).limit(50);
    const { data: invoices } = await q("invoices").limit(200);
    const paid = new Set((invoices ?? []).map((i: any) => i.payment_id));
    for (const p of data ?? []) {
      if (paid.has(p.id)) continue;
      planned.push({
        rule: "paiement_recu",
        notif: {
          title: `Paiement reçu de ${p.amount} €`,
          body: "La facture peut être générée et le projet créé.",
          kind: "paiement",
        },
        task: {
          agentKey: "gestion",
          title: "Générer la facture du paiement reçu",
          detail: `Paiement de ${p.amount} € encaissé le ${p.paid_at ?? p.created_at}.`,
        },
      });
    }
  }

  if (active.has("relance_devis")) {
    const { data } = await q("quotes").eq("status", "envoye").lt("sent_at", days(5)).limit(30);
    for (const quote of data ?? []) {
      planned.push({
        rule: "relance_devis",
        notif: {
          title: `Devis ${quote.number} à relancer`,
          body: "Envoyé depuis plus de 5 jours, toujours sans réponse.",
          kind: "devis",
        },
        task: {
          agentKey: "relances",
          title: `Relancer le devis ${quote.number}`,
          detail: `Client sans réponse depuis le ${quote.sent_at}. Préparer un message à valider.`,
        },
      });
    }
  }

  if (active.has("facture_retard")) {
    const today = new Date().toISOString().slice(0, 10);
    const { data } = await q("invoices").neq("status", "payee").lt("due_date", today).limit(30);
    for (const inv of data ?? []) {
      planned.push({
        rule: "facture_retard",
        notif: {
          title: `Facture ${inv.number} en retard`,
          body: `Échéance dépassée (${inv.due_date}) pour ${inv.amount_ttc} €.`,
          kind: "paiement",
        },
        task: {
          agentKey: "gestion",
          title: `Rappel de paiement — facture ${inv.number}`,
          detail: `Montant dû : ${inv.amount_ttc} €.`,
        },
      });
    }
  }

  if (active.has("projet_retard")) {
    const today = new Date().toISOString().slice(0, 10);
    const { data } = await q("projects").neq("status", "termine").lt("end_date", today).limit(30);
    for (const pr of data ?? []) {
      planned.push({
        rule: "projet_retard",
        notif: {
          title: `Projet « ${pr.name} » en retard`,
          body: `Date de fin prévue le ${pr.end_date}, avancement ${pr.progress}%.`,
          kind: "projet",
        },
        task: {
          agentKey: "projets",
          title: `Remettre le projet « ${pr.name} » sur les rails`,
          detail: "Proposer un nouveau planning et prévenir le client.",
        },
      });
    }
  }

  if (active.has("prospect_chaud")) {
    const { data } = await q("prospects").gt("score", 80).eq("status", "nouveau").limit(30);
    for (const p of data ?? []) {
      planned.push({
        rule: "prospect_chaud",
        notif: {
          title: `Prospect très qualifié : ${p.full_name}`,
          body: `Score ${p.score}/100 — à contacter en priorité.`,
          kind: "prospect",
        },
        task: {
          agentKey: "commercial",
          title: `Préparer un message pour ${p.full_name}`,
          detail: `${p.company_name ?? ""} — score ${p.score}. Message à valider avant envoi.`,
        },
      });
    }
  }

  if (active.has("email_important")) {
    const { data } = await q("emails").eq("priority", "haute").eq("direction", "recu").limit(30);
    for (const e of data ?? []) {
      planned.push({
        rule: "email_important",
        notif: {
          title: `Email important : ${e.subject}`,
          body: `De ${e.from_email ?? "expéditeur inconnu"} — réponse à préparer.`,
          kind: "email",
        },
      });
    }
  }

  if (active.has("avis_negatif")) {
    const { data } = await q("reviews").eq("sentiment", "negatif").neq("reply_status", "publie").limit(30);
    for (const r of data ?? []) {
      planned.push({
        rule: "avis_negatif",
        notif: {
          title: `Avis négatif à traiter (${r.source})`,
          body: r.summary ?? r.content ?? "Un avis négatif attend une réponse.",
          kind: "reputation",
        },
        task: {
          agentKey: "marketing",
          title: "Préparer une réponse à un avis négatif",
          detail: `Source : ${r.source}. Réponse à valider avant publication.`,
        },
      });
    }
  }

  if (active.has("veille_dispo")) {
    const { data } = await q("intel_assets").gt("created_at", days(7)).limit(20);
    for (const a of data ?? []) {
      planned.push({
        rule: "veille_dispo",
        notif: {
          title: `Veille disponible : ${a.title}`,
          body: a.summary ?? "Une nouvelle analyse est prête à consulter.",
          kind: "veille",
        },
      });
    }
  }

  if (active.has("candidat_recu")) {
    const { data } = await q("candidates").eq("status", "nouveau").limit(30);
    for (const c of data ?? []) {
      planned.push({
        rule: "candidat_recu",
        notif: {
          title: `Candidature reçue : ${c.full_name}`,
          body: `${c.position ?? "Poste non précisé"} — analyse du CV à lancer.`,
          kind: "rh",
        },
        task: {
          agentKey: "rh",
          title: `Analyser la candidature de ${c.full_name}`,
          detail: "Lecture du CV, scoring et recommandation.",
        },
      });
    }
  }

  if (!planned.length) return { created: 0, rules: [] as string[] };

  // Anti-doublon : on ne recrée jamais une alerte déjà présente.
  const { data: existing } = await (supabase.from("notifications") as any)
    .select("title")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })
    .limit(400);
  const seen = new Set((existing ?? []).map((n: any) => n.title));

  const fresh = planned.filter((p) => !seen.has(p.notif.title));
  if (!fresh.length) return { created: 0, rules: [] as string[] };

  await (supabase.from("notifications") as any).insert(
    fresh.map((p) => ({ org_id: orgId, title: p.notif.title, body: p.notif.body, kind: p.notif.kind })),
  );

  const withTasks = fresh.filter((p) => p.task);
  if (withTasks.length) {
    const { data: agents } = await (supabase.from("agents") as any)
      .select("id,key")
      .eq("org_id", orgId);
    const byKey = new Map((agents ?? []).map((a: any) => [a.key, a.id]));
    const rows = withTasks
      .map((p) => ({
        org_id: orgId,
        agent_id: byKey.get(p.task!.agentKey) ?? null,
        title: p.task!.title,
        detail: p.task!.detail,
        status: "todo",
        priority: "normale",
        credits_used: 0,
      }))
      .filter((r) => r.agent_id);
    if (rows.length) await (supabase.from("agent_tasks") as any).insert(rows);
  }

  const ruleKeys = [...new Set(fresh.map((p) => p.rule))];
  await (supabase.from("automation_rules") as any)
    .update({ last_run_at: new Date().toISOString() })
    .eq("org_id", orgId)
    .in("rule_key", activeKeys);

  return { created: fresh.length, rules: ruleKeys };
}
