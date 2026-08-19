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

  return {
    organisation: org?.data ?? null,
    prospects,
    clients,
    devis: quotes,
    factures: invoices,
    projets: projects,
    taches: tasks,
    campagnes: campaigns,
    candidats: candidates,
    historique_agents: agentTasks,
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
): Promise<string> {
  const meta = AGENTS.find((a) => a.key === agent.key);
  const content = await chat(
    [
      {
        role: "system",
        content: `Tu es ${agent.name}, ${agent.role} chez Kobyde. ${meta?.description ?? ""}
Tu exécutes la tâche confiée par Éric, le Directeur IA. Tu partages la mémoire centrale de l'entreprise.
Réponds en français, 4 à 10 lignes maximum, format concret et actionnable (listes courtes, chiffres, noms réels de la mémoire).
Si une information manque, dis précisément ce qu'il faut fournir. Pas de blabla, pas de markdown lourd.`,
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
