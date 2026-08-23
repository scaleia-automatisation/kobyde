import { createFileRoute } from "@tanstack/react-router";

/** Callback OAuth générique des connecteurs (Google, Meta, LinkedIn, TikTok, Microsoft…). */
export const Route = createFileRoute("/api/public/connectors/$connector/callback")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const url = new URL(request.url);
        const origin = url.origin;
        const code = url.searchParams.get("code");
        const state = url.searchParams.get("state");
        const error = url.searchParams.get("error_description") ?? url.searchParams.get("error");

        const back = (status: "ok" | "error", message?: string) =>
          new Response(null, {
            status: 302,
            headers: {
              location: `${origin}/connexions?connexion=${status}&connecteur=${encodeURIComponent(
                params.connector,
              )}${message ? `&message=${encodeURIComponent(message)}` : ""}`,
            },
          });

        if (error) return back("error", error);
        if (!code || !state) return back("error", "Réponse d'autorisation incomplète.");

        try {
          const { completeOAuth } = await import("@/lib/connectors.server");
          await completeOAuth(params.connector, code, state, origin);
          return back("ok");
        } catch (e) {
          return back("error", e instanceof Error ? e.message : "Connexion impossible.");
        }
      },
    },
  },
});
