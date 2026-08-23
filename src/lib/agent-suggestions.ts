/** Suggestions de démarrage par agent : ce qu'il fait en priorité. */
export const AGENT_SUGGESTIONS: Record<string, string[]> = {
  directeur: [
    "Fais le point sur la situation de l'entreprise cette semaine",
    "Donne-moi les 3 priorités du jour et qui doit s'en charger",
    "Répartis les tâches en cours entre les agents concernés",
    "Prépare un résumé clair pour ma réunion de demain",
  ],
  commercial: [
    "Trouve-moi 10 prospects qualifiés dans mon secteur",
    "Prépare un message de prise de contact percutant",
    "Relance les prospects sans réponse depuis 7 jours",
    "Analyse mes meilleures opportunités en cours",
  ],
  devis: [
    "Crée un devis à partir de ma dernière réunion client",
    "Vérifie la cohérence des prix de mon dernier devis",
    "Propose 3 options tarifaires pour cette prestation",
    "Rédige les conditions et délais du devis en cours",
  ],
  clients: [
    "Fais le point sur mes clients les plus actifs",
    "Identifie les clients à risque de départ",
    "Prépare un message de suivi personnalisé",
    "Résume l'historique complet d'un client avant mon appel",
  ],
  relances: [
    "Écris une séquence de 3 relances pour les devis en attente",
    "Relance les factures impayées avec un ton pro et courtois",
    "Propose le meilleur moment pour relancer chaque contact",
    "Rédige un email de réactivation pour clients inactifs",
  ],
  marketing: [
    "Donne-moi 5 idées de posts avec des angles pertinents",
    "Rédige un post LinkedIn qui met en avant notre expertise",
    "Prépare un calendrier de publication pour les 2 prochaines semaines",
    "Écris une newsletter courte pour nos clients",
  ],
  rh: [
    "Rédige une offre d'emploi attractive pour ce poste",
    "Prépare 10 questions d'entretien pertinentes",
    "Analyse les candidatures reçues et classe-les",
    "Crée un parcours d'intégration pour un nouvel arrivant",
  ],
  gestion: [
    "Fais le point sur ma trésorerie et mes encaissements",
    "Liste les factures en retard et le montant total",
    "Analyse mes dépenses du mois et propose des économies",
    "Prépare un récapitulatif comptable du trimestre",
  ],
  analyse: [
    "Analyse mes concurrents et leurs dernières actions",
    "Donne-moi les tendances de mon marché avec les sources",
    "Identifie 3 opportunités de croissance pour l'entreprise",
    "Résume l'actualité utile de mon secteur cette semaine",
  ],
  projets: [
    "Fais le point sur l'avancement de mes projets",
    "Découpe ce projet en étapes avec des échéances",
    "Identifie les projets en retard et les blocages",
    "Prépare un point d'avancement à envoyer au client",
  ],
};

export function suggestionsFor(key: string): string[] {
  return AGENT_SUGGESTIONS[key] ?? [];
}
