import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { CheckCircle2, Link2, RefreshCw, Search, ShieldCheck, XCircle } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { OrgStripeCard } from "@/components/org-stripe-card";
import { OrgWhatsappCard } from "@/components/org-whatsapp-card";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OrgConnectorConfig } from "@/components/org-connector-config";

import {
  disconnectConnection,
  myConnections,
  startConnection,
  toggleMyConnection,

} from "@/lib/connectors.functions";
import { CONNECTOR_MAP, scopeGroups } from "@/lib/connectors.catalog";

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
          "Connectez vos comptes Google, Meta, LinkedIn, TikTok, Slack ou Notion une seule fois et choisissez les autorisations données à vos agents IA Kobyde.",
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

  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Record<string, string[]>>({});
  const [openPerms, setOpenPerms] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (search.connexion === "ok") {
      toast.success("Connexion réussie : votre compte est autorisé.");
      void qc.invalidateQueries({ queryKey: ["org-connectors"] });
      void qc.invalidateQueries({ queryKey: ["my-connections"] });
    }
    if (search.connexion === "error") toast.error(search.message ?? "Connexion impossible.");
  }, [search.connexion, search.message, qc]);


  // Toutes les autorisations sont activées automatiquement et en permanence.
  useEffect(() => {
    setSelected(() => {
      const next: Record<string, string[]> = {};
      for (const c of items) {
        if ((c as any).platformManaged) {
          next[c.key] = [...(c.grantedScopes ?? [])];
          continue;
        }
        const def = CONNECTOR_MAP.get(c.key);
        const catalog = (def?.oauth?.scopeCatalog ?? []).map((s) => s.scope);
        const all = catalog.length ? catalog : (def?.oauth?.defaultScopes ?? []);
        next[c.key] = Array.from(new Set([...all, ...(c.grantedScopes ?? [])]));
      }
      return next;
    });
  }, [items]);






  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    // WhatsApp Business est géré par l'utilisateur lui-même (carte dédiée).
    // Stripe SaaS est le compte de la plateforme : réservé au Super Admin, jamais visible ici.
    const base = items.filter((c) => c.key !== "whatsapp" && c.key !== "stripe");
    if (!q) return base;
    return base.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        c.key.toLowerCase().includes(q)
    );
  }, [items, query]);


  const connect = async (key: string) => {
    setBusy(key);
    try {
      const res = await startFn({
        data: { connectorKey: key, origin: window.location.origin, scopes: selected[key] ?? [] },
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
    <AppShell
      title="Mes connexions"
      subtitle="Configurez les identifiants de votre entreprise, puis autorisez vos comptes"
    >
      <Tabs defaultValue="configuration" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="configuration">Comptes</TabsTrigger>
          <TabsTrigger value="comptes">Autorisations</TabsTrigger>
        </TabsList>

        <TabsContent value="configuration">
          <OrgConnectorConfig />
        </TabsContent>

        <TabsContent value="comptes">
      <div className="flex flex-col gap-4">

        <Card className="flex items-start gap-3 border-primary/20 bg-primary/5 p-4">
          <ShieldCheck className="mt-0.5 size-5 text-primary" />
          <p className="text-sm text-muted-foreground">
            Choisissez les autorisations que vous souhaitez accorder, puis connectez-vous à la plateforme. Votre
            autorisation est mémorisée et renouvelée automatiquement : elle ne vous sera plus redemandée, sauf si une
            nouvelle permission est nécessaire ou si vous révoquez l'accès.
          </p>
        </Card>

        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Rechercher un connecteur…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-9 text-sm"
          />
        </div>

        {"stripe connect".includes(query.trim().toLowerCase()) && <OrgStripeCard />}

        {"whatsapp business".includes(query.trim().toLowerCase()) && <OrgWhatsappCard />}



        {filteredItems.map((c) => {
          const def = CONNECTOR_MAP.get(c.key);
          const platform = (c as any).platformManaged === true;
          const groups = platform
            ? [{ label: "Usages autorisés", scopes: ((c as any).services ?? []).map((s: any) => ({ scope: s.key, label: s.label, required: false })) }]
            : scopeGroups(def);
          const chosen = selected[c.key] ?? [];
          const showPerms = openPerms[c.key] ?? !c.connected;
          if (platform) {
            const activeServices: any[] = groups[0]?.scopes ?? [];
            return (
              <Card key={c.key} className="space-y-4 p-5">
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 sm:flex sm:flex-wrap sm:justify-between">
                  <div className="flex min-w-0 items-center gap-2">
                    <Link2 className="size-4 shrink-0 text-muted-foreground" />
                    <h3 className="truncate font-medium">{c.name}</h3>
                    <Badge className="shrink-0" variant="outline">
                      Géré par l'administrateur
                    </Badge>
                    <Badge className="shrink-0 bg-emerald-500/15 text-emerald-600">Actif pour votre compte</Badge>
                  </div>
                </div>

                <p className="text-sm text-muted-foreground">{c.description}</p>

                {activeServices.length ? (
                  <div className="space-y-2 rounded-lg border p-4">
                    <p className="text-sm font-medium">Usages activés par votre administrateur</p>
                    <ul className="space-y-1 text-sm">
                      {activeServices.map((s: any) => (
                        <li key={s.scope} className="flex items-center gap-2 text-emerald-700">
                          <CheckCircle2 className="size-3.5" /> {s.label}
                        </li>
                      ))}
                    </ul>
                    <p className="text-xs text-muted-foreground">
                      Aucune action requise : ces autorisations sont déjà actives pour vous, avec les identifiants
                      configurés par votre administrateur.
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">Aucun usage activé par votre administrateur.</p>
                )}

              </Card>
            );
          }
          return (
            <Card key={c.key} className="space-y-4 p-5">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 sm:flex sm:flex-wrap sm:justify-between">
                <div className="flex min-w-0 items-center gap-2">
                  <Link2 className="size-4 shrink-0 text-muted-foreground" />
                  <h3 className="truncate font-medium">{c.name}</h3>
                  {c.needsReconnect ? (
                    <Badge className="shrink-0 bg-amber-500/15 text-amber-600">Reconnexion nécessaire</Badge>
                  ) : c.connected ? (
                    <Badge className="shrink-0 bg-emerald-500/15 text-emerald-600">Connecté</Badge>
                  ) : c.available ? (
                    <Badge className="shrink-0" variant="secondary">Disponible</Badge>
                  ) : (
                    <Badge className="shrink-0" variant="outline">Bientôt disponible</Badge>
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

              {c.needsReconnect && (
                <p className="rounded-md bg-amber-500/10 p-3 text-sm text-amber-700">
                  Votre connexion doit être renouvelée.
                </p>
              )}

              {c.connected && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Permissions accordées</p>
                    <ul className="mt-1 space-y-1 text-sm">
                      {(c.grantedLabels ?? []).map((l) => (
                        <li key={l} className="flex items-center gap-2 text-emerald-700">
                          <CheckCircle2 className="size-3.5" /> {l}
                        </li>
                      ))}
                      {!(c.grantedLabels ?? []).length && <li className="text-muted-foreground">—</li>}
                    </ul>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Non accordées</p>
                    <ul className="mt-1 space-y-1 text-sm">
                      {(c.missingLabels ?? []).map((l) => (
                        <li key={l} className="flex items-center gap-2 text-muted-foreground">
                          <XCircle className="size-3.5" /> {l}
                        </li>
                      ))}
                      {!(c.missingLabels ?? []).length && <li className="text-muted-foreground">—</li>}
                    </ul>
                  </div>
                </div>
              )}

              {showPerms && groups.length > 0 && (
                <div className="space-y-3 rounded-lg border p-4">
                  <p className="text-sm font-medium">
                    Autorisations demandées — toutes activées automatiquement ({chosen.length})
                  </p>
                  {groups.map((g) => (
                    <div key={g.label} className="space-y-1.5">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{g.label}</p>
                      {g.scopes.map((s: { scope: string; label: string; required?: boolean }) => (
                        <div key={s.scope} className="flex items-center gap-2 text-sm text-emerald-700">
                          <CheckCircle2 className="size-3.5" />
                          <span>{s.label}</span>
                        </div>
                      ))}
                    </div>
                  ))}
                  <p className="text-xs text-muted-foreground">
                    Toutes les autorisations sont demandées en une seule fois : le consentement final est donné par la
                    plateforme elle-même.
                  </p>
                </div>
              )}


              <div className="flex flex-wrap gap-2">
                {!c.connected ? (
                  <Button disabled={!c.available || busy === c.key} onClick={() => void connect(c.key)}>
                    {busy === c.key ? "Redirection…" : `Se connecter à ${c.name}`}
                  </Button>
                ) : (
                  <>
                    <Button variant="outline" onClick={() => setOpenPerms((p) => ({ ...p, [c.key]: !showPerms }))}>
                      {showPerms ? "Masquer les permissions" : "Gérer les permissions"}
                    </Button>
                    <Button disabled={busy === c.key} onClick={() => void connect(c.key)}>
                      Ajouter une permission
                    </Button>
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
          );
        })}

        {!filteredItems.length && !list.isLoading && (
          <Card className="p-6 text-sm text-muted-foreground">
            {query.trim()
              ? "Aucun connecteur ne correspond à votre recherche."
              : "Aucun service à connecter pour le moment. Votre administrateur doit d'abord activer les connecteurs."}
          </Card>
        )}
      </div>
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}

