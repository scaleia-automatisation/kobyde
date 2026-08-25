/**
 * Couche commune côté serveur : mémoire d'actions partagée entre agents,
 * recherche des données existantes, détection de doublons, enrichissement.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  ALREADY_ENGAGED,
  decide,
  detectDuplicates,
  enrichPatch,
  fingerprint,
  type Candidate,
  type Decision,
  type DuplicateMatch,
} from "./context-engine";

/* eslint-disable @typescript-eslint/no-explicit-any */

/** Table et colonnes lues pour chaque entité du moteur. */
export const ENTITY_TABLE: Record<string, { table: string; cols: string }> = {
  prospect: {
    table: "prospects",
    cols: "id,company_name,full_name,email,phone,website,city,status,followup_step,qualification,score,created_at",
  },
  lead: { table: "prospects", cols: "id,company_name,full_name,email,status,created_at" },
  client: { table: "clients", cols: "id,company_name,full_name,email,phone,status,created_at" },
  contact: { table: "clients", cols: "id,company_name,full_name,email,phone,status,created_at" },
  entreprise: { table: "prospects", cols: "id,company_name,website,city,status,created_at" },
  devis: {
    table: "quotes",
    cols: "id,number,title,status,client_id,total_ttc,created_at,valid_until,version",
  },
  facture: {
    table: "invoices",
    cols: "id,number,label,status,client_id,quote_id,payment_id,installment_id,amount_ttc,due_date,created_at",
  },
  projet: { table: "projects", cols: "id,name,status,client_id,quote_id,progress,created_at" },
  tache: { table: "tasks", cols: "id,title,status,project_id,created_at" },
  produit: { table: "products", cols: "id,name,description,price_ht,category,created_at" },
  service: { table: "products", cols: "id,name,description,price_ht,category,created_at" },
  campagne: { table: "campaigns", cols: "id,name,channel,status,created_at" },
  email: { table: "emails", cols: "id,subject,status,created_at" },
  document: { table: "documents", cols: "id,name,created_at" },
  contenu: { table: "content_creations", cols: "id,title,status,created_at" },
  reunion: { table: "meetings", cols: "id,title,created_at" },
  campagne_email: { table: "email_sequences", cols: "id,name,status,created_at" },
};

/** Charge les lignes existantes d'une entité (bornées) pour la comparaison. */
export async function loadEntityRows(
  supabase: SupabaseClient<any>,
  orgId: string,
  entity: string,
  limit = 500,
): Promise<any[]> {
  const cfg = ENTITY_TABLE[entity];
  if (!cfg) return [];
  const { data } = await (supabase.from(cfg.table as any) as any)
    .select(cfg.cols)
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as any[];
}

export type DuplicateReport = {
  entity: string;
  matches: DuplicateMatch[];
  decision: Decision;
  message: string;
};

/** Vérifier AVANT de créer : recherche les éléments existants similaires. */
export async function checkExisting(
  supabase: SupabaseClient<any>,
  orgId: string,
  entity: string,
  candidate: Candidate,
  opts?: { threshold?: number; recentDays?: number },
): Promise<DuplicateReport> {
  const rows = await loadEntityRows(supabase, orgId, entity);
  const matches = detectDuplicates(entity, candidate, rows, opts).slice(0, 5);
  const { decision, message } = decide(entity, matches, candidate);
  return { entity, matches, decision, message };
}

/** Enrichit une fiche existante sans jamais écraser une donnée fiable. */
export async function enrichExisting(
  supabase: SupabaseClient<any>,
  entity: string,
  rowId: string,
  existing: Record<string, any>,
  incoming: Record<string, any>,
): Promise<{ enriched: boolean; fields: string[] }> {
  const cfg = ENTITY_TABLE[entity];
  if (!cfg) return { enriched: false, fields: [] };
  const patch = enrichPatch(existing, incoming);
  const fields = Object.keys(patch);
  if (!fields.length) return { enriched: false, fields: [] };
  await (supabase.from(cfg.table as any) as any).update(patch).eq("id", rowId);
  return { enriched: true, fields };
}

export type ActionInput = {
  orgId: string;
  userId?: string | null;
  agentKey?: string | null;
  actionType: string;
  entityType: string;
  entityId?: string | null;
  entityLabel?: string | null;
  status?: string;
  result?: string | null;
  metadata?: Record<string, unknown>;
  /** Éléments composant l'empreinte anti-répétition. */
  fingerprintParts?: (string | number | null | undefined)[];
};

/** Enregistre une action dans la mémoire commune des agents. */
export async function recordAction(supabase: SupabaseClient<any>, input: ActionInput) {
  const fp = fingerprint(
    input.fingerprintParts?.length
      ? input.fingerprintParts
      : [input.actionType, input.entityType, input.entityId ?? input.entityLabel ?? ""],
  );
  const { data } = await (supabase.from("agent_actions") as any)
    .insert({
      org_id: input.orgId,
      user_id: input.userId ?? null,
      agent_key: input.agentKey ?? null,
      action_type: input.actionType,
      entity_type: input.entityType,
      entity_id: input.entityId ?? null,
      entity_label: input.entityLabel ?? null,
      fingerprint: fp,
      status: input.status ?? "termine",
      result: input.result ?? null,
      metadata: input.metadata ?? {},
    })
    .select("id")
    .maybeSingle();
  return { id: (data as any)?.id ?? null, fingerprint: fp };
}

