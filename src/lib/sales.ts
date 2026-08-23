/** Constantes et calculs partagés du cycle Catalogue → Devis → Paiement → Facture → Projet. */

export const DISCOUNT_OPTIONS = [
  { value: "aucune", label: "Aucune remise" },
  { value: "pct5", label: "5 %" },
  { value: "pct10", label: "10 %" },
  { value: "pct20", label: "20 %" },
  { value: "pct", label: "Pourcentage personnalisé" },
  { value: "fixe", label: "Montant fixe (€)" },
] as const;

export const VALIDITY_OPTIONS = [7, 10, 15, 30] as const;

export const MEETING_SOURCES = [
  "Google Meet",
  "Microsoft Teams",
  "Fireflies",
  "Transcription",
  "Résumé",
  "Compte rendu",
  "Texte libre",
] as const;

export const AUDIO_FORMATS = ".wav,.mp3,.m4a,.mp4,.aac,.ogg,.webm,.txt,.md,.pdf";

export const DETECTIONS = ["Validé", "Discuté", "Refusé"] as const;
export type Detection = (typeof DETECTIONS)[number];

export const detectionAction = (d: string) =>
  d === "Validé" ? "✓" : d === "Discuté" ? "À confirmer" : "—";

export const PAYMENT_METHODS = [
  { value: "stripe", label: "Carte bancaire (Stripe)" },
  { value: "virement", label: "Virement" },
  { value: "cheque", label: "Chèque" },
  { value: "especes", label: "Espèces" },
  { value: "autre", label: "Autre" },
] as const;

export const DEFAULT_PROJECT_STEPS = ["Analyse", "Maquette", "Développement", "Tests", "Mise en ligne"];

export const CLIENT_REQUEST_KINDS = [
  { value: "document", label: "Demander un document" },
  { value: "question", label: "Poser une question" },
  { value: "validation", label: "Demander une validation" },
  { value: "information", label: "Demander une information" },
] as const;

export const DEFAULT_INSTALLMENTS = [
  { label: "Acompte 1 — 30 %", percentage: 30 },
  { label: "Acompte 2 — 30 %", percentage: 30 },
  { label: "Solde — 40 %", percentage: 40 },
];

/** Modes de paiement d'un devis / projet : une fois, 2 fois ou 3 fois. */
export const PAYMENT_PLANS = [
  {
    value: "unique",
    label: "Paiement unique",
    hint: "Le client règle la totalité en une seule fois.",
    schedule: [{ label: "Paiement intégral", percentage: 100 }],
  },
  {
    value: "2x",
    label: "Paiement en 2 fois",
    hint: "50 % à la commande, 50 % à la livraison.",
    schedule: [
      { label: "Acompte — 50 %", percentage: 50 },
      { label: "Solde — 50 %", percentage: 50 },
    ],
  },
  {
    value: "3x",
    label: "Paiement en 3 fois",
    hint: "30 % à la commande, 30 % à mi-parcours, 40 % à la livraison.",
    schedule: [
      { label: "Acompte — 30 %", percentage: 30 },
      { label: "Intermédiaire — 30 %", percentage: 30 },
      { label: "Solde — 40 %", percentage: 40 },
    ],
  },
] as const;

export type PaymentPlan = (typeof PAYMENT_PLANS)[number]["value"];

export const paymentPlanOf = (value?: string | null) =>
  PAYMENT_PLANS.find((p) => p.value === value) ?? PAYMENT_PLANS[0];

export const PAYMENT_PLAN_LABEL: Record<string, string> = Object.fromEntries(
  PAYMENT_PLANS.map((p) => [p.value, p.label]),
);

export const PROJECT_STATUS_LABEL: Record<string, string> = {
  en_attente: "En attente du 1er paiement",
  en_cours: "En cours",
  en_pause: "En pause",
  termine: "Terminé",
};


export type QuoteLine = {
  id?: string;
  label: string;
  quantity: number;
  unit_price: number;
  vat_rate: number;
  product_id?: string | null;
  subservices?: { nom: string; prix: number }[];
};

export function discountAmount(subtotal: number, type: string, value: number) {
  switch (type) {
    case "pct5":
      return subtotal * 0.05;
    case "pct10":
      return subtotal * 0.1;
    case "pct20":
      return subtotal * 0.2;
    case "pct":
      return (subtotal * Math.max(0, Math.min(100, value))) / 100;
    case "fixe":
      return Math.max(0, Math.min(subtotal, value));
    default:
      return 0;
  }
}

export function computeTotals(lines: QuoteLine[], discountType: string, discountValue: number) {
  const subtotal = lines.reduce((s, l) => s + Number(l.quantity || 0) * Number(l.unit_price || 0), 0);
  const remise = discountAmount(subtotal, discountType, discountValue);
  const totalHt = Math.max(0, subtotal - remise);
  const ratio = subtotal > 0 ? totalHt / subtotal : 0;
  const tva = lines.reduce(
    (s, l) =>
      s + Number(l.quantity || 0) * Number(l.unit_price || 0) * ratio * (Number(l.vat_rate ?? 20) / 100),
    0,
  );
  const avgVat = totalHt > 0 ? (tva / totalHt) * 100 : 20;
  return {
    subtotal: round2(subtotal),
    remise: round2(remise),
    totalHt: round2(totalHt),
    tva: round2(tva),
    totalTtc: round2(totalHt + tva),
    vatRate: round2(avgVat),
  };
}

export const round2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;

export const ttcFrom = (ht: number, vat: number, remise = 0) =>
  round2(Math.max(0, ht - remise) * (1 + (Number(vat) || 0) / 100));

export const addDays = (days: number, from = new Date()) => {
  const d = new Date(from);
  d.setDate(d.getDate() + days);
  return d;
};

export const isoDate = (d: Date) => d.toISOString().slice(0, 10);

export const nextNumber = (prefix: string) =>
  `${prefix}-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000)}`;

export const QUOTE_STATUS_LABEL: Record<string, string> = {
  brouillon: "Brouillon",
  envoye: "Envoyé",
  accepte: "Accepté",
  refuse: "Refusé",
  expire: "Expiré",
};
