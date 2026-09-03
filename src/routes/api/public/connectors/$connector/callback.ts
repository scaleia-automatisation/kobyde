import { createFileRoute } from "@tanstack/react-router";

/** Callback OAuth générique des connecteurs (Google, Meta, LinkedIn, TikTok, Slack, Notion…). */
export const Route = createFileRoute("/api/public/connectors/$connector/callback")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const url = new URL(request.url);
        // Toujours revenir sur le domaine canonique : l'utilisateur doit
        // atterrir sur https://kobyde.com/mes-connexions, jamais sur une
        // origine d'aperçu ou un domaine secondaire (www, preview…).
        const origin = url.hostname === "localhost" ? url.origin : "https://kobyde.com";
        const code = url.searchParams.get("code");
        const state = url.searchParams.get("state");
        const error = url.searchParams.get("error_description") ?? url.searchParams.get("error");

        const back = (status: "ok" | "error", message?: string) =>
          new Response(null, {
            status: 302,
            headers: {
              location: `${origin}/mes-connexions?connexion=${status}&connecteur=${encodeURIComponent(
                params.connector,
              )}${message ? `&message=${encodeURIComponent(message)}` : ""}`,
              "cache-control": "no-store",
            },
          });

        if (error) return back("error", error);
        if (!code || !state) return back("error", "Réponse d'autorisation incomplète.");

        try {
          const { completeOAuth } = await import("@/lib/connectors.server");
          const result = await completeOAuth(params.connector, code, state, origin);
          const target = new URL(result.redirectTo);
          target.searchParams.set("connexion", "ok");
          target.searchParams.set("connecteur", params.connector);
          return new Response(null, { status: 302, headers: { location: target.toString() } });
        } catch (e) {
          return back("error", e instanceof Error ? e.message : "Connexion impossible.");
        }
      },
    },
  },
});