/** Cette action a-t-elle déjà été réalisée récemment ? (anti-retraitement) */
export async function findPreviousAction(
  supabase: SupabaseClient<any>,
  orgId: string,
  fingerprintParts: (string | number | null | undefined)[],
  withinDays = 30,
) {
  const fp = fingerprint(fingerprintParts);
  const since = new Date(Date.now() - withinDays * 864e5).toISOString();
  const { data } = await (supabase.from("agent_actions") as any)
    .select("id,action_type,entity_type,entity_id,entity_label,result,status,created_at")
    .eq("org_id", orgId)
    .eq("fingerprint", fp)
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as any) ?? null;
}

/** Historique complet d'un élément (tunnel prospect → client, suivi projet, etc.). */
export async function entityTimeline(
  supabase: SupabaseClient<any>,
  orgId: string,
  entityType: string,
  entityId: string,
) {
  const { data } = await (supabase.from("agent_actions") as any)
    .select("action_type,agent_key,status,result,created_at,metadata")
    .eq("org_id", orgId)
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .order("created_at", { ascending: true })
    .limit(100);
  return (data ?? []) as any[];
}

/** Dernières actions de l'entreprise, injectées dans le contexte des agents. */
export async function recentActions(supabase: SupabaseClient<any>, orgId: string, limit = 40) {
  const { data } = await (supabase.from("agent_actions") as any)
    .select("action_type,entity_type,entity_label,agent_key,status,created_at")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as any[];
}

/** Prospects à exclure d'une nouvelle recherche (déjà traités / à ne plus contacter). */
export async function excludedProspects(supabase: SupabaseClient<any>, orgId: string) {
  const rows = await loadEntityRows(supabase, orgId, "prospect", 2000);
  return rows.filter((r) => {
    const s = String(r.status ?? "").toLowerCase();
    const f = String(r.followup_step ?? "").toLowerCase();
    return ALREADY_ENGAGED.has(s) || ALREADY_ENGAGED.has(f);
  });
}

/** Règles communes injectées dans le prompt de tous les agents IA. */
export const CONTEXT_RULES_PROMPT = `MÉTHODE OBLIGATOIRE (mémoire → vérification → détection → contexte → action pertinente → mise à jour → historique) :
AVANT d'agir : comprends la demande, identifie les entités concernées, cherche les données déjà présentes dans la mémoire de l'entreprise, vérifie l'historique des actions déjà réalisées, détecte les doublons, puis identifie uniquement les informations réellement manquantes.
PENDANT : utilise d'abord les données existantes ; n'appelle un outil externe que si c'est indispensable ; ne retraite jamais une donnée déjà traitée ; respecte le statut actuel de chaque élément.
APRÈS : indique ce qui doit être mis à jour, enrichi, et quelle est la prochaine action logique.

RÈGLES ABSOLUES :
- Ne recrée jamais une information déjà existante : privilégie réutiliser → enrichir → mettre à jour → créer seulement si nécessaire.
- Pas de doublon : prospect, client, devis, facture, projet, campagne, contenu, analyse.
- Un prospect déjà contacté ne doit pas recevoir le même type de message : analyse ce qui a déjà été envoyé, quand, les réponses et les relances, puis propose la prochaine action logique.
- N'analyse jamais deux fois le même email, et ne propose pas de réponse à un email déjà traité, déjà répondu ou clôturé.
- Ne demande une précision que si l'information est réellement absente. Si un seul élément correspond clairement (service, produit, client, projet, devis), sélectionne-le et informe l'utilisateur. Si plusieurs correspondent, demande simplement lequel — jamais un long formulaire.
- Si l'utilisateur demande explicitement les éléments déjà traités (« montre-moi les entreprises déjà contactées »), alors travaille justement sur ces éléments.
- Conserve pour chaque information externe : sa source, sa date de récupération et son niveau de fiabilité.`;

/** Bloc de contexte prêt à injecter : actions déjà réalisées + points de vigilance. */
export async function buildContextBrief(supabase: SupabaseClient<any>, orgId: string): Promise<string> {
  const [actions, excluded] = await Promise.all([recentActions(supabase, orgId, 30), excludedProspects(supabase, orgId)]);
  const lignes = actions.map(
    (a) =>
      `- ${new Date(a.created_at).toLocaleDateString("fr-FR")} · ${a.action_type} · ${a.entity_type}${
        a.entity_label ? ` « ${a.entity_label} »` : ""
      }${a.agent_key ? ` (agent ${a.agent_key})` : ""} → ${a.status}`,
  );
  return `${CONTEXT_RULES_PROMPT}

MÉMOIRE D'ACTIONS DÉJÀ RÉALISÉES (ne pas refaire) :
${lignes.length ? lignes.join("\n") : "- aucune action enregistrée pour l'instant"}

CONTACTS DÉJÀ ENGAGÉS OU À NE PLUS CONTACTER (${excluded.length}) :
${
  excluded.length
    ? excluded
        .slice(0, 40)
        .map((p) => `- ${p.company_name || p.full_name} (${p.status}${p.followup_step ? ` / ${p.followup_step}` : ""})`)
        .join("\n")
    : "- aucun"
}`;
}

export { decide, detectDuplicates, enrichPatch, fingerprint };
