import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  CheckCircle2,
  Copy,
  ExternalLink,
  Loader2,
  Lock,
  Plug,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  XCircle,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  connectMyOrgConnector,
  deleteMyOrgConnector,
  listMyOrgConnectors,
  saveMyOrgConnector,
  testMyOrgConnector,
} from "@/lib/org-connectors.functions";
import { ORG_STATUS_LABELS } from "@/lib/org-connectors.catalog";

const statusTone: Record<string, string> = {
  non_configure: "bg-muted text-muted-foreground",
  incomplet: "bg-amber-500/15 text-amber-700",
  configure: "bg-sky-500/15 text-sky-700",
  connecte: "bg-emerald-500/15 text-emerald-700",
  erreur: "bg-destructive/15 text-destructive",
  expire: "bg-amber-500/15 text-amber-700",
};

type TestResult = { ok: boolean; message: string };

export function OrgConnectorConfig() {
  const listFn = useServerFn(listMyOrgConnectors);
  const saveFn = useServerFn(saveMyOrgConnector);
  const testFn = useServerFn(testMyOrgConnector);
  const deleteFn = useServerFn(deleteMyOrgConnector);
  const connectFn = useServerFn(connectMyOrgConnector);
  const qc = useQueryClient();

  const [origin, setOrigin] = useState<string>("");
  useEffect(() => setOrigin(window.location.origin), []);
  const query = useQuery({
    queryKey: ["org-connectors", origin],
    queryFn: async () => {
      const res = await listFn({ data: { origin } });
      if (res == null) throw new Error("Votre session a expiré : rechargez la page ou reconnectez-vous.");
      return res;
    },
    enabled: Boolean(origin),
  });

  const canManage = query.data?.canManage ?? false;
  const items = useMemo(() => query.data?.items ?? [], [query.data]);

  const [search, setSearch] = useState("");
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [drafts, setDrafts] = useState<Record<string, Record<string, string>>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, TestResult>>({});
  const [googleAuthorizationUrl, setGoogleAuthorizationUrl] = useState<string | null>(null);
  const [scopeSel, setScopeSel] = useState<Record<string, string[]>>({});

  // L'aperçu Kobyde est lui-même dans une iframe : une navigation `_top` y est
  // bloquée silencieusement par le navigateur. Le nouvel onglet ouvre d'abord
  // une route Kobyde, qui redirige ensuite Google côté serveur sans iframe.
  const googleLink = googleAuthorizationUrl
    ? `/auth/google/launch?url=${encodeURIComponent(googleAuthorizationUrl)}`
    : null;

  type ScopeOpt = { scope: string; label: string; required?: boolean };
  const scopesFor = (c: { key: string; scopeCatalog?: ScopeOpt[]; grantedScopes?: string[] }) => {
    if (scopeSel[c.key]) return scopeSel[c.key]!;
    // Par défaut toutes les autorisations de la plateforme sont validées automatiquement.
    const catalog = c.scopeCatalog ?? [];
    const granted = c.grantedScopes ?? [];
    return Array.from(new Set([...catalog.map((s) => s.scope), ...granted]));
  };

  const toggleScope = (c: { key: string; scopeCatalog?: ScopeOpt[]; grantedScopes?: string[] }, scope: string) => {
    const current = scopesFor(c);
    const next = current.includes(scope) ? current.filter((s) => s !== scope) : [...current, scope];
    setScopeSel((prev) => ({ ...prev, [c.key]: next }));
    if (c.key === "google") setGoogleAuthorizationUrl(null);
  };

  const googleScopesKey = (scopeSel["google"] ?? []).join(" ");

  // Prépare l'URL avant le clic afin d'éviter qu'un appel asynchrone fasse perdre
  // le geste utilisateur et déclenche le bloqueur de fenêtres du navigateur.
  useEffect(() => {
    const google = items.find((item) => item.key === "google");
    if (!origin || !google?.complete || googleAuthorizationUrl) return;
    let active = true;
    const scopes = scopeSel["google"] ?? scopesFor(google as never);
    void connectFn({ data: { provider: "google", origin, scopes } }).then((result) => {
      if (active && result?.url) setGoogleAuthorizationUrl(result.url);
    });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, origin, googleAuthorizationUrl, connectFn, googleScopesKey]);


  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (c) => c.name.toLowerCase().includes(q) || c.description.toLowerCase().includes(q) || c.key.includes(q),
    );
  }, [items, search]);

  const draftFor = (key: string, values: Record<string, string>) => drafts[key] ?? values;

  const setField = (key: string, field: string, value: string, base: Record<string, string>) =>
    setDrafts((prev) => ({ ...prev, [key]: { ...(prev[key] ?? base), [field]: value } }));

  const copy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success("Redirect URI copiée.");
    } catch {
      toast.error("Copie impossible.");
    }
  };

  const save = async (key: string, values: Record<string, string>) => {
    setBusy(`save-${key}`);
    try {
      await saveFn({ data: { provider: key, values } });
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      toast.success("Identifiants enregistrés en sécurité.");
      await qc.invalidateQueries({ queryKey: ["org-connectors"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Enregistrement impossible.");
    } finally {
      setBusy(null);
    }
  };

  const addToPlatform = async (c: { key: string; name: string; authType: string }, values: Record<string, string>) => {
    setBusy(`add-${c.key}`);
    try {
      if (c.authType === "oauth") {
        // Enregistre d'abord les identifiants saisis, puis lance l'autorisation.
        await saveFn({ data: { provider: c.key, values } });
        setDrafts((prev) => {
          const next = { ...prev };
          delete next[c.key];
          return next;
        });
        const res = await connectFn({ data: { provider: c.key, origin, scopes: scopeSel[c.key] ?? [] } });
        if (res?.url) {
          if (c.key === "google") {
            setGoogleAuthorizationUrl(res.url);
            toast.success("Identifiants enregistrés. Cliquez maintenant sur « Se connecter à Google ».");
            await qc.invalidateQueries({ queryKey: ["org-connectors"] });
            return;
          }
          toast.success(`Ouverture de la connexion à ${c.name}…`);
          window.location.assign(res.url);
          return;
        }
        toast.error(res?.error ?? "Autorisation impossible.");
        await qc.invalidateQueries({ queryKey: ["org-connectors"] });
        return;
      }
      // Clé API : enregistrer puis vérifier la connexion.
      await saveFn({ data: { provider: c.key, values } });
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[c.key];
        return next;
      });
      const res = await testFn({ data: { provider: c.key, origin } });
      setResults((prev) => ({ ...prev, [c.key]: res as TestResult }));
      if (res.ok) toast.success(`${c.name} ajouté et connecté.`);
      else toast.error(`${c.name} enregistré, mais le test a échoué.`);
      await qc.invalidateQueries({ queryKey: ["org-connectors"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : `Impossible d'ajouter ${c.name}.`);
    } finally {
      setBusy(null);
    }
  };

  const test = async (key: string) => {
    setBusy(`test-${key}`);
    setResults((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    try {
      const res = await testFn({ data: { provider: key, origin } });
      setResults((prev) => ({ ...prev, [key]: res as TestResult }));
      if (res.ok) toast.success("Connexion réussie.");
      else toast.error("Connexion échouée.");
      await qc.invalidateQueries({ queryKey: ["org-connectors"] });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Test impossible.";
      setResults((prev) => ({ ...prev, [key]: { ok: false, message } }));
      toast.error(message);
    } finally {
      setBusy(null);
    }
  };

  const connect = async (key: string) => {
    const connector = items.find((item) => item.key === key);
    const connectorName = connector?.name ?? key;
    setBusy(`connect-${key}`);
    try {
      const res = await connectFn({
        data: { provider: key, origin, scopes: connector ? scopesFor(connector as never) : [] },
      });
      if (res?.url) {
        toast.success(`Ouverture de la connexion à ${connectorName}…`);
        window.location.assign(res.url);
        return;
      }

      toast.error(res?.error ?? "Autorisation impossible.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Autorisation impossible.");
    } finally {
      setBusy(null);
    }
  };

  const remove = async (key: string, name: string) => {
    if (!window.confirm(`Supprimer les identifiants ${name} ? Vos agents ne pourront plus utiliser cette plateforme.`))
      return;
    setBusy(`del-${key}`);
    try {
      await deleteFn({ data: { provider: key } });
      toast.success(`${name} déconnecté.`);
      await qc.invalidateQueries({ queryKey: ["org-connectors"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Suppression impossible.");
    } finally {
      setBusy(null);
    }
  };

  if (query.isLoading) {
    return (
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    );
  }

  if (query.isError) {
    return (
      <Card className="p-5 text-sm text-destructive">
        {query.error instanceof Error ? query.error.message : "Chargement impossible."}
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">


      <Card className="flex items-start gap-3 border-primary/20 bg-primary/5 p-4">
        <ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" />
        <p className="text-sm text-muted-foreground">
          Renseignez ici les identifiants de <strong>votre entreprise</strong> pour chaque plateforme. Ils sont chiffrés
          et conservés côté serveur : ils ne sont jamais réaffichés et ne quittent jamais votre entreprise. Une fois
          configurés, vos agents IA les réutilisent automatiquement, sans jamais vous les redemander.
        </p>
      </Card>

      {!canManage && (
        <Card className="p-4 text-sm text-muted-foreground">
          <Lock className="mr-2 inline size-4" />
          Seuls le propriétaire et les administrateurs de l'entreprise peuvent modifier ces identifiants.
        </Card>
      )}

      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Rechercher une plateforme…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 text-sm"
        />
      </div>

      {filtered.map((c) => {
        const values = draftFor(c.key, c.values as Record<string, string>);
        const isOpen = open[c.key] ?? false;
        const result = results[c.key];
        return (
          <Card key={c.key} className="space-y-4 p-5">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 sm:flex sm:flex-wrap sm:justify-between">
              <div className="flex min-w-0 items-center gap-2">
                <Plug className="size-4 shrink-0 text-muted-foreground" />
                <h3 className="truncate font-medium">{c.name}</h3>
                <Badge className={`shrink-0 ${statusTone[c.status] ?? statusTone["non_configure"]}`}>
                  {ORG_STATUS_LABELS[c.status] ?? c.status}
                </Badge>
              </div>
              <div className="flex shrink-0 flex-nowrap items-center gap-2">
                <Button size="sm" variant={isOpen ? "secondary" : "outline"} onClick={() => setOpen((p) => ({ ...p, [c.key]: !isOpen }))}>
                  {c.complete ? "Modifier" : "Configurer"}
                </Button>
                <Button size="sm" variant="outline" disabled={!c.complete || busy === `test-${c.key}`} onClick={() => void test(c.key)}>
                  {busy === `test-${c.key}` ? <Loader2 className="mr-1 size-4 animate-spin" /> : null}
                  Tester la connexion
                </Button>
                {c.authType === "oauth" ? (
                  // OAuth : le clic d'autorisation n'est possible qu'une fois les identifiants enregistrés.
                  !c.complete ? (
                    <Badge variant="outline" className="shrink-0 text-muted-foreground">
                      Identifiants à configurer d'abord
                    </Badge>
                  ) : c.connected ? (
                    <span className="flex items-center gap-2">
                      <Badge className="shrink-0 bg-emerald-500/15 text-emerald-700">
                        <CheckCircle2 className="mr-1 size-3.5" /> Connecté
                      </Badge>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={busy === `connect-${c.key}`}
                        title="Renouveler l'autorisation (utile après un changement de permissions)"
                        onClick={() => void connect(c.key)}
                      >
                        {busy === `connect-${c.key}` ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <RefreshCw className="size-4" />
                        )}
                      </Button>
                    </span>
                  ) : c.key === "google" && googleLink ? (
                    <Button asChild size="sm">
                      <a href={googleLink} target="_blank" rel="noopener noreferrer">
                        <RefreshCw className="mr-1 size-4" />
                        Se connecter à Google
                      </a>
                    </Button>
                  ) : (
                    <Button size="sm" disabled={busy === `connect-${c.key}`} onClick={() => void connect(c.key)}>
                      {busy === `connect-${c.key}` ? (
                        <Loader2 className="mr-1 size-4 animate-spin" />
                      ) : (
                        <RefreshCw className="mr-1 size-4" />
                      )}
                      Se connecter à {c.name}
                    </Button>
                  )
                ) : // Clé API : aucun bouton « Se connecter » — l'enregistrement des clés suffit.
                c.complete ? (
                  <Badge className="shrink-0 bg-emerald-500/15 text-emerald-700">
                    <CheckCircle2 className="mr-1 size-3.5" /> Connecté — clé API active
                  </Badge>
                ) : (
                  <span className="text-xs text-muted-foreground">
                    Renseignez vos clés via « Configurer » — aucune autorisation n'est nécessaire.
                  </span>
                )}
                {(c.complete || c.connected) && canManage && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive"
                    disabled={busy === `del-${c.key}`}
                    onClick={() => void remove(c.key, c.name)}
                  >
                    <Trash2 className="mr-1 size-4" />
                    Déconnecter
                  </Button>
                )}
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">{c.description}</p>
              {c.account && (
                <p className="text-xs text-muted-foreground">
                  ✓ {c.name} connecté — compte : {c.account}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Dernier test :{" "}
                {c.lastTestAt
                  ? `${c.lastTestOk ? "réussi" : "échoué"} le ${new Date(c.lastTestAt).toLocaleDateString("fr-FR")}`
                  : "jamais"}
                {" · "}
                Dernière utilisation :{" "}
                {c.lastUsedAt ? new Date(c.lastUsedAt).toLocaleDateString("fr-FR") : "jamais"}
              </p>
            </div>

            {result && (
              <p
                className={`flex items-start gap-2 rounded-md p-3 text-sm ${
                  result.ok ? "bg-emerald-500/10 text-emerald-700" : "bg-destructive/10 text-destructive"
                }`}
              >
                {result.ok ? (
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
                ) : (
                  <XCircle className="mt-0.5 size-4 shrink-0" />
                )}
                <span>
                  <strong>{result.ok ? "✓ Connexion réussie" : "✕ Connexion échouée"}</strong> — {result.message}
                </span>
              </p>
            )}

            {!result && c.lastError && (
              <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{c.lastError}</p>
            )}

            {c.authType === "oauth" && (c.scopeCatalog?.length ?? 0) > 0 && (
              <div className="space-y-2 rounded-lg border bg-background/60 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium">Permissions à autoriser</p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setScopeSel((prev) => ({ ...prev, [c.key]: c.scopeCatalog!.map((s) => s.scope) }));
                        if (c.key === "google") setGoogleAuthorizationUrl(null);
                      }}
                    >
                      Tout cocher
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setScopeSel((prev) => ({
                          ...prev,
                          [c.key]: c.scopeCatalog!.filter((s) => s.required).map((s) => s.scope),
                        }));
                        if (c.key === "google") setGoogleAuthorizationUrl(null);
                      }}
                    >
                      Tout décocher
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Cochez ce que vos agents pourront faire sur {c.name}. Les cases cochées sont activées et autorisées
                  dès la connexion à {c.name}.
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {c.scopeCatalog!.map((s) => {
                    const checked = scopesFor(c).includes(s.scope);
                    const granted = (c.grantedScopes ?? []).includes(s.scope);
                    return (
                      <label
                        key={s.scope}
                        className="flex cursor-pointer items-start gap-2 rounded-md border p-2 text-sm hover:bg-muted/40"
                      >
                        <Checkbox
                          checked={checked}
                          disabled={s.required}
                          onCheckedChange={() => toggleScope(c, s.scope)}
                          className="mt-0.5"
                        />
                        <span className="min-w-0">
                          <span className="block truncate">{s.label}</span>
                          <span className="block truncate text-[11px] text-muted-foreground">
                            {s.required ? "Obligatoire · " : ""}
                            {granted ? "Déjà accordée" : "Non accordée"}
                          </span>
                        </span>
                      </label>
                    );
                  })}
                </div>
                {c.connected && (
                  <p className="text-xs text-muted-foreground">
                    Après modification des cases, cliquez sur « Se connecter à {c.name} » pour appliquer les nouvelles
                    permissions.
                  </p>
                )}
              </div>
            )}


            {isOpen && (
              <div className="space-y-4 rounded-lg border bg-muted/30 p-4">
                {c.redirectUri && (
                  <div>
                    <Label className="text-xs font-medium">Redirect URI à déclarer chez {c.name}</Label>
                    <div className="mt-1 flex gap-2">
                      <Input readOnly value={c.redirectUri} className="font-mono text-xs" />
                      <Button type="button" variant="outline" size="sm" onClick={() => void copy(c.redirectUri!)}>
                        <Copy className="mr-1 size-4" />
                        Copier
                      </Button>
                    </div>
                  </div>
                )}

                <div className="grid gap-3 sm:grid-cols-2">
                  {c.fields.map((f) => {
                    const alreadySet = c.configuredSecrets.includes(f.key);
                    return (
                      <div key={f.key}>
                        <Label htmlFor={`${c.key}-${f.key}`} className="text-xs font-medium">
                          {f.label}
                          {f.required ? " *" : ""}
                          {f.hint ? <span className="ml-2 font-normal text-muted-foreground">{f.hint}</span> : null}
                        </Label>
                        <Input
                          id={`${c.key}-${f.key}`}
                          type={f.secret ? "password" : "text"}
                          autoComplete="off"
                          disabled={!canManage}
                          value={f.secret ? (values[f.key] ?? "") : (values[f.key] ?? "")}
                          placeholder={f.secret && alreadySet ? "•••••••• (enregistré)" : ""}
                          onChange={(e) => setField(c.key, f.key, e.target.value, c.values as Record<string, string>)}
                          className="mt-1 text-sm"
                        />
                        {f.secret && alreadySet && (
                          <p className="mt-1 text-[11px] text-muted-foreground">
                            Enregistré et chiffré. Laissez vide pour le conserver.
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button size="sm" disabled={!canManage || busy === `save-${c.key}`} onClick={() => void save(c.key, values)}>
                    {busy === `save-${c.key}` ? <Loader2 className="mr-1 size-4 animate-spin" /> : null}
                    Enregistrer
                  </Button>
                  {c.docsUrl && (
                    <span className="inline-flex items-center gap-1">
                      <a
                        href={c.docsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-muted-foreground underline"
                      >
                        Obtenir mes identifiants <ExternalLink className="size-3" />
                      </a>
                      <button
                        type="button"
                        title="Copier le lien (si l'ouverture est bloquée par le navigateur)"
                        className="text-muted-foreground hover:text-foreground"
                        onClick={() => {
                          void navigator.clipboard.writeText(c.docsUrl!);
                          toast.success("Lien copié — collez-le dans un nouvel onglet si l'ouverture est bloquée.");
                        }}
                      >
                        <Copy className="size-3" />
                      </button>
                    </span>
                  )}
                </div>

                <div className="flex justify-end">
                  <Button
                    size="sm"
                    disabled={!canManage || busy === `add-${c.key}`}
                    onClick={() => void addToPlatform(c, values)}
                  >
                    {busy === `add-${c.key}` ? <Loader2 className="mr-1 size-4 animate-spin" /> : null}
                    Ajouter à {c.name}
                  </Button>
                </div>
              </div>
            )}
          </Card>
        );
      })}

      {filtered.length === 0 && (
        <Card className="p-6 text-center text-sm text-muted-foreground">Aucune plateforme ne correspond.</Card>
      )}
    </div>
  );
}
