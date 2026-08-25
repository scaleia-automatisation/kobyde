/** Constantes partagées du Studio de contenus IA (client-safe : aucun secret). */

export type ContentKind = "image" | "carrousel" | "video";

export const CONTENT_KINDS: { key: ContentKind; label: string; hint: string; emoji: string }[] = [
  { key: "image", label: "Image", hint: "Un visuel unique prêt à publier.", emoji: "🖼️" },
  { key: "carrousel", label: "Carrousel", hint: "2 à 4 visuels cohérents qui racontent une histoire.", emoji: "🎠" },
  { key: "video", label: "Vidéo", hint: "Une vidéo courte pour les réseaux.", emoji: "🎬" },
];

export const CAROUSEL_SIZES = [2, 3, 4] as const;

export const OBJECTIVES = [
  "Promouvoir un produit ou service",
  "Générer des prospects",
  "Obtenir des ventes",
  "Générer des rendez-vous",
  "Augmenter la notoriété",
  "Présenter une nouveauté",
  "Éduquer l'audience — apporter de la valeur",
  "Générer de l'engagement",
  "Créer de la confiance",
  "Lancer une offre",
  "Autre objectif",
] as const;

export const PLATFORMS = [
  { key: "instagram", label: "Instagram", provider: "meta", ratio: "4:5" },
  { key: "facebook", label: "Facebook", provider: "meta", ratio: "1:1" },
  { key: "linkedin", label: "LinkedIn", provider: "linkedin", ratio: "1:1" },
  { key: "tiktok", label: "TikTok", provider: "tiktok", ratio: "9:16" },
] as const;

export type PlatformKey = (typeof PLATFORMS)[number]["key"];

export const platformLabel = (k: string) => PLATFORMS.find((p) => p.key === k)?.label ?? k;

export const TONES = [
  "Professionnel",
  "Différenciant",
  "Original",
  "Provocateur",
  "Premium",
  "Comique",
  "Direct",
  "Chaleureux",
  "Expert",
  "Dynamique",
  "Éducatif",
  "Conversationnel",
  "Inspirant",
  "Persuasif",
  "Personnalisé",
] as const;

export const IMAGE_STYLES = [
  "Photo réaliste",
  "Studio produit",
  "Minimaliste / épuré",
  "Premium / élégant",
  "Illustration moderne",
  "3D / rendu",
  "Lifestyle",
] as const;

export const VIDEO_CAMERA = [
  "Plan fixe",
  "Travelling lent",
  "Zoom avant",
  "Panoramique",
  "Caméra à l'épaule",
] as const;

export type ContentModel = {
  id: string;
  key: string;
  provider: string;
  label: string;
  kind: "image" | "video";
  engine: string | null;
  speed: string;
  quality: string;
  credits: number;
  formats: string[];
  params: Record<string, boolean>;
  notes: string | null;
  is_active: boolean;
  sort_order: number;
};

export type ContentParams = {
  ratio?: string | undefined;
  resolution?: string | undefined;
  quality?: string | undefined;
  style?: string | undefined;
  realism?: string | undefined;
  count?: number | undefined;
  duration?: number | undefined;
  audio?: boolean | undefined;
  camera?: string | undefined;
  language?: string | undefined;
  withText?: boolean | undefined;
  prompt?: string | undefined;
};


/** Détection locale immédiate (l'IA affine ensuite côté serveur). */
export function detectKindLocal(message: string): { kind: ContentKind; slides: number } {
  const m = message.toLowerCase();
  const n = /(\b[2-5])\s*(images?|slides?|visuels?)/.exec(m);
  if (/carrou?sel|slides?|plusieurs images/.test(m)) {
    const slides = n ? Math.min(4, Math.max(2, Number(n[1]))) : 4;
    return { kind: "carrousel", slides };
  }
  if (/vid[ée]o|reel|réel|tiktok|clip|film/.test(m)) return { kind: "video", slides: 1 };
  return { kind: "image", slides: 1 };
}

export const KIND_LABEL: Record<ContentKind, string> = {
  image: "Image",
  carrousel: "Carrousel",
  video: "Vidéo",
};
