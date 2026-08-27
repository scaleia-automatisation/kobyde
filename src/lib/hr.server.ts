import type { SupabaseClient } from "@supabase/supabase-js";
import { unzipSync, strFromU8 } from "fflate";
import { loadCompanyMemory } from "./eric.server";

/* eslint-disable @typescript-eslint/no-explicit-any */

const MARIEME = `Tu es Mariéme, l'agent IA « Ressources humaines et recrutement » de Kobyde.
Tu écris en français, de façon factuelle, neutre et professionnelle.
Règle absolue : tu n'inventes JAMAIS une information (diplôme, entreprise, date, compétence, coordonnée).
Si une information est absente du document, tu écris exactement « Non trouvé ».
Tu n'évalues jamais une personne sur l'âge, le genre, l'origine, la religion, la santé ou la situation familiale : uniquement sur les compétences et l'expérience.
Tu restes une aide à la décision : la décision finale appartient à l'humain.`;

const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

function parseJson(content: string): any {
  try {
    return JSON.parse(content.trim());
  } catch {
    const s = content.indexOf("{");
    const e = content.lastIndexOf("}");
    if (s >= 0 && e > s) {
      try {
        return JSON.parse(content.slice(s, e + 1));
      } catch {
        /* suite */
      }
    }
    return {};
  }
}

/** Appel IA générique acceptant des blocs multimodaux (texte, PDF, audio). */
async function chatJson(system: string, content: any): Promise<any> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("Clé IA indisponible.");

  const res = await fetch(GATEWAY, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: system },
        { role: "user", content },
      ],
      response_format: { type: "json_object" },
    }),
  });

  if (res.status === 429) throw new Error("Trop de demandes d'un coup, réessayez dans un instant.");
  if (res.status === 402) throw new Error("Crédits IA épuisés.");
  if (res.status === 403) throw new Error("L'IA est indisponible pour cet espace de travail.");
  if (!res.ok) throw new Error(`Erreur IA (${res.status})`);

  const json = (await res.json()) as any;
  return parseJson(String(json?.choices?.[0]?.message?.content ?? "{}"));
}

const txt = (v: any): string => {
  if (v === null || v === undefined) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  if (Array.isArray(v)) return v.map((x) => `- ${txt(x).trim()}`).join("\n");
  return Object.entries(v)
    .map(([k, val]) => `${k.replace(/_/g, " ")} : ${txt(val).trim()}`)
    .join("\n");
};

const list = (v: any, max = 20): string[] =>
  (Array.isArray(v) ? v : []).map((x) => (typeof x === "string" ? x : txt(x))).filter(Boolean).slice(0, max);

const num = (v: any, max = 100) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.min(max, Math.max(0, n)) : 0;
};

const mem = async (supabase: SupabaseClient<any>, orgId: string) =>
  `Mémoire centrale de l'entreprise (JSON) :\n${JSON.stringify(await loadCompanyMemory(supabase, orgId)).slice(0, 6000)}`;

/* ---------------------------------- Fichiers --------------------------------- */

