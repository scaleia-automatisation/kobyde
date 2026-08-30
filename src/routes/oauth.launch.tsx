import { createFileRoute } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

const TITLE = "Connexion sécurisée — Kobyde";
const DESCRIPTION = "Ouverture sécurisée de la plateforme à connecter à Kobyde.";

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
  component: OAuthLaunchPage,
});

function OAuthLaunchPage() {
  const [error, setError] = useState("");

  useEffect(() => {
    const channelId = new URLSearchParams(window.location.search).get("channel");
    if (!channelId || !/^[a-zA-Z0-9-]{8,80}$/.test(channelId)) {
      setError("Cette demande de connexion est invalide. Fermez cette fenêtre et réessayez.");
      return;
    }

    const channel = new BroadcastChannel(`kobyde-oauth-${channelId}`);
    const announceReady = () => channel.postMessage({ type: "ready" });
    const readyInterval = window.setInterval(announceReady, 250);
    const timeout = window.setTimeout(() => {
      window.clearInterval(readyInterval);
      setError("La connexion a expiré. Fermez cette fenêtre et réessayez.");
    }, 30000);

    channel.onmessage = (event: MessageEvent<unknown>) => {
      const message = event.data as { type?: unknown; url?: unknown } | null;
      if (message?.type === "close") {
        window.close();
        return;
      }
      if (message?.type !== "navigate" || typeof message.url !== "string") return;
      try {
        const target = new URL(message.url);
        if (target.protocol !== "https:") throw new Error("Protocole invalide");
        window.clearInterval(readyInterval);
        window.clearTimeout(timeout);
        channel.close();
        window.location.replace(target.toString());
      } catch {
        setError("L’adresse d’autorisation reçue est invalide.");
      }
    };

    announceReady();
    return () => {
      window.clearInterval(readyInterval);
      window.clearTimeout(timeout);
      channel.close();
    };
  }, []);

  return (
    <main className="grid min-h-screen place-items-center bg-background p-6 text-foreground">
      <div className="flex max-w-md flex-col items-center gap-4 text-center">
        {error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : (
          <>
            <Loader2 className="size-8 animate-spin text-primary" aria-hidden="true" />
            <h1 className="text-xl font-semibold">Ouverture de la connexion sécurisée…</h1>
          </>
        )}
      </div>
    </main>
  );
}