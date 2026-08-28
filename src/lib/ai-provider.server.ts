/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Fournisseur IA unique de Kobyde : OpenAI en priorité.
 * La clé OpenAI est celle configurée dans Connecteurs (Super Admin) ou le secret OPENAI_API_KEY.
 * Repli automatique sur la passerelle Lovable uniquement si aucune clé OpenAI n'est disponible.
 * Serveur uniquement.
 */

import { getConnectorConfig } from "./connectors.server";

const OPENAI = "https://api.openai.com";

/** Modèles OpenAI utilisés par défaut (surchargeables via le champ « model » du connecteur). */
const DEFAULT_CHAT_MODEL = "gpt-4o-mini";
const AUDIO_MODEL = "gpt-4o-audio-preview";
const IMAGE_MODEL = "gpt-image-1";

async function openaiCredentials(): Promise<{ key: string; model: string } | null> {
  let key = "";
  let model = "";
  try {
    const conf = await getConnectorConfig("openai");
    if (conf?.isEnabled !== false) {
      key = conf?.secrets?.["api_key"] ?? "";
      model = conf?.config?.["model"] ?? "";
    }
  } catch {
    /* base indisponible : on retombe sur le secret d'environnement */
  }
  if (!key) key = process.env["OPENAI_API_KEY"] ?? "";
  if (!key) return null;
  return { key, model: model || DEFAULT_CHAT_MODEL };
}

function hasAudio(body: any): boolean {
  return JSON.stringify(body?.messages ?? "").includes("input_audio");
}

/**
 * Remplace `fetch` pour tous les appels IA de l'application.
 * `url` reste l'URL passerelle historique : elle sert uniquement à identifier le type d'appel.
 */
export async function aiFetch(url: string, init: RequestInit): Promise<Response> {
  const path = url.replace("https://ai.gateway.lovable.dev", "");
  const creds = await openaiCredentials();
  let body: any = undefined;
  if (typeof init.body === "string") {
    try {
      body = JSON.parse(init.body);
    } catch {
      body = undefined;
    }
  }

  if (creds && body) {
    if (path.startsWith("/v1/chat/completions")) {
      const model = hasAudio(body) ? AUDIO_MODEL : creds.model;
      return fetch(`${OPENAI}/v1/chat/completions`, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${creds.key}` },
        body: JSON.stringify({ ...body, model }),
      });
    }
    if (path.startsWith("/v1/images/generations") && typeof body.prompt === "string") {
      const { model: _ignored, response_format: _rf, ...rest } = body;
      return fetch(`${OPENAI}/v1/images/generations`, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${creds.key}` },
        body: JSON.stringify({ ...rest, model: IMAGE_MODEL }),
      });
    }
  }

  // Repli : passerelle Lovable (aucune clé OpenAI configurée, ou endpoint non couvert par OpenAI).
  return fetch(url, init);
}