export function base64ToBytes(b64: string): Uint8Array {
  const clean = b64.includes(",") ? b64.slice(b64.indexOf(",") + 1) : b64;
  const bin = atob(clean);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** Extrait le texte d'un .docx (zip OOXML) sans dépendance native. */
export function docxToText(b64: string): string {
  const files = unzipSync(base64ToBytes(b64));
  const doc = files["word/document.xml"];
  if (!doc) return "";
  const xml = strFromU8(doc);
  return xml
    .replace(/<w:p[^>]*>/g, "\n")
    .replace(/<w:tab[^>]*\/>/g, "\t")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#x2019;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export type UploadedFile = { name: string; mime: string; base64: string };

const isPdf = (f: UploadedFile) => f.mime.includes("pdf") || /\.pdf$/i.test(f.name);
const isDocx = (f: UploadedFile) => f.mime.includes("word") || /\.docx$/i.test(f.name);

/** Transforme un fichier en bloc exploitable par le modèle (PDF natif, DOCX converti en texte). */
export function fileBlock(f: UploadedFile, label: string): any {
  if (isPdf(f)) {
    return {
      type: "file",
      file: { filename: f.name, file_data: `data:application/pdf;base64,${f.base64.split(",").pop()}` },
    };
  }
  if (isDocx(f)) return { type: "text", text: `${label} (texte extrait du document) :\n${docxToText(f.base64).slice(0, 30000)}` };
  return { type: "text", text: `${label} :\n${strFromU8(base64ToBytes(f.base64)).slice(0, 30000)}` };
}

/** Texte brut d'un fichier, pour l'archivage et l'export RGPD. */
export function fileText(f: UploadedFile): string {
  if (isDocx(f)) return docxToText(f.base64);
  if (isPdf(f)) return "";
  try {
    return strFromU8(base64ToBytes(f.base64)).slice(0, 30000);
  } catch {
    return "";
  }
}

export async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as any;
}

/** Stocke un fichier RH dans le bucket privé et renvoie son chemin. */
export async function storeFile(orgId: string, folder: string, f: UploadedFile): Promise<string> {
  const db = await admin();
  const safe = f.name.replace(/[^a-zA-Z0-9._-]/g, "-").slice(-60);
  const path = `${orgId}/${folder}/${crypto.randomUUID()}-${safe}`;
  const { error } = await db.storage
    .from("hr-files")
    .upload(path, base64ToBytes(f.base64), { contentType: f.mime || "application/octet-stream", upsert: false });
  if (error) throw new Error(`Envoi du fichier impossible : ${error.message}`);
  return path;
}

export async function signedUrl(path: string, seconds = 600): Promise<string> {
  const db = await admin();
  const { data, error } = await db.storage.from("hr-files").createSignedUrl(path, seconds);
  if (error) throw new Error(error.message);
  return data.signedUrl as string;
}

export async function removeFiles(paths: string[]) {
  if (!paths.length) return;
  const db = await admin();
  await db.storage.from("hr-files").remove(paths);
}

/* -------------------------------- Offre d'emploi ------------------------------- */

/** Récupère le texte d'une offre publiée en ligne. */
function normalizeSiteUrl(raw: string): string {
  const trimmed = raw.trim().replace(/\s+/g, "").replace(/\/$/, "");
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

export async function fetchOfferFromUrl(url: string): Promise<string> {
  const target = normalizeSiteUrl(url);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(target, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "user-agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "accept-language": "fr-FR,fr;q=0.9,en;q=0.8",
      },
    });
    if (!res.ok) throw new Error(`Lien inaccessible (${res.status}). Collez plutôt le texte de l'offre.`);
    const html = await res.text();
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
      .replace(/<canvas[\s\S]*?<\/canvas>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/\s{2,}/g, " ")
      .trim();
    if (text.length < 120) throw new Error("Aucun texte exploitable sur ce lien. Collez plutôt le texte de l'offre.");
    return text.slice(0, 20000);
  } finally {
    clearTimeout(timer);
  }
}

export type JobAnalysis = {
  intitule: string;
  missions: string[];
  competences: string[];
  experience: string;
  formation: string;
  langues: string[];
  localisation: string;
  contrat: string;
  criteres_obligatoires: string[];
  criteres_souhaites: string[];
  synthese: string;
};

export async function analyzeJobOfferAI(
  supabase: SupabaseClient<any>,
  orgId: string,
  offerText: string,
): Promise<JobAnalysis> {
  const p = await chatJson(
    `${MARIEME}
Tu analyses une offre d'emploi et tu en extrais la structure exacte.
Réponds uniquement en JSON :
{"intitule":"","missions":[""],"competences":[""],"experience":"","formation":"","langues":[""],"localisation":"","contrat":"","criteres_obligatoires":[""],"criteres_souhaites":[""],"synthese":""}`,
    `${await mem(supabase, orgId)}\n\nOffre d'emploi à analyser :\n${offerText.slice(0, 20000)}`,
  );
  return {
    intitule: String(p?.intitule ?? "").slice(0, 200),
    missions: list(p?.missions),
    competences: list(p?.competences),
    experience: txt(p?.experience).slice(0, 600),
    formation: txt(p?.formation).slice(0, 600),
    langues: list(p?.langues, 10),
    localisation: String(p?.localisation ?? "").slice(0, 200),
    contrat: String(p?.contrat ?? "").slice(0, 120),
    criteres_obligatoires: list(p?.criteres_obligatoires),
    criteres_souhaites: list(p?.criteres_souhaites),
    synthese: txt(p?.synthese).slice(0, 2000),
  };
}

