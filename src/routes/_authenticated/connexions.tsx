import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Copy, Link2, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  adminConnectorLogs,
  adminConnectorStats,
  adminListConnectors,
  adminSaveConnector,
  adminTestConnector,
  adminToggleConnector,
} from "@/lib/connectors.functions";
import { CATEGORY_LABELS, CONNECTOR_MAP, scopeGroups } from "@/lib/connectors.catalog";

export const Route = createFileRoute("/_authenticated/connexions")({
  component: ConnecteursAdminPage,
  head: () => ({
    meta: [
      { title: "Connecteurs — Administration Kobyde" },
      {
        name: "description",
        content:
          "Configurez une seule fois les clés API, applications OAuth et webhooks utilisés par tous les agents IA de Kobyde.",
      },
      { property: "og:title", content: "Connecteurs — Administration Kobyde" },
      {
        property: "og:description",
        content: "Clés API, applications OAuth, webhooks, tests, journaux et coûts des connecteurs de la plateforme.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

function CopyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="flex gap-2">
        <Input readOnly value={value} className="font-mono text-xs" />
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => {
            void navigator.clipboard.writeText(value);
            toast.success("Copié");
          }}
        >
          <Copy className="size-4" />
        </Button>
      </div>
    </div>
  );
}

function ConnecteursAdminPage() {
  const listFn = useServerFn(adminListConnectors);
  const saveFn = useServerFn(adminSaveConnector);
  const testFn = useServerFn(adminTestConnector);
  const toggleFn = useServerFn(adminToggleConnector);
  const logsFn = useServerFn(adminConnectorLogs);
  const statsFn = useServerFn(adminConnectorStats);
  const qc = useQueryClient();

  const list = useQuery({ queryKey: ["admin-connectors"], queryFn: () => listFn({ data: undefined }) });
  const stats = useQuery({ queryKey: ["admin-connector-stats"], queryFn: () => statsFn({ data: undefined }) });
  const logs = useQuery({ queryKey: ["admin-connector-logs"], queryFn: () => logsFn({ data: {} }) });

  const items = useMemo(() => list.data ?? [], [list.data]);
  const [drafts, setDrafts] = useState<Record<string, Record<string, string>>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, { ok: boolean; message: string }>>({});
  const [open, setOpen] = useState<string | null>(null);

  const setValue = (key: string, field: string, value: string) =>
    setDrafts((prev) => ({ ...prev, [key]: { ...(prev[key] ?? {}), [field]: value } }));

  const save = async (key: string) => {
    setBusy(key);
    try {
      await saveFn({ data: { key, values: drafts[key] ?? {} } });
      setDrafts((p) => ({ ...p, [key]: {} }));
      toast.success("Configuration enregistrée.");
      void qc.invalidateQueries({ queryKey: ["admin-connectors"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Enregistrement impossible.");
    } finally {
      setBusy(null);
    }
  };

  const test = async (key: string) => {
    setBusy(key);
    try {
      const res = await testFn({ data: { key } });
      setResults((p) => ({ ...p, [key]: res }));
      if (res.ok) toast.success(res.message);
      else toast.error(res.message);
      void qc.invalidateQueries({ queryKey: ["admin-connectors"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Test impossible.");
    } finally {
      setBusy(null);
    }
  };

  const toggle = async (key: string, enabled: boolean) => {
    try {
      await toggleFn({ data: { key, enabled } });
      void qc.invalidateQueries({ queryKey: ["admin-connectors"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Modification impossible.");
    }
  };

  const grouped = useMemo(() => {
    const map = new Map<string, typeof items>();
    for (const c of items) map.set(c.category, [...(map.get(c.category) ?? []), c]);
    return Array.from(map, ([cat, list]) => ({ cat, list }));
  }, [items]);

  // DEBUG
  useEffect(() => {
    console.log("[ConnecteursDebug] list", { data: list.data, error: list.error, isLoading: list.isLoading, isFetching: list.isFetching });
  }, [list.data, list.error, list.isLoading, list.isFetching]);

  return (
    <AppShell title="Connecteurs" subtitle="Configuration centrale des API, applications OAuth et webhooks">
      <Tabs defaultValue="config">
        <TabsList>
          <TabsTrigger value="config">Configuration</TabsTrigger>
          <TabsTrigger value="logs">Journaux</TabsTrigger>
        </TabsList>

        <TabsContent value="config" className="mt-4 space-y-6">
          <Card className="flex items-start gap-3 border-primary/20 bg-primary/5 p-4">
            <ShieldCheck className="mt-0.5 size-5 text-primary" />
            <p className="text-sm text-muted-foreground">
              Les clés saisies ici restent côté serveur et ne sont jamais exposées aux utilisateurs. Les utilisateurs
              autorisent uniquement leurs propres comptes depuis « Mes connexions ».
            </p>
          </Card>

          {grouped.map(({ cat, list: group }) => (
            <div key={cat} className="space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                {CATEGORY_LABELS[cat as keyof typeof CATEGORY_LABELS] ?? cat}
              </h2>
              {group.map((c) => {
                const def = CONNECTOR_MAP.get(c.key);
                const stat = (stats.data ?? {})[c.key];
                const expanded = open === c.key;
                return (
                  <Card key={c.key} className="space-y-3 p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <Link2 className="size-4 text-muted-foreground" />
                          <h3 className="font-medium">{c.name}</h3>
                          <Badge
                            className={
                              c.status === "configure"
                                ? "bg-emerald-500/15 text-emerald-600"
                                : c.status === "erreur"
                                  ? "bg-destructive/15 text-destructive"
                                  : "bg-muted text-muted-foreground"
                            }
                          >
                            {c.status === "configure" ? "Configuré" : c.status === "erreur" ? "Erreur" : "Non configuré"}
                          </Badge>
                          {c.userConnect && <Badge variant="outline">Compte utilisateur (OAuth)</Badge>}
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">{c.description}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {stat
                            ? `${stat.calls} appel(s) · ${stat.errors} erreur(s) · ${stat.cost.toFixed(2)} € (30 j)`
                            : "Aucun appel enregistré sur 30 jours"}
                          {c.lastTestAt ? ` · testé le ${new Date(c.lastTestAt).toLocaleString("fr-FR")}` : ""}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <Label htmlFor={`en-${c.key}`} className="text-xs text-muted-foreground">
                          {c.isEnabled ? "Activé" : "Désactivé"}
                        </Label>
                        <Switch id={`en-${c.key}`} checked={c.isEnabled} onCheckedChange={(v) => void toggle(c.key, v)} />
                        <Button variant="outline" size="sm" onClick={() => setOpen(expanded ? null : c.key)}>
                          {expanded ? "Fermer" : "Configurer"}
                        </Button>
                      </div>
                    </div>

                    {results[c.key] && (
                      <p className={`text-sm ${results[c.key]!.ok ? "text-emerald-600" : "text-destructive"}`}>
                        {results[c.key]!.message}
                      </p>
                    )}
                    {!results[c.key] && c.lastError && <p className="text-sm text-destructive">{c.lastError}</p>}

                    {expanded && (
                      <div className="space-y-4 rounded-lg border p-4">
                        <div className="grid gap-3 sm:grid-cols-2">
                          {[...c.fields, ...c.optionalFields].map((fd) => (
                            <div key={fd.key} className="space-y-1">
                              <Label className="text-xs">
                                {fd.label}
                                {fd.required === false ? " (facultatif)" : ""}
                              </Label>
                              <Input
                                type={fd.secret ? "password" : "text"}
                                placeholder={c.values[fd.key] || (fd.secret ? "•••••" : "")}
                                value={drafts[c.key]?.[fd.key] ?? ""}
                                onChange={(e) => setValue(c.key, fd.key, e.target.value)}
                              />
                            </div>
                          ))}
                        </div>

                        {c.authType === "oauth" && (
                          <div className="grid gap-3 sm:grid-cols-2">
                            <CopyField label="Redirect URI (production)" value={c.urls.redirectProd} />
                            <CopyField label="Redirect URI (développement)" value={c.urls.redirectDev} />
                          </div>
                        )}
                        {c.webhook && (
                          <div className="grid gap-3 sm:grid-cols-2">
                            <CopyField label="Webhook URL (production)" value={c.urls.webhookProd} />
                            <CopyField label="Webhook URL (développement)" value={c.urls.webhookDev} />
                          </div>
                        )}

                        {scopeGroups(def).length > 0 && (
                          <div className="space-y-2">
                            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                              Permissions proposées aux utilisateurs
                            </p>
                            <div className="grid gap-1 sm:grid-cols-2">
                              {scopeGroups(def).map((g) => (
                                <p key={g.label} className="text-xs text-muted-foreground">
                                  <span className="font-medium text-foreground">{g.label} :</span>{" "}
                                  {g.scopes.map((s) => s.label).join(", ")}
                                </p>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="flex flex-wrap gap-2">
                          <Button disabled={busy === c.key} onClick={() => void save(c.key)}>
                            Enregistrer
                          </Button>
                          <Button variant="outline" disabled={busy === c.key} onClick={() => void test(c.key)}>
                            Tester
                          </Button>
                        </div>
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          ))}
        </TabsContent>

        <TabsContent value="logs" className="mt-4">
          <Card className="overflow-x-auto p-4">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="py-2">Date</th>
                  <th>Connecteur</th>
                  <th>Action</th>
                  <th>Statut</th>
                  <th>Durée</th>
                  <th>Coût</th>
                </tr>
              </thead>
              <tbody>
                {(logs.data ?? []).map((l: any) => (
                  <tr key={l.id} className="border-t">
                    <td className="py-2">{new Date(l.created_at).toLocaleString("fr-FR")}</td>
                    <td>{l.provider}</td>
                    <td>{l.action ?? "—"}</td>
                    <td className={l.status === "ok" ? "text-emerald-600" : "text-destructive"}>{l.status}</td>
                    <td>{l.duration_ms ? `${l.duration_ms} ms` : "—"}</td>
                    <td>{l.cost_eur ? `${Number(l.cost_eur).toFixed(4)} €` : "—"}</td>
                  </tr>
                ))}
                {!(logs.data ?? []).length && (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-muted-foreground">
                      Aucun appel enregistré pour le moment.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </Card>
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}
