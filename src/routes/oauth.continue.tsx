import { createFileRoute } from "@tanstack/react-router";

const TITLE = "Connexion à un service — Kobyde";
const DESCRIPTION = "Redirection sécurisée vers le service que vous souhaitez connecter à Kobyde.";

function validatedOAuthDestination(raw: string | null) {
  if (!raw) return null;
  try {
    const destination = new URL(raw);
    const allowed =
      destination.protocol === "https:" &&
      destination.hostname === "accounts.google.com" &&
      destination.pathname.startsWith("/o/oauth2/");
    return allowed ? destination.toString() : null;
  } catch {
    return null;
  }
}

export const Route = createFileRoute("/oauth/continue")({
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
        const destination = validatedOAuthDestination(requestUrl.searchParams.get("destination"));
        if (!destination) {
          return new Response("Destination OAuth refusée.", {
            status: 400,
            headers: { "content-type": "text/plain; charset=utf-8" },
          });
        }
        return new Response(null, {
          status: 302,
          headers: {
            location: destination,
            "cache-control": "no-store",
            "referrer-policy": "no-referrer",
          },
        });
      },
    },
  },
  component: () => null,
});