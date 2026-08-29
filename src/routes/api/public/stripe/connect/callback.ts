import { createFileRoute } from "@tanstack/react-router";

/** Retour d'autorisation Stripe Connect (compte Stripe de l'entreprise cliente). */
export const Route = createFileRoute("/api/public/stripe/connect/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const origin = url.origin;
        const code = url.searchParams.get("code");
        const state = url.searchParams.get("state");
        const error = url.searchParams.get("error_description") ?? url.searchParams.get("error");

        const back = (status: "ok" | "error", message?: string) =>
          new Response(null, {
            status: 302,
            headers: {
              location: `${origin}/mes-connexions?connexion=${status}&connecteur=stripe${
                message ? `&message=${encodeURIComponent(message)}` : ""
              }`,
            },
          });

        if (error) return back("error", error);
        if (!code || !state) return back("error", "Réponse d'autorisation incomplète.");

        try {
          const { completeConnect } = await import("@/lib/stripe-connect.server");
          await completeConnect(code, state);
          return back("ok");
        } catch (e) {
          return back("error", e instanceof Error ? e.message : "Connexion Stripe impossible.");
        }
      },
    },
  },
});
