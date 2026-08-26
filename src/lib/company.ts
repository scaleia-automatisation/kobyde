/** Champs de la mémoire centrale de l'entreprise (source de vérité unique). */
export type CompanyField = {
  key: string;
  label: string;
  hint?: string;
  type: "text" | "textarea" | "number" | "select" | "phone" | "multiselect";
  /** Pour les champs téléphone : clé de l'indicatif stocké séparément. */
  codeKey?: string;
  placeholder?: string;
  options?: { value: string; label: string }[];
  optional?: boolean;
};

export type CompanyGroup = { title: string; description: string; fields: CompanyField[] };

const opts = (values: string[]) => values.map((v) => ({ value: v, label: v }));

/** Formes juridiques les plus courantes en France. */
export const COMPANY_TYPES = [
  "Auto-entrepreneur / Micro-entreprise",
  "Entreprise individuelle (EI)",
  "EURL",
  "SARL",
  "SAS",
  "SASU",
  "SA",
  "SNC",
  "SCI",
  "SCOP",
  "SELARL",
  "Association loi 1901",
  "Profession libérale",
  "Autre",
];

/** Taux de TVA applicables en France. */
export const VAT_RATES = [
  { value: "20", label: "20 % — taux normal (la plupart des activités)" },
  { value: "10", label: "10 % — taux intermédiaire (restauration, rénovation, transport)" },
  { value: "5.5", label: "5,5 % — taux réduit (alimentaire, livres, travaux énergétiques)" },
  { value: "2.1", label: "2,1 % — taux particulier (presse, médicaments remboursés)" },
  { value: "0", label: "0 % — franchise en base / exonération" },
];

export const CURRENCIES = [
  { value: "EUR", label: "EUR — Euro (€)" },
  { value: "USD", label: "USD — Dollar américain ($)" },
  { value: "GBP", label: "GBP — Livre sterling (£)" },
  { value: "CHF", label: "CHF — Franc suisse" },
  { value: "CAD", label: "CAD — Dollar canadien" },
  { value: "XOF", label: "XOF — Franc CFA (UEMOA)" },
  { value: "XAF", label: "XAF — Franc CFA (CEMAC)" },
  { value: "MAD", label: "MAD — Dirham marocain" },
  { value: "TND", label: "TND — Dinar tunisien" },
  { value: "AED", label: "AED — Dirham des Émirats" },
];

/** Indicatifs téléphoniques les plus utilisés. */
export const DIAL_CODES = [
  { value: "+33", label: "🇫🇷 France +33" },
  { value: "+32", label: "🇧🇪 Belgique +32" },
  { value: "+41", label: "🇨🇭 Suisse +41" },
  { value: "+352", label: "🇱🇺 Luxembourg +352" },
  { value: "+1", label: "🇺🇸🇨🇦 États-Unis / Canada +1" },
  { value: "+44", label: "🇬🇧 Royaume-Uni +44" },
  { value: "+49", label: "🇩🇪 Allemagne +49" },
  { value: "+34", label: "🇪🇸 Espagne +34" },
  { value: "+39", label: "🇮🇹 Italie +39" },
  { value: "+212", label: "🇲🇦 Maroc +212" },
  { value: "+213", label: "🇩🇿 Algérie +213" },
  { value: "+216", label: "🇹🇳 Tunisie +216" },
  { value: "+221", label: "🇸🇳 Sénégal +221" },
  { value: "+225", label: "🇨🇮 Côte d'Ivoire +225" },
  { value: "+237", label: "🇨🇲 Cameroun +237" },
  { value: "+242", label: "🇨🇬 Congo +242" },
  { value: "+243", label: "🇨🇩 RD Congo +243" },
  { value: "+971", label: "🇦🇪 Émirats arabes unis +971" },
];

export const WEEK_DAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

/** Créneaux horaires par pas de 30 minutes. */
export const HOUR_SLOTS = Array.from({ length: 48 }, (_, i) => {
  const h = String(Math.floor(i / 2)).padStart(2, "0");
  const m = i % 2 === 0 ? "00" : "30";
  return `${h}:${m}`;
});

export type OpeningDay = { day: string; closed: boolean; open: string; close: string };

export const DEFAULT_OPENING_HOURS: OpeningDay[] = WEEK_DAYS.map((day) => ({
  day,
  closed: day === "Samedi" || day === "Dimanche",
  open: "09:00",
  close: "18:00",
}));

export function openingHoursText(hours: OpeningDay[] | null | undefined): string {
  if (!hours?.length) return "";
  return hours
    .map((h) => (h.closed ? `${h.day} : fermé` : `${h.day} : ${h.open} – ${h.close}`))
    .join("\n");
}

