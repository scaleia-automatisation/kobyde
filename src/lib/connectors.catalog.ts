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
    key: "fal",
    name: "fal.ai (Kling, Seedance, Grok Imagine)",
    category: "ia",
    description: "Génération de vidéos IA Kling, Seedance et Grok Imagine utilisées par le Studio de contenus.",
    authType: "api_key",
    fields: [f("api_key", "fal.ai API Key")],
    services: [
      { key: "kling", label: "Kling — vidéos cinématiques" },
      { key: "seedance", label: "Seedance — vidéos rapides et réalistes" },
      { key: "grok", label: "Grok Imagine — vidéos courtes" },
    ],
    optionalFields: [{ key: "monthly_budget_eur", label: "Budget mensuel (€)", secret: false }],
  },

  {
    key: "gemini",
    name: "Gemini + Google Search Grounding",
    category: "ia",
    description: "Recherche web, veille, analyse concurrentielle et enrichissement de données.",
    authType: "api_key",
    userConnect: true,
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
        { scope: "chat:write", label: "Envoyer des messages", required: true },
        { scope: "channels:read", label: "Lire la liste des canaux" },
        { scope: "channels:history", label: "Lire l'historique des canaux" },
        { scope: "users:read", label: "Voir les membres de l'espace" },
        { scope: "files:write", label: "Partager des fichiers" },
      ],
    },
  },
  {
    key: "google",
    name: "Google Workspace",
    category: "productivite",
    description: "Gmail, Agenda, Drive, Docs et Sheets des comptes Google autorisés.",
    authType: "oauth",
    userConnect: true,
    fields: [f("client_id", "Client ID", false), f("client_secret", "Client Secret")],
    services: [
      { key: "gmail", label: "Gmail" },
      { key: "calendar", label: "Google Calendar" },
      { key: "drive", label: "Google Drive" },
      { key: "docs", label: "Google Docs" },
      { key: "sheets", label: "Google Sheets" },
    ],
    oauth: {
      authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
      tokenUrl: "https://oauth2.googleapis.com/token",
      defaultScopes: [
        "openid",
        "email",
        "profile",
        "https://www.googleapis.com/auth/gmail.send",
        "https://www.googleapis.com/auth/calendar.events",
      ],
      scopeCatalog: [
        { scope: "openid", label: "Identité du compte Google", required: true },
        { scope: "email", label: "Adresse email", required: true },
        { scope: "profile", label: "Profil (nom, photo)", required: true },
        { scope: "https://www.googleapis.com/auth/gmail.send", label: "Gmail — envoyer des emails" },
        { scope: "https://www.googleapis.com/auth/gmail.readonly", label: "Gmail — lire les emails" },
        { scope: "https://www.googleapis.com/auth/calendar.events", label: "Agenda — créer et modifier des événements" },
        { scope: "https://www.googleapis.com/auth/calendar.readonly", label: "Agenda — consulter le planning" },
        { scope: "https://www.googleapis.com/auth/drive.file", label: "Drive — gérer les fichiers créés par Kobyde" },
        { scope: "https://www.googleapis.com/auth/documents", label: "Docs — créer et modifier des documents" },
        { scope: "https://www.googleapis.com/auth/spreadsheets", label: "Sheets — créer et modifier des feuilles" },
      ],
    },
  },
  {
    key: "google_business",
    name: "Google Business & Analytics",
    category: "productivite",
    description: "Google Business Profile, Search Console et Analytics des comptes autorisés.",
    authType: "oauth",
    userConnect: true,
    fields: [f("client_id", "Client ID", false), f("client_secret", "Client Secret")],
    services: [
      { key: "business_profile", label: "Google Business Profile" },
      { key: "search_console", label: "Search Console" },
      { key: "analytics", label: "Google Analytics" },
    ],
    oauth: {
      authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
      tokenUrl: "https://oauth2.googleapis.com/token",
      defaultScopes: ["openid", "email", "https://www.googleapis.com/auth/business.manage"],
      scopeCatalog: [
        { scope: "openid", label: "Identité du compte Google", required: true },
        { scope: "email", label: "Adresse email", required: true },
        { scope: "https://www.googleapis.com/auth/business.manage", label: "Google Business Profile — gérer la fiche" },
        { scope: "https://www.googleapis.com/auth/webmasters.readonly", label: "Search Console — consulter les performances" },
        { scope: "https://www.googleapis.com/auth/analytics.readonly", label: "Google Analytics — consulter les statistiques" },
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
    key: "microsoft",
    name: "Microsoft 365",
    category: "productivite",
    description: "Outlook, Calendrier et Teams des comptes Microsoft autorisés.",
    authType: "oauth",
    userConnect: true,
    fields: [f("client_id", "Client ID", false), f("client_secret", "Client Secret")],
    optionalFields: [{ key: "tenant_id", label: "Tenant ID (si nécessaire)", secret: false }],
    services: [
      { key: "outlook", label: "Outlook" },
      { key: "calendar", label: "Microsoft Calendar" },
      { key: "teams", label: "Microsoft Teams" },
    ],
    oauth: {
      authorizeUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
      tokenUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
      defaultScopes: ["offline_access", "openid", "email", "Mail.Send", "Calendars.ReadWrite"],
      scopeCatalog: [
        { scope: "offline_access", label: "Maintenir la connexion active", required: true },
        { scope: "openid", label: "Identité Microsoft", required: true },
        { scope: "email", label: "Adresse email", required: true },
        { scope: "Mail.Send", label: "Outlook — envoyer des emails" },
        { scope: "Mail.Read", label: "Outlook — lire les emails" },
        { scope: "Calendars.ReadWrite", label: "Calendrier — créer et modifier des événements" },
        { scope: "Files.ReadWrite", label: "OneDrive — gérer les fichiers" },
        { scope: "ChannelMessage.Send", label: "Teams — envoyer des messages" },
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
    key: "phantombuster",
    name: "PhantomBuster",
    category: "recherche",
    description: "Scénarios d'automatisation de collecte lorsque c'est pertinent et autorisé.",
    authType: "api_key",
    fields: [f("api_key", "API Key")],
    optionalFields: [{ key: "allowed_phantoms", label: "Phantoms autorisés", secret: false }],
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
    optionalFields: [{ key: "business_account_id", label: "Business Account ID", secret: false }],
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
  {
    key: "make",
    name: "Make",
    category: "automatisation",
    description: "Scénarios d'automatisation externes.",
    authType: "api_key",
    webhook: true,
    fields: [f("api_key", "API Key ou Access Token")],
    optionalFields: [
      { key: "webhook_url", label: "Webhook URL", secret: false },
      { key: "organization", label: "Organisation", secret: false },
    ],
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
