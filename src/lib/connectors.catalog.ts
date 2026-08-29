/**
 * Catalogue central des connecteurs de la plateforme (client-safe : aucun secret ici).
 * Le Super Admin configure ces connecteurs ; les utilisateurs connectent seulement leurs comptes.
 */

export type ConnectorField = {
  key: string;
  label: string;
  required?: boolean;
  secret?: boolean;
  placeholder?: string;
};

export type ScopeOption = {
  /** Valeur technique du scope envoyée au fournisseur */
  scope: string;
  /** Libellé lisible pour l'utilisateur */
  label: string;
  /** Scope obligatoire (toujours coché, non décochable) */
  required?: boolean;
  /** Catégorie affichée à l'utilisateur (Gmail, Agenda, Drive…) */
  group?: string;
};

export type ConnectorDef = {
  key: string;
  name: string;
  category: "ia" | "recherche" | "social" | "productivite" | "email" | "paiement" | "sms" | "automatisation" | "mcp" | "custom";
  description: string;
  /** api_key | oauth | custom */
  authType: "api_key" | "oauth" | "custom";
  fields: ConnectorField[];
  /** Champs facultatifs (limites, budgets, expéditeurs…) */
  optionalFields?: ConnectorField[];
  /** Services / scopes activables par le Super Admin */
  services?: { key: string; label: string }[];
  /** Le connecteur nécessite une connexion du compte utilisateur (OAuth) */
  userConnect?: boolean;
  /** Le connecteur reçoit des webhooks */
  webhook?: boolean;
  oauth?: {
    authorizeUrl: string;
    tokenUrl: string;
    revokeUrl?: string;
    scopeSeparator?: string;
    defaultScopes: string[];
    /** Autorisations cochables par l'utilisateur avant de connecter son compte */
    scopeCatalog?: ScopeOption[];
  };
};

const f = (key: string, label: string, secret = true, required = true): ConnectorField => ({
  key,
  label,
  secret,
  required,
});

