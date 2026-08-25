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

/** Exemples courts de demandes, propres aux compétences de chaque agent. */
export const AGENT_EXAMPLES: Record<string, string[]> = {
  directeur: [
    "Fais le point sur mon activité cette semaine.",
    "Quelles sont mes 3 priorités aujourd'hui ?",
    "Confie les tâches en cours aux bons agents.",
    "Prépare un résumé pour ma réunion.",
  ],
  commercial: [
    "Trouve-moi 50 prospects pour mon offre de création de site.",
    "Rédige un message de prise de contact.",
    "Qualifie mes opportunités en cours.",
    "Relance les prospects sans réponse.",
  ],
  devis: [
    "Prépare un devis pour Jean.",
    "Crée un devis à partir du catalogue.",
    "Propose 3 options tarifaires.",
    "Vérifie les prix de mon dernier devis.",
  ],
  clients: [
    "Résume l'historique de ce client avant mon appel.",
    "Quels clients sont à risque de départ ?",
    "Écris un message de suivi personnalisé.",
    "Mets à jour la fiche d'un client.",
  ],
  relances: [
    "Quels sont mes clients à relancer ?",
    "Relance les factures impayées.",
    "Crée une séquence de 3 relances.",
    "Réactive mes clients inactifs.",
  ],
  marketing: [
    "Donne-moi 5 idées de posts.",
    "Rédige un post LinkedIn sur notre expertise.",
    "Prépare un calendrier de publication.",
    "Écris une newsletter courte.",
  ],
  rh: [
    "Je veux recruter un commercial.",
    "Rédige une offre d'emploi attractive.",
    "Prépare 10 questions d'entretien.",
    "Classe les candidatures reçues.",
  ],
  gestion: [
    "Fais le point sur ma trésorerie.",
    "Liste les factures en retard.",
    "Analyse mes dépenses du mois.",
    "Prépare le récapitulatif du trimestre.",
  ],
  analyse: [
    "Analyse mes concurrents.",
    "Donne-moi les tendances de mon marché.",
    "Surveille mon e-réputation.",
    "Identifie 3 opportunités de croissance.",
  ],
  projets: [
    "Où en sont mes projets ?",
    "Découpe ce projet en étapes.",
    "Quels projets sont en retard ?",
    "Prépare un point d'avancement client.",
  ],
};

export function examplesFor(key: string): string[] {
  return AGENT_EXAMPLES[key] ?? AGENT_EXAMPLES["directeur"]!;
}
