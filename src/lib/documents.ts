/** Constantes partagées du module Documents (client + serveur). */

/** Propositions de noms de documents les plus courants. */
export const DOC_NAME_SUGGESTIONS = [
  "Contrat de prestation signé",
  "Devis signé",
  "Facture client",
  "Bon de commande",
  "Attestation de vigilance URSSAF",
  "Kbis de l'entreprise",
  "Attestation d'assurance RC Pro",
  "Cahier des charges",
  "Compte rendu de réunion",
  "Fiche de paie",
  "Contrat de travail",
  "Relevé bancaire",
];

/** Types de documents proposés dans le formulaire. */
export const DOC_KINDS = [
  "contrat",
  "devis",
  "facture",
  "bon de commande",
  "attestation",
  "administratif",
  "cahier des charges",
  "compte rendu",
  "RH",
  "comptabilité",
  "autre",
];

/** Extensions acceptées à l'import / export. */
export const DOC_ACCEPT =
  ".pdf,.docx,.doc,.txt,.md,.csv,.xlsx,.xls,.json,.jpg,.jpeg,.png,.webp,application/pdf,image/*";

export const DOC_QUESTION_SUGGESTIONS = [
  "Résume ce document en 5 points clés.",
  "Extrais toutes les données chiffrées (montants, dates, quantités).",
  "Quelles sont les obligations et les échéances de chaque partie ?",
  "Extrais les coordonnées présentes (nom, email, téléphone, adresse).",
  "Y a-t-il des clauses à risque ou inhabituelles ?",
];

export const humanSize = (kb: number | null | undefined) => {
  const n = Number(kb ?? 0);
  if (!n) return "—";
  return n > 1024 ? `${(n / 1024).toFixed(1)} Mo` : `${Math.round(n)} Ko`;
};
