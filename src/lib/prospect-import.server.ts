import type { ImportedProspect } from "./prospect-import";

import { aiFetch } from "./ai-provider.server";

const SYSTEM = `Tu extrais une liste de prospects à partir de données brutes (tableau CSV, texte collé ou capture d'écran).
RÈGLES ABSOLUES :
- N'invente JAMAIS une donnée. Si une information est absente, laisse le champ vide ("").
- Ne complète pas un email, un téléphone ou un identifiant partiel.
- Normalise les identifiants sociaux en pseudo (@pseudo) ou URL si présente dans la source.
Réponds STRICTEMENT en JSON : {"prospects":[{"full_name":"","company_name":"","email":"","phone":"","city":"","website":"","facebook":"","instagram":"","tiktok":"","youtube":"","linkedin":"","notes":""}]}`;

type Block =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

async function askGateway(blocks: Block[]): Promise<ImportedProspect[]> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("IA indisponible : clé manquante.");

  const res = await aiFetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: blocks },
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
  const list = Array.isArray(parsed?.prospects) ? parsed.prospects : [];
  return list.slice(0, 300) as ImportedProspect[];
}

export function parseFromText(text: string) {
  return askGateway([
    {
      type: "text",
      text: `Extrais les prospects de ces données :\n\n${text.slice(0, 40000)}`,
    },
  ]);
}

export function parseFromImage(dataUrl: string) {
  return askGateway([
    { type: "text", text: "Extrais tous les prospects visibles sur cette capture d'écran." },
    { type: "image_url", image_url: { url: dataUrl } },
  ]);
}