export const CONNECTORS: ConnectorDef[] = [
  {
    key: "openai",
    name: "OpenAI",
    category: "ia",
    description: "Génération de texte, analyse, raisonnement, images et vidéos Sora selon les modèles activés.",
    authType: "api_key",
    fields: [f("api_key", "API Key")],
    optionalFields: [{ key: "monthly_budget_eur", label: "Budget mensuel (€)", secret: false }],
  },
  {
    key: "kling",
    name: "Kling AI",
    category: "ia",
    description: "Génération de vidéos IA Kling via l'API officielle Kling AI (API Key simple ou Access Key + Secret Key).",
    authType: "api_key",
    fields: [f("api_key", "Kling API Key")],
    services: [{ key: "video", label: "Vidéos Kling (text-to-video)" }],
    optionalFields: [
      { key: "access_key", label: "Kling Access Key (JWT)", secret: false },
      { key: "secret_key", label: "Kling Secret Key (JWT)", secret: true },
      { key: "api_base", label: "Endpoint API (par défaut Singapour)", secret: false },
      { key: "monthly_budget_eur", label: "Budget mensuel (€)", secret: false },
    ],
  },
  {
    key: "seedance",
    name: "Seedance",
    category: "ia",
    description: "Génération de vidéos IA Seedance via l'API officielle Seedance (ModelArk).",
    authType: "api_key",
    fields: [f("api_key", "Seedance API Key")],
    services: [{ key: "video", label: "Vidéos Seedance (text-to-video)" }],
    optionalFields: [
      { key: "api_base", label: "Endpoint API", secret: false },
      { key: "monthly_budget_eur", label: "Budget mensuel (€)", secret: false },
    ],
  },
  {
    key: "grok",
    name: "Grok (xAI)",
    category: "ia",
    description: "Génération de vidéos Grok Imagine via l'API officielle xAI.",
    authType: "api_key",
    fields: [f("api_key", "xAI API Key")],
    services: [{ key: "video", label: "Vidéos Grok Imagine" }],
    optionalFields: [{ key: "monthly_budget_eur", label: "Budget mensuel (€)", secret: false }],
  },


  {
    key: "gemini",
    name: "Gemini + Google Search Grounding",
    category: "ia",
    description: "Recherche web, veille, analyse concurrentielle et enrichissement de données.",
    authType: "api_key",
    fields: [f("api_key", "Gemini API Key")],
    services: [
      { key: "web_search", label: "Recherche web en temps réel (Google Search Grounding)" },
      { key: "text_generation", label: "Génération et reformulation de textes" },
      { key: "analysis", label: "Analyse de documents et de données" },
      { key: "monitoring", label: "Veille marché et concurrence" },
    ],
    optionalFields: [{ key: "monthly_budget_eur", label: "Budget mensuel (€)", secret: false }],
  },
  {
    key: "notion",
    name: "Notion",
    category: "productivite",
    description: "Pages, bases de données et notes Notion de votre espace de travail.",
    authType: "oauth",
    userConnect: true,
    fields: [f("client_id", "Client ID", false), f("client_secret", "Client Secret")],
    services: [
      { key: "pages", label: "Pages Notion" },
      { key: "databases", label: "Bases de données" },
    ],
    oauth: {
      authorizeUrl: "https://api.notion.com/v1/oauth/authorize",
      tokenUrl: "https://api.notion.com/v1/oauth/token",
      defaultScopes: [],
      scopeCatalog: [
        { group: "Notion", scope: "read", label: "Lire les pages et bases de données partagées", required: true },
        { group: "Notion", scope: "insert", label: "Créer des pages" },
        { group: "Notion", scope: "update", label: "Modifier des pages" },
      ],
    },
  },
  {
    key: "slack",
    name: "Slack",
    category: "productivite",
    description: "Messages, canaux et notifications de votre espace Slack.",
    authType: "oauth",
    userConnect: true,
    fields: [f("client_id", "Client ID", false), f("client_secret", "Client Secret")],
    services: [
      { key: "messages", label: "Envoi de messages" },
      { key: "channels", label: "Canaux" },
    ],
    oauth: {
      authorizeUrl: "https://slack.com/oauth/v2/authorize",
      tokenUrl: "https://slack.com/api/oauth.v2.access",
      scopeSeparator: ",",
      defaultScopes: ["chat:write", "channels:read", "users:read"],
      scopeCatalog: [
        { group: "Slack", scope: "chat:write", label: "Envoyer des messages", required: true },
        { group: "Slack", scope: "channels:read", label: "Lire la liste des canaux" },
        { group: "Slack", scope: "channels:history", label: "Lire l'historique des canaux" },
        { group: "Slack", scope: "users:read", label: "Voir les membres de l'espace" },
        { group: "Slack", scope: "files:write", label: "Partager des fichiers" },
      ],
    },
  },
  {
    key: "google",
    name: "Google",
    category: "productivite",
    description: "Gmail, Agenda, Drive, Docs, Sheets, Business Profile, Search Console et Analytics du compte Google autorisé.",
    authType: "oauth",
    userConnect: true,
    fields: [f("client_id", "Client ID", false), f("client_secret", "Client Secret")],
    services: [
      { key: "gmail", label: "Gmail" },
      { key: "calendar", label: "Google Calendar" },
      { key: "drive", label: "Google Drive" },
      { key: "docs", label: "Google Docs" },
      { key: "sheets", label: "Google Sheets" },
      { key: "business_profile", label: "Google Business Profile" },
      { key: "search_console", label: "Search Console" },
      { key: "analytics", label: "Google Analytics" },
    ],
    oauth: {
      authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
      tokenUrl: "https://oauth2.googleapis.com/token",
      revokeUrl: "https://oauth2.googleapis.com/revoke",
      defaultScopes: ["openid", "email", "profile"],
      scopeCatalog: [
        { group: "Identité", scope: "openid", label: "Identité du compte Google", required: true },
        { group: "Identité", scope: "profile", label: "Profil (nom, photo)", required: true },
        { group: "Identité", scope: "email", label: "Adresse email", required: true },
        { group: "Gmail", scope: "https://www.googleapis.com/auth/gmail.readonly", label: "Lire mes emails" },
        { group: "Gmail", scope: "https://www.googleapis.com/auth/gmail.modify", label: "Modifier mes emails" },
        { group: "Gmail", scope: "https://www.googleapis.com/auth/gmail.send", label: "Envoyer des emails en mon nom" },
        { group: "Agenda", scope: "https://www.googleapis.com/auth/calendar.readonly", label: "Lire mon calendrier" },
        { group: "Agenda", scope: "https://www.googleapis.com/auth/calendar.events", label: "Créer et modifier mes événements" },
        { group: "Drive", scope: "https://www.googleapis.com/auth/drive.readonly", label: "Lire mes fichiers" },
        { group: "Drive", scope: "https://www.googleapis.com/auth/drive.file", label: "Accéder aux fichiers créés ou utilisés par Kobyde" },
        { group: "Docs", scope: "https://www.googleapis.com/auth/documents", label: "Lire et rédiger les documents nécessaires" },
        { group: "Sheets", scope: "https://www.googleapis.com/auth/spreadsheets.readonly", label: "Lire mes feuilles de calcul" },
        { group: "Sheets", scope: "https://www.googleapis.com/auth/spreadsheets", label: "Modifier mes feuilles de calcul" },
        { group: "Google Business", scope: "https://www.googleapis.com/auth/business.manage", label: "Lire ma fiche établissement et gérer les réponses aux avis" },
        { group: "Search Console", scope: "https://www.googleapis.com/auth/webmasters.readonly", label: "Lire les données Search Console" },
        { group: "Analytics", scope: "https://www.googleapis.com/auth/analytics.readonly", label: "Lire les données Analytics" },
      ],
    },
  },
  {
    key: "meta",
    name: "Meta (Facebook & Instagram)",
    category: "social",
    description: "Publication et statistiques des pages Facebook et comptes Instagram autorisés.",
    authType: "oauth",
    userConnect: true,
    webhook: true,
    fields: [f("app_id", "App ID", false), f("app_secret", "App Secret")],
    optionalFields: [{ key: "webhook_verify_token", label: "Webhook Verify Token", secret: true }],
    services: [
      { key: "facebook", label: "Pages Facebook" },
      { key: "instagram", label: "Instagram Business" },
    ],
    oauth: {
      authorizeUrl: "https://www.facebook.com/v20.0/dialog/oauth",
      tokenUrl: "https://graph.facebook.com/v20.0/oauth/access_token",
      scopeSeparator: ",",
      defaultScopes: ["public_profile", "email", "pages_show_list", "pages_manage_posts"],
      scopeCatalog: [
        { scope: "public_profile", label: "Profil public", required: true },
        { scope: "email", label: "Adresse email", required: true },
        { scope: "pages_show_list", label: "Voir mes pages Facebook" },
        { scope: "pages_manage_posts", label: "Publier sur mes pages" },
        { scope: "pages_read_engagement", label: "Lire les statistiques des pages" },
        { scope: "pages_messaging", label: "Répondre aux messages des pages" },
        { scope: "instagram_basic", label: "Instagram — accès au compte professionnel" },
        { scope: "instagram_content_publish", label: "Instagram — publier des contenus" },
        { scope: "instagram_manage_insights", label: "Instagram — statistiques" },
      ],
    },
  },
  {
    key: "linkedin",
    name: "LinkedIn",
    category: "social",
    description: "Publication et informations du compte LinkedIn connecté.",
    authType: "oauth",
    userConnect: true,
    fields: [f("client_id", "Client ID", false), f("client_secret", "Client Secret")],
    oauth: {
      authorizeUrl: "https://www.linkedin.com/oauth/v2/authorization",
      tokenUrl: "https://www.linkedin.com/oauth/v2/accessToken",
      defaultScopes: ["openid", "profile", "email", "w_member_social"],
      scopeCatalog: [
        { scope: "openid", label: "Identité LinkedIn", required: true },
        { scope: "profile", label: "Profil (nom, photo)", required: true },
        { scope: "email", label: "Adresse email" },
        { scope: "w_member_social", label: "Publier des posts en mon nom" },
      ],
    },
  },
  {
    key: "tiktok",
    name: "TikTok Business",
    category: "social",
    description: "Publication et statistiques des comptes TikTok connectés.",
    authType: "oauth",
    userConnect: true,
    fields: [f("client_key", "Client Key", false), f("client_secret", "Client Secret")],
    oauth: {
      authorizeUrl: "https://www.tiktok.com/v2/auth/authorize/",
      tokenUrl: "https://open.tiktokapis.com/v2/oauth/token/",
      scopeSeparator: ",",
      defaultScopes: ["user.info.basic", "video.publish"],
      scopeCatalog: [
        { scope: "user.info.basic", label: "Informations de base du compte", required: true },
        { scope: "video.list", label: "Voir mes vidéos publiées" },
        { scope: "video.upload", label: "Préparer des vidéos" },
        { scope: "video.publish", label: "Publier des vidéos" },
      ],
    },
  },
  {
    key: "apify",
    name: "Apify",
    category: "recherche",
    description: "Recherche Google Maps, collecte de données publiques et recherche de prospects.",
    authType: "api_key",
    fields: [f("api_token", "Apify API Token")],
    optionalFields: [
      { key: "allowed_actors", label: "Actors autorisés (séparés par une virgule)", secret: false },
      { key: "monthly_budget_eur", label: "Budget mensuel (€)", secret: false },
    ],
  },
  {
    key: "resend",
    name: "Resend",
    category: "email",
    description: "Emails transactionnels du SaaS : devis, relances, invitations, notifications.",
    authType: "api_key",
    fields: [f("api_key", "API Key")],
    optionalFields: [
      { key: "domain", label: "Domaine d'envoi", secret: false },
      { key: "from_email", label: "Email expéditeur", secret: false },
      { key: "from_name", label: "Nom expéditeur", secret: false },
    ],
  },
  {
    key: "brevo",
    name: "Brevo / MailerLite",
    category: "email",
    description: "Séquences email, campagnes et automatisations marketing.",
    authType: "api_key",
    fields: [f("api_key", "API Key")],
    optionalFields: [
      { key: "sender_email", label: "Compte expéditeur", secret: false },
      { key: "domain", label: "Domaine", secret: false },
    ],
  },
  {
    key: "stripe",
    name: "Stripe",
    category: "paiement",
    description: "Paiements, abonnements et webhooks de facturation.",
    authType: "api_key",
    webhook: true,
    fields: [f("secret_key", "Secret Key"), f("webhook_secret", "Webhook Signing Secret")],
    optionalFields: [{ key: "publishable_key", label: "Publishable Key", secret: false }],
  },
  {
    key: "twilio",
    name: "Twilio",
    category: "sms",
    description: "SMS, notifications et communications sortantes.",
    authType: "api_key",
    fields: [f("account_sid", "Account SID", false), f("auth_token", "Auth Token")],
    optionalFields: [{ key: "messaging_service_sid", label: "Numéro ou Messaging Service SID", secret: false }],
  },
  {
    key: "whatsapp",
    name: "WhatsApp Business API",
    category: "sms",
    description: "Messages WhatsApp professionnels.",
    authType: "api_key",
    webhook: true,
    fields: [f("access_token", "Access Token"), f("phone_number_id", "Phone Number ID", false)],
    optionalFields: [
      { key: "business_account_id", label: "Business Account ID", secret: false },
      { key: "webhook_verify_token", label: "Webhook Verify Token", secret: true },
      { key: "webhook_secret", label: "Webhook Secret", secret: true },
    ],
  },
  {
    key: "fcm",
    name: "Firebase Cloud Messaging",
    category: "automatisation",
    description: "Notifications push, alertes et rappels.",
    authType: "api_key",
    fields: [f("server_key", "Server Key / Service Account JSON")],
    optionalFields: [{ key: "project_id", label: "Project ID", secret: false }],
  },
];

