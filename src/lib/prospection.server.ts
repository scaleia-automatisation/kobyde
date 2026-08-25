import type { SupabaseClient } from "@supabase/supabase-js";
import { loadCompanyMemory } from "./eric.server";

/* eslint-disable @typescript-eslint/no-explicit-any */

export const CHANNELS = [
  "LinkedIn",
  "Facebook",
  "Instagram",
  "TikTok",
  "Youtube",
  "Google Maps",
  "Google Search",
] as const;

export const TOOLS = ["Automatique", "Apify"] as const;

export type SearchParams = {
  target: string;
  continent: string;
  country: string;
  region: string;
  department: string;
  city: string;
  district: string;
  count: number;
  offer: string;
  channel: string;
  tool: string;
};

/** Étapes officielles du workflow de prospection de Jason. */
export const WORKFLOW_STEPS = [
  "Entreprise + Offre + Persona + Cible + Localisation",
  "Recherche",
  "Enrichissement",
  "Vérification",
  "Déduplication",
  "Analyse",
  "Qualification",
  "Score",
  "Angle commercial",
  "Personnalisation",
  "Prospection",
  "Suivi",
  "Conversion",
] as const;

export const NOT_FOUND = "Non trouvé";

const NEVER_INVENT = `RÈGLE ABSOLUE ET NON NÉGOCIABLE :
- Tu ne dois JAMAIS inventer une entreprise, une personne, un email, un téléphone, un site web ou une adresse qui n'existe pas.
- Si une information n'est pas trouvée ou n'est pas certaine, écris exactement "${NOT_FOUND}".
- Chaque donnée importante doit conserver sa source quand c'est possible (nom de la source + URL). Si la source est inconnue, écris "${NOT_FOUND}".
- Aucun exemple fictif, aucun placeholder du type "exemple.com", "John Doe", "société ABC".`;

async function chatJson(system: string, user: string): Promise<any> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("AI indisponible : clé manquante.");

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      response_format: { type: "json_object" },
    }),
  });

  if (res.status === 429) throw new Error("Trop de demandes d'un coup, réessayez dans un instant.");
  if (res.status === 402) throw new Error("Crédits IA épuisés.");
  if (!res.ok) throw new Error(`Erreur IA (${res.status})`);

  const json = (await res.json()) as any;
  const content: string = json?.choices?.[0]?.message?.content ?? "{}";
  try {
    return JSON.parse(content);
  } catch {
    return JSON.parse(content.slice(content.indexOf("{"), content.lastIndexOf("}") + 1));
  }
}

export async function loadMemory(supabase: SupabaseClient<any>, orgId: string) {
  return loadCompanyMemory(supabase, orgId);
}

function locationText(p: SearchParams) {
  return [
    p.continent && `continent : ${p.continent}`,
    p.country && `pays : ${p.country}`,
    p.region && `région : ${p.region}`,
    p.department && `département : ${p.department}`,
    p.city && `ville : ${p.city}`,
    p.district && `quartier : ${p.district}`,
  ]
    .filter(Boolean)
    .join(" · ") || NOT_FOUND;
}

export type Persona = {
  titre: string;
  resume: string;
  profil: string[];
  problemes: string[];
  objectifs: string[];
  objections: string[];
  ou_les_trouver: string[];
  messages_cles: string[];
};

export async function generatePersonaAI(params: SearchParams, memory: unknown): Promise<Persona> {
  const parsed = await chatJson(
    `Tu es Jason, agent IA commercial du SaaS Kobyde. Tu construis le persona du client idéal.
Tu t'appuies uniquement sur la fiche entreprise fournie et sur les paramètres de recherche.
${NEVER_INVENT}
Réponds UNIQUEMENT par un JSON valide :
{"titre":"...","resume":"3 phrases max","profil":["..."],"problemes":["..."],"objectifs":["..."],"objections":["..."],"ou_les_trouver":["..."],"messages_cles":["..."]}`,
    `Mémoire de l'entreprise (JSON) :\n${JSON.stringify(memory).slice(0, 9000)}

Paramètres :
- cible : ${params.target || NOT_FOUND}
- localisation : ${locationText(params)}
- produit/service : ${params.offer || NOT_FOUND}
- canal : ${params.channel}
- outil : ${params.tool}`,
  );

  const arr = (v: any) => (Array.isArray(v) ? v.map(String).slice(0, 8) : []);
  return {
    titre: String(parsed.titre ?? "Persona"),
    resume: String(parsed.resume ?? ""),
    profil: arr(parsed.profil),
    problemes: arr(parsed.problemes),
    objectifs: arr(parsed.objectifs),
    objections: arr(parsed.objections),
    ou_les_trouver: arr(parsed.ou_les_trouver),
    messages_cles: arr(parsed.messages_cles),
  };
}

