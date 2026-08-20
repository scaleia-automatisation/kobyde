/** Constantes partagées du module Emails (Clara Relances). */

export const EMAIL_PRIORITIES = [
  { key: "urgent", label: "Urgent", chip: "bg-red-100 text-red-800 ring-red-200", rank: 0 },
  { key: "important", label: "Important", chip: "bg-orange-100 text-orange-800 ring-orange-200", rank: 1 },
  { key: "normal", label: "Normal", chip: "bg-sky-100 text-sky-800 ring-sky-200", rank: 2 },
  { key: "faible", label: "Faible", chip: "bg-slate-100 text-slate-700 ring-slate-200", rank: 3 },
] as const;

export type EmailPriority = (typeof EMAIL_PRIORITIES)[number]["key"];

export const priorityMeta = (key: string | null | undefined) =>
  EMAIL_PRIORITIES.find((p) => p.key === key) ?? EMAIL_PRIORITIES[2];

export const EMAIL_STATUSES = [
  { key: "nouveau", label: "Nouveau" },
  { key: "analyse", label: "Analysé" },
  { key: "a_valider", label: "Réponse à valider" },
  { key: "planifie", label: "Envoi programmé" },
  { key: "envoye", label: "Envoyé" },
  { key: "rejete", label: "Rejeté" },
  { key: "classe", label: "Classé" },
] as const;

export const statusLabel = (key: string | null | undefined) =>
  EMAIL_STATUSES.find((s) => s.key === key)?.label ?? "Nouveau";

/** Routage : catégorie d'email → agent responsable. */
export const EMAIL_ROUTING: { category: string; label: string; agentKey: string; agentName: string }[] = [
  { category: "commercial", label: "Email commercial", agentKey: "commercial", agentName: "Jason" },
  { category: "devis", label: "Email devis", agentKey: "devis", agentName: "Michael" },
  { category: "client", label: "Email client", agentKey: "clients", agentName: "Jennifer" },
  { category: "relance", label: "Email relance", agentKey: "relances", agentName: "Clara" },
  { category: "rh", label: "Email RH", agentKey: "rh", agentName: "Mariéme" },
  { category: "marketing", label: "Email marketing", agentKey: "marketing", agentName: "Lamine" },
  { category: "facturation", label: "Email facturation / gestion", agentKey: "gestion", agentName: "Audrey" },
  { category: "projet", label: "Email projet", agentKey: "projets", agentName: "Chloé" },
  { category: "analyse", label: "Email analyse / veille", agentKey: "analyse", agentName: "Ethan" },
  { category: "autre", label: "Autre", agentKey: "directeur", agentName: "Éric" },
];

export const routingMeta = (category: string | null | undefined) =>
  EMAIL_ROUTING.find((r) => r.category === category) ?? EMAIL_ROUTING[EMAIL_ROUTING.length - 1]!;

/** Conditions disponibles dans le constructeur de séquences. */
export const SEQUENCE_CONDITIONS = [
  { key: "toujours", label: "Toujours" },
  { key: "ouvert", label: "Si email ouvert" },
  { key: "clic", label: "Si clic" },
  { key: "reponse", label: "Si réponse" },
  { key: "sans_reponse", label: "Si absence de réponse" },
  { key: "rdv", label: "Si rendez-vous" },
  { key: "conversion", label: "Si conversion" },
] as const;

export const conditionLabel = (key: string | null | undefined) =>
  SEQUENCE_CONDITIONS.find((c) => c.key === key)?.label ?? "Toujours";

export type SequenceStep = {
  kind: "initial" | "relance" | "finale";
  day: number;
  condition: string;
  subject: string;
  body: string;
};

export const STEP_KIND_LABEL: Record<SequenceStep["kind"], string> = {
  initial: "Email initial",
  relance: "Relance",
  finale: "Relance finale",
};

export const DEFAULT_SEQUENCE_STEPS: SequenceStep[] = [
  { kind: "initial", day: 0, condition: "toujours", subject: "", body: "" },
  { kind: "relance", day: 3, condition: "sans_reponse", subject: "", body: "" },
  { kind: "relance", day: 7, condition: "sans_reponse", subject: "", body: "" },
  { kind: "finale", day: 14, condition: "sans_reponse", subject: "", body: "" },
];

export const dayLabel = (day: number) => (day === 0 ? "J0" : `J+${day}`);
