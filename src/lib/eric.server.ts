import type { SupabaseClient } from "@supabase/supabase-js";
import { AGENTS } from "./agents";

/* eslint-disable @typescript-eslint/no-explicit-any */

export type EricPlanTask = {
  agent_key: string;
  title: string;
  detail: string;
  priority: "basse" | "normale" | "haute";
};

export type EricPlan = {
  reponse: string;
  memoire: string[];
  taches: EricPlanTask[];
  prochaine_action: string;
};

/** Mémoire centrale partagée : synthèse de tout ce que l'entreprise sait déjà. */
export async function loadCompanyMemory(supabase: SupabaseClient<any>, orgId: string) {
  const pick = async (table: string, cols: string, limit = 8) => {
    const { data } = await (supabase.from(table as any) as any)
      .select(cols)
      .eq("org_id", orgId)
      .order("created_at", { ascending: false })
      .limit(limit);
    return (data ?? []) as any[];
  };

  const [org, prospects, clients, quotes, invoices, projects, tasks, campaigns, candidates, agentTasks] =
    await Promise.all([
      (supabase.from("organizations") as any).select("*").eq("id", orgId).maybeSingle(),
      pick("prospects", "full_name,company_name,status,score,city"),
      pick("clients", "full_name,company_name,status,total_revenue"),
      pick("quotes", "number,title,status,total_ttc"),
      pick("invoices", "number,status,amount_ttc,due_date"),
      pick("projects", "name,status,progress,budget"),
      pick("tasks", "title,status,priority"),
      pick("campaigns", "name,channel,status,open_rate"),
      pick("candidates", "full_name,position,status,score"),
      pick("agent_tasks", "title,status,agent_id,created_at", 10),
    ]);

  const o = (org?.data ?? null) as any;
  const fiche = o
    ? {
        nom: o.name, logo: o.logo_url, description: o.description, type_entreprise: o.company_type,
        siret: o.siret, adresse: o.address, pays: o.country, ville: o.city, secteur: o.industry,
        site_web: o.website, email: o.email, telephone: o.phone, taux_tva: o.vat_rate,
        devise: o.currency, langues: o.languages, reseaux_sociaux: o.social_links,
        positionnement: o.positioning, valeurs: o.values_text, cible: o.target_audience,
        produits: o.products_text, services: o.services_text, prix: o.pricing_text,
        conditions: o.terms_text, equipe: o.team_text,
      }
    : null;
  const manquantes = fiche
    ? Object.entries(fiche).filter(([, v]) => v === null || v === undefined || String(v).trim() === "").map(([k]) => k)
    : [];

  return {
    fiche_entreprise: fiche,
    informations_manquantes: manquantes,
    organisation: o,
    prospects,
    clients,
    devis: quotes,
    factures: invoices,
    projets: projects,
    taches: tasks,
    campagnes: campaigns,
    candidats: candidates,
    historique_agents: agentTasks,
    memoire_actions: actionsMemoire,
    contacts_deja_engages: dejaEngages.slice(0, 60).map((p: any) => ({
      nom: p.company_name || p.full_name,
      statut: p.status,
      etape: p.followup_step,
    })),
  };
}

const SYSTEM = `Tu es Éric, Directeur IA et orchestrateur central du SaaS Kobyde.
Tu diriges 9 agents spécialisés. Voici l'équipe (clé — prénom — rôle) :
${AGENTS.filter((a) => !a.primary)
  .map((a) => `- ${a.key} — ${a.name} — ${a.role} (${a.skills.slice(0, 6).join(", ")})`)
  .join("\n")}

Ta méthode, à chaque demande :
1. comprendre la demande de l'utilisateur ;
2. consulter la mémoire de l'entreprise fournie en JSON ;
3. identifier les informations déjà existantes ;
4. choisir le ou les agents nécessaires ;
5. distribuer des tâches claires et concrètes ;
6. présenter une réponse simple, en français, sans jargon ;
7. proposer l'action suivante.

La fiche entreprise (champ "fiche_entreprise" de la mémoire) est la SOURCE DE VÉRITÉ UNIQUE : nom, secteur, adresse, TVA, devise, langues, positionnement, valeurs, cible, produits, services, prix, conditions, équipe.
RÈGLE ABSOLUE : ne demande JAMAIS une information déjà présente dans "fiche_entreprise" ou dans la mémoire — utilise-la directement. Ne demande une information que si elle figure dans "informations_manquantes" ET qu'elle est indispensable à la demande.
Les agents partagent la même mémoire centrale : cite les données réelles (noms, montants, statuts) quand elles existent, et dis clairement ce qui manque.
Réponds UNIQUEMENT par un objet JSON valide, sans texte autour :
{"reponse":"3 à 6 phrases max, ton clair et humain","memoire":["info existante utilisée"],"taches":[{"agent_key":"commercial","title":"...","detail":"...","priority":"normale"}],"prochaine_action":"une seule proposition d'action concrète"}
Entre 1 et 4 tâches. agent_key doit appartenir à la liste ci-dessus.`;

