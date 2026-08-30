import { createFileRoute } from "@tanstack/react-router";

const TITLE = "Connexion à un service — Kobyde";
const DESCRIPTION = "Ouverture sécurisée de l'autorisation du service à connecter à Kobyde.";

/**
 * Route relais OAuth : l'aperçu Kobyde s'exécute dans une iframe, où les
 * fournisseurs (Google, Meta, LinkedIn, TikTok, Slack, Notion…) refusent de
 * s'afficher (X-Frame-Options). Le lien s'ouvre dans un nouvel onglet sur
 * cette route Kobyde, qui redirige ensuite côté serveur — hors iframe.
 */
const ALLOWED_HOSTS: Array<string | RegExp> = [
  "accounts.google.com",
  "www.facebook.com",
  "facebook.com",
  "www.linkedin.com",
  "linkedin.com",
  "www.tiktok.com",
  "tiktok.com",
  "slack.com",
  "api.notion.com",
  "notion.so",
  "www.notion.so",
  "connect.stripe.com",
  "login.microsoftonline.com",
  "login.live.com",
  /(^|\.)slack\.com$/,
  /(^|\.)notion\.so$/,
];

function isAllowed(destination: URL) {
  if (destination.protocol !== "https:") return false;
  return ALLOWED_HOSTS.some((h) =>
    typeof h === "string" ? destination.hostname === h : h.test(destination.hostname),
  );
}

export const Route = createFileRoute("/oauth/launch")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  server: {
    handlers: {
      GET: async ({ request }) => {
        const requestUrl = new URL(request.url);
        const raw = requestUrl.searchParams.get("url");
        if (!raw) return new Response("Lien d'autorisation manquant.", { status: 400 });

        let destination: URL;
        try {
          destination = new URL(raw);
        } catch {
          return new Response("Lien d'autorisation invalide.", { status: 400 });
        }
        if (!isAllowed(destination)) {
          return new Response("Destination non autorisée.", { status: 400 });
        }
        return new Response(null, {
          status: 302,
          headers: { location: destination.toString(), "cache-control": "no-store" },
        });
      },
    },
  },
  component: () => null,
});
