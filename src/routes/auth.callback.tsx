import { createFileRoute } from "@tanstack/react-router";

const TITLE = "Autorisation Google — Kobyde";
const DESCRIPTION = "Finalisation sécurisée de la connexion de votre compte Google à Kobyde.";

export const Route = createFileRoute("/auth/callback")({
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
        const url = new URL(request.url);
        const code = url.searchParams.get("code");
        const state = url.searchParams.get("state");
        const error = url.searchParams.get("error_description") ?? url.searchParams.get("error");
        const back = (status: "ok" | "error", message?: string) =>
          new Response(null, {
            status: 302,
            headers: {
              location:
                status === "ok"
                  ? "/mes-connexions?onglet=comptes&connexion=ok&connecteur=google"
                  : `/mes-connexions?onglet=comptes&connexion=error&connecteur=google${
                      message ? `&message=${encodeURIComponent(message)}` : ""
                    }`,
            },
          });


        if (error) return back("error", error);
        if (!code || !state) return back("error", "Réponse d'autorisation Google incomplète.");

        try {
          const { completeOAuth, oauthBaseUrl } = await import("@/lib/connectors.server");
          // Toujours échanger le code avec l'URI canonique https://kobyde.com/auth/callback.
          const callbackUri = `${oauthBaseUrl(url.origin)}/auth/callback`;
          await completeOAuth("google", code, state, url.origin, callbackUri);
          // Retour systématique dans « Mes connexions », onglet Comptes.
          return back("ok");
        } catch (caught) {
          return back("error", caught instanceof Error ? caught.message : "Connexion Google impossible.");
        }
      },
    },
  },
  component: () => null,
});