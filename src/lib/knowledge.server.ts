import { fileBlock, type UploadedFile } from "./hr.server";
import { openingHoursText } from "./company";

/* eslint-disable @typescript-eslint/no-explicit-any */

const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

/** Catégories de la version structurée exploitée par les agents. */
export const KNOWLEDGE_CATEGORIES = [
  "identite",
  "activite",
  "positionnement",
  "valeurs",
  "cibles",
  "produits",
  "services",
  "prix",
  "conditions",
  "marketing",
  "seo",
  "equipe",
  "horaires",
  "coordonnees",
  "reseaux_sociaux",
  "administratif",
  "documents",
  "sources",
] as const;

export type KnowledgeCategory = (typeof KNOWLEDGE_CATEGORIES)[number];

export type KnowledgeStructured = Partial<Record<KnowledgeCategory, any>> & {
  incoherences?: string[];
};

const SYSTEM = `Tu es l'expert « base de connaissance d'entreprise » de Kobyde.
Tu produis une base de connaissance interne en français, factuelle, structurée et directement exploitable par des agents IA.

RÈGLES ABSOLUES
1. N'invente JAMAIS : ni produit, ni service, ni prix, ni client, ni certification, ni adresse, ni horaire, ni membre d'équipe, ni promesse commerciale, ni avantage concurrentiel.
2. Si une information n'est pas disponible, laisse le champ vide (chaîne vide ou tableau vide). N'écris pas de contenu de remplissage.
3. Priorité des sources : (1) fiche entreprise renseignée par l'utilisateur — toujours prioritaire, (2) site internet, (3) autres sources connectées (documents, connecteurs, données CRM).
4. En cas de contradiction, garde l'information de la fiche entreprise et signale l'écart dans "incoherences".
5. Pas de doublon : une même information n'apparaît qu'une fois.
6. Dans la section SEO, sépare clairement « informations trouvées » et « recommandations IA ».

SORTIE
Réponds UNIQUEMENT par un objet JSON valide :
{
  "markdown": "base de connaissance lisible en Markdown",
  "data": { ...version structurée... },
  "incoherences": ["..."]
}

"markdown" doit être du TEXTE STRUCTURÉ LISIBLE (pas de JSON, pas de syntaxe markdown ** ni ##). Format OBLIGATOIRE pour chaque section : un titre en MAJUSCULES précédé d'un emoji, une ligne vide, puis chaque information sur sa propre ligne sous la forme « - Libellé : valeur » (listes à puces simples), avec une ligne vide entre chaque section. Exemple :

🏢 IDENTITÉ

- Nom : Baobab Shop
- Description : ...
- Type d'entreprise : ...
- Secteur d'activité : ...
- SIRET : ...
- SIREN : ...
- Numéro de TVA : ...

📍 COORDONNÉES

- Adresse : ...
- Ville : ...
- Pays : ...
- Site internet : ...
- Email : ...
- Téléphone : ...
- WhatsApp : ...
- Telegram : ...

Structure complète des sections à produire (omettre toute ligne ou section sans information, ne jamais écrire « non renseigné ») :
🏢 1. IDENTITÉ DE L'ENTREPRISE (nom, descriptions, secteur, type, zone géographique, résumé : ce qu'elle fait, pour qui, comment elle crée de la valeur, ce qui la différencie)
🎯 2. ACTIVITÉ ET EXPERTISE
🛍️ 3. PRODUITS
🛠️ 4. SERVICES
💰 5. PRIX ET CONDITIONS COMMERCIALES
👥 6. CLIENTS ET CIBLES
🎯 7. POSITIONNEMENT
🧠 8. PROBLÈMES RÉSOLUS ET BÉNÉFICES CLIENTS
📢 9. MARKETING ET COMMUNICATION
🔎 10. SEO ET VISIBILITÉ
📍 11. COORDONNÉES ET CONTACT
🌐 12. PRÉSENCE DIGITALE
🕒 13. HORAIRES ET DISPONIBILITÉS
👨‍💼 14. ÉQUIPE ET ORGANISATION
📄 15. INFORMATIONS ADMINISTRATIVES

"data" suit ce schéma (chaque bloc peut être vide) :
{
  "identite": { "nom": "", "description_courte": "", "description_detaillee": "", "secteur": "", "type_entreprise": "", "zone_geographique": "", "resume": "" },
  "activite": { "principale": "", "secondaires": [], "expertises": [], "problemes_resolus": [] },
  "positionnement": { "positionnement": "", "proposition_valeur": "", "differenciation": "", "avantages": [], "ton": "" },
  "valeurs": [],
  "cibles": [ { "nom": "", "description": "", "secteurs": [], "besoins": [], "objections": [] } ],
  "produits": [ { "nom": "", "description": "", "probleme_resolu": "", "caracteristiques": [], "prix": "", "options": [], "conditions": "" } ],
  "services": [ { "nom": "", "description": "", "objectif": "", "livrables": [], "delais": "", "prix": "", "conditions": "" } ],
  "prix": { "grille": [], "forfaits": [], "remises": [], "tva": "", "devise": "" },
  "conditions": { "paiement": "", "delais": "", "garanties": "", "cgv": "" },
  "marketing": { "ton": "", "style": "", "messages_cles": [], "arguments": [], "mots_cles": [], "expressions_a_eviter": [], "reseaux_utilises": [] },
  "seo": { "mots_cles_trouves": [], "zones_geographiques": [], "thematiques": [], "questions_frequentes": [], "recommandations_ia": [] },
  "equipe": [ { "nom": "", "fonction": "", "responsabilites": "", "departement": "" } ],
  "horaires": { "texte": "", "jours": [] },
  "coordonnees": { "adresse": "", "ville": "", "pays": "", "email": "", "telephone": "", "whatsapp": "", "telegram": "", "site_web": "", "zones_desservies": [] },
  "reseaux_sociaux": [ { "plateforme": "", "url": "" } ],
  "administratif": { "forme_juridique": "", "siret": "", "siren": "", "tva": "", "taux_tva": "", "devise": "", "langues": [], "adresse_legale": "" },
  "documents": [],
  "sources": [ { "categorie": "", "source": "fiche_entreprise|site_web|document|connecteur|utilisateur", "url": "", "recupere_le": "" } ]
}`;

