import { fetchOfferFromUrl } from "./hr.server";
import { COMPANY_FIELDS } from "./company";

/* eslint-disable @typescript-eslint/no-explicit-any */

const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

/** Champs remplissables automatiquement depuis un site web (texte et listes uniquement). */
const FILLABLE = COMPANY_FIELDS.filter((f) => f.type !== "multiselect").map((f) => ({
  key: f.key,
  label: f.label,
  values: f.options?.map((o) => o.value) ?? null,
  codeKey: f.codeKey ?? null,
}));

const SYSTEM = `Tu extrais les informations d'une entreprise depuis le contenu public de son site web.
Règle absolue : n'invente JAMAIS. Si une information n'apparaît pas explicitement sur le site, renvoie une chaîne vide.
Ne déduis pas, ne complète pas, ne reformule pas des données factuelles (SIRET, TVA, téléphone, adresse).
Réponds uniquement par un objet JSON valide, sans texte autour.`;

/** Récupère la page d'accueil et, si possible, les pages contact / à propos / mentions légales. */
async function fetchSite(url: string): Promise<string> {
  const base = url.startsWith("http") ? url : `https://${url}`;
  const pages = [base];
  try {
    const origin = new URL(base).origin;
    for (const p of ["/contact", "/a-propos", "/mentions-legales"]) pages.push(origin + p);
  } catch {
    /* URL invalide : on garde uniquement la page fournie */
  }
  const parts = await Promise.all(
    pages.map(async (p) => {
      try {
        return `\n\n--- ${p} ---\n${(await fetchOfferFromUrl(p)).slice(0, 12000)}`;
      } catch {
        return "";
      }
    }),
  );
  const text = parts.join("").trim();
  if (!text) throw new Error("Site inaccessible ou sans texte exploitable.");
  return text.slice(0, 40000);
}

export async function fillCompanyFromSite(url: string): Promise<Record<string, string>> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("Clé IA indisponible.");
  const site = await fetchSite(url);

  const schema = FILLABLE.map((f) => {
    const allowed = f.values ? ` (valeurs autorisées : ${f.values.join(" | ")})` : "";
    const code = f.codeKey ? ` + "${f.codeKey}" : indicatif international type +33` : "";
    return `- "${f.key}" : ${f.label}${allowed}${code}`;
  }).join("\n");

  const res = await fetch(GATEWAY, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: SYSTEM },
        {
          role: "user",
          content: `Champs attendus dans le JSON :\n${schema}\n\nContenu du site :\n${site}\n\nRenvoie le JSON. Toute information absente du site = "".`,
        },
      ],
      response_format: { type: "json_object" },
    }),
  });
  if (res.status === 429) throw new Error("Trop de demandes d'un coup, réessayez dans un instant.");
  if (res.status === 402) throw new Error("Crédits IA épuisés.");
  if (!res.ok) throw new Error(`Erreur IA (${res.status})`);
  const json = (await res.json()) as any;
  const raw = String(json?.choices?.[0]?.message?.content ?? "{}");
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(raw.replace(/^```json|^```|```$/gm, "").trim());
  } catch {
    throw new Error("Réponse illisible, réessayez.");
  }

  const allowedKeys = new Set(FILLABLE.flatMap((f) => (f.codeKey ? [f.key, f.codeKey] : [f.key])));
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(parsed)) {
    if (!allowedKeys.has(k)) continue;
    const value = typeof v === "string" || typeof v === "number" ? String(v).trim() : "";
    if (value) out[k] = value;
  }
  out["website"] = url;
  return out;
}