export const COMPANY_GROUPS: CompanyGroup[] = [
  {
    title: "Identité",
    description: "Ce que vos agents doivent savoir avant tout.",
    fields: [
      { key: "name", label: "Nom de l'entreprise", type: "text", placeholder: "Kobyde SAS" },
      { key: "logo_url", label: "Logo (lien de l'image)", type: "text", placeholder: "https://…/logo.png" },
      { key: "description", label: "Description", type: "textarea", placeholder: "Ce que fait votre entreprise en quelques lignes." },
      {
        key: "company_type",
        label: "Type d'entreprise",
        type: "select",
        placeholder: "Choisir une forme juridique",
        options: opts(COMPANY_TYPES),
      },
      { key: "industry", label: "Secteur d'activité", type: "text", placeholder: "Bâtiment, conseil, e-commerce…" },
      { key: "siret", label: "SIRET", type: "text", placeholder: "123 456 789 00012" },
      { key: "siren", label: "SIREN (optionnel)", type: "text", placeholder: "123 456 789", optional: true },
      {
        key: "vat_number",
        label: "N° TVA intracommunautaire (optionnel)",
        type: "text",
        placeholder: "FR12345678900",
        optional: true,
      },
    ],
  },
  {
    title: "Coordonnées",
    description: "Utilisées automatiquement dans les devis, factures et emails.",
    fields: [
      { key: "address", label: "Adresse", type: "text", placeholder: "12 rue des Lilas" },
      { key: "city", label: "Ville", type: "text", placeholder: "Paris" },
      { key: "country", label: "Pays", type: "text", placeholder: "France" },
      { key: "website", label: "Site web", type: "text", placeholder: "https://kobyde.com" },
      { key: "email", label: "Email", type: "text", placeholder: "contact@kobyde.com" },
      {
        key: "phone_country_code",
        label: "Indicatif téléphonique",
        type: "select",
        placeholder: "Choisir un indicatif",
        options: DIAL_CODES,
      },
      { key: "phone", label: "Téléphone", type: "text", placeholder: "1 23 45 67 89" },
      { key: "whatsapp_phone", label: "Numéro WhatsApp", type: "text", placeholder: "6 12 34 56 78", optional: true },
      { key: "telegram_phone", label: "Numéro Telegram", type: "text", placeholder: "6 12 34 56 78", optional: true },
    ],
  },
  {
    title: "Réseaux sociaux",
    description: "Un lien par plateforme : vos agents les réutilisent dans les contenus et les signatures.",
    fields: [
      { key: "facebook_url", label: "Facebook", type: "text", placeholder: "https://facebook.com/…", optional: true },
      { key: "instagram_url", label: "Instagram", type: "text", placeholder: "https://instagram.com/…", optional: true },
      { key: "tiktok_url", label: "TikTok", type: "text", placeholder: "https://tiktok.com/@…", optional: true },
      { key: "linkedin_url", label: "LinkedIn", type: "text", placeholder: "https://linkedin.com/company/…", optional: true },
      { key: "youtube_url", label: "YouTube", type: "text", placeholder: "https://youtube.com/@…", optional: true },
      { key: "twitter_url", label: "X (Twitter)", type: "text", placeholder: "https://x.com/…", optional: true },
      {
        key: "google_business_url",
        label: "Google My Business",
        type: "text",
        placeholder: "https://g.page/…",
        optional: true,
      },
    ],
  },
  {
    title: "Réglages commerciaux",
    description: "Appliqués par défaut par vos agents.",
    fields: [
      {
        key: "vat_rate",
        label: "Taux de TVA",
        type: "select",
        placeholder: "Choisir un taux",
        options: VAT_RATES,
      },
      { key: "currency", label: "Devise", type: "select", placeholder: "Choisir une devise", options: CURRENCIES },
      { key: "languages", label: "Langues", type: "text", placeholder: "Français, anglais" },
    ],
  },
  {
    title: "Positionnement",
    description: "Le ton et la stratégie que vos agents doivent respecter.",
    fields: [
      { key: "positioning", label: "Positionnement", type: "textarea", placeholder: "Ce qui vous différencie." },
      { key: "values_text", label: "Valeurs", type: "textarea", placeholder: "Proximité, réactivité, transparence…" },
      { key: "target_audience", label: "Cible", type: "textarea", placeholder: "À qui vous vendez." },
    ],
  },
  {
    title: "Offre",
    description: "Vos agents s'appuient dessus pour vendre, chiffrer et répondre.",
    fields: [
      { key: "products_text", label: "Produits", type: "textarea", placeholder: "Un produit par ligne." },
      { key: "services_text", label: "Services", type: "textarea", placeholder: "Un service par ligne." },
      { key: "pricing_text", label: "Prix", type: "textarea", placeholder: "Grille tarifaire, forfaits, remises." },
      { key: "terms_text", label: "Conditions", type: "textarea", placeholder: "Délais de paiement, garanties, CGV." },
      { key: "team_text", label: "Équipe", type: "textarea", placeholder: "Qui fait quoi dans votre entreprise." },
    ],
  },
];

export const COMPANY_FIELDS = COMPANY_GROUPS.flatMap((g) => g.fields);

export function companyCompletion(org: Record<string, unknown> | null | undefined) {
  if (!org) return 0;
  const required = COMPANY_FIELDS.filter((f) => !f.optional);
  const filled = required.filter((f) => {
    const v = org[f.key];
    return v !== null && v !== undefined && String(v).trim() !== "";
  }).length;
  return Math.round((filled / required.length) * 100);
}
