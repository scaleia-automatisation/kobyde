import type { SupabaseClient } from "@supabase/supabase-js";
import { loadCompanyMemory } from "./eric.server";
import { SITE_SECTIONS } from "./marketing";

/* eslint-disable @typescript-eslint/no-explicit-any */

async function chatJson(system: string, user: string): Promise<any> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("Clé IA indisponible.");

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

const LAMINE = `Tu es Lamine, l'agent IA « Marketing et contenu » de Kobyde.
Tu écris en français, de façon concrète, sans jargon et sans superlatif creux.
Règle absolue : tu n'inventes jamais une preuve, un chiffre, un témoignage, un label ni une référence client.
Si une preuve manque, tu écris exactement « À fournir » et tu expliques quelle preuve obtenir.`;

const mem = async (supabase: SupabaseClient<any>, orgId: string) =>
  `Mémoire centrale de l'entreprise (JSON) :\n${JSON.stringify(await loadCompanyMemory(supabase, orgId)).slice(0, 8000)}`;

const arr = (v: any, max = 12): string[] =>
  (Array.isArray(v) ? v : []).map((x) => String(typeof x === "string" ? x : JSON.stringify(x))).slice(0, max);

export type PromiseResult = {
  promesse: string;
  variantes: string[];
  version_resultat: string;
  version_transformation: string;
  version_performance: string;
  version_courte: string;
  benefice: string;
  credibilite: string;
};

export async function generatePromiseAI(
  supabase: SupabaseClient<any>,
  orgId: string,
  input: { offer: string; audience: string; notes: string },
): Promise<PromiseResult> {
  const p = await chatJson(
    `${LAMINE}
Tu génères la promesse marketing de l'entreprise.
Réponds uniquement en JSON :
{"promesse":"","variantes":["","",""],"version_resultat":"","version_transformation":"","version_performance":"","version_courte":"","benefice":"","credibilite":""}`,
    `${await mem(supabase, orgId)}\n\nOffre concernée : ${input.offer || "offre principale de l'entreprise"}\nCible : ${input.audience || "cible principale"}\nInformations complémentaires : ${input.notes}`,
  );
  return {
    promesse: String(p?.promesse ?? "").slice(0, 400),
    variantes: arr(p?.variantes, 3),
    version_resultat: String(p?.version_resultat ?? "").slice(0, 400),
    version_transformation: String(p?.version_transformation ?? "").slice(0, 400),
    version_performance: String(p?.version_performance ?? "").slice(0, 400),
    version_courte: String(p?.version_courte ?? "").slice(0, 160),
    benefice: toText(p?.benefice).slice(0, 600),
    credibilite: toText(p?.credibilite).slice(0, 1200),
  };
}

export type ValuePropResult = {
  proposition: string;
  benefice: string;
  differenciation: string;
  variantes: string[];
  accroche: string;
  preuves: string[];
};

export async function generateValuePropAI(
  supabase: SupabaseClient<any>,
  orgId: string,
  input: { mode: "generer" | "optimiser" | "concurrents"; offer: string; audience: string; notes: string; current: string; competitors: string },
): Promise<ValuePropResult & { analyse_concurrents?: string[] }> {
  const task =
    input.mode === "optimiser"
      ? "Tu optimises la proposition de valeur existante fournie : tu la rends plus claire, plus spécifique et plus différenciante."
      : input.mode === "concurrents"
        ? "Tu analyses les propositions de valeur des concurrents fournies, puis tu proposes une proposition de valeur qui se différencie réellement. Remplis aussi analyse_concurrents (une ligne par concurrent : ce qu'il promet, sa faiblesse)."
        : "Tu génères la proposition de valeur de l'entreprise.";

  const p = await chatJson(
    `${LAMINE}
${task}
Réponds uniquement en JSON :
{"proposition":"","benefice":"","differenciation":"","variantes":["","",""],"accroche":"","preuves":[""],"analyse_concurrents":[""]}`,
    `${await mem(supabase, orgId)}\n\nOffre : ${input.offer}\nCible : ${input.audience}\nProposition actuelle : ${input.current || "aucune"}\nConcurrents : ${input.competitors || "non précisés"}\nInformations complémentaires : ${input.notes}`,
  );

  return {
    proposition: String(p?.proposition ?? "").slice(0, 500),
    benefice: toText(p?.benefice).slice(0, 600),
    differenciation: toText(p?.differenciation).slice(0, 800),
    variantes: arr(p?.variantes, 3),
    accroche: String(p?.accroche ?? "").slice(0, 200),
    preuves: arr(p?.preuves, 8),
    analyse_concurrents: arr(p?.analyse_concurrents, 8),
  };
}

export type SiteBrief = Record<string, string>;

/** Aplatit une valeur IA (texte, liste ou objet) en texte lisible avec des puces. */
function toText(v: any, depth = 0): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  const pad = "  ".repeat(depth);
  if (Array.isArray(v)) return v.map((x) => `${pad}- ${toText(x, depth + 1).trim()}`).join("\n");
  return Object.entries(v)
    .map(([k, val]) => `${pad}${k.replace(/_/g, " ")} : ${toText(val, depth + 1).trim()}`)
    .join("\n");
}

