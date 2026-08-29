import type { SupabaseClient } from "@supabase/supabase-js";
import { loadCompanyMemory } from "./eric.server";
import {
  OBJECTIVES,
  PLATFORMS,
  TONES,
  videoCaps,
  type ContentKind,
  type ContentModel,
  type ContentParams,
} from "./content";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { aiFetch } from "./ai-provider.server";

import { getConnectorConfig } from "./connectors.server";

const GATEWAY = "https://ai.gateway.lovable.dev";
const OPENAI_API = "https://api.openai.com";

function apiKey() {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("Clé IA indisponible.");
  return key;
}

function gatewayError(status: number): Error {
  if (status === 429) return new Error("Trop de demandes d'un coup, réessayez dans un instant.");
  if (status === 402) return new Error("Crédits IA épuisés côté plateforme.");
  return new Error(`Erreur du modèle IA (${status})`);
}

async function chatJson(system: string, user: string): Promise<any> {
  const res = await aiFetch(`${GATEWAY}/v1/chat/completions`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${apiKey()}` },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      response_format: { type: "json_object" },
    }),
  });
  if (!res.ok) throw gatewayError(res.status);
  const json = (await res.json()) as any;
  const content: string = json?.choices?.[0]?.message?.content ?? "{}";
  try {
    return JSON.parse(content);
  } catch {
    return JSON.parse(content.slice(content.indexOf("{"), content.lastIndexOf("}") + 1));
  }
}

const LAMINE = `Tu es Lamine, l'agent IA « Marketing et contenu » de Kobyde.
Tu es un directeur artistique et un copywriter expert.
Tu écris en français, de façon concrète, sans jargon et sans superlatif creux.
Règle absolue : tu n'inventes jamais un résultat, un chiffre, un témoignage, un client ni une garantie.
Si une preuve manque, tu n'en parles pas.`;

/* ------------------------------- Contexte ------------------------------- */

export type StudioContext = {
  kind: ContentKind;
  slides: number;
  objective: string;
  platforms: string[];
  tone: string;
  instructions: string;
  products: any[];
  memory: any;
  params: ContentParams;
};

export async function loadStudioContext(
  supabase: SupabaseClient<any>,
  orgId: string,
  productIds: string[],
): Promise<{ memory: any; products: any[] }> {
  const memory = await loadCompanyMemory(supabase, orgId);
  let products: any[] = [];
  if (productIds.length) {
    const { data } = await supabase
      .from("products")
      .select("id,name,kind,description,category,price,price_ht,unit,subservices,terms")
      .eq("org_id", orgId)
      .in("id", productIds);
    products = data ?? [];
  }
  return { memory, products };
}

const contextBlock = (ctx: StudioContext) =>
  `Mémoire centrale de l'entreprise (JSON) :
${JSON.stringify(ctx.memory).slice(0, 7000)}

Produits / services concernés (JSON) :
${JSON.stringify(ctx.products).slice(0, 4000) || "aucun sélectionné, utiliser l'offre principale"}

Objectif : ${ctx.objective}
Plateformes : ${ctx.platforms.map((p) => PLATFORMS.find((x) => x.key === p)?.label ?? p).join(", ") || "non précisé"}
Ton : ${ctx.tone}
Instructions complémentaires de l'utilisateur : ${ctx.instructions || "aucune"}
Paramètres visuels : ${JSON.stringify(ctx.params)}`;

/* --------------------------- Détection d'intention --------------------------- */

export type Intent = {
  kind: ContentKind;
  slides: number;
  objective: string;
  platforms: string[];
  tone: string;
  resume: string;
};

export async function detectIntentAI(message: string): Promise<Intent> {
  const p = await chatJson(
    `${LAMINE}
Tu analyses une demande utilisateur et tu détermines le contenu à produire.
Types possibles : "image", "carrousel", "video". Si le carrousel est demandé, slides entre 2 et 4 (4 par défaut).
Objectifs possibles : ${OBJECTIVES.join(" | ")}
Plateformes possibles : ${PLATFORMS.map((p2) => p2.key).join(" | ")}
Tons possibles : ${TONES.join(" | ")}
Si un élément n'est pas identifiable, renvoie une chaîne vide (sauf le type : choisis le plus pertinent).
Réponds uniquement en JSON :
{"kind":"","slides":1,"objective":"","platforms":[""],"tone":"","resume":""}`,
    `Demande : ${message.slice(0, 1500)}`,
  );
  const kind: ContentKind = ["image", "carrousel", "video"].includes(p?.kind) ? p.kind : "image";
  const slides = kind === "carrousel" ? Math.min(4, Math.max(2, Number(p?.slides) || 4)) : 1;
  return {
    kind,
    slides,
    objective: OBJECTIVES.includes(p?.objective) ? p.objective : "",
    platforms: (Array.isArray(p?.platforms) ? p.platforms : []).filter((x: any) =>
      PLATFORMS.some((pl) => pl.key === x),
    ),
    tone: (TONES as readonly string[]).includes(p?.tone) ? p.tone : "",
    resume: String(p?.resume ?? "").slice(0, 300),
  };
}

/* -------------------------------- Stratégie -------------------------------- */

export type Slide = {
  role: string;
  titre: string;
  texte: string;
  direction_visuelle: string;
  prompt: string;
};

export type Strategy = {
  concept: string;
  angle: string;
  brief_visuel: string;
  slides: Slide[];
  cta: string;
};

export async function buildStrategyAI(ctx: StudioContext): Promise<Strategy> {
  const structure =
    ctx.kind === "carrousel"
      ? `Le carrousel comporte exactement ${ctx.slides} visuels et suit la progression Hook → Problème/Idée → Valeur → Explication → CTA, adaptée au nombre de visuels.
Chaque visuel a un rôle, un titre court, un texte, une direction visuelle et un prompt image en anglais.
Le champ brief_visuel décrit l'identité commune obligatoire (couleurs, style, typographie, sujet, personnage, ambiance, composition) pour garantir la cohérence de tous les visuels.`
      : ctx.kind === "video"
        ? `Tu conçois une vidéo courte : concept, angle marketing, scène, actions, ambiance, direction artistique, narration si utile et CTA.
Le tableau slides contient un seul élément dont le champ prompt est le prompt vidéo complet en anglais (scène, mouvement, lumière, ambiance, durée implicite).`
        : `Tu conçois un visuel unique. Le tableau slides contient un seul élément dont le champ prompt est le prompt image en anglais.`;

  const p = await chatJson(
    `${LAMINE}
${structure}
Le prompt doit intégrer l'identité de marque, le sujet, le style, le cadrage et le format demandé.
N'écris jamais de faux chiffres ni de faux témoignages dans les textes.
Réponds uniquement en JSON :
{"concept":"","angle":"","brief_visuel":"","slides":[{"role":"","titre":"","texte":"","direction_visuelle":"","prompt":""}],"cta":""}`,
    contextBlock(ctx),
  );

  const wanted = ctx.kind === "carrousel" ? ctx.slides : 1;
  const slides: Slide[] = (Array.isArray(p?.slides) ? p.slides : []).slice(0, wanted).map((s: any) => ({
    role: String(s?.role ?? "").slice(0, 80),
    titre: String(s?.titre ?? "").slice(0, 160),
    texte: String(s?.texte ?? "").slice(0, 1200),
    direction_visuelle: String(s?.direction_visuelle ?? "").slice(0, 800),
    prompt: String(s?.prompt ?? "").slice(0, 1500),
  }));
  while (slides.length < wanted) slides.push({ role: "", titre: "", texte: "", direction_visuelle: "", prompt: "" });

  return {
    concept: String(p?.concept ?? "").slice(0, 1500),
    angle: String(p?.angle ?? "").slice(0, 800),
    brief_visuel: String(p?.brief_visuel ?? "").slice(0, 2000),
    slides,
    cta: String(p?.cta ?? "").slice(0, 200),
  };
}

/* ------------------------------ Génération image ------------------------------ */

const OPENAI_SIZE: Record<string, string> = {
  "1:1": "1024x1024",
  "16:9": "1536x1024",
  "9:16": "1024x1536",
  "4:5": "1024x1536",
};

function finalPrompt(base: string, brief: string, params: ContentParams): string {
  const bits = [base];
  if (brief) bits.push(`Shared visual identity (must be respected): ${brief}`);
  if (params.style) bits.push(`Style: ${params.style}.`);
  if (params.realism) bits.push(`Realism: ${params.realism}.`);
  if (params.ratio) bits.push(`Aspect ratio: ${params.ratio}.`);
  if (params.withText === false) bits.push("No text overlay in the image.");
  if (params.prompt) bits.push(params.prompt);
  return bits.filter(Boolean).join("\n");
}

/** Génère une image et renvoie le base64 PNG. */
export async function generateImageB64(model: ContentModel, prompt: string, params: ContentParams = {}): Promise<string> {
  const engine = model.engine;
  if (!engine) throw new Error(`Le modèle « ${model.label} » n'est pas encore raccordé à une API. Choisissez un autre modèle.`);

  const isOpenAI = engine.startsWith("openai/");
  const quality = ["low", "medium", "high"].includes(String(params.quality)) ? String(params.quality) : "low";
  const body = isOpenAI
    ? {
        model: engine,
        prompt,
        size: openaiSize(params.ratio),
        quality,
        n: 1,
      }
    : {
        model: engine,
        messages: [{ role: "user", content: prompt }],
        modalities: ["image", "text"],
      };

  const res = await aiFetch(`${GATEWAY}/v1/images/generations`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${apiKey()}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    if (/content_policy|moderation/i.test(txt))
      throw new Error("Le modèle a refusé ce visuel (règles de contenu). Reformulez la demande.");
    throw gatewayError(res.status);
  }
  const json = (await res.json()) as any;
  const b64 = json?.data?.[0]?.b64_json;
  if (!b64) throw new Error("Le modèle n'a renvoyé aucune image.");
  return b64;
}

export function imagePrompt(slide: Slide, strategy: Strategy, params: ContentParams, ratio: string): string {
  return finalPrompt(slide.prompt || strategy.concept, strategy.brief_visuel, { ...params, ratio: params.ratio || ratio });
}

export function openaiSize(ratio?: string) {
  return OPENAI_SIZE[ratio ?? "1:1"] ?? "1024x1024";
}

/* ------------------------------ Génération vidéo ------------------------------ */

/**
 * Fournisseurs vidéo, chacun via son API officielle :
 *  - `openai/…`   → API OpenAI Vidéos (Sora 2, Sora 2 Pro)
 *  - `kling/…`    → API officielle Kling AI (JWT AccessKey/SecretKey)
 *  - `seedance/…` → API officielle Seedance (ModelArk / BytePlus)
 *  - `xai/…`      → API officielle xAI (Grok Imagine)
 *  - `google/…`   → passerelle Lovable (Veo 3.1)
 * L'identifiant de tâche renvoyé encode le fournisseur : `provider|engine|id`.
 */

/** Secrets d'un connecteur (configuré par l'admin) avec repli sur les variables d'environnement. */
async function connectorSecrets(connector: string): Promise<Record<string, string>> {
  try {
    const conf = await getConnectorConfig(connector);
    if (conf?.isEnabled !== false)
      return { ...(conf?.config ?? {}), ...(conf?.secrets ?? {}) } as Record<string, string>;
  } catch {
    /* base indisponible */
  }
  return {};
}


async function providerKey(connector: string, envVar: string): Promise<string> {
  const s = await connectorSecrets(connector);
  return s["api_key"] || process.env[envVar] || "";
}

const klingBase = async () =>
  (await connectorSecrets("kling"))["api_base"] || process.env["KLING_API_BASE"] || "https://api-singapore.klingai.com";
const seedanceBase = async () =>
  (await connectorSecrets("seedance"))["api_base"] ||
  process.env["SEEDANCE_API_BASE"] ||
  "https://ark.ap-southeast.bytepluses.com/api/v3";
const XAI_BASE = process.env["XAI_API_BASE"] || "https://api.x.ai";

const b64url = (bytes: Uint8Array) => {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

/** Jeton JWT HS256 exigé par l'API officielle Kling (valide 30 minutes). */
async function klingToken(accessKey: string, secretKey: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const enc = new TextEncoder();
  const head = b64url(enc.encode(JSON.stringify({ alg: "HS256", typ: "JWT" })));
  const payload = b64url(enc.encode(JSON.stringify({ iss: accessKey, exp: now + 1800, nbf: now - 5 })));
  const key = await crypto.subtle.importKey("raw", enc.encode(secretKey), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
  ]);
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(`${head}.${payload}`)));
  return `${head}.${payload}.${b64url(sig)}`;
}

