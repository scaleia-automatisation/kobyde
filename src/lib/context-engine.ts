/**
 * Couche commune de contexte : normalisation, similarité et détection de doublons.
 * Pur TypeScript, utilisable côté client comme côté serveur.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

/** Entités couvertes par le moteur de contexte. */
export const ENTITY_TYPES = [
  "prospect",
  "lead",
  "client",
  "ambassadeur",
  "entreprise",
  "contact",
  "email",
  "conversation",
  "devis",
  "facture",
  "paiement",
  "projet",
  "tache",
  "rendez_vous",
  "reunion",
  "document",
  "offre",
  "produit",
  "service",
  "analyse",
  "recherche",
  "campagne",
  "contenu",
] as const;
export type EntityType = (typeof ENTITY_TYPES)[number];

/** Actions mémorisées par la mémoire commune des agents. */
export const ACTION_TYPES = [
  "prospect_recherche",
  "prospect_enrichi",
  "prospect_contacte",
  "email_analyse",
  "email_envoye",
  "reponse_generee",
  "devis_cree",
  "facture_creee",
  "paiement_recu",
  "projet_cree",
  "contenu_publie",
  "analyse_effectuee",
  "veille_realisee",
  "concurrent_analyse",
] as const;
export type ActionType = (typeof ACTION_TYPES)[number] | string;

/** Statuts du tunnel prospect → client. */
export const PROSPECT_FUNNEL = [
  "Nouveau",
  "Trouvé",
  "Enrichi",
  "Vérifié",
  "Qualifié",
  "À contacter",
  "Contacté",
  "Email envoyé",
  "Relancé",
  "Répondu",
  "Intéressé",
  "Opportunité",
  "Rendez-vous",
  "Devis",
  "Client",
  "Perdu",
  "À ne plus contacter",
] as const;

/** Statuts qui signifient « déjà traité / ne pas re-solliciter automatiquement ». */
export const ALREADY_ENGAGED = new Set(
  [
    "contacté",
    "contacte",
    "email envoyé",
    "email envoye",
    "relancé",
    "relance",
    "répondu",
    "repondu",
    "intéressé",
    "interesse",
    "opportunité",
    "opportunite",
    "rendez-vous",
    "devis",
    "client",
    "perdu",
    "à ne plus contacter",
    "a ne plus contacter",
  ].map((s) => s),
);

