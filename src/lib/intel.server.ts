import type { SupabaseClient } from "@supabase/supabase-js";
import { loadCompanyMemory } from "./eric.server";
import { WATCH_AXES, type Source } from "./intel";

/* eslint-disable @typescript-eslint/no-explicit-any */

const ETHAN = `Tu es Ethan, l'agent IA « Analyse et veille » de Kobyde.
Tu écris en français, de façon factuelle, structurée et actionnable, sans jargon inutile.
Règle absolue : tu n'inventes JAMAIS une donnée, un chiffre, un prix, une levée de fonds ni un concurrent.
Toute information issue du web doit être accompagnée de sa source (titre + URL réelle).
Si une information n'est pas trouvée ou pas vérifiable, tu écris exactement « Non trouvé ».`;

/** Appelle le modèle. `grounded` active la recherche Google (Grounding) pour des données réelles sourcées. */
async function chat(system: string, user: string, grounded = false): Promise<any> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("Clé IA indisponible.");

  const body: Record<string, any> = {
    model: "google/gemini-2.5-flash",
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  };
  if (grounded) {
    // Grounding with Google Search : données réelles et récentes, avec sources.
    body["tools"] = [{ type: "google_search" }];
  } else {
    body["response_format"] = { type: "json_object" };
  }

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(body),
  });

  if (res.status === 429) throw new Error("Trop de demandes d'un coup, réessayez dans un instant.");
  if (res.status === 402) throw new Error("Crédits IA épuisés.");
  if (!res.ok) throw new Error(`Erreur IA (${res.status})`);

  const json = (await res.json()) as any;
  const content: string = json?.choices?.[0]?.message?.content ?? "{}";
  return parseJson(content);
}

