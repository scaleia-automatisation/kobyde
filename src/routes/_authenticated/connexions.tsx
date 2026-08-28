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
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  disconnectConnection,
  enableManagedConnection,
  myConnections,
  startConnection,
  testMyConnection,
  toggleMyConnection,
} from "@/lib/connectors.functions";
import { CATEGORY_LABELS, CONNECTOR_MAP } from "@/lib/connectors.catalog";
import { ConnectorsPanel } from "@/components/admin/connectors-panel";
import { useMyRole } from "@/lib/db";


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
      { title: "Connecteurs — Kobyde" },
      {
        name: "description",
        content:
          "Connectez vos comptes Google, Meta, LinkedIn, TikTok ou Microsoft pour que vos agents IA Kobyde travaillent directement dans vos outils.",
      },
      { property: "og:title", content: "Connecteurs — Kobyde" },
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
  const testFn = useServerFn(testMyConnection);
  const toggleFn = useServerFn(toggleMyConnection);
  const [testing, setTesting] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, { ok: boolean; message: string }>>({});
  const qc = useQueryClient();
  const myRole = useMyRole();
  const isAdmin = Boolean(myRole.data?.isPlatformAdmin || myRole.data?.role === "owner" || myRole.data?.role === "admin");

  const list = useQuery({ queryKey: ["my-connections"], queryFn: () => listFn({ data: undefined }) });

  useEffect(() => {
    if (search.connexion === "ok") toast.success("Compte connecté avec succès.");
    if (search.connexion === "error") toast.error(search.message ?? "Connexion impossible.");
  }, [search.connexion, search.message]);

  const enableFn = useServerFn(enableManagedConnection);
  const [connecting, setConnecting] = useState<string | null>(null);

  // L'utilisateur ne saisit jamais d'identifiants (OAuth, clé API, MCP) :
  // la configuration de l'administrateur est toujours utilisée, de façon invisible.
  const connect = async (key: string) => {
    const isOauth = CONNECTOR_MAP.get(key)?.authType === "oauth";
    setConnecting(key);
    try {
      if (isOauth) {
        const res = await startFn({ data: { connectorKey: key, origin: window.location.origin } });
        if (res?.url) {
          window.location.href = res.url;
          return;
        }
        toast.error("Ce service n'est pas encore disponible. Rien à renseigner de votre côté.");
        return;
      }
      await enableFn({ data: { connectorKey: key } });
      toast.success("Service activé pour vos agents IA.");
      void qc.invalidateQueries({ queryKey: ["my-connections"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Connexion impossible.");
    } finally {
      setConnecting(null);
    }
  };

  const toggleActive = async (key: string, active: boolean) => {
    try {
      await toggleFn({ data: { connectorKey: key, active } });
      toast.success(active ? "Connecteur activé : vos agents peuvent l'utiliser." : "Connecteur désactivé : vos agents ne l'utiliseront plus.");
      void qc.invalidateQueries({ queryKey: ["my-connections"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Modification impossible.");
    }
  };

  const runTest = async (key: string) => {
    setTesting(key);
    try {
      const res = await testFn({ data: { connectorKey: key } });
      setResults((prev) => ({ ...prev, [key]: res }));
      if (res.ok) toast.success(res.message);
      else toast.error(res.message);
      void qc.invalidateQueries({ queryKey: ["my-connections"] });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Test impossible.";
      setResults((prev) => ({ ...prev, [key]: { ok: false, message } }));
      toast.error(message);
    } finally {
      setTesting(null);
    }
  };

  const items = list.data ?? [];

  return (
    <AppShell title="Connecteurs" subtitle="Autorisez vos agents à agir dans vos outils, en votre nom">
      {isAdmin && (
        <section className="mb-8 space-y-3">
          <div>
            <h2 className="text-lg font-semibold">Administration des connecteurs</h2>
            <p className="text-sm text-muted-foreground">
              Activez chaque connecteur avec son interrupteur, puis renseignez les champs requis par son API.
            </p>
          </div>
          <ConnectorsPanel />
        </section>
      )}

      <div className="flex flex-col gap-4">
        {items.map((c) => (
          <Card key={c.key} className="space-y-3 p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Link2 className="size-4 text-muted-foreground" />
                  <h3 className="font-medium">{c.name}</h3>
                  {c.connected ? (
                    <Badge
                      className={
                        c.isActive
                          ? "bg-emerald-500/15 text-emerald-600"
                          : "bg-muted text-muted-foreground"
                      }
                    >
                      {c.isActive ? "Connecté — actif" : "Connecté — désactivé"}
                    </Badge>
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
              {c.connected && (
                <div className="flex shrink-0 items-center gap-2">
                  <Label htmlFor={`toggle-${c.key}`} className="text-xs text-muted-foreground">
                    {c.isActive ? "Activé" : "Désactivé"}
                  </Label>
                  <Switch
                    id={`toggle-${c.key}`}
                    checked={c.isActive}
                    onCheckedChange={(v) => void toggleActive(c.key, v)}
                  />
                </div>
              )}
            </div>

            {c.services.length > 0 && (
              <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                {c.services.map((s: { key: string; label: string }) => (
                  <li key={s.key} className="flex items-center gap-1.5 whitespace-nowrap">
                    <CheckCircle2 className="size-3 shrink-0 text-emerald-600" /> {s.label}
                  </li>
                ))}
              </ul>
            )}

            {c.connected && c.account && <p className="text-xs">Compte : {c.account}</p>}

            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="secondary"
                disabled={testing === c.key}
                onClick={() => void runTest(c.key)}
              >
                {testing === c.key ? "Test en cours…" : "Tester la connexion"}
              </Button>
              {c.connected ? (
                <>
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
                </>
              ) : (
                <Button disabled={connecting === c.key} onClick={() => void connect(c.key)}>
                  {connecting === c.key ? "Connexion…" : "Connecter mon compte"}
                </Button>
              )}

            </div>

            {results[c.key] && (
              <p className={`text-xs ${results[c.key]!.ok ? "text-emerald-600" : "text-destructive"}`}>
                {results[c.key]!.ok ? "✓ " : "✕ "}
                {results[c.key]!.message}
              </p>
            )}
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
