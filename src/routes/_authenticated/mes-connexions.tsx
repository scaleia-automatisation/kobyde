import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Link2, RefreshCw, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { OrgStripeCard } from "@/components/org-stripe-card";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

import {
  disconnectConnection,
  myConnections,
  startConnection,
  toggleMyConnection,
} from "@/lib/connectors.functions";
import { CONNECTOR_MAP } from "@/lib/connectors.catalog";

type Search = { connexion?: string | undefined; message?: string | undefined };

const TITLE = "Mes connexions — Kobyde";
const DESCRIPTION =
  "Connectez vos comptes Google, YouTube, Meta, LinkedIn, TikTok, Notion, Slack et WhatsApp Business en un clic, et configurez Stripe pour encaisser vos clients.";

export const Route = createFileRoute("/_authenticated/mes-connexions")({
  component: MesConnexionsPage,
  validateSearch: (search: Record<string, unknown>): Search => ({
    connexion: typeof search["connexion"] === "string" ? (search["connexion"] as string) : undefined,
    message: typeof search["message"] === "string" ? (search["message"] as string) : undefined,
  }),
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

function MesConnexionsPage() {
  const search = useSearch({ from: "/_authenticated/mes-connexions" });
  const listFn = useServerFn(myConnections);
  const startFn = useServerFn(startConnection);
  const stopFn = useServerFn(disconnectConnection);
  const toggleFn = useServerFn(toggleMyConnection);
  const qc = useQueryClient();

  const list = useQuery({
    queryKey: ["my-connections"],
    queryFn: async () => {
      const res = await listFn({ data: undefined });
      if (res == null) throw new Error("Votre session a expiré : rechargez la page ou reconnectez-vous.");
      return res;
    },
  });
  const items = useMemo(() => list.data ?? [], [list.data]);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (search.connexion === "ok") {
      toast.success("Connexion réussie : votre compte est autorisé.");
      void qc.invalidateQueries({ queryKey: ["my-connections"] });
    }
    if (search.connexion === "error") toast.error(search.message ?? "Connexion impossible.");
  }, [search.connexion, search.message, qc]);

  // Uniquement les plateformes OAuth que l'utilisateur autorise avec son propre compte.
  const oauthItems = useMemo(
    () =>
      items.filter((c) => {
        if (c.key === "stripe") return false;
        if ((c as { platformManaged?: boolean }).platformManaged) return false;
        const def = CONNECTOR_MAP.get(c.key);
        return def?.authType === "oauth" && def?.userConnect === true;
      }),
    [items],
  );

  const connect = async (key: string) => {
    setBusy(key);
    try {
      const def = CONNECTOR_MAP.get(key);
      const scopes = Array.from(
        new Set([
          ...(def?.oauth?.defaultScopes ?? []),
          ...(def?.oauth?.scopeCatalog ?? []).map((s) => s.scope),
        ]),
      );
      const res = await startFn({
        data: { connectorKey: key, origin: window.location.origin, scopes },
      });
      if (res?.url) {
        window.location.href = res.url;
        return;
      }
      toast.error(res?.error ?? "Ce service n'est pas encore disponible. Contactez votre administrateur.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Connexion impossible.");
    } finally {
      setBusy(null);
    }
  };

  const disconnect = async (key: string, name: string) => {
    if (!window.confirm(`Déconnecter ${name} ? Vos agents ne pourront plus utiliser ce compte.`)) return;
    try {
      await stopFn({ data: { connectorKey: key } });
      toast.success(`${name} déconnecté.`);
      void qc.invalidateQueries({ queryKey: ["my-connections"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Déconnexion impossible.");
    }
  };

  const setActive = async (key: string, active: boolean) => {
    try {
      await toggleFn({ data: { connectorKey: key, active } });
      void qc.invalidateQueries({ queryKey: ["my-connections"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Modification impossible.");
    }
  };

  return (
    <AppShell title="Mes connexions" subtitle="Connectez vos comptes en un clic, sans clé ni code technique">
      <div className="flex flex-col gap-4">
        <Card className="flex items-start gap-3 border-primary/20 bg-primary/5 p-4">
          <ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" />
          <p className="text-sm text-muted-foreground">
            Cliquez sur « Se connecter » : la plateforme vous demande d'approuver l'accès, puis vous revenez ici
            automatiquement. Vos accès sont renouvelés en continu, aucune clé à saisir. Seul Stripe se configure avec
            vos clés.
          </p>
        </Card>

        {oauthItems.map((c) => (
          <Card key={c.key} className="space-y-4 p-5">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 sm:flex sm:flex-wrap sm:justify-between">
              <div className="flex min-w-0 items-center gap-2">
                <Link2 className="size-4 shrink-0 text-muted-foreground" />
                <h3 className="truncate font-medium">{c.name}</h3>
                {c.needsReconnect ? (
                  <Badge className="shrink-0 bg-amber-500/15 text-amber-600">Reconnexion nécessaire</Badge>
                ) : c.connected ? (
                  <Badge className="shrink-0 bg-emerald-500/15 text-emerald-600">● Connecté</Badge>
                ) : c.available ? (
                  <Badge className="shrink-0" variant="secondary">
                    Disponible
                  </Badge>
                ) : (
                  <Badge className="shrink-0" variant="outline">
                    Bientôt disponible
                  </Badge>
                )}
              </div>
              {c.connected && (
                <div className="flex shrink-0 items-center gap-2">
                  <Label htmlFor={`act-${c.key}`} className="text-xs text-muted-foreground">
                    {c.isActive ? "Actif" : "En pause"}
                  </Label>
                  <Switch id={`act-${c.key}`} checked={c.isActive} onCheckedChange={(v) => void setActive(c.key, v)} />
                </div>
              )}
            </div>

            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">{c.description}</p>
              {c.account && <p className="text-xs text-muted-foreground">Compte : {c.account}</p>}
            </div>

            <div className="flex flex-wrap gap-2">
              {!c.connected ? (
                <Button disabled={!c.available || busy === c.key} onClick={() => void connect(c.key)}>
                  {busy === c.key ? "Redirection…" : `Se connecter à ${c.name}`}
                </Button>
              ) : (
                <>
                  <Button variant="outline" disabled={busy === c.key} onClick={() => void connect(c.key)}>
                    <RefreshCw className="mr-1 size-4" /> Reconnecter
                  </Button>
                  <Button variant="ghost" className="text-destructive" onClick={() => void disconnect(c.key, c.name)}>
                    Déconnecter
                  </Button>
                </>
              )}
            </div>
          </Card>
        ))}

        <OrgStripeCard />

        {!oauthItems.length && !list.isLoading && (
          <Card className="p-6 text-sm text-muted-foreground">
            Aucune plateforme à connecter pour le moment. Votre administrateur doit d'abord activer les connecteurs.
          </Card>
        )}
      </div>
    </AppShell>
  );
}
