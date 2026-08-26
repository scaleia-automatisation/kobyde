import { fetchOfferFromUrl, fileBlock, type UploadedFile } from "./hr.server";

/* eslint-disable @typescript-eslint/no-explicit-any */

const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

const SYSTEM = `Tu es l'expert connaissance d'entreprise de Kobyde.
Tu rédiges en français une base de connaissance interne, factuelle et structurée en Markdown.
Règle absolue : n'invente jamais une information. Utilise uniquement les éléments fournis.
Structure attendue : Présentation, Offre (produits et services), Tarifs et conditions, Public cible et positionnement,
Coordonnées et horaires, Réseaux sociaux, Questions fréquentes (uniquement si l'information existe).`;

async function callAI(content: any[]): Promise<string> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("Clé IA indisponible.");
  const res = await fetch(GATEWAY, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content },
      ],
    }),
  });
  if (res.status === 429) throw new Error("Trop de demandes d'un coup, réessayez dans un instant.");
  if (res.status === 402) throw new Error("Crédits IA épuisés.");
  if (!res.ok) throw new Error(`Erreur IA (${res.status})`);
  const json = (await res.json()) as any;
  const out = String(json?.choices?.[0]?.message?.content ?? "").trim();
  if (!out) throw new Error("La base de connaissance n'a pas pu être générée.");
  return out;
}

/** Génère la base de connaissance à partir du site web et de la fiche entreprise. */
export async function generateKnowledgeAI(
  org: Record<string, any>,
  existing?: string | null,
  mode: "generate" | "update" = "generate",
): Promise<string> {
  let site = "";
  if (org["website"]) {
    try {
      site = (await fetchOfferFromUrl(String(org["website"]))).slice(0, 12000);
    } catch {
      site = "";
    }
  }
  const content: any[] = [
    {
      type: "text",
      text: `Fiche entreprise (JSON) :\n${JSON.stringify(org).slice(0, 12000)}`,
    },
  ];
  if (site) content.push({ type: "text", text: `Contenu public du site web :\n${site}` });
  if (existing?.trim())
    content.push({ type: "text", text: `Base de connaissance existante à compléter sans rien perdre :\n${existing.slice(0, 12000)}` });
  content.push({
    type: "text",
    text: "Rédige la base de connaissance complète de cette entreprise en Markdown.",
  });
  return callAI(content);
}

/** Intègre un fichier ou un texte collé à la base de connaissance. */
export async function importKnowledgeAI(args: {
  existing?: string | null;
  pasted?: string | null;
  file?: UploadedFile | null;
}): Promise<string> {
  const content: any[] = [];
  if (args.file) content.push(fileBlock(args.file, `Document « ${args.file.name} »`));
  if (args.pasted?.trim()) content.push({ type: "text", text: `Texte fourni :\n${args.pasted.slice(0, 30000)}` });
  if (args.existing?.trim())
    content.push({ type: "text", text: `Base de connaissance existante :\n${args.existing.slice(0, 12000)}` });
  content.push({
    type: "text",
    text: "Fusionne ces éléments dans une base de connaissance unique, sans doublon, en Markdown. Conserve toutes les informations existantes.",
  });
  return callAI(content);
}