/* ---------------------------------- Candidat ---------------------------------- */

export type CandidateExtraction = {
  prenom: string;
  nom: string;
  email: string;
  telephone: string;
  localisation: string;
  experiences: { poste: string; entreprise: string; dates: string; detail: string }[];
  formations: { diplome: string; etablissement: string; dates: string }[];
  certifications: string[];
  competences: string[];
  langues: string[];
  resume: string;
};

export async function extractCandidateAI(
  cv: UploadedFile,
  letter: UploadedFile | null,
): Promise<CandidateExtraction> {
  const content: any[] = [
    {
      type: "text",
      text: "Extrais toutes les informations du CV ci-joint (et de la lettre de motivation si elle est fournie). Toute information absente vaut « Non trouvé ».",
    },
    fileBlock(cv, "CV"),
  ];
  if (letter) content.push(fileBlock(letter, "Lettre de motivation"));

  const p = await chatJson(
    `${MARIEME}
Tu extrais les informations d'un CV.
Réponds uniquement en JSON :
{"prenom":"","nom":"","email":"","telephone":"","localisation":"","experiences":[{"poste":"","entreprise":"","dates":"","detail":""}],"formations":[{"diplome":"","etablissement":"","dates":""}],"certifications":[""],"competences":[""],"langues":[""],"resume":""}`,
    content,
  );

  return {
    prenom: String(p?.prenom ?? "").slice(0, 80),
    nom: String(p?.nom ?? "").slice(0, 80),
    email: String(p?.email ?? "").slice(0, 160),
    telephone: String(p?.telephone ?? "").slice(0, 60),
    localisation: String(p?.localisation ?? "").slice(0, 160),
    experiences: (Array.isArray(p?.experiences) ? p.experiences : []).slice(0, 20).map((x: any) => ({
      poste: String(x?.poste ?? "").slice(0, 160),
      entreprise: String(x?.entreprise ?? "").slice(0, 160),
      dates: String(x?.dates ?? "").slice(0, 80),
      detail: txt(x?.detail).slice(0, 1200),
    })),
    formations: (Array.isArray(p?.formations) ? p.formations : []).slice(0, 15).map((x: any) => ({
      diplome: String(x?.diplome ?? "").slice(0, 200),
      etablissement: String(x?.etablissement ?? "").slice(0, 200),
      dates: String(x?.dates ?? "").slice(0, 80),
    })),
    certifications: list(p?.certifications, 15),
    competences: list(p?.competences, 40),
    langues: list(p?.langues, 12),
    resume: txt(p?.resume).slice(0, 2000),
  };
}

export type CandidateScore = {
  score: number;
  sous_scores: {
    experience: number;
    competences: number;
    formation: number;
    missions: number;
    criteres_obligatoires: number;
    criteres_souhaites: number;
    lettre: number;
  };
  points_forts: string[];
  points_faibles: string[];
  competences_manquantes: string[];
  recommandation: string;
};