export async function generateSiteBriefAI(
  supabase: SupabaseClient<any>,
  orgId: string,
  input: { siteType: string; product: string; notes: string },
): Promise<SiteBrief> {
  const p = await chatJson(
    `${LAMINE}
Tu rédiges un briefing de site web complet et actionnable.
Chaque champ est un texte clair (listes à puces avec des tirets autorisées).
Réponds uniquement en JSON avec exactement ces clés :
{"contexte":"","objectifs":"","entreprise":"","produit_service":"","cible":"","positionnement":"","parcours":"","architecture":"","pages":"","direction_artistique":"","seo":"","geo":"","conversion":"","contenus_necessaires":""}`,
    `${await mem(supabase, orgId)}\n\nType de site : ${input.siteType}\nProduit / service : ${input.product}\nInformations complémentaires : ${input.notes}`,
  );

  const out: SiteBrief = {};
  for (const k of [
    "contexte",
    "objectifs",
    "entreprise",
    "produit_service",
    "cible",
    "positionnement",
    "parcours",
    "architecture",
    "pages",
    "direction_artistique",
    "seo",
    "geo",
    "conversion",
    "contenus_necessaires",
  ]) {
    out[k] = toText(p?.[k]).slice(0, 4000);
  }
  return out;
}

export type SiteContent = {
  strategie: string;
  architecture: string[];
  identite_visuelle: { palette: string; polices: string; style: string; principes: string };
  pages: {
    page: string;
    objectif: string;
    seo: { title: string; description: string; mots_cles: string[] };
    sections: {
      section: string;
      pourquoi: string;
      titre: string;
      texte: string;
      cta: string;
      prompt_image: string;
      prompt_icone: string;
    }[];
  }[];
  geo: string;
  cta_global: string;
};

export async function generateSiteContentAI(
  supabase: SupabaseClient<any>,
  orgId: string,
  input: {
    siteType: string;
    pages: string;
    product: string;
    brief: string;
    audience: string;
    goal: string;
    tone: string;
    location: string;
    keywords: string;
    language: string;
    font: string;
    palette: string;
    style: string;
    cta: string;
  },
): Promise<SiteContent> {
  const p = await chatJson(
    `${LAMINE}
Tu produis le contenu complet d'un site, page par page et section par section.
Sections autorisées : ${SITE_SECTIONS.join(", ")}.
Tu n'ajoutes JAMAIS une section uniquement pour remplir : chaque section doit être justifiée dans le champ "pourquoi".
Pour chaque section tu écris un vrai texte publiable (pas un plan), un CTA si pertinent, un prompt d'image et un prompt d'icône en anglais.
Le SEO est par page (title max 60 caractères, description max 155). Le GEO explique comment être cité par les moteurs de réponse IA.
Réponds uniquement en JSON :
{"strategie":"","architecture":[""],"identite_visuelle":{"palette":"","polices":"","style":"","principes":""},"pages":[{"page":"","objectif":"","seo":{"title":"","description":"","mots_cles":[""]},"sections":[{"section":"","pourquoi":"","titre":"","texte":"","cta":"","prompt_image":"","prompt_icone":""}]}],"geo":"","cta_global":""}`,
    `${await mem(supabase, orgId)}

Type de site : ${input.siteType}
Pages souhaitées : ${input.pages}
Produit / service : ${input.product}
Briefing : ${input.brief.slice(0, 6000)}
Cible : ${input.audience}
Objectif : ${input.goal}
Ton : ${input.tone}
Localisation : ${input.location}
Mots-clés : ${input.keywords}
Langue : ${input.language}
Police : ${input.font}
Palette : ${input.palette}
Style : ${input.style}
CTA principal : ${input.cta}`,
  );

  const pages = (Array.isArray(p?.pages) ? p.pages : []).slice(0, 12).map((pg: any) => ({
    page: String(pg?.page ?? "").slice(0, 120),
    objectif: toText(pg?.objectif).slice(0, 400),
    seo: {
      title: String(pg?.seo?.title ?? "").slice(0, 120),
      description: String(pg?.seo?.description ?? "").slice(0, 300),
      mots_cles: arr(pg?.seo?.mots_cles, 12),
    },
    sections: (Array.isArray(pg?.sections) ? pg.sections : []).slice(0, 20).map((s: any) => ({
      section: String(s?.section ?? "").slice(0, 80),
      pourquoi: toText(s?.pourquoi).slice(0, 400),
      titre: String(s?.titre ?? "").slice(0, 200),
      texte: toText(s?.texte).slice(0, 4000),
      cta: String(s?.cta ?? "").slice(0, 160),
      prompt_image: String(s?.prompt_image ?? "").slice(0, 600),
      prompt_icone: String(s?.prompt_icone ?? "").slice(0, 300),
    })),
  }));

  return {
    strategie: toText(p?.strategie).slice(0, 4000),
    architecture: arr(p?.architecture, 20),
    identite_visuelle: {
      palette: String(p?.identite_visuelle?.palette ?? "").slice(0, 600),
      polices: String(p?.identite_visuelle?.polices ?? "").slice(0, 400),
      style: String(p?.identite_visuelle?.style ?? "").slice(0, 600),
      principes: String(p?.identite_visuelle?.principes ?? "").slice(0, 1200),
    },
    pages,
    geo: toText(p?.geo).slice(0, 3000),
    cta_global: String(p?.cta_global ?? "").slice(0, 300),
  };
}
