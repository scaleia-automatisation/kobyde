/** Constantes partagées du module Ethan (analyse, veille et e-réputation). */

export const INTEL_KINDS = {
  business_plan: "Business plan",
  market_study: "Étude de marché",
  sector: "Analyse sectorielle",
  competitive: "Analyse concurrentielle",
  watch_competitive: "Briefing de veille concurrentielle",
  watch_general: "Veille générale",
  ereputation: "E-réputation",
} as const;

export type IntelKind = keyof typeof INTEL_KINDS;

export const WATCH_FREQUENCIES = ["quotidienne", "hebdomadaire"] as const;

export const WATCH_AXES = [
  "produits",
  "fonctionnalités",
  "prix",
  "offres",
  "promotions",
  "marchés",
  "partenariats",
  "acquisitions",
  "levées de fonds",
  "campagnes",
  "positionnement",
  "technologies",
] as const;

export const SENTIMENTS = ["positif", "neutre", "négatif"] as const;
export const IMPORTANCES = ["faible", "normale", "élevée", "critique"] as const;

export const REPLY_STATUSES = {
  aucune: "Sans réponse",
  brouillon: "Réponse préparée",
  valide: "Validée",
  publie: "Publiée",
} as const;

export type Source = { titre: string; url: string; date?: string | undefined };

export const sentimentTone = (s: string) =>
  s === "positif"
    ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/30"
    : s === "négatif"
      ? "bg-rose-500/15 text-rose-600 border-rose-500/30"
      : "bg-muted text-muted-foreground border-border";

export const importanceTone = (s: string) =>
  s === "critique"
    ? "bg-rose-500/15 text-rose-600 border-rose-500/30"
    : s === "élevée"
      ? "bg-amber-500/15 text-amber-600 border-amber-500/30"
      : "bg-muted text-muted-foreground border-border";
