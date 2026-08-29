/**
 * Catalogue des plateformes qui nécessitent que l'entreprise fournisse ses PROPRES identifiants
 * (OAuth ou API). Client-safe : aucune valeur secrète ici, uniquement la description des champs.
 */

export type OrgConnectorField = {
  key: string;
  label: string;
  hint?: string;
  /** true = stocké chiffré côté serveur, jamais renvoyé au frontend */
  secret: boolean;
  required: boolean;
  placeholder?: string;
};

export type OrgConnectorDef = {
  key: string;
  name: string;
  description: string;
  /** Clé du connecteur OAuth utilisée pour le callback (identique à connectors.catalog) */
  oauthKey?: string;
  authType: "oauth" | "api_key";
  fields: OrgConnectorField[];
  docsUrl?: string;
};

const oauthPair = (idKey: string, idLabel: string): OrgConnectorField[] => [
  { key: idKey, label: idLabel, secret: false, required: true },
  { key: "client_secret", label: "Client Secret", secret: true, required: true },
];

export const ORG_CONNECTORS: OrgConnectorDef[] = [
  {
    key: "google",
    name: "Google",
    description:
      "Gmail, Agenda, Drive, Docs, Sheets, Business Profile, Search Console et Analytics de votre entreprise.",
    oauthKey: "google",
    authType: "oauth",
    fields: oauthPair("client_id", "Client ID"),
    docsUrl: "https://console.cloud.google.com/apis/credentials",
  },
  {
    key: "meta",
    name: "Meta — Facebook & Instagram",
    description: "Publication et statistiques de vos pages Facebook et comptes Instagram professionnels.",
    oauthKey: "meta",
    authType: "oauth",
    fields: [
      { key: "app_id", label: "App ID", secret: false, required: true },
      { key: "app_secret", label: "App Secret", secret: true, required: true },
    ],
    docsUrl: "https://developers.facebook.com/apps",
  },
  {
    key: "linkedin",
    name: "LinkedIn",
    description: "Publication de posts et informations du compte LinkedIn de votre entreprise.",
    oauthKey: "linkedin",
    authType: "oauth",
    fields: oauthPair("client_id", "Client ID"),
    docsUrl: "https://www.linkedin.com/developers/apps",
  },
  {
    key: "tiktok",
    name: "TikTok Business",
    description: "Publication de vidéos et statistiques de votre compte TikTok.",
    oauthKey: "tiktok",
    authType: "oauth",
    fields: oauthPair("client_key", "Client Key"),
    docsUrl: "https://developers.tiktok.com",
  },
  {
    key: "slack",
    name: "Slack",
    description: "Messages, canaux et notifications de votre espace de travail Slack.",
    oauthKey: "slack",
    authType: "oauth",
    fields: oauthPair("client_id", "Client ID"),
    docsUrl: "https://api.slack.com/apps",
  },
  {
    key: "notion",
    name: "Notion",
    description: "Pages et bases de données de votre espace Notion.",
    oauthKey: "notion",
    authType: "oauth",
    fields: oauthPair("client_id", "Client ID"),
    docsUrl: "https://www.notion.so/my-integrations",
  },
  {
    key: "whatsapp",
    name: "WhatsApp Business",
    description: "Envoi de messages WhatsApp depuis le numéro professionnel de votre entreprise.",
    authType: "api_key",
    fields: [
      { key: "access_token", label: "Access Token", secret: true, required: true },
      {
        key: "phone_number_id",
        label: "Phone Number ID",
        hint: "Identifiant du numéro dans votre compte WhatsApp Business",
        secret: false,
        required: true,
      },
    ],
    docsUrl: "https://developers.facebook.com/docs/whatsapp",
  },
  {
    key: "stripe_connect",
    name: "Stripe Connect",
    description: "Encaissements, demandes de paiement et factures sur le compte Stripe de votre entreprise.",
    authType: "api_key",
    fields: [
      { key: "secret_key", label: "Secret Key", hint: "Clé sk_live_… ou sk_test_…", secret: true, required: true },
      { key: "publishable_key", label: "Publishable Key", secret: false, required: false },
    ],
    docsUrl: "https://dashboard.stripe.com/apikeys",
  },
];

export const ORG_CONNECTOR_MAP = new Map(ORG_CONNECTORS.map((c) => [c.key, c]));

export const ORG_STATUS_LABELS: Record<string, string> = {
  non_configure: "Non connecté",
  incomplet: "Configuration incomplète",
  configure: "Configuré",
  connecte: "Connecté",
  erreur: "Erreur",
  expire: "Expiré",
};