function parseJson(content: string): any {
  const cleaned = content.replace(/```json/gi, "```").split("```").join("\n");
  const candidates = [content, cleaned];
  for (const c of candidates) {
    try {
      return JSON.parse(c.trim());
    } catch {
      const start = c.indexOf("{");
      const end = c.lastIndexOf("}");
      if (start >= 0 && end > start) {
        try {
          return JSON.parse(c.slice(start, end + 1));
        } catch {
          /* suite */
        }
      }
    }
  }
  throw new Error("Réponse IA illisible, réessayez.");
}

const mem = async (supabase: SupabaseClient<any>, orgId: string) =>
  `Mémoire centrale de l'entreprise (JSON) :\n${JSON.stringify(await loadCompanyMemory(supabase, orgId)).slice(0, 8000)}`;

const txt = (v: any, depth = 0): string => {
  if (v === null || v === undefined) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  const pad = "  ".repeat(depth);
  if (Array.isArray(v)) return v.map((x) => `${pad}- ${txt(x, depth + 1).trim()}`).join("\n");
  return Object.entries(v)
    .map(([k, val]) => `${pad}${k.replace(/_/g, " ")} : ${txt(val, depth + 1).trim()}`)
    .join("\n");
};

const list = (v: any, max = 15): string[] =>
  (Array.isArray(v) ? v : []).map((x) => txt(x).trim()).filter(Boolean).slice(0, max);

const sources = (v: any, max = 20): Source[] =>
  (Array.isArray(v) ? v : [])
    .map((s: any) => ({
      titre: String(s?.titre ?? s?.title ?? s?.source ?? "Source").slice(0, 200),
      url: String(s?.url ?? s?.lien ?? "").slice(0, 800),
      date: s?.date ? String(s.date).slice(0, 40) : undefined,
    }))
    .filter((s) => !!s.url)
    .slice(0, max);

const JSON_ONLY = `Réponds UNIQUEMENT avec un objet JSON valide, sans texte avant ni après, sans bloc de code.`;

/* ------------------------------- Analyses ------------------------------- */

export type SectionAnalysis = { sections: Record<string, string>; synthese: string; sources: Source[] };

const SECTION_SETS = {
  business_plan: ["entreprise", "marche", "cible", "offre", "modele_economique", "strategie", "risques", "opportunites"],
  market_study: ["marche", "demande", "tendances", "clients", "concurrents", "opportunites", "risques"],
  sector: ["evolution_du_secteur", "tendances", "acteurs", "technologies", "opportunites", "menaces"],
} as const;

export type AnalysisKind = keyof typeof SECTION_SETS;

export async function generateAnalysisAI(
  supabase: SupabaseClient<any>,
  orgId: string,
  kind: AnalysisKind,
  input: { scope: string; notes: string },
): Promise<SectionAnalysis> {
  const keys = SECTION_SETS[kind];
  const label =
    kind === "business_plan" ? "un business plan" : kind === "market_study" ? "une étude de marché" : "une analyse sectorielle";

  const shape = `{${keys.map((k) => `"${k}":""`).join(",")},"synthese":"","sources":[{"titre":"","url":"","date":""}]}`;

  const p = await chat(
    `${ETHAN}
Tu produis ${label} pour l'entreprise.
Chaque rubrique est un texte développé et concret (des puces avec « - » sont autorisées).
Tu t'appuies sur des données réelles et récentes trouvées sur le web, et tu cites tes sources dans "sources".
${JSON_ONLY}
Format : ${shape}`,
    `${await mem(supabase, orgId)}\n\nPérimètre : ${input.scope || "activité principale de l'entreprise"}\nInformations complémentaires : ${input.notes || "aucune"}`,
    true,
  );

  const out: Record<string, string> = {};
  for (const k of keys) out[k] = txt(p?.[k]).slice(0, 6000) || "Non trouvé";
  return { sections: out, synthese: txt(p?.synthese).slice(0, 3000), sources: sources(p?.sources) };
}

/* -------------------------- Analyse concurrentielle -------------------------- */

export type CompetitiveResult = {
  concurrents: {
    nom: string;
    offre: string;
    fonctionnalites: string;
    prix_publics: string;
    positionnement: string;
    cible: string;
    avantages: string;
    differenciation: string;
    promesse: string;
    visibilite: string;
    sources: Source[];
  }[];
  forces: string[];
  faiblesses: string[];
  ecarts: string[];
  opportunites: string[];
  recommandations: string[];
  sources: Source[];
};

export async function generateCompetitiveAI(
  supabase: SupabaseClient<any>,
  orgId: string,
  input: { competitors: string; notes: string },
): Promise<CompetitiveResult> {
  const p = await chat(
    `${ETHAN}
Tu réalises une analyse concurrentielle en t'appuyant sur la recherche Google (données réelles et publiques uniquement).
Pour chaque concurrent tu compares : offre, fonctionnalités, prix publics, positionnement, cible, avantages, différenciation, promesse, visibilité.
Un prix non publié doit être écrit « Non trouvé » : tu n'estimes jamais un prix.
Chaque concurrent doit avoir au moins une source (URL réelle).
Tu donnes ensuite les forces et faiblesses de MON entreprise face à eux, les écarts, les opportunités, et 3 à 5 recommandations concrètes.
${JSON_ONLY}
Format : {"concurrents":[{"nom":"","offre":"","fonctionnalites":"","prix_publics":"","positionnement":"","cible":"","avantages":"","differenciation":"","promesse":"","visibilite":"","sources":[{"titre":"","url":"","date":""}]}],"forces":[""],"faiblesses":[""],"ecarts":[""],"opportunites":[""],"recommandations":[""],"sources":[{"titre":"","url":"","date":""}]}`,
    `${await mem(supabase, orgId)}\n\nConcurrents à analyser : ${input.competitors || "identifie toi-même les 3 à 5 concurrents les plus pertinents"}\nInformations complémentaires : ${input.notes || "aucune"}`,
    true,
  );

  return {
    concurrents: (Array.isArray(p?.concurrents) ? p.concurrents : []).slice(0, 8).map((c: any) => ({
      nom: String(c?.nom ?? "Concurrent").slice(0, 160),
      offre: txt(c?.offre).slice(0, 2000) || "Non trouvé",
      fonctionnalites: txt(c?.fonctionnalites).slice(0, 2000) || "Non trouvé",
      prix_publics: txt(c?.prix_publics).slice(0, 1200) || "Non trouvé",
      positionnement: txt(c?.positionnement).slice(0, 1200) || "Non trouvé",
      cible: txt(c?.cible).slice(0, 1200) || "Non trouvé",
      avantages: txt(c?.avantages).slice(0, 1500) || "Non trouvé",
      differenciation: txt(c?.differenciation).slice(0, 1500) || "Non trouvé",
      promesse: txt(c?.promesse).slice(0, 800) || "Non trouvé",
      visibilite: txt(c?.visibilite).slice(0, 1200) || "Non trouvé",
      sources: sources(c?.sources, 6),
    })),
    forces: list(p?.forces, 8),
    faiblesses: list(p?.faiblesses, 8),
    ecarts: list(p?.ecarts, 8),
    opportunites: list(p?.opportunites, 8),
    recommandations: list(p?.recommandations, 5),
    sources: sources(p?.sources),
  };
}

/* --------------------------------- Veille --------------------------------- */

export type WatchResult = {
  items: {
    titre: string;
    categorie: string;
    acteur: string;
    date: string;
    resume: string;
    impact: string;
    source: Source | null;
  }[];
  synthese: string;
  actions: string[];
  sources: Source[];
};

export async function runWatchAI(
  supabase: SupabaseClient<any>,
  orgId: string,
  input: { kind: "concurrentielle" | "generale"; subject: string; competitors: string },
): Promise<WatchResult> {
  const focus =
    input.kind === "concurrentielle"
      ? `Tu surveilles les concurrents sur ces axes : ${WATCH_AXES.join(", ")}.
Concurrents surveillés : ${input.competitors || "les concurrents les plus pertinents du secteur"}.`
      : `Tu réalises une veille générale sur le sujet demandé : informations récentes, sources, analyse et synthèse.`;

  const p = await chat(
    `${ETHAN}
Tu produis un briefing de veille à partir d'informations RÉCENTES trouvées via la recherche Google.
${focus}
Chaque information doit avoir une source réelle (titre + URL) et une date si disponible.
Le champ "impact" explique en une phrase ce que cela change pour mon entreprise.
${JSON_ONLY}
Format : {"items":[{"titre":"","categorie":"","acteur":"","date":"","resume":"","impact":"","source":{"titre":"","url":"","date":""}}],"synthese":"","actions":[""],"sources":[{"titre":"","url":"","date":""}]}`,
    `${await mem(supabase, orgId)}\n\nSujet de veille : ${input.subject}\nDate du jour : ${new Date().toISOString().slice(0, 10)}`,
    true,
  );

  return {
    items: (Array.isArray(p?.items) ? p.items : []).slice(0, 20).map((i: any) => ({
      titre: String(i?.titre ?? "").slice(0, 240),
      categorie: String(i?.categorie ?? "").slice(0, 80),
      acteur: String(i?.acteur ?? "").slice(0, 120),
      date: String(i?.date ?? "").slice(0, 40),
      resume: txt(i?.resume).slice(0, 1500),
      impact: txt(i?.impact).slice(0, 800),
      source: sources([i?.source], 1)[0] ?? null,
    })),
    synthese: txt(p?.synthese).slice(0, 3000),
    actions: list(p?.actions, 8),
    sources: sources(p?.sources),
  };
}

/* ------------------------------ E-réputation ------------------------------ */

export type ReputationResult = {
  mentions: {
    source: string;
    lien: string;
    page: string;
    section: string;
    sujet: string;
    sentiment: string;
    resume: string;
    importance: string;
    auteur: string;
    note: number | null;
    date: string;
  }[];
  synthese: string;
  points_forts: string[];
  points_faibles: string[];
  actions: string[];
};

const SENT = (v: any) => {
  const s = String(v ?? "").toLowerCase();
  return s.includes("posit") ? "positif" : s.includes("nég") || s.includes("neg") ? "négatif" : "neutre";
};

const IMP = (v: any) => {
  const s = String(v ?? "").toLowerCase();
  if (s.includes("crit")) return "critique";
  if (s.includes("élev") || s.includes("elev") || s.includes("haut")) return "élevée";
  if (s.includes("faib") || s.includes("bas")) return "faible";
  return "normale";
};

export async function analyzeReputationAI(
  supabase: SupabaseClient<any>,
  orgId: string,
  input: { query: string; notes: string },
): Promise<ReputationResult> {
  const p = await chat(
    `${ETHAN}
Tu analyses l'e-réputation de l'entreprise : ce qui est dit d'elle sur Internet.
Tu utilises la recherche Google et tu couvres : avis Google, mentions, articles, réseaux sociaux et pages web.
Chaque mention doit être réelle et vérifiable avec un lien (URL). Si tu ne trouves rien, renvoie une liste vide plutôt que d'inventer.
"sentiment" vaut positif, neutre ou négatif. "importance" vaut faible, normale, élevée ou critique.
${JSON_ONLY}
Format : {"mentions":[{"source":"","lien":"","page":"","section":"","sujet":"","sentiment":"","resume":"","importance":"","auteur":"","note":null,"date":""}],"synthese":"","points_forts":[""],"points_faibles":[""],"actions":[""]}`,
    `${await mem(supabase, orgId)}\n\nRecherche à effectuer sur : ${input.query || "le nom de l'entreprise"}\nInformations complémentaires : ${input.notes || "aucune"}`,
    true,
  );

  return {
    mentions: (Array.isArray(p?.mentions) ? p.mentions : []).slice(0, 25).map((m: any) => ({
      source: String(m?.source ?? "Web").slice(0, 120),
      lien: String(m?.lien ?? m?.url ?? "").slice(0, 800),
      page: String(m?.page ?? "").slice(0, 200),
      section: String(m?.section ?? "").slice(0, 200),
      sujet: String(m?.sujet ?? "").slice(0, 240),
      sentiment: SENT(m?.sentiment),
      resume: txt(m?.resume).slice(0, 1200),
      importance: IMP(m?.importance),
      auteur: String(m?.auteur ?? "").slice(0, 120),
      note: typeof m?.note === "number" ? m.note : null,
      date: String(m?.date ?? "").slice(0, 40),
    })),
    synthese: txt(p?.synthese).slice(0, 3000),
    points_forts: list(p?.points_forts, 8),
    points_faibles: list(p?.points_faibles, 8),
    actions: list(p?.actions, 8),
  };
}

export async function draftReviewReplyAI(
  supabase: SupabaseClient<any>,
  orgId: string,
  input: { author: string; rating: number | null; content: string; source: string; tone: string },
): Promise<{ reponse: string; sentiment: string; conseils: string[] }> {
  const p = await chat(
    `${ETHAN}
Tu rédiges la réponse publique de l'entreprise à un avis client.
Ton : ${input.tone || "professionnel, humain et posé"}. 4 à 8 lignes maximum, signée par l'entreprise.
Tu ne promets jamais un geste commercial non validé, tu n'inventes aucun fait et tu ne divulgues aucune donnée privée.
Si l'avis est négatif : reconnaître, expliquer sans se justifier, proposer un contact direct.
${JSON_ONLY}
Format : {"reponse":"","sentiment":"","conseils":[""]}`,
    `${await mem(supabase, orgId)}\n\nSource : ${input.source}\nAuteur : ${input.author || "client"}\nNote : ${input.rating ?? "non précisée"}\nAvis : ${input.content}`,
  );

  return {
    reponse: txt(p?.reponse).slice(0, 3000),
    sentiment: SENT(p?.sentiment),
    conseils: list(p?.conseils, 5),
  };
}