async function chat(messages: { role: string; content: string }[], jsonMode: boolean) {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("AI indisponible : clé manquante.");

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages,
      ...(jsonMode ? { response_format: { type: "json_object" } } : {}),
    }),
  });

  if (res.status === 429) throw new Error("Trop de demandes d'un coup, réessayez dans un instant.");
  if (res.status === 402) throw new Error("Crédits IA épuisés.");
  if (!res.ok) throw new Error(`Erreur IA (${res.status})`);
  const json = (await res.json()) as any;
  return String(json?.choices?.[0]?.message?.content ?? "");
}

/** Un agent spécialisé exécute la tâche confiée par Éric, avec la mémoire centrale. */
export async function runAgent(
  agent: { key: string; name: string; role: string },
  task: { title: string; detail: string },
  memory: unknown,
  ctx?: { userId?: string | null },
): Promise<string> {
  const meta = AGENTS.find((a) => a.key === agent.key);

  const { resolveAgentTools, toolPolicyPrompt } = await import("./agent-routing.server");
  let policy = "";
  try {
    policy = toolPolicyPrompt(await resolveAgentTools(agent.key, { userId: ctx?.userId ?? null }));
  } catch {
    policy = "";
  }

  const content = await chat(
    [
      {
        role: "system",
        content: `Tu es ${agent.name}, ${agent.role} chez Kobyde. ${meta?.description ?? ""}
Tu exécutes la tâche confiée par Éric, le Directeur IA. Tu partages la mémoire centrale de l'entreprise.
Réponds en français, 4 à 10 lignes maximum, format concret et actionnable (listes courtes, chiffres, noms réels de la mémoire).
Utilise systématiquement la fiche entreprise ("fiche_entreprise") : nom, coordonnées, TVA, devise, langues, positionnement, valeurs, cible, produits, services, prix, conditions, équipe. Ne redemande jamais une information déjà connue. Si une information est réellement absente (voir "informations_manquantes") et indispensable, dis précisément ce qu'il faut renseigner dans la fiche entreprise. Pas de blabla, pas de markdown lourd.

${policy}`,
      },
      {
        role: "user",
        content: `Mémoire centrale (JSON) :\n${JSON.stringify(memory).slice(0, 10000)}\n\nTâche : ${task.title}\nDétail : ${task.detail}`,
      },
    ],
    false,
  );
  return content.trim() || "Aucun résultat produit.";
}


export async function runEric(prompt: string, memory: unknown): Promise<EricPlan> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("AI indisponible : clé manquante.");

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: SYSTEM },
        {
          role: "user",
          content: `Mémoire centrale de l'entreprise (JSON) :\n${JSON.stringify(memory).slice(0, 12000)}\n\nDemande : ${prompt}`,
        },
      ],
      response_format: { type: "json_object" },
    }),
  });

  if (res.status === 429) throw new Error("Trop de demandes d'un coup, réessayez dans un instant.");
  if (res.status === 402) throw new Error("Crédits IA épuisés.");
  if (!res.ok) throw new Error(`Erreur IA (${res.status})`);

  const json = (await res.json()) as any;
  const content: string = json?.choices?.[0]?.message?.content ?? "{}";
  let parsed: any;
  try {
    parsed = JSON.parse(content);
  } catch {
    parsed = JSON.parse(content.slice(content.indexOf("{"), content.lastIndexOf("}") + 1));
  }

  const valid = new Set(AGENTS.filter((a) => !a.primary).map((a) => a.key));
  return {
    reponse: String(parsed.reponse ?? "Je m'en occupe."),
    memoire: Array.isArray(parsed.memoire) ? parsed.memoire.map(String).slice(0, 6) : [],
    taches: (Array.isArray(parsed.taches) ? parsed.taches : [])
      .filter((t: any) => valid.has(t?.agent_key))
      .slice(0, 4)
      .map((t: any) => ({
        agent_key: String(t.agent_key),
        title: String(t.title ?? "Tâche"),
        detail: String(t.detail ?? ""),
        priority: (["basse", "normale", "haute"].includes(t.priority) ? t.priority : "normale") as
          | "basse"
          | "normale"
          | "haute",
      })),
    prochaine_action: String(parsed.prochaine_action ?? ""),
  };
}
