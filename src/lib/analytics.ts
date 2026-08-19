/** Évènements comportement client (espace client + page de paiement). */
export const PORTAL_EVENTS = [
  "portal_viewed",
  "quote_viewed",
  "quote_accepted",
  "quote_rejected",
  "payment_started",
  "payment_completed",
  "project_viewed",
  "document_downloaded",
  "client_request_created",
  "section_clicked",
  "time_spent",
] as const;

export type PortalEvent = (typeof PORTAL_EVENTS)[number];

export const EVENT_LABELS: Record<string, string> = {
  portal_viewed: "Espace client ouvert",
  quote_viewed: "Devis consulté",
  quote_accepted: "Devis accepté",
  quote_rejected: "Devis refusé",
  payment_started: "Paiement commencé",
  payment_completed: "Paiement terminé",
  project_viewed: "Projet consulté",
  document_downloaded: "Document téléchargé",
  client_request_created: "Demande / réponse client",
  section_clicked: "Clic dans l'espace",
  time_spent: "Temps de consultation",
};

export const eventLabel = (name: string) => EVENT_LABELS[name] ?? name;

/** Identifiant de session anonyme (pas de cookie publicitaire, pas de donnée perso). */
export function portalSessionId(): string {
  if (typeof window === "undefined") return "ssr";
  const key = "kobyde_portal_session";
  let id = window.sessionStorage.getItem(key);
  if (!id) {
    id = Math.random().toString(36).slice(2) + Date.now().toString(36);
    window.sessionStorage.setItem(key, id);
  }
  return id;
}

export const RGPD_PORTAL_NOTICE =
  "Pour améliorer votre suivi, nous enregistrons de façon anonyme les pages consultées et le temps passé dans cet espace. Aucune donnée n'est revendue ni utilisée à des fins publicitaires.";

export const pct = (num: number, den: number) => (den > 0 ? Math.round((num / den) * 100) : 0);

/** Délai moyen de paiement en jours. */
export function averageDelayDays(rows: { from?: string | null; to?: string | null }[]) {
  const values = rows
    .map((r) =>
      r.from && r.to ? (new Date(r.to).getTime() - new Date(r.from).getTime()) / 86400000 : null,
    )
    .filter((v): v is number => v !== null && Number.isFinite(v) && v >= 0);
  if (values.length === 0) return null;
  return Math.round((values.reduce((s, v) => s + v, 0) / values.length) * 10) / 10;
}
