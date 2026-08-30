import { createFileRoute } from "@tanstack/react-router";

const TITLE = "Connexion Google — Kobyde";
const DESCRIPTION = "Ouverture sécurisée de l’autorisation Google pour Kobyde.";

export const Route = createFileRoute("/auth/google/launch")({
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
        const destination = requestUrl.searchParams.get("url");

        if (!destination) return new Response("Lien Google manquant.", { status: 400 });

        let googleUrl: URL;
        try {
          googleUrl = new URL(destination);
        } catch {
          return new Response("Lien Google invalide.", { status: 400 });
        }

        if (googleUrl.protocol !== "https:" || googleUrl.hostname !== "accounts.google.com") {
          return new Response("Destination non autorisée.", { status: 400 });
        }

        return new Response(null, {
          status: 302,
          headers: {
            location: googleUrl.toString(),
            "cache-control": "no-store",
          },
        });
      },
    },
  },
  component: () => null,
});