export const norm = (v: unknown): string =>
  String(v ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9@. ]+/g, " ")
    .replace(/\b(sarl|sas|sasu|eurl|sa|sci|ltd|llc|inc|gmbh|group|groupe|company|co|societe)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export const normEmail = (v: unknown): string => String(v ?? "").trim().toLowerCase();

export const normPhone = (v: unknown): string => {
  const d = String(v ?? "").replace(/\D+/g, "");
  return d.length > 9 ? d.slice(-9) : d;
};

export const normDomain = (v: unknown): string =>
  String(v ?? "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split(/[/?#]/)[0] ?? "";

export const normRef = (v: unknown): string => String(v ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");

/** Distance de Levenshtein bornée, utilisée pour les noms proches. */
function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length || !b.length) return Math.max(a.length, b.length);
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(
        (prev[j] ?? 0) + 1,
        (cur[j - 1] ?? 0) + 1,
        (prev[j - 1] ?? 0) + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    prev = cur;
  }
  return prev[b.length] ?? 0;
}

/** Similarité 0→1 combinant tokens communs et distance d'édition. */
export function similarity(a: string, b: string): number {
  const x = norm(a);
  const y = norm(b);
  if (!x || !y) return 0;
  if (x === y) return 1;
  const tx = new Set(x.split(" ").filter(Boolean));
  const ty = new Set(y.split(" ").filter(Boolean));
  const inter = [...tx].filter((t) => ty.has(t)).length;
  const jaccard = inter / (tx.size + ty.size - inter || 1);
  const lev = 1 - levenshtein(x, y) / Math.max(x.length, y.length);
  return Math.max(jaccard, lev * 0.95);
}

/** Similarité de contenu long (contenus générés, analyses, documents). */
export function contentSimilarity(a: string, b: string): number {
  const tx = new Set(norm(a).split(" ").filter((w) => w.length > 3));
  const ty = new Set(norm(b).split(" ").filter((w) => w.length > 3));
  if (!tx.size || !ty.size) return 0;
  const inter = [...tx].filter((t) => ty.has(t)).length;
  return inter / Math.min(tx.size, ty.size);
}

export type DuplicateMatch<T = any> = {
  row: T;
  score: number;
  /** Critères ayant déclenché la correspondance. */
  reasons: string[];
  /** true si la correspondance est certaine (email, domaine, référence, identifiant). */
  exact: boolean;
};

export type Candidate = Record<string, unknown>;

/** Critères de rapprochement par entité. */
const KEYS: Record<string, { exact: [string, (v: unknown) => string][]; fuzzy: string[]; scope?: string[] }> = {
  prospect: {
    exact: [
      ["email", normEmail],
      ["phone", normPhone],
      ["website", normDomain],
    ],
    fuzzy: ["company_name", "full_name"],
  },
  lead: { exact: [["email", normEmail]], fuzzy: ["company_name", "full_name"] },
  client: {
    exact: [
      ["email", normEmail],
      ["phone", normPhone],
    ],
    fuzzy: ["company_name", "full_name"],
  },
  contact: { exact: [["email", normEmail]], fuzzy: ["full_name"] },
  entreprise: { exact: [["website", normDomain]], fuzzy: ["name", "company_name"] },
  devis: { exact: [["number", normRef]], fuzzy: ["title"], scope: ["client_id", "project_id"] },
  facture: {
    exact: [
      ["number", normRef],
      ["quote_id", (v) => String(v ?? "")],
      ["payment_id", (v) => String(v ?? "")],
      ["installment_id", (v) => String(v ?? "")],
    ],
    fuzzy: ["label"],
    scope: ["client_id"],
  },
  projet: { exact: [["quote_id", (v) => String(v ?? "")]], fuzzy: ["name"], scope: ["client_id"] },
  tache: { exact: [], fuzzy: ["title"], scope: ["project_id"] },
  produit: { exact: [], fuzzy: ["name"] },
  service: { exact: [], fuzzy: ["name"] },
  offre: { exact: [], fuzzy: ["name", "title"] },
  campagne: { exact: [], fuzzy: ["name"] },
  email: { exact: [["message_id", (v) => String(v ?? "").toLowerCase()]], fuzzy: ["subject"], scope: ["thread_id"] },
  document: { exact: [["url", normDomain]], fuzzy: ["name", "title"] },
  contenu: { exact: [], fuzzy: ["title"] },
  analyse: { exact: [["url", (v) => String(v ?? "").toLowerCase()]], fuzzy: ["title"] },
  recherche: { exact: [], fuzzy: ["title", "query"] },
  reunion: { exact: [], fuzzy: ["title"] },
  rendez_vous: { exact: [], fuzzy: ["title"] },
};

/**
 * Détecte les doublons d'un candidat parmi des lignes existantes.
 * Ne conclut jamais « différent » sur la seule base d'un nom légèrement différent.
 */
export function detectDuplicates<T extends Record<string, any>>(
  entity: string,
  candidate: Candidate,
  rows: T[],
  opts?: { threshold?: number; recentDays?: number },
): DuplicateMatch<T>[] {
  const cfg = KEYS[entity] ?? { exact: [], fuzzy: ["name", "title"] };
  const threshold = opts?.threshold ?? 0.82;
  const out: DuplicateMatch<T>[] = [];

  for (const row of rows) {
    if (candidate["id"] && row["id"] === candidate["id"]) continue;

    // Portée : même client / même projet quand c'est pertinent.
    const scopeOk = (cfg.scope ?? []).every((k) => {
      const a = candidate[k];
      const b = row[k];
      return a === undefined || a === null || b === undefined || b === null || String(a) === String(b);
    });
    if (!scopeOk) continue;

    const reasons: string[] = [];
    let exact = false;
    for (const [key, fn] of cfg.exact) {
      const a = fn(candidate[key]);
      const b = fn(row[key]);
      if (a && b && a === b) {
        exact = true;
        reasons.push(key);
      }
    }

    let best = exact ? 1 : 0;
    if (!exact) {
      for (const key of cfg.fuzzy) {
        const s = similarity(String(candidate[key] ?? ""), String(row[key] ?? ""));
        if (s > best) best = s;
        if (s >= threshold) reasons.push(key);
      }
    }

    if (opts?.recentDays && row["created_at"]) {
      const age = (Date.now() - new Date(row["created_at"]).getTime()) / 864e5;
      if (age > opts.recentDays && !exact) continue;
    }

    if (exact || best >= threshold) out.push({ row, score: Number(best.toFixed(2)), reasons, exact });
  }

  return out.sort((a, b) => b.score - a.score);
}

/** Empreinte stable d'une action, pour éviter de refaire deux fois la même chose. */
export function fingerprint(parts: (string | number | null | undefined)[]): string {
  return parts.map((p) => norm(p)).filter(Boolean).join("|").slice(0, 300);
}

/**
 * Enrichissement non destructif : ne remplit que les champs manquants,
 * ne remplace jamais une donnée fiable existante.
 */
export function enrichPatch<T extends Record<string, any>>(
  existing: T,
  incoming: Record<string, any>,
  opts?: { placeholders?: string[] },
): Record<string, any> {
  const placeholders = new Set((opts?.placeholders ?? ["non trouvé", "non trouve", "n/a", "-"]).map((p) => p.toLowerCase()));
  const empty = (v: any) =>
    v === null || v === undefined || (typeof v === "string" && (!v.trim() || placeholders.has(v.trim().toLowerCase())));

  const patch: Record<string, any> = {};
  for (const [k, v] of Object.entries(incoming)) {
    if (k === "id" || k === "org_id" || k === "created_at") continue;
    if (empty(v)) continue;
    if (empty(existing[k])) patch[k] = v;
  }
  return patch;
}

/** Action recommandée par le moteur face à un élément existant. */
export type Decision =
  | "creer"
  | "mettre_a_jour"
  | "enrichir"
  | "reprendre"
  | "continuer"
  | "relancer"
  | "afficher"
  | "archiver"
  | "ignorer"
  | "demander_confirmation";

export const DECISION_LABEL: Record<Decision, string> = {
  creer: "Créer",
  mettre_a_jour: "Mettre à jour",
  enrichir: "Enrichir",
  reprendre: "Reprendre",
  continuer: "Continuer",
  relancer: "Relancer",
  afficher: "Afficher",
  archiver: "Archiver",
  ignorer: "Ignorer",
  demander_confirmation: "Demander confirmation",
};

/** Réutiliser → enrichir → mettre à jour → créer seulement si nécessaire. */
export function decide(entity: string, matches: DuplicateMatch[], candidate: Candidate): {
  decision: Decision;
  message: string;
} {
  if (!matches.length) return { decision: "creer", message: "Aucun élément similaire : création." };

  const top = matches[0]!;
  const status = String((top.row as any).status ?? "").toLowerCase();

  if (entity === "devis") {
    if (["accepte", "accepté", "refuse", "refusé", "expire", "expiré"].includes(status))
      return { decision: "creer", message: "Le devis similaire est clôturé : un nouveau devis est justifié." };
    return { decision: "reprendre", message: "Un devis similaire est en cours : reprendre et modifier." };
  }
  if (entity === "facture")
    return { decision: "afficher", message: "Une facture est déjà associée à cette transaction." };
  if (entity === "projet")
    return { decision: "continuer", message: "Un projet correspondant existe déjà : l'ouvrir ou ajouter une phase." };
  if (entity === "prospect" || entity === "client" || entity === "contact") {
    if (ALREADY_ENGAGED.has(status)) return { decision: "afficher", message: "Contact déjà engagé : consulter l'historique." };
    return { decision: "enrichir", message: "Fiche existante : enrichir uniquement les informations manquantes." };
  }
  if (top.exact) return { decision: "afficher", message: "Élément identique déjà présent." };
  return { decision: "demander_confirmation", message: "Élément proche détecté : confirmation requise." };
}

/** Intention de la demande : l'utilisateur veut-il justement les éléments déjà traités ? */
export function wantsAlreadyProcessed(prompt: string): boolean {
  const p = norm(prompt);
  return /\b(deja|precedemment|historique|passe|archive)\b/.test(p) &&
    /\b(contacte|contactes|prospecte|prospectes|traite|traites|envoye|envoyes|analyse|analyses|cree|crees)\b/.test(p)
    ? true
    : /\bmontre[- ]?moi (les|mes)\b.*\b(deja|contactes|prospectes|traites)\b/.test(p);
}
