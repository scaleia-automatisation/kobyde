/** Champs de la mémoire centrale de l'entreprise (source de vérité unique). */
export type CompanyField = {
  key: string;
  label: string;
  hint?: string;
  type: "text" | "textarea" | "number";
  placeholder?: string;
};

export type CompanyGroup = { title: string; description: string; fields: CompanyField[] };

export const COMPANY_GROUPS: CompanyGroup[] = [
  {
    title: "Identité",
    description: "Ce que vos agents doivent savoir avant tout.",
    fields: [
      { key: "name", label: "Nom de l'entreprise", type: "text", placeholder: "Kobyde SAS" },
      { key: "logo_url", label: "Logo (lien de l'image)", type: "text", placeholder: "https://…/logo.png" },
      { key: "description", label: "Description", type: "textarea", placeholder: "Ce que fait votre entreprise en quelques lignes." },
      { key: "company_type", label: "Type d'entreprise", type: "text", placeholder: "SAS, SARL, auto-entrepreneur…" },
      { key: "siret", label: "SIRET", type: "text", placeholder: "123 456 789 00012" },
      { key: "industry", label: "Secteur", type: "text", placeholder: "Bâtiment, conseil, e-commerce…" },
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
      { key: "phone", label: "Téléphone", type: "text", placeholder: "01 23 45 67 89" },
    ],
  },
  {
    title: "Réglages commerciaux",
    description: "Appliqués par défaut par vos agents.",
    fields: [
      { key: "vat_rate", label: "Taux de TVA (%)", type: "number", placeholder: "20" },
      { key: "currency", label: "Devise", type: "text", placeholder: "EUR" },
      { key: "languages", label: "Langues", type: "text", placeholder: "Français, anglais" },
      { key: "social_links", label: "Réseaux sociaux", type: "textarea", placeholder: "LinkedIn : …\nInstagram : …" },
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
  const filled = COMPANY_FIELDS.filter((f) => {
    const v = org[f.key];
    return v !== null && v !== undefined && String(v).trim() !== "";
  }).length;
  return Math.round((filled / COMPANY_FIELDS.length) * 100);
}