/** En-têtes authentifiés pour l'API officielle Kling (clé API simple ou couple Access/Secret Key). */
async function klingHeaders(): Promise<Record<string, string>> {
  const s = await connectorSecrets("kling");
  const apiKey = s["api_key"] || process.env["KLING_API_KEY"] || "";
  const accessKey = s["access_key"] || process.env["KLING_ACCESS_KEY"] || "";
  const secretKey = s["secret_key"] || process.env["KLING_SECRET_KEY"] || "";
  const token = accessKey && secretKey ? await klingToken(accessKey, secretKey) : apiKey;
  if (!token) throw new Error("Clés Kling manquantes : renseignez la clé API du connecteur Kling AI.");
  return {
    "content-type": "application/json",
    authorization: `Bearer ${token}`,
  };
}


const videoDuration = (model: ContentModel, params: ContentParams) => {
  const allowed = videoCaps(model.key).durations;
  const wanted = Number(params.duration);
  return allowed.includes(wanted) ? wanted : (allowed[allowed.length - 1] as number);
};

const videoResolution = (model: ContentModel, params: ContentParams) => {
  const allowed = videoCaps(model.key).resolutions;
  return allowed.includes(String(params.resolution)) ? String(params.resolution) : (allowed[0] as string);
};

const videoRatio = (params: ContentParams) => (params.ratio === "9:16" ? "9:16" : params.ratio === "1:1" ? "1:1" : "16:9");

