/** Constantes partagées du pôle Marketing (Lamine) : funnel, sites, sections. */

export const FUNNEL_STAGES = [
  { key: "visiteur", label: "Visiteur", hint: "Personnes touchées par vos actions." },
  { key: "lead", label: "Lead", hint: "Contacts identifiés avec un email ou un téléphone." },
  { key: "prospect", label: "Prospect", hint: "Contacts qualifiés, intéressés par votre offre." },
  { key: "rendez_vous", label: "Rendez-vous", hint: "Échanges programmés ou réalisés." },
  { key: "devis", label: "Devis", hint: "Propositions commerciales envoyées." },
  { key: "client", label: "Client", hint: "Devis acceptés, clients actifs." },
  { key: "paiement", label: "Paiement", hint: "Paiements réellement encaissés." },
  { key: "fidelisation", label: "Fidélisation", hint: "Clients qui reviennent (plusieurs achats)." },
] as const;

export type FunnelKey = (typeof FUNNEL_STAGES)[number]["key"];

export const SITE_TYPES = [
  { value: "vitrine", label: "Site vitrine" },
  { value: "ecommerce", label: "E-commerce" },
] as const;

export const SITE_TONES = [
  "Professionnel",
  "Chaleureux",
  "Premium",
  "Direct",
  "Expert",
  "Créatif",
] as const;

export const SITE_STYLES = [
  "Épuré / minimaliste",
  "Premium / élégant",
  "Moderne / tech",
  "Chaleureux / artisanal",
  "Audacieux / coloré",
] as const;

/** Sections disponibles. Une section n'est ajoutée que si elle est réellement utile. */
export const SITE_SECTIONS = [
  "Hero",
  "Proposition de valeur",
  "Problème",
  "Solution",
  "Bénéfices",
  "Fonctionnalités",
  "Produits",
  "Fonctionnement",
  "Avantages",
  "Preuves",
  "Chiffres",
  "Témoignages",
  "Études de cas",
  "Comparaison",
  "Tarifs",
  "Garanties",
  "FAQ",
  "CTA",
  "Contact",
  "Footer",
] as const;

export const BRIEF_SECTIONS = [
  ["contexte", "Contexte"],
  ["objectifs", "Objectifs"],
  ["entreprise", "Entreprise"],
  ["produit_service", "Produit / service"],
  ["cible", "Cible"],
  ["positionnement", "Positionnement"],
  ["parcours", "Parcours utilisateur"],
  ["architecture", "Architecture"],
  ["pages", "Pages"],
  ["direction_artistique", "Direction artistique"],
  ["seo", "SEO"],
  ["geo", "GEO (recherche IA)"],
  ["conversion", "Conversion"],
  ["contenus_necessaires", "Contenus nécessaires"],
] as const;

export type MarketingKind = "promesse" | "proposition" | "briefing" | "contenu";

export const KIND_LABEL: Record<MarketingKind, string> = {
  promesse: "Promesse",
  proposition: "Proposition de valeur",
  briefing: "Briefing de site",
  contenu: "Contenu de site",
};
