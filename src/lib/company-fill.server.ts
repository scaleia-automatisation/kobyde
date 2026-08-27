import { COMPANY_FIELDS } from "./company";

/* eslint-disable @typescript-eslint/no-explicit-any */

const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const FETCH_TIMEOUT_MS = 8000;
const READER_PREFIX = "https://r.jina.ai/http://";

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

function normalizeInput(raw: string): string {
  return raw.trim().replace(/\s+/g, "").replace(/\/$/, "");
}

function addScheme(raw: string): string {
  return /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
}

function htmlDecode(input: string): string {
  return input
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}

/** Récupère une page et en extrait le texte lisible. */
async function fetchPageText(url: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "user-agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "accept-language": "fr-FR,fr;q=0.9,en;q=0.8",
      },
    });

    if (!res.ok) return "";

    const contentType = res.headers.get("content-type") || "";
    if (!contentType.includes("text/html") && !contentType.includes("application/xhtml")) {
      return "";
    }

    const html = await res.text();
    if (!html || html.length < 20) return "";

    const title = (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "").trim();
    const meta = Array.from(
      html.matchAll(
        /<meta[^>]+(?:name|property)=["'](?:description|og:[a-z:]+)["'][^>]*content=["']([^"']+)["']/gi,
      ),
    )
      .map((m) => m[1])
      .join(" ");

    const body = html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
      .replace(/<canvas[\s\S]*?<\/canvas>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s{2,}/g, " ")
      .trim();

    const text = htmlDecode(`${title} ${meta} ${body}`.trim());
    return text;
  } catch {
    return "";
  } finally {
    clearTimeout(timer);
  }
}

/** Lecture de secours pour les sites dont le contenu est rendu côté navigateur. */
async function fetchRenderedText(url: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const target = new URL(url);
    const readerUrl = `${READER_PREFIX}${target.host}${target.pathname}${target.search}`;
    const res = await fetch(readerUrl, {
      redirect: "follow",
      signal: controller.signal,
      headers: { accept: "text/plain;charset=utf-8" },
    });
    if (!res.ok) return "";

    const text = (await res.text()).trim();
    if (
      text.length < 40 ||
      /(?:Target URL returned error 4\d\d|Title:\s*(?:404|Not Found)|Page not found)/i.test(text)
    ) {
      return "";
    }
    return text;
  } catch {
    return "";
  } finally {
    clearTimeout(timer);
  }
}

/** Récupère la page d'accueil et, si possible, les pages contact / à propos / mentions légales. */
export async function fetchSite(url: string): Promise<{ text: string; origin: string }> {
  const raw = normalizeInput(url);
  const withScheme = addScheme(raw);

  const origins: string[] = [];
  try {
    const u = new URL(withScheme);
    const host = u.hostname.toLowerCase();
    const alt = host.startsWith("www.") ? host.slice(4) : `www.${host}`;
    for (const h of [host, alt]) {
      origins.push(`https://${h}`);
      origins.push(`http://${h}`);
    }
  } catch {
    throw new Error("Lien du site invalide.");
  }

  let origin = "";
  let home = "";
  for (const o of origins) {
    const directText = await fetchPageText(o).catch(() => "");
    const text = directText.length > 40 ? directText : await fetchRenderedText(o).catch(() => "");
    if (text.length > 40) {
      origin = o;
      home = text;
      break;
    }
  }

  if (!home) {
    throw new Error(
      "Impossible de lire ce site (inaccessible ou entièrement généré en JavaScript). Vérifiez le lien ou remplissez la fiche manuellement.",
    );
  }

  const extras = await Promise.all(
    ["/contact", "/a-propos", "/about", "/mentions-legales", "/legal"].map(async (p) => {
      const text = await fetchPageText(origin + p).catch(() => "");
      return text.length > 40 ? `\n\n--- ${origin + p} ---\n${text.slice(0, 10000)}` : "";
    }),
  );

  return {
    origin,
    text: `--- ${origin} ---\n${home.slice(0, 15000)}${extras.join("")}`.slice(0, 40000),
  };
}

export async function fillCompanyFromSite(url: string): Promise<Record<string, string>> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("Clé IA indisponible.");

  const { text: site, origin } = await fetchSite(url);

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
  out["website"] = origin;
  return out;
}