export const CONNECTOR_MAP = new Map(CONNECTORS.map((c) => [c.key, c]));

export const CATEGORY_LABELS: Record<ConnectorDef["category"], string> = {
  ia: "Intelligence artificielle",
  recherche: "Recherche & données",
  social: "Réseaux sociaux",
  productivite: "Productivité",
  email: "Email",
  paiement: "Paiement",
  sms: "SMS & messagerie",
  automatisation: "Automatisation",
  mcp: "Serveurs MCP",
  custom: "Connecteurs personnalisés",
};

/** Connecteurs que l'utilisateur final peut relier à ses propres comptes. */
export const USER_CONNECTORS = CONNECTORS.filter((c) => c.userConnect);

export const maskSecret = (v?: string | null) =>
  !v ? "" : v.length <= 8 ? "••••" : `${v.slice(0, 3)}${"•".repeat(12)}${v.slice(-4)}`;

/** Regroupe les autorisations d'un connecteur par catégorie affichable. */
export function scopeGroups(def?: ConnectorDef) {
  const catalog = def?.oauth?.scopeCatalog ?? [];
  const groups = new Map<string, ScopeOption[]>();
  for (const s of catalog) {
    const g = s.group ?? def?.name ?? "Autorisations";
    groups.set(g, [...(groups.get(g) ?? []), s]);
  }
  return Array.from(groups, ([label, scopes]) => ({ label, scopes }));
}
