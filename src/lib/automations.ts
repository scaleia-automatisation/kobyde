/** Moteur d'automatisation : Déclencheur → Condition → Action (catalogue partagé client/serveur). */
export type AutomationRule = {
  key: string;
  agent: string;
  title: string;
  trigger: string;
  condition: string;
  action: string;
};

export const AUTOMATIONS: AutomationRule[] = [
  {
    key: "devis_accepte",
    agent: "devis",
    title: "Devis accepté → demande de paiement",
    trigger: "Un devis passe en « accepté »",
    condition: "Aucun paiement n'a encore été demandé",
    action: "Michael prépare la demande de paiement et vous prévient",
  },
  {
    key: "paiement_recu",
    agent: "gestion",
    title: "Paiement reçu → facture + projet",
    trigger: "Un paiement est confirmé",
    condition: "La facture n'existe pas encore",
    action: "Audrey génère la facture, Chloé crée le projet",
  },
  {
    key: "relance_devis",
    agent: "relances",
    title: "Devis sans réponse → relance",
    trigger: "Un devis envoyé depuis plus de 5 jours",
    condition: "Toujours sans réponse du client",
    action: "Clara prépare une relance à valider",
  },
  {
    key: "facture_retard",
    agent: "gestion",
    title: "Facture en retard → rappel",
    trigger: "La date d'échéance est dépassée",
    condition: "La facture n'est pas payée",
    action: "Audrey prépare un rappel de paiement",
  },
  {
    key: "projet_retard",
    agent: "projets",
    title: "Projet en retard → alerte",
    trigger: "La date de fin est dépassée",
    condition: "Le projet n'est pas terminé",
    action: "Chloé et Éric sont prévenus et proposent une action",
  },
  {
    key: "prospect_chaud",
    agent: "commercial",
    title: "Prospect très qualifié → message",
    trigger: "Un prospect obtient un score supérieur à 80",
    condition: "Il n'a pas encore été contacté",
    action: "Jason prépare un message personnalisé à valider",
  },
  {
    key: "email_important",
    agent: "relances",
    title: "Email important → routage",
    trigger: "Un email prioritaire arrive",
    condition: "Il n'a pas encore de réponse",
    action: "Clara l'analyse et le confie au bon agent",
  },
  {
    key: "avis_negatif",
    agent: "marketing",
    title: "Avis négatif → réponse",
    trigger: "Un avis négatif est détecté",
    condition: "Aucune réponse publiée",
    action: "Lamine et Jennifer préparent une réponse",
  },
  {
    key: "veille_dispo",
    agent: "analyse",
    title: "Veille disponible → résumé",
    trigger: "Une nouvelle analyse de veille est prête",
    condition: "Elle date de moins de 7 jours",
    action: "Ethan prévient Éric avec le résumé",
  },
  {
    key: "candidat_recu",
    agent: "rh",
    title: "Candidature reçue → analyse",
    trigger: "Un candidat est ajouté",
    condition: "Son CV n'a pas encore été analysé",
    action: "Salim analyse la candidature et attribue un score",
  },
];

export const automationByKey = (key: string) => AUTOMATIONS.find((a) => a.key === key);

export const NOTIFICATION_KINDS: Record<string, { label: string; tone: string }> = {
  prospect: { label: "Prospection", tone: "bg-sky-50 text-sky-800" },
  devis: { label: "Devis", tone: "bg-violet-50 text-violet-800" },
  paiement: { label: "Paiement", tone: "bg-emerald-50 text-emerald-800" },
  projet: { label: "Projet", tone: "bg-lime-50 text-lime-800" },
  client: { label: "Client", tone: "bg-teal-50 text-teal-800" },
  email: { label: "Email", tone: "bg-orange-50 text-orange-800" },
  rh: { label: "Recrutement", tone: "bg-indigo-50 text-indigo-800" },
  veille: { label: "Veille", tone: "bg-cyan-50 text-cyan-800" },
  reputation: { label: "E-réputation", tone: "bg-rose-50 text-rose-800" },
  document: { label: "Document", tone: "bg-slate-100 text-slate-800" },
  tache: { label: "Tâche", tone: "bg-amber-50 text-amber-800" },
  systeme: { label: "Système", tone: "bg-slate-100 text-slate-700" },
};
