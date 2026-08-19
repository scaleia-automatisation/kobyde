/** Constantes partagées client/serveur pour la prospection de Jason. */
export const CHANNELS = [
  "LinkedIn",
  "Facebook",
  "Instagram",
  "TikTok",
  "Youtube",
  "Google Maps",
  "Google Search",
] as const;

export const TOOLS = ["Automatique", "Apify", "PhantomBuster"] as const;

export const WORKFLOW_STEPS = [
  "Entreprise + Offre + Persona + Cible + Localisation",
  "Recherche",
  "Enrichissement",
  "Vérification",
  "Déduplication",
  "Analyse",
  "Qualification",
  "Score",
  "Angle commercial",
  "Personnalisation",
  "Prospection",
  "Suivi",
  "Conversion",
] as const;

export const NOT_FOUND = "Non trouvé";

/** Le coût dépend du nombre de résultats demandés. */
export function searchActionKey(count: number) {
  if (count <= 25) return "prospect.generate_25";
  if (count <= 50) return "prospect.generate_50";
  return "prospect.generate_100";
}