async function callAI(content: any[]): Promise<any> {
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
      response_format: { type: "json_object" },
    }),
  });
  if (res.status === 429) throw new Error("Trop de demandes d'un coup, réessayez dans un instant.");
  if (res.status === 402) throw new Error("Crédits IA épuisés.");
  if (!res.ok) throw new Error(`Erreur IA (${res.status})`);
  const json = (await res.json()) as any;
  const raw = String(json?.choices?.[0]?.message?.content ?? "").trim();
  if (!raw) throw new Error("La base de connaissance n'a pas pu être générée.");
  try {
    return JSON.parse(raw.replace(/^```json|^```|```$/gm, "").trim());
  } catch {
    const s = raw.indexOf("{");
    const e = raw.lastIndexOf("}");
    if (s >= 0 && e > s) {
      try {
        return JSON.parse(raw.slice(s, e + 1));
      } catch {
        /* suite */
      }
    }
    return { markdown: raw, data: {} };
  }
}

export type KnowledgeResult = {
  markdown: string;
  data: KnowledgeStructured;
  pages: string[];
};

function normalize(out: any, pages: string[], origin: string): KnowledgeResult {
  let markdown = String(out?.markdown ?? "").trim();
  // Si le modèle a renvoyé le JSON complet dans "markdown", on extrait le vrai contenu texte.
  if (markdown.startsWith("{")) {
    try {
      const inner = JSON.parse(markdown);
      if (inner && typeof inner.markdown === "string") markdown = inner.markdown.trim();
    } catch {
      const s = markdown.indexOf('"markdown"');
      if (s >= 0) {
        const m2 = markdown.slice(s).match(/"markdown"\s*:\s*"([\s\S]*?)",\s*"data"/);
        if (m2?.[1]) {
          try {
            markdown = JSON.parse(`"${m2[1]}"`);
          } catch {
            markdown = m2[1].replace(/\\n/g, "\n").replace(/\\"/g, '"');
          }
        }
      }
    }
  }
  if (!markdown || markdown.startsWith("{")) throw new Error("La base de connaissance n'a pas pu être générée.");
  const data = (out?.data && typeof out.data === "object" ? out.data : {}) as KnowledgeStructured;
  if (Array.isArray(out?.incoherences) && out.incoherences.length) data.incoherences = out.incoherences;
  const sources = Array.isArray(data.sources) ? data.sources : [];
  data.sources = [
    ...sources,
    { categorie: "fiche_entreprise", source: "fiche_entreprise", url: "", recupere_le: new Date().toISOString() },
    ...pages.map((p) => ({ categorie: "site_web", source: "site_web", url: p, recupere_le: new Date().toISOString() })),
  ];
  if (origin) (data as any).site_origine = origin;
  return { markdown, data, pages };
}

/** Génère (ou met à jour) la base de connaissance : fiche entreprise + site web + sources connectées. */
export async function generateKnowledgeAI(
  org: Record<string, any>,
  existing?: string | null,
  mode: "generate" | "update" = "generate",
  extras?: { produits?: any[]; services?: any[]; connecteurs?: string[]; documents?: string[] },
): Promise<KnowledgeResult> {
  let site = "";
  let pages: string[] = [];
  let origin = "";
  if (org["website"]) {
    try {
      const { crawlSite } = await import("./company-fill.server");
      const crawled = await crawlSite(String(org["website"]));
      site = crawled.text;
      pages = crawled.pages;
      origin = crawled.origin;
    } catch {
      site = "";
    }
  }

  const fiche = { ...org };
  delete (fiche as any).knowledge_base;
  delete (fiche as any).knowledge_json;

  const content: any[] = [
    {
      type: "text",
      text: `SOURCE PRIORITAIRE — fiche entreprise renseignée par l'utilisateur (JSON) :\n${JSON.stringify(fiche).slice(0, 20000)}`,
    },
  ];

  const horaires = openingHoursText(org["opening_hours"]);
  if (horaires) content.push({ type: "text", text: `Horaires d'ouverture renseignés :\n${horaires}` });

  if (site)
    content.push({
      type: "text",
      text: `SOURCE SECONDAIRE — contenu public du site web (${pages.length} page(s) lue(s) : ${pages.join(", ")}) :\n${site}`,
    });

  if (extras?.produits?.length || extras?.services?.length)
    content.push({
      type: "text",
      text: `SOURCE COMPLÉMENTAIRE — catalogue enregistré dans Kobyde :\n${JSON.stringify({
        produits: extras?.produits ?? [],
        services: extras?.services ?? [],
      }).slice(0, 12000)}`,
    });

  if (extras?.documents?.length)
    content.push({ type: "text", text: `SOURCE COMPLÉMENTAIRE — documents importés :\n${extras.documents.join("\n")}` });

  if (extras?.connecteurs?.length)
    content.push({ type: "text", text: `Outils connectés : ${extras.connecteurs.join(", ")}` });

  if (existing?.trim())
    content.push({
      type: "text",
      text: `Base de connaissance existante à conserver et compléter :\n${existing.slice(0, 20000)}`,
    });

  content.push({
    type: "text",
    text:
      mode === "update"
        ? "Mets à jour la base de connaissance existante sans rien perdre d'utile et sans créer de doublon. La fiche entreprise fait foi en cas de contradiction ; signale les écarts dans \"incoherences\"."
        : "Génère la base de connaissance complète de cette entreprise selon la structure demandée.",
  });

  return normalize(await callAI(content), pages, origin);
}

/** Intègre un fichier ou un texte collé à la base de connaissance. */
export async function importKnowledgeAI(args: {
  existing?: string | null;
  pasted?: string | null;
  file?: UploadedFile | null;
}): Promise<KnowledgeResult> {
  const content: any[] = [];
  if (args.file) content.push(fileBlock(args.file, `Document « ${args.file.name} »`));
  if (args.pasted?.trim()) content.push({ type: "text", text: `Texte fourni :\n${args.pasted.slice(0, 30000)}` });
  if (args.existing?.trim())
    content.push({ type: "text", text: `Base de connaissance existante :\n${args.existing.slice(0, 20000)}` });
  content.push({
    type: "text",
    text: "Fusionne ces éléments dans une base de connaissance unique, sans doublon, en respectant la structure et le format de sortie demandés. Conserve toutes les informations existantes.",
  });
  return normalize(await callAI(content), [], "");
}