export type FoundProspect = {
  company_name: string;
  full_name: string;
  email: string;
  phone: string;
  website: string;
  city: string;
  channel: string;
  source_url: string;
  sources: { champ: string; source: string; url: string }[];
  qualification: string;
  score: number;
  angle: string;
  personalized_message: string;
  notes: string;
};

export async function findProspectsAI(
  params: SearchParams,
  persona: string,
  memory: unknown,
  exclude: string[] = [],
): Promise<{ prospects: FoundProspect[]; rapport: string; etapes: { step: string; detail: string }[] }> {
  const parsed = await chatJson(
    `Tu es Jason, agent IA commercial du SaaS Kobyde, spécialiste de la génération de prospects B2B réels.
Tu appliques dans l'ordre ce workflow : ${WORKFLOW_STEPS.join(" → ")}.
${NEVER_INVENT}
Tu ne renvoies que des entreprises dont tu es raisonnablement certain de l'existence réelle et publique.
Il vaut mieux renvoyer 3 prospects réels que 50 inventés.
Pour chaque champ inconnu : "${NOT_FOUND}".
Réponds UNIQUEMENT par un JSON valide :
{"rapport":"résumé clair en 3 à 6 phrases, précise combien de prospects réels ont été trouvés et ce qui manque",
"etapes":[{"step":"Recherche","detail":"..."}],
"prospects":[{"company_name":"...","full_name":"${NOT_FOUND}","email":"${NOT_FOUND}","phone":"${NOT_FOUND}","website":"...","city":"...","channel":"${params.channel}","source_url":"...","sources":[{"champ":"website","source":"Google Search","url":"..."}],"qualification":"chaud|tiède|froid + raison","score":0,"angle":"angle commercial","personalized_message":"message de prospection personnalisé (4 lignes max)","notes":"..."}]}
Renvoie au maximum ${params.count} prospects. "etapes" doit couvrir les 13 étapes du workflow.`,
    `Mémoire de l'entreprise (JSON) :\n${JSON.stringify(memory).slice(0, 8000)}

Persona validé :
${persona || NOT_FOUND}

Paramètres de recherche :
- cible : ${params.target || NOT_FOUND}
- localisation : ${locationText(params)}
- nombre de résultats souhaités : ${params.count}
- produit/service : ${params.offer || NOT_FOUND}
- canal : ${params.channel}
- outil : ${params.tool}

Entreprises DÉJÀ présentes dans la base ou déjà contactées — ne les renvoie pas, cherche d'autres entreprises :
${exclude.length ? exclude.slice(0, 200).map((e) => `- ${e}`).join("\n") : "- aucune"}`,
  );

  const s = (v: any) => (v === undefined || v === null || String(v).trim() === "" ? NOT_FOUND : String(v));
  const prospects: FoundProspect[] = (Array.isArray(parsed.prospects) ? parsed.prospects : [])
    .slice(0, Math.max(0, Math.min(100, params.count)))
    .map((p: any) => ({
      company_name: s(p.company_name),
      full_name: s(p.full_name),
      email: s(p.email),
      phone: s(p.phone),
      website: s(p.website),
      city: s(p.city),
      channel: s(p.channel ?? params.channel),
      source_url: s(p.source_url),
      sources: Array.isArray(p.sources)
        ? p.sources.slice(0, 6).map((x: any) => ({
            champ: s(x?.champ),
            source: s(x?.source),
            url: s(x?.url),
          }))
        : [],
      qualification: s(p.qualification),
      score: Math.max(0, Math.min(100, Number(p.score) || 0)),
      angle: s(p.angle),
      personalized_message: s(p.personalized_message),
      notes: s(p.notes),
    }))
    // Déduplication sur le nom d'entreprise + site.
    .filter((p: FoundProspect, i: number, all: FoundProspect[]) => {
      if (p.company_name === NOT_FOUND && p.full_name === NOT_FOUND) return false;
      const id = `${p.company_name.toLowerCase()}|${p.website.toLowerCase()}`;
      return all.findIndex((o) => `${o.company_name.toLowerCase()}|${o.website.toLowerCase()}` === id) === i;
    });

  const etapes = (Array.isArray(parsed.etapes) ? parsed.etapes : []).map((e: any) => ({
    step: String(e?.step ?? ""),
    detail: String(e?.detail ?? ""),
  }));

  return {
    prospects,
    rapport: String(parsed.rapport ?? ""),
    etapes: etapes.length ? etapes : WORKFLOW_STEPS.map((step) => ({ step, detail: "Effectué" })),
  };
}