const SORA_SIZE: Record<string, Record<string, string>> = {
  "720p": { "16:9": "1280x720", "9:16": "720x1280", "1:1": "720x720" },
  "1080p": { "16:9": "1920x1080", "9:16": "1080x1920", "1:1": "1080x1080" },
};

export async function startVideoJob(model: ContentModel, prompt: string, params: ContentParams): Promise<string> {
  const engine = model.engine;
  if (!engine)
    throw new Error(`Le modèle « ${model.label} » n'est pas encore raccordé à une API. Choisissez un autre modèle.`);

  const duration = videoDuration(model, params);
  const resolution = videoResolution(model, params);
  const ratio = videoRatio(params);

  /* ------------------------------- OpenAI Sora ------------------------------- */
  if (engine.startsWith("openai/")) {
    const key = await providerKey("openai", "OPENAI_API_KEY");
    if (!key) throw new Error("Clé OpenAI manquante : configurez le connecteur OpenAI.");
    const res = await fetch(`${OPENAI_API}/v1/videos`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: engine.replace("openai/", ""),
        prompt,
        seconds: String(duration),
        size: SORA_SIZE[resolution]?.[ratio] ?? "1280x720",
      }),
    });
    if (!res.ok) throw new Error((await providerMessage(res)) ?? `Erreur du modèle vidéo (${res.status})`);
    const job = (await res.json()) as any;
    return `openai|${engine}|${job.id}`;
  }

  /* --------------------------- Kling AI (API officielle) --------------------------- */
  if (engine.startsWith("kling/")) {
    const res = await fetch(`${await klingBase()}/v1/videos/text2video`, {
      method: "POST",
      headers: await klingHeaders(),
      body: JSON.stringify({
        model_name: engine.replace("kling/", ""),
        prompt,
        negative_prompt: "blur, distort, low quality",
        mode: resolution === "1080p" ? "pro" : "std",
        duration: String(duration),
        aspect_ratio: ratio,
      }),
    });
    if (!res.ok) throw new Error((await providerMessage(res)) ?? `Erreur du modèle vidéo Kling (${res.status})`);
    const job = (await res.json()) as any;
    if (job?.code && job.code !== 0) throw new Error(job?.message ?? "Kling a refusé la demande.");
    const taskId = job?.data?.task_id;
    if (!taskId) throw new Error("Kling n'a renvoyé aucune tâche.");
    return `kling|${engine}|${taskId}`;
  }

  /* ------------------------ Seedance (API officielle ModelArk) ------------------------ */
  if (engine.startsWith("seedance/")) {
    const key = await providerKey("seedance", "SEEDANCE_API_KEY");
    if (!key) throw new Error("Clé Seedance manquante : configurez le connecteur Seedance.");
    const res = await fetch(`${await seedanceBase()}/contents/generations/tasks`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: engine.replace("seedance/", ""),
        content: [
          {
            type: "text",
            text: `${prompt} --resolution ${resolution} --duration ${duration} --ratio ${ratio}`,
          },
        ],
      }),
    });
    if (!res.ok) throw new Error((await providerMessage(res)) ?? `Erreur du modèle vidéo Seedance (${res.status})`);
    const job = (await res.json()) as any;
    if (!job?.id) throw new Error("Seedance n'a renvoyé aucune tâche.");
    return `seedance|${engine}|${job.id}`;
  }

  /* --------------------------- Grok Imagine (API xAI) --------------------------- */
  if (engine.startsWith("xai/")) {
    const key = await providerKey("grok", "XAI_API_KEY");
    if (!key) throw new Error("Clé Grok manquante : configurez le connecteur Grok (xAI).");
    const res = await fetch(`${XAI_BASE}/v1/videos/generations`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: engine.replace("xai/", ""),
        prompt,
        duration_seconds: duration,
        aspect_ratio: ratio,
        resolution,
      }),
    });
    if (!res.ok) throw new Error((await providerMessage(res)) ?? `Erreur du modèle vidéo Grok (${res.status})`);
    const job = (await res.json()) as any;
    const jobId = job?.id ?? job?.request_id;
    if (!jobId) throw new Error("Grok n'a renvoyé aucune tâche.");
    return `xai|${engine}|${jobId}`;
  }


  /* ----------------------------- Passerelle (Veo) ----------------------------- */
  const res = await fetch(`${GATEWAY}/v1/videos`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${apiKey()}` },
    body: JSON.stringify({
      model: engine,
      instances: [{ prompt }],
      parameters: {
        durationSeconds: resolution === "1080p" ? 8 : duration,
        resolution,
        aspectRatio: ratio === "9:16" ? "9:16" : "16:9",
        sampleCount: 1,
        generateAudio: params.audio !== false,
      },
    }),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => null)) as any;
    throw new Error(err?.message ?? `Erreur du modèle vidéo (${res.status})`);
  }
  const job = (await res.json()) as any;
  return `gateway||${job.id}`;
}

async function providerMessage(res: Response): Promise<string | null> {
  const txt = await res.text().catch(() => "");
  try {
    const j = JSON.parse(txt);
    return j?.error?.message ?? j?.message ?? j?.detail?.[0]?.msg ?? null;
  } catch {
    return txt.slice(0, 200) || null;
  }
}

export async function pollVideoJob(id: string): Promise<{ status: string; bytes?: Uint8Array; error?: string }> {
  const [provider, engine, realId] = id.includes("|") ? id.split("|") : ["gateway", "", id];

  if (provider === "openai") {
    const key = await providerKey("openai", "OPENAI_API_KEY");
    const res = await fetch(`${OPENAI_API}/v1/videos/${realId}`, { headers: { authorization: `Bearer ${key}` } });
    if (!res.ok) throw gatewayError(res.status);
    const job = (await res.json()) as any;
    if (job.status === "failed") return { status: "failed", error: job?.error?.message ?? "Génération vidéo échouée." };
    if (job.status !== "completed") return { status: "in_progress" };
    const dl = await fetch(`${OPENAI_API}/v1/videos/${realId}/content`, {
      headers: { authorization: `Bearer ${key}` },
    });
    if (!dl.ok) throw gatewayError(dl.status);
    return { status: "completed", bytes: new Uint8Array(await dl.arrayBuffer()) };
  }

  /** Télécharge la vidéo finale depuis l'URL renvoyée par le fournisseur. */
  const download = async (url?: string) => {
    if (!url) return { status: "failed", error: "Le modèle n'a renvoyé aucune vidéo." };
    const dl = await fetch(url);
    if (!dl.ok) throw new Error("Téléchargement de la vidéo impossible.");
    return { status: "completed", bytes: new Uint8Array(await dl.arrayBuffer()) };
  };

  if (provider === "kling") {
    const res = await fetch(`${await klingBase()}/v1/videos/text2video/${realId}`, { headers: await klingHeaders() });
    if (!res.ok) throw gatewayError(res.status);
    const job = (await res.json()) as any;
    const st = job?.data?.task_status;
    if (st === "failed") return { status: "failed", error: job?.data?.task_status_msg ?? "Génération Kling échouée." };
    if (st !== "succeed") return { status: "in_progress" };
    return download(job?.data?.task_result?.videos?.[0]?.url);
  }

  if (provider === "seedance") {
    const key = await providerKey("seedance", "SEEDANCE_API_KEY");
    const res = await fetch(`${await seedanceBase()}/contents/generations/tasks/${realId}`, {
      headers: { authorization: `Bearer ${key}` },
    });
    if (!res.ok) throw gatewayError(res.status);
    const job = (await res.json()) as any;
    const st = String(job?.status ?? "").toLowerCase();
    if (st === "failed" || st === "cancelled")
      return { status: "failed", error: job?.error?.message ?? "Génération Seedance échouée." };
    if (st !== "succeeded") return { status: "in_progress" };
    return download(job?.content?.video_url);
  }

  if (provider === "xai") {
    const key = await providerKey("grok", "XAI_API_KEY");
    const res = await fetch(`${XAI_BASE}/v1/videos/generations/${realId}`, {
      headers: { authorization: `Bearer ${key}` },
    });
    if (!res.ok) throw gatewayError(res.status);
    const job = (await res.json()) as any;
    const st = String(job?.status ?? "").toLowerCase();
    if (st === "failed") return { status: "failed", error: job?.error?.message ?? "Génération Grok échouée." };
    if (st && !["completed", "succeeded", "success"].includes(st)) return { status: "in_progress" };
    return download(job?.video?.url ?? job?.data?.[0]?.url ?? job?.url);
  }


  const res = await fetch(`${GATEWAY}/v1/videos/${realId}`, { headers: { authorization: `Bearer ${apiKey()}` } });
  if (!res.ok) throw gatewayError(res.status);
  const job = (await res.json()) as any;
  if (job.status === "failed") return { status: "failed", error: job?.error?.message ?? "Génération vidéo échouée." };
  if (job.status !== "completed") return { status: "in_progress" };
  const dl = await fetch(`${GATEWAY}/v1/videos/${realId}/content`, {
    headers: { authorization: `Bearer ${apiKey()}` },
  });
  if (!dl.ok) throw gatewayError(dl.status);
  return { status: "completed", bytes: new Uint8Array(await dl.arrayBuffer()) };
}


/* -------------------------------- Stockage -------------------------------- */

async function adminDb() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as any;
}

function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64.includes(",") ? b64.split(",").pop()! : b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export async function storeAsset(
  orgId: string,
  bytes: Uint8Array,
  ext: "png" | "mp4",
): Promise<{ path: string; url: string }> {
  const db = await adminDb();
  const path = `${orgId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await db.storage
    .from("content")
    .upload(path, bytes, { contentType: ext === "png" ? "image/png" : "video/mp4", upsert: false });
  if (error) throw new Error(`Stockage du contenu impossible : ${error.message}`);
  return { path, url: await signAsset(path) };
}

export async function storeImageB64(orgId: string, b64: string) {
  return storeAsset(orgId, b64ToBytes(b64), "png");
}

export async function signAsset(path: string, seconds = 60 * 60 * 24 * 7): Promise<string> {
  const db = await adminDb();
  const { data, error } = await db.storage.from("content").createSignedUrl(path, seconds);
  if (error) throw new Error(error.message);
  return data.signedUrl as string;
}

/* -------------------------------- Captions -------------------------------- */

export async function generateCaptionsAI(
  ctx: StudioContext,
  strategy: Strategy,
): Promise<Record<string, { texte: string; cta: string; hashtags: string[] }>> {
  const targets = ctx.platforms.length ? ctx.platforms : ["instagram"];
  const p = await chatJson(
    `${LAMINE}
Tu rédiges une légende (caption) publiable pour chaque plateforme demandée.
Instagram : accrocheur, aéré, hashtags seulement s'ils apportent de la valeur.
LinkedIn : professionnel, orienté expertise, pas de hashtag inutile.
Facebook : conversationnel et engageant.
TikTok : très court et direct.
Applique strictement le ton demandé, le CTA et l'objectif. N'invente aucun résultat, chiffre, témoignage, client ni garantie.
Réponds uniquement en JSON avec une clé par plateforme parmi ${targets.join(", ")} :
{"${targets[0]}":{"texte":"","cta":"","hashtags":[""]}}`,
    `${contextBlock(ctx)}

Concept du contenu : ${strategy.concept}
Angle : ${strategy.angle}
Textes du contenu : ${strategy.slides.map((s, i) => `#${i + 1} ${s.titre} — ${s.texte}`).join("\n")}
CTA : ${strategy.cta}`,
  );

  const out: Record<string, { texte: string; cta: string; hashtags: string[] }> = {};
  for (const key of targets) {
    const v = p?.[key] ?? {};
    out[key] = {
      texte: String(v?.texte ?? "").slice(0, 3000),
      cta: String(v?.cta ?? strategy.cta).slice(0, 200),
      hashtags: (Array.isArray(v?.hashtags) ? v.hashtags : []).map((h: any) => String(h)).slice(0, 15),
    };
  }
  return out;
}

/* ------------------------------- Publication ------------------------------- */

export type PublishTarget = { platform: string; caption: string; assetUrl: string; assetKind: "image" | "video" };

/** Vérifie le compte connecté et actif de l'utilisateur pour une plateforme. */
export async function findConnection(supabase: SupabaseClient<any>, userId: string, platform: string) {
  const provider = PLATFORMS.find((p) => p.key === platform)?.provider ?? platform;
  const { data } = await supabase
    .from("oauth_connections")
    .select("id,provider,account_label,status,is_active,revoked,access_token,metadata")
    .eq("user_id", userId)
    .in("provider", [platform, provider])
    .eq("is_active", true)
    .eq("revoked", false)
    .maybeSingle();
  return data ?? null;
}