export async function scoreCandidateAI(args: {
  offer: any;
  extraction: any;
  letterText: string;
}): Promise<CandidateScore> {
  const p = await chatJson(
    `${MARIEME}
Tu notes un candidat par rapport à une offre, de 0 à 100, avec des sous-scores de 0 à 100.
Le score global reflète l'adéquation réelle : un critère obligatoire non rempli fait fortement baisser la note.
Réponds uniquement en JSON :
{"score":0,"sous_scores":{"experience":0,"competences":0,"formation":0,"missions":0,"criteres_obligatoires":0,"criteres_souhaites":0,"lettre":0},"points_forts":[""],"points_faibles":[""],"competences_manquantes":[""],"recommandation":""}`,
    `Offre (analyse JSON) :\n${JSON.stringify(args.offer).slice(0, 8000)}\n\nCandidat (extraction JSON) :\n${JSON.stringify(args.extraction).slice(0, 10000)}\n\nLettre de motivation :\n${(args.letterText || "Non fournie").slice(0, 6000)}`,
  );

  return {
    score: num(p?.score),
    sous_scores: {
      experience: num(p?.sous_scores?.experience),
      competences: num(p?.sous_scores?.competences),
      formation: num(p?.sous_scores?.formation),
      missions: num(p?.sous_scores?.missions),
      criteres_obligatoires: num(p?.sous_scores?.criteres_obligatoires),
      criteres_souhaites: num(p?.sous_scores?.criteres_souhaites),
      lettre: num(p?.sous_scores?.lettre),
    },
    points_forts: list(p?.points_forts, 12),
    points_faibles: list(p?.points_faibles, 12),
    competences_manquantes: list(p?.competences_manquantes, 15),
    recommandation: txt(p?.recommandation).slice(0, 1500),
  };
}

/* --------------------------------- Entretien ---------------------------------- */

export type InterviewAnalysis = {
  transcription: string;
  resume: string;
  sujets: string[];
  communication: string;
  motivation: string;
  coherence: string;
  points_forts: string[];
  points_vigilance: string[];
  score: number;
  recommandation: string;
};

const AUDIO_FORMATS: Record<string, string> = {
  webm: "webm",
  mp4: "m4a",
  "x-m4a": "m4a",
  m4a: "m4a",
  mpeg: "mp3",
  mp3: "mp3",
  wav: "wav",
  "x-wav": "wav",
  ogg: "ogg",
  aac: "aac",
  flac: "flac",
};

export function audioFormat(mime: string, name: string): string {
  const sub = (mime.split("/")[1] ?? "").toLowerCase();
  const ext = (name.split(".").pop() ?? "").toLowerCase();
  return AUDIO_FORMATS[sub] ?? AUDIO_FORMATS[ext] ?? "mp3";
}

export async function analyzeInterviewAudioAI(args: {
  audio: UploadedFile;
  offer: any;
  candidate: any;
  notes: string;
}): Promise<InterviewAnalysis> {
  const p = await chatJson(
    `${MARIEME}
Tu analyses l'enregistrement d'un entretien de recrutement : tu transcris, tu résumes, puis tu évalues.
Tu ne juges que ce qui est réellement dit. Ce que tu n'entends pas vaut « Non trouvé ».
Réponds uniquement en JSON :
{"transcription":"","resume":"","sujets":[""],"communication":"","motivation":"","coherence":"","points_forts":[""],"points_vigilance":[""],"score":0,"recommandation":""}`,
    [
      {
        type: "text",
        text: `Entretien à analyser.\nOffre : ${JSON.stringify(args.offer).slice(0, 4000)}\nCandidat : ${JSON.stringify(args.candidate).slice(0, 4000)}\nNotes du recruteur : ${args.notes || "aucune"}`,
      },
      {
        type: "input_audio",
        input_audio: {
          data: args.audio.base64.split(",").pop(),
          format: audioFormat(args.audio.mime, args.audio.name),
        },
      },
    ],
  );

  return {
    transcription: txt(p?.transcription).slice(0, 30000),
    resume: txt(p?.resume).slice(0, 4000),
    sujets: list(p?.sujets, 20),
    communication: txt(p?.communication).slice(0, 2000),
    motivation: txt(p?.motivation).slice(0, 2000),
    coherence: txt(p?.coherence).slice(0, 2000),
    points_forts: list(p?.points_forts, 12),
    points_vigilance: list(p?.points_vigilance, 12),
    score: num(p?.score),
    recommandation: txt(p?.recommandation).slice(0, 2000),
  };
}
