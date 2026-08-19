/** Constantes partagées du module RH et recrutement (Salim). */

export const HR_STAGES = [
  "candidature",
  "selection",
  "entretien_1",
  "entretien_2",
  "entretien_3",
  "decision",
] as const;

export type HrStage = (typeof HR_STAGES)[number];

export const HR_STAGE_LABELS: Record<string, string> = {
  candidature: "Candidature",
  selection: "Sélection",
  entretien_1: "Entretien 1",
  entretien_2: "Entretien 2",
  entretien_3: "Entretien 3",
  decision: "Décision",
};

/** Progression du pipeline : 20 % → 100 %. */
export const stageProgress = (stage: string) => {
  const i = HR_STAGES.indexOf(stage as HrStage);
  return i < 0 ? 20 : (i + 1) * 20 > 100 ? 100 : (i + 1) * 20;
};

export const INTERVIEW_STATUSES: Record<string, string> = {
  propose: "Créneaux proposés",
  planifie: "Planifié",
  realise: "Réalisé",
  annule: "Annulé",
};

export const INVITE_STATUSES: Record<string, string> = {
  envoye: "En attente de réponse",
  choisi: "Créneau choisi",
  autre: "Autre date demandée",
  refuse: "Ne recherche plus d'emploi",
};

export const scoreTone = (n: number) =>
  n >= 75
    ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/30"
    : n >= 50
      ? "bg-amber-500/15 text-amber-600 border-amber-500/30"
      : "bg-rose-500/15 text-rose-600 border-rose-500/30";

/** Durée de conservation par défaut des candidatures (RGPD, France : 2 ans). */
export const RETENTION_MONTHS = 24;

export const RGPD_NOTICE = `Les informations transmises (CV, lettre, échanges et enregistrements d'entretien) sont utilisées uniquement pour étudier votre candidature.
Elles sont conservées ${RETENTION_MONTHS} mois maximum, ne sont jamais revendues et restent accessibles aux seules personnes en charge du recrutement.
Vous pouvez à tout moment demander l'accès, l'export ou la suppression de vos données. L'IA est une aide à la décision : la décision finale est toujours humaine.`;
