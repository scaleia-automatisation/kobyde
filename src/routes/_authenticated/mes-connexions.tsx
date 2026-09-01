import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { CheckCircle2, Link2, RefreshCw, Search, ShieldCheck, XCircle } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { OrgStripeCard } from "@/components/org-stripe-card";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

import {
  disconnectConnection,
  myConnections,
  startConnection,
  toggleMyConnection,
} from "@/lib/connectors.functions";
import { CONNECTOR_MAP, scopeGroups } from "@/lib/connectors.catalog";

type Search = { connexion?: string | undefined; message?: string | undefined; onglet?: string | undefined };

const TITLE = "Mes connexions — Kobyde";
const DESCRIPTION =
  "Connectez vos comptes Google, YouTube, Meta, LinkedIn, TikTok, Notion, Slack et WhatsApp Business en un clic, et choisissez les autorisations données à vos agents IA Kobyde.";

export const Route = createFileRoute("/_authenticated/mes-connexions")({
  component: MesConnexionsPage,
  validateSearch: (search: Record<string, unknown>): Search => ({
    connexion: typeof search["connexion"] === "string" ? (search["connexion"] as string) : undefined,
    message: typeof search["message"] === "string" ? (search["message"] as string) : undefined,
    onglet: typeof search["onglet"] === "string" ? (search["onglet"] as string) : undefined,
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

  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Record<string, string[]>>({});
  const [openPerms, setOpenPerms] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (search.connexion === "ok") {
      toast.success("Connexion réussie : votre compte est autorisé.");
      void qc.invalidateQueries({ queryKey: ["my-connections"] });
    }
    if (search.connexion === "error") toast.error(search.message ?? "Connexion impossible.");
  }, [search.connexion, search.message, qc]);

  // Sélection initiale : autorisations obligatoires + celles déjà accordées.
  useEffect(() => {
    setSelected((prev) => {
      const next: Record<string, string[]> = { ...prev };
      for (const c of items) {
        if (next[c.key]) continue;
        if ((c as { platformManaged?: boolean }).platformManaged) {
          next[c.key] = [...(c.grantedScopes ?? [])];
          continue;
        }
        const def = CONNECTOR_MAP.get(c.key);
        const required = (def?.oauth?.scopeCatalog ?? []).filter((s) => s.required).map((s) => s.scope);
        const fallback = required.length ? required : (def?.oauth?.defaultScopes ?? []);
        next[c.key] = Array.from(new Set([...fallback, ...(c.grantedScopes ?? [])]));
      }
      return next;
    });
  }, [items]);

  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    // Stripe SaaS est le compte de la plateforme : réservé au Super Admin.
    const base = items.filter((c) => c.key !== "stripe");
    if (!q) return base;
    return base.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        c.key.toLowerCase().includes(q),
    );
  }, [items, query]);

  const toggleScope = (key: string, scope: string, checked: boolean) =>
    setSelected((p) => {
      const current = new Set(p[key] ?? []);
      if (checked) current.add(scope);
      else current.delete(scope);
      return { ...p, [key]: Array.from(current) };
    });

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
    <AppShell title="Mes connexions" subtitle="Connectez vos comptes en un clic, sans clé ni code technique">
      <div className="flex flex-col gap-4">
        <Card className="flex items-start gap-3 border-primary/20 bg-primary/5 p-4">
          <ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" />
          <p className="text-sm text-muted-foreground">
            Choisissez les autorisations que vous souhaitez accorder, puis connectez votre compte. Aucune clé ni
            identifiant technique à saisir : Kobyde utilise sa propre application pour chaque plateforme. Votre
            autorisation est mémorisée et renouvelée automatiquement.
          </p>
        </Card>

        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Rechercher une plateforme…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-9 text-sm"
          />
        </div>

        {"stripe connect".includes(query.trim().toLowerCase()) && <OrgStripeCard />}

        {filteredItems.map((c) => {
          const def = CONNECTOR_MAP.get(c.key);
          const platform = (c as { platformManaged?: boolean }).platformManaged === true;
          const groups = platform
            ? [
                {
                  label: "Usages autorisés",
                  scopes: ((c as { services?: { key: string; label: string }[] }).services ?? []).map((s) => ({
                    scope: s.key,
                    label: s.label,
                    required: false,
                  })),
                },
              ]
            : scopeGroups(def);
          const chosen = selected[c.key] ?? [];
          const showPerms = openPerms[c.key] ?? !c.connected;

          if (platform) {
            const activeServices = groups[0]?.scopes ?? [];
            return (
              <Card key={c.key} className="space-y-4 p-5">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <Link2 className="size-4 shrink-0 text-muted-foreground" />
                  <h3 className="truncate font-medium">{c.name}</h3>
                  <Badge variant="outline">Fourni par Kobyde</Badge>
                  <Badge className="bg-emerald-500/15 text-emerald-600">Actif pour votre compte</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{c.description}</p>
                {activeServices.length ? (
                  <ul className="space-y-1 rounded-lg border p-4 text-sm">
                    {activeServices.map((s) => (
                      <li key={s.scope} className="flex items-center gap-2 text-emerald-700">
                        <CheckCircle2 className="size-3.5" /> {s.label}
                      </li>
                    ))}
                  </ul>
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

              {c.needsReconnect && (
                <p className="rounded-md bg-amber-500/10 p-3 text-sm text-amber-700">
                  Votre connexion doit être renouvelée. Cliquez sur « Reconnecter » : la tâche en attente reprendra
                  automatiquement.
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
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium">Autorisations demandées ({chosen.length})</p>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        setSelected((p) => ({
                          ...p,
                          [c.key]: groups.flatMap((g) => g.scopes.map((s) => s.scope)),
                        }))
                      }
                    >
                      Tout cocher
                    </Button>
                  </div>
                  {groups.map((g) => (
                    <div key={g.label} className="space-y-1.5">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{g.label}</p>
                      {g.scopes.map((s: { scope: string; label: string; required?: boolean }) => {
                        const granted = (c.grantedScopes ?? []).includes(s.scope);
                        return (
                          <label key={s.scope} className="flex items-center gap-2 text-sm">
                            <Checkbox
                              checked={chosen.includes(s.scope)}
                              disabled={s.required}
                              onCheckedChange={(v) => toggleScope(c.key, s.scope, v === true)}
                            />
                            <span className={granted ? "text-emerald-700" : ""}>{s.label}</span>
                            {s.required && <span className="text-xs text-muted-foreground">(obligatoire)</span>}
                          </label>
                        );
                      })}
                    </div>
                  ))}
                  <p className="text-xs text-muted-foreground">
                    Une autorisation n'est réellement accordée qu'après confirmation par la plateforme. Les permissions
                    déjà valides ne vous seront pas redemandées.
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
                      {showPerms ? "Masquer les permissions" : "Voir les permissions"}
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
              ? "Aucune plateforme ne correspond à votre recherche."
              : "Aucun service à connecter pour le moment. Votre administrateur doit d'abord activer les connecteurs."}
          </Card>
        )}
      </div>
    </AppShell>
  );
}
