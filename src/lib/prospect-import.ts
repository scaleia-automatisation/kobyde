/** Constantes partagées pour l'import et le formulaire prospect. */
export const ACQUISITION_CHANNELS = [
  "Formulaire",
  "Landing page",
  "Lead magnet",
  "Facebook",
  "Instagram",
  "TikTok",
  "YouTube",
  "LinkedIn",
  "Google",
  "Salon / événement",
  "Recommandation",
  "Appel entrant",
  "Import fichier",
  "Autre",
] as const;

export type ImportedProspect = {
  full_name?: string | null;
  company_name?: string | null;
  email?: string | null;
  phone?: string | null;
  city?: string | null;
  website?: string | null;
  facebook?: string | null;
  instagram?: string | null;
  tiktok?: string | null;
  youtube?: string | null;
  linkedin?: string | null;
  acquisition_channel?: string | null;
  notes?: string | null;
};

export const IDENTIFIER_FIELDS = [
  "email",
  "phone",
  "facebook",
  "instagram",
  "tiktok",
  "youtube",
  "linkedin",
] as const;

/** Un prospect n'est enregistrable que s'il a au moins un moyen de contact. */
export function hasIdentifier(p: Record<string, unknown>) {
  return IDENTIFIER_FIELDS.some((f) => String(p[f] ?? "").trim() !== "");
}

export function extractEmails(text: string): string[] {
  const found = text.match(/[\w.+-]+@[\w-]+\.[\w.-]+/g) ?? [];
  return Array.from(new Set(found.map((e) => e.toLowerCase())));
}
