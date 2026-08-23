import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { CheckCircle2, Link2 } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  disconnectConnection,
  myConnections,
  saveMyManualConnection,
  startConnection,
} from "@/lib/connectors.functions";
import { CATEGORY_LABELS, CONNECTOR_MAP, type ConnectorField } from "@/lib/connectors.catalog";


type Search = { connexion?: string | undefined; connecteur?: string | undefined; message?: string | undefined };

export const Route = createFileRoute("/_authenticated/connexions")({
  component: ConnexionsPage,
  validateSearch: (search: Record<string, unknown>): Search => ({
    connexion: typeof search['connexion'] === "string" ? (search['connexion'] as string) : undefined,
    connecteur: typeof search['connecteur'] === "string" ? (search['connecteur'] as string) : undefined,
    message: typeof search['message'] === "string" ? (search['message'] as string) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Mes connexions — Kobyde" },
      {
        name: "description",
        content:
          "Connectez vos comptes Google, Meta, LinkedIn, TikTok ou Microsoft pour que vos agents IA Kobyde travaillent directement dans vos outils.",
      },
      { property: "og:title", content: "Mes connexions — Kobyde" },
      {
        property: "og:description",
        content: "Autorisez Kobyde à agir en votre nom sur vos plateformes préférées, en toute sécurité.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

function ConnexionsPage() {
  const search = useSearch({ from: "/_authenticated/connexions" });
  const listFn = useServerFn(myConnections);
  const startFn = useServerFn(startConnection);
  const stopFn = useServerFn(disconnectConnection);
  const qc = useQueryClient();

  const list = useQuery({ queryKey: ["my-connections"], queryFn: () => listFn({ data: undefined }) });

  useEffect(() => {
    if (search.connexion === "ok") toast.success("Compte connecté avec succès.");
    if (search.connexion === "error") toast.error(search.message ?? "Connexion impossible.");
  }, [search.connexion, search.message]);

  const connect = async (key: string) => {
    try {
      const { url } = await startFn({ data: { connectorKey: key, origin: window.location.origin } });
      window.location.href = url;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Connexion impossible.");
    }
  };

  const items = list.data ?? [];

  return (
    <AppShell title="Mes connexions" subtitle="Autorisez vos agents à agir dans vos outils, en votre nom">
      <div className="flex flex-col gap-4">
        {items.map((c) => (
          <Card key={c.key} className="space-y-3 p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Link2 className="size-4 text-muted-foreground" />
                  <h3 className="font-medium">{c.name}</h3>
                  {c.connected ? (
                    <Badge className="bg-emerald-500/15 text-emerald-600">Connecté</Badge>
                  ) : c.available ? (
                    <Badge variant="secondary">Disponible</Badge>
                  ) : (
                    <Badge variant="outline">Bientôt disponible</Badge>
                  )}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{c.description}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {CATEGORY_LABELS[c.category as keyof typeof CATEGORY_LABELS] ?? c.category}
                </p>
              </div>
            </div>

            {c.services.length > 0 && (
              <ul className="space-y-1 text-xs text-muted-foreground">
                {c.services.map((s: { key: string; label: string }) => (
                  <li key={s.key} className="flex items-center gap-2">
                    <CheckCircle2 className="size-3 text-emerald-600" /> {s.label}
                  </li>
                ))}
              </ul>
            )}

            {c.connected && c.account && <p className="text-xs">Compte : {c.account}</p>}

            <div className="flex gap-2">
              {c.connected ? (
                <Button
                  variant="outline"
                  onClick={async () => {
                    await stopFn({ data: { connectorKey: c.key } });
                    toast.success("Compte déconnecté.");
                    void qc.invalidateQueries({ queryKey: ["my-connections"] });
                  }}
                >
                  Déconnecter
                </Button>
              ) : (
                <Button disabled={!c.available} onClick={() => void connect(c.key)}>
                  Connecter mon compte
                </Button>
              )}
            </div>
          </Card>
        ))}
        {items.length === 0 && !list.isLoading && (
          <Card className="p-6 text-sm text-muted-foreground">
            Aucun connecteur n'est encore disponible. Revenez bientôt.
          </Card>
        )}
      </div>
    </AppShell>
  );
}
