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
  /** Explication : où trouver la valeur et à quoi elle sert pour les requêtes API */
  hint?: string;
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
  /** Console développeur du fournisseur où créer l'application OAuth / la clé API */
  docsUrl?: string;
  /** Étapes de configuration côté fournisseur */
  setupSteps?: string[];
  oauth?: {
    authorizeUrl: string;
    tokenUrl: string;
    scopeSeparator?: string;
    defaultScopes: string[];
    /** Autorisations cochables par l'utilisateur avant de connecter son compte */
    scopeCatalog?: ScopeOption[];
  };
};

const f = (
  key: string,
  label: string,
  secret = true,
  required = true,
  hint?: string,
): ConnectorField => ({
  key,
  label,
  secret,
  required,
  hint,
});


export const CONNECTORS: ConnectorDef[] = [
  {
    key: "openai",
    name: "OpenAI",
    category: "ia",
    description: "Génération de texte, analyse, raisonnement et images selon les modèles activés.",
    authType: "api_key",
    docsUrl: "https://platform.openai.com/api-keys",
    setupSteps: [
      "Créez une clé API sur platform.openai.com › API keys.",
      "Copiez l'identifiant d'organisation si votre compte en utilise plusieurs.",
    ],
    fields: [f("api_key", "API Key", true, true, "Clé secrète sk-… utilisée dans l'en-tête Authorization: Bearer.")],
    optionalFields: [
      { key: "organization_id", label: "Organization ID", secret: false, hint: "En-tête OpenAI-Organization (org-…)." },
      { key: "monthly_budget_eur", label: "Budget mensuel (€)", secret: false, hint: "Plafond de dépense appliqué par Kobyde." },
    ],
  },
  {
    key: "gemini",
    name: "Gemini + Google Search Grounding",
    category: "ia",
    description: "Recherche web, veille, analyse concurrentielle et enrichissement de données.",
    authType: "api_key",
    userConnect: true,
    docsUrl: "https://aistudio.google.com/apikey",
    setupSteps: ["Générez une clé API dans Google AI Studio."],
    fields: [f("api_key", "Gemini API Key", true, true, "Clé AIza… envoyée en paramètre x-goog-api-key.")],
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
    docsUrl: "https://www.notion.so/my-integrations",
    setupSteps: [
      "Créez une intégration « Public » sur notion.so/my-integrations.",
      "Collez la Redirect URI ci-dessous dans la section OAuth Domain & URIs.",
      "Copiez l'OAuth client ID et l'OAuth client secret.",
    ],
    fields: [
      f("client_id", "OAuth Client ID", false, true, "Onglet Secrets de l'intégration Notion."),
      f("client_secret", "OAuth Client Secret", true, true, "Secret utilisé pour l'échange du code d'autorisation."),
    ],
    optionalFields: [
      { key: "notion_version", label: "Notion-Version", secret: false, hint: "En-tête de version d'API (ex. 2022-06-28)." },
    ],
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
    docsUrl: "https://api.slack.com/apps",
    setupSteps: [
      "Créez une app sur api.slack.com/apps.",
      "OAuth & Permissions : ajoutez la Redirect URI ci-dessous et les bot scopes voulus.",
      "Copiez Client ID, Client Secret et Signing Secret (onglet Basic Information).",
    ],
    fields: [
      f("client_id", "Client ID", false, true, "Basic Information › App Credentials."),
      f("client_secret", "Client Secret", true, true, "Échange du code OAuth contre un token."),
    ],
    optionalFields: [
      { key: "signing_secret", label: "Signing Secret", secret: true, hint: "Vérification des requêtes et events Slack entrants." },
    ],
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
    docsUrl: "https://console.cloud.google.com/apis/credentials",
    setupSteps: [
      "Google Cloud Console › API et services › Identifiants › ID client OAuth (Application Web).",
      "Ajoutez les deux Redirect URI ci-dessous aux URI de redirection autorisés.",
      "Activez les API Gmail, Calendar, Drive, Docs et Sheets pour le projet.",
    ],
    fields: [
      f("client_id", "Client ID", false, true, "Se termine par .apps.googleusercontent.com."),
      f("client_secret", "Client Secret", true, true, "GOCSPX-… : échange du code et rafraîchissement des tokens."),
    ],
    optionalFields: [
      { key: "project_id", label: "Project ID", secret: false, hint: "Projet Google Cloud propriétaire des API activées." },
    ],
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
    docsUrl: "https://console.cloud.google.com/apis/credentials",
    setupSteps: [
      "Utilisez un ID client OAuth Web (même projet que Google Workspace ou un projet dédié).",
      "Activez Business Profile API, Search Console API et Google Analytics Data API.",
    ],
    fields: [
      f("client_id", "Client ID", false, true, "ID client OAuth Web du projet Google Cloud."),
      f("client_secret", "Client Secret", true, true, "Secret associé à l'ID client OAuth."),
    ],
    optionalFields: [
      { key: "ga4_property_id", label: "Propriété GA4 par défaut", secret: false, hint: "ID numérique utilisé pour les rapports Analytics." },
    ],
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
    docsUrl: "https://developers.facebook.com/apps",
    setupSteps: [
      "Créez une app Business sur developers.facebook.com.",
      "Produit « Facebook Login » : ajoutez les Redirect URI ci-dessous.",
      "Produit « Webhooks » : collez l'URL de webhook et le Verify Token.",
    ],
    fields: [
      f("app_id", "App ID", false, true, "Identifiant public de l'app Meta."),
      f("app_secret", "App Secret", true, true, "Échange du code OAuth et signature appsecret_proof."),
    ],
    optionalFields: [
      { key: "webhook_verify_token", label: "Webhook Verify Token", secret: true, hint: "Chaîne de votre choix, identique dans la console Meta." },
      { key: "api_version", label: "Version de l'API Graph", secret: false, hint: "Ex. v20.0 — par défaut la version supportée par Kobyde." },
    ],
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
    docsUrl: "https://www.linkedin.com/developers/apps",
    setupSteps: [
      "Créez une app liée à votre page entreprise sur linkedin.com/developers.",
      "Onglet Auth : ajoutez les Redirect URI ci-dessous.",
      "Produits : activez « Sign In with LinkedIn using OpenID Connect » et « Share on LinkedIn ».",
    ],
    fields: [
      f("client_id", "Client ID", false, true, "Onglet Auth de l'app LinkedIn."),
      f("client_secret", "Client Secret", true, true, "Utilisé pour l'échange du code d'autorisation."),
    ],
    optionalFields: [
      { key: "organization_urn", label: "URN de la page entreprise", secret: false, hint: "urn:li:organization:123456 pour publier au nom de la page." },
    ],
    services: [
      { key: "posts", label: "Publication de posts" },
      { key: "profile", label: "Profil et identité" },
    ],
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
    docsUrl: "https://developers.tiktok.com/apps",
    setupSteps: [
      "Créez une app sur developers.tiktok.com et ajoutez le produit « Login Kit » + « Content Posting API ».",
      "Déclarez les Redirect URI ci-dessous dans la configuration Login Kit.",
    ],
    fields: [
      f("client_key", "Client Key", false, true, "Identifiant public de l'app TikTok."),
      f("client_secret", "Client Secret", true, true, "Échange du code d'autorisation contre un access token."),
    ],
    services: [
      { key: "publish", label: "Publication de vidéos" },
      { key: "insights", label: "Statistiques du compte" },
    ],
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
    docsUrl: "https://entra.microsoft.com/#view/Microsoft_AAD_RegisteredApps",
    setupSteps: [
      "Microsoft Entra ID › Inscriptions d'applications › Nouvelle inscription (comptes multi-tenant).",
      "Authentification : ajoutez les Redirect URI ci-dessous (plateforme Web).",
      "Certificats et secrets : créez un secret client et copiez sa valeur.",
    ],
    fields: [
      f("client_id", "Application (client) ID", false, true, "GUID de l'inscription d'application."),
      f("client_secret", "Client Secret", true, true, "Valeur du secret client (visible une seule fois)."),
    ],
    optionalFields: [
      { key: "tenant_id", label: "Tenant ID", secret: false, hint: "GUID du locataire ; « common » si multi-tenant." },
    ],
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
    description: "Scraping web et automatisation via des milliers d'Actors Apify : Google Maps, LinkedIn, réseaux sociaux, recherche de prospects.",
    authType: "api_key",
    userConnect: true,
    docsUrl: "https://console.apify.com/settings/integrations",
    setupSteps: ["Apify Console › Settings › Integrations › Personal API token."],
    fields: [f("api_token", "Apify API Token", true, true, "Token apify_api_… envoyé en Bearer sur api.apify.com.")],
    services: [
      { key: "actors", label: "Lancer des Actors (scraping & automatisation)" },
      { key: "datasets", label: "Lire les datasets de résultats" },
      { key: "leads", label: "Prospection (Google Maps, annuaires, réseaux sociaux)" },
    ],
    optionalFields: [
      { key: "allowed_actors", label: "Actors autorisés (séparés par une virgule)", secret: false, hint: "Ex. compass/crawler-google-places, apify/instagram-scraper." },
      { key: "monthly_budget_eur", label: "Budget mensuel (€)", secret: false },
    ],
  },
  {
    key: "phantombuster",
    name: "PhantomBuster",
    category: "recherche",
    description: "Scénarios d'automatisation de collecte lorsque c'est pertinent et autorisé.",
    authType: "api_key",
    docsUrl: "https://phantombuster.com/api-keys",
    fields: [f("api_key", "API Key", true, true, "En-tête X-Phantombuster-Key-1.")],
    optionalFields: [{ key: "allowed_phantoms", label: "Phantoms autorisés", secret: false, hint: "IDs des phantoms utilisables par les agents." }],
  },
  {
    key: "resend",
    name: "Resend",
    category: "email",
    description: "Emails transactionnels du SaaS : devis, relances, invitations, notifications.",
    authType: "api_key",
    docsUrl: "https://resend.com/api-keys",
    setupSteps: ["Vérifiez votre domaine d'envoi puis créez une clé API avec droit d'envoi."],
    fields: [f("api_key", "API Key", true, true, "Clé re_… envoyée en Bearer sur api.resend.com.")],
    optionalFields: [
      { key: "domain", label: "Domaine d'envoi", secret: false, hint: "Domaine vérifié (SPF/DKIM) chez Resend." },
      { key: "from_email", label: "Email expéditeur", secret: false, hint: "Adresse par défaut du champ From." },
      { key: "from_name", label: "Nom expéditeur", secret: false },
    ],
  },
  {
    key: "brevo",
    name: "Brevo / MailerLite",
    category: "email",
    description: "Séquences email, campagnes et automatisations marketing.",
    authType: "api_key",
    docsUrl: "https://app.brevo.com/settings/keys/api",
    fields: [f("api_key", "API Key", true, true, "Clé v3 envoyée en en-tête api-key.")],
    optionalFields: [
      { key: "sender_email", label: "Compte expéditeur", secret: false, hint: "Expéditeur vérifié dans Brevo." },
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
    docsUrl: "https://dashboard.stripe.com/apikeys",
    setupSteps: [
      "Copiez la clé secrète (sk_live_… ou sk_test_…).",
      "Créez un endpoint webhook avec l'URL ci-dessous et copiez son secret de signature (whsec_…).",
    ],
    fields: [
      f("secret_key", "Secret Key", true, true, "sk_live_… / sk_test_… : toutes les requêtes API Stripe."),
      f("webhook_secret", "Webhook Signing Secret", true, true, "whsec_… : vérification des événements reçus."),
    ],
    optionalFields: [{ key: "publishable_key", label: "Publishable Key", secret: false, hint: "pk_… utilisée côté navigateur (Checkout)." }],
  },
  {
    key: "twilio",
    name: "Twilio",
    category: "sms",
    description: "SMS, notifications et communications sortantes.",
    authType: "api_key",
    docsUrl: "https://console.twilio.com",
    fields: [
      f("account_sid", "Account SID", false, true, "AC… : identifiant du compte (Basic Auth)."),
      f("auth_token", "Auth Token", true, true, "Mot de passe Basic Auth des requêtes API."),
    ],
    optionalFields: [{ key: "messaging_service_sid", label: "Numéro ou Messaging Service SID", secret: false, hint: "Expéditeur par défaut (+33… ou MG…)." }],
  },
  {
    key: "whatsapp",
    name: "WhatsApp Business API",
    category: "sms",
    description: "Messages WhatsApp professionnels.",
    authType: "api_key",
    webhook: true,
    docsUrl: "https://developers.facebook.com/apps",
    setupSteps: ["App Meta › WhatsApp › API Setup : token permanent, Phone Number ID et WABA ID."],
    fields: [
      f("access_token", "Access Token", true, true, "Token système permanent de l'app Meta."),
      f("phone_number_id", "Phone Number ID", false, true, "Identifiant du numéro expéditeur (endpoint /messages)."),
    ],
    optionalFields: [
      { key: "business_account_id", label: "Business Account ID", secret: false, hint: "WABA ID pour la gestion des templates." },
      { key: "webhook_verify_token", label: "Webhook Verify Token", secret: true, hint: "Identique à celui saisi dans la console Meta." },
    ],
  },
  {
    key: "fcm",
    name: "Firebase Cloud Messaging",
    category: "automatisation",
    description: "Notifications push, alertes et rappels.",
    authType: "api_key",
    docsUrl: "https://console.firebase.google.com",
    setupSteps: ["Paramètres du projet › Comptes de service › Générer une nouvelle clé privée (JSON)."],
    fields: [f("server_key", "Service Account JSON", true, true, "Contenu complet du JSON du compte de service.")],
    optionalFields: [{ key: "project_id", label: "Project ID", secret: false, hint: "Utilisé dans l'URL de l'API FCM v1." }],
  },
  {
    key: "make",
    name: "Make",
    category: "automatisation",
    description: "Scénarios d'automatisation externes.",
    authType: "api_key",
    webhook: true,
    docsUrl: "https://www.make.com/en/help/apps/api",
    fields: [f("api_key", "API Key ou Access Token", true, true, "En-tête Authorization: Token … de l'API Make.")],
    optionalFields: [
      { key: "webhook_url", label: "Webhook URL", secret: false, hint: "URL du webhook Make déclenché par Kobyde." },
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
