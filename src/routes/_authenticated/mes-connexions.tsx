import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { CheckCircle2, Link2, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  disconnectConnection,
  enableManagedConnection,
  myConnections,
  startConnection,
  toggleMyConnection,
} from "@/lib/connectors.functions";
import { CATEGORY_LABELS, CONNECTOR_MAP } from "@/lib/connectors.catalog";

type Search = { connexion?: string | undefined; message?: string | undefined };

export const Route = createFileRoute("/_authenticated/mes-connexions")({
  component: MesConnexionsPage,
  validateSearch: (search: Record<string, unknown>): Search => ({
    connexion: typeof search["connexion"] === "string" ? (search["connexion"] as string) : undefined,
    message: typeof search["message"] === "string" ? (search["message"] as string) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Mes connexions — Kobyde" },
      {
        name: "description",
        content:
          "Connectez vos comptes Google, Microsoft, Meta, LinkedIn, Slack ou Notion une seule fois et choisissez les autorisations données à vos agents IA.",
      },
      { property: "og:title", content: "Mes connexions — Kobyde" },
      {
        property: "og:description",
        content: "Autorisez vos agents IA Kobyde à travailler dans vos comptes, avec les permissions de votre choix.",
      },
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
  const enableFn = useServerFn(enableManagedConnection);
  const qc = useQueryClient();

  const list = useQuery({ queryKey: ["my-connections"], queryFn: () => listFn({ data: undefined }) });
  const items = useMemo(() => list.data ?? [], [list.data]);

  const [selected, setSelected] = useState<Record<string, string[]>>({});
  const [connecting, setConnecting] = useState<string | null>(null);

  useEffect(() => {
    if (search.connexion === "ok") toast.success("Compte connecté avec succès.");
    if (search.connexion === "error") toast.error(search.message ?? "Connexion impossible.");
  }, [search.connexion, search.message]);

  // Pré-coche les autorisations par défaut de chaque connecteur.
  useEffect(() => {
    setSelected((prev) => {
      const next = { ...prev };
      for (const c of items) {
        if (next[c.key]) continue;
        const def = CONNECTOR_MAP.get(c.key);
        const catalog = def?.oauth?.scopeCatalog ?? [];
        if (!c.oauth) {
          next[c.key] = (def?.services ?? []).map((sv) => sv.key);
          continue;
        }
        next[c.key] = catalog.length
          ? catalog.filter((s) => s.required || (def?.oauth?.defaultScopes ?? []).includes(s.scope)).map((s) => s.scope)
          : (def?.oauth?.defaultScopes ?? []);
      }
      return next;
    });
  }, [items]);

  const toggleScope = (key: string, scope: string, on: boolean) =>
    setSelected((prev) => {
      const current = prev[key] ?? [];
      return { ...prev, [key]: on ? Array.from(new Set([...current, scope])) : current.filter((s) => s !== scope) };
    });

  const connect = async (key: string, isOauth: boolean) => {
    setConnecting(key);
    try {
      if (!isOauth) {
        await enableFn({ data: { connectorKey: key, services: selected[key] ?? [] } });
        toast.success("Service activé pour vos agents IA.");
        void qc.invalidateQueries({ queryKey: ["my-connections"] });
        return;
      }
      const res = await startFn({
        data: { connectorKey: key, origin: window.location.origin, scopes: selected[key] ?? [] },
      });
      if (res?.url) {
        window.location.href = res.url;
        return;
      }
      toast.error(
        res?.error ??
          "Ce service n'est pas encore activé par votre administrateur. Aucune information n'est à saisir de votre côté.",
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ce service n'est pas encore activé par votre administrateur.");
    } finally {
      setConnecting(null);
    }
  };

  const toggleActive = async (key: string, active: boolean) => {
    try {
      await toggleFn({ data: { connectorKey: key, active } });
      toast.success(active ? "Compte activé pour vos agents." : "Compte désactivé : vos agents ne l'utiliseront plus.");
      void qc.invalidateQueries({ queryKey: ["my-connections"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Modification impossible.");
    }
  };

  return (
    <AppShell
      title="Mes connexions"
      subtitle="Connectez vos comptes une seule fois et choisissez ce que vos agents IA peuvent faire"
    >
      <div className="flex flex-col gap-4">
        <Card className="flex items-start gap-3 p-4 text-sm text-muted-foreground">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-emerald-600" />
          <p>
            Vous n'avez aucune clé API ni identifiant à renseigner : tout est configuré par votre administrateur. Vous
            autorisez simplement la connexion, une seule fois, sur la page officielle du fournisseur. Kobyde n'accède
            qu'aux autorisations que vous cochez et vous pouvez retirer l'accès à tout moment.
          </p>
        </Card>

        {items.map((c) => {
          const cdef = CONNECTOR_MAP.get(c.key);
          const catalog = c.oauth
            ? (cdef?.oauth?.scopeCatalog ?? [])
            : (cdef?.services ?? []).map((sv) => ({ scope: sv.key, label: sv.label, required: false }));
          const chosen = selected[c.key] ?? [];
          return (
            <Card key={c.key} className="space-y-4 p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Link2 className="size-4 text-muted-foreground" />
                    <h3 className="font-medium">{c.name}</h3>
                    {c.connected ? (
                      <Badge className={c.isActive ? "bg-emerald-500/15 text-emerald-600" : "bg-muted text-muted-foreground"}>
                        {c.isActive ? "Compte connecté" : "Connecté — désactivé"}
                      </Badge>
                    ) : (
                      <Badge variant="secondary">Non connecté</Badge>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{c.description}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {CATEGORY_LABELS[c.category as keyof typeof CATEGORY_LABELS] ?? c.category}
                  </p>
                </div>
                {c.connected && (
                  <div className="flex shrink-0 items-center gap-2">
                    <Label htmlFor={`mc-toggle-${c.key}`} className="text-xs text-muted-foreground">
                      {c.isActive ? "Activé" : "Désactivé"}
                    </Label>
                    <Switch
                      id={`mc-toggle-${c.key}`}
                      checked={c.isActive}
                      onCheckedChange={(v) => void toggleActive(c.key, v)}
                    />
                  </div>
                )}
              </div>

              {c.connected && c.account && <p className="text-xs">Compte : {c.account}</p>}

              {catalog.length > 0 ? (
                <div className="space-y-2 rounded-lg border p-3">
                  <p className="text-xs font-medium">
                    {c.oauth ? "Autorisations à accorder" : "Fonctions accessibles à vos agents"}
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {catalog.map((s) => (
                      <label key={s.scope} className="flex items-start gap-2 text-sm">
                        <Checkbox
                          checked={s.required || chosen.includes(s.scope)}
                          disabled={Boolean(s.required)}
                          onCheckedChange={(v) => toggleScope(c.key, s.scope, v === true)}
                        />
                        <span className={s.required ? "text-muted-foreground" : ""}>
                          {s.label}
                          {s.required && " (obligatoire)"}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              ) : (
                c.services.length > 0 && (
                  <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    {c.services.map((s: { key: string; label: string }) => (
                      <li key={s.key} className="flex items-center gap-1.5 whitespace-nowrap">
                        <CheckCircle2 className="size-3 shrink-0 text-emerald-600" /> {s.label}
                      </li>
                    ))}
                  </ul>
                )
              )}

              <div className="flex flex-wrap items-center gap-2">
                {c.connected ? (
                  <>
                    <Button disabled={connecting === c.key} onClick={() => void connect(c.key, c.oauth)}>
                      {c.oauth ? "Mettre à jour les autorisations" : "Mettre à jour les fonctions"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={async () => {
                        await stopFn({ data: { connectorKey: c.key } });
                        toast.success("Compte déconnecté.");
                        void qc.invalidateQueries({ queryKey: ["my-connections"] });
                      }}
                    >
                      {c.oauth ? "Déconnecter le compte" : "Désactiver le service"}
                    </Button>
                  </>
                ) : (
                  <Button disabled={connecting === c.key} onClick={() => void connect(c.key, c.oauth)}>
                    {connecting === c.key
                      ? "Activation…"
                      : c.oauth
                        ? "Connecter le compte"
                        : "Activer ce service"}
                  </Button>
                )}
              </div>
            </Card>
          );
        })}

        {items.length === 0 && !list.isLoading && (
          <Card className="p-6 text-sm text-muted-foreground">
            Aucun compte n'est encore disponible à la connexion. Revenez bientôt.
          </Card>
        )}
      </div>

    </AppShell>
  );
}
