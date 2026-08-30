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
              location: `/mes-connexions?connexion=${status}&connecteur=google${
                message ? `&message=${encodeURIComponent(message)}` : ""
              }`,
            },
          });

        if (error) return back("error", error);
        if (!code || !state) return back("error", "Réponse d'autorisation Google incomplète.");

        try {
          const { completeOAuth } = await import("@/lib/connectors.server");
          const callbackUri = `${url.origin}/auth/callback`;
          const result = await completeOAuth("google", code, state, url.origin, callbackUri);
          const target = new URL(result.redirectTo);
          target.searchParams.set("connexion", "ok");
          target.searchParams.set("connecteur", "google");
          return new Response(null, { status: 302, headers: { location: target.toString() } });
        } catch (caught) {
          return back("error", caught instanceof Error ? caught.message : "Connexion Google impossible.");
        }
      },
    },
  },
  component: () => null,
});