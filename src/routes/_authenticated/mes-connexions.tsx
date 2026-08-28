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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
  toggleMyConnection,
} from "@/lib/connectors.functions";
import { CATEGORY_LABELS, CONNECTOR_MAP, type ConnectorField } from "@/lib/connectors.catalog";

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
  const saveFn = useServerFn(saveMyManualConnection);
  const qc = useQueryClient();

  const list = useQuery({ queryKey: ["my-connections"], queryFn: () => listFn({ data: undefined }) });
  const items = useMemo(() => list.data ?? [], [list.data]);

  const [selected, setSelected] = useState<Record<string, string[]>>({});
  const [connecting, setConnecting] = useState<string | null>(null);
  const [dialogKey, setDialogKey] = useState<string | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

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

  const openDialog = (key: string) => {
    setValues({});
    setDialogKey(key);
  };

  const connect = async (key: string) => {
    setConnecting(key);
    try {
      const res = await startFn({
        data: { connectorKey: key, origin: window.location.origin, scopes: selected[key] ?? [] },
      });
      if (res?.url) {
        window.location.href = res.url;
        return;
      }
      openDialog(key);
    } catch {
      openDialog(key);
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

  const def = dialogKey ? CONNECTOR_MAP.get(dialogKey) : undefined;
  const dialogFields: ConnectorField[] = def ? [...(def.fields ?? []), ...(def.optionalFields ?? [])] : [];

  const submitManual = async () => {
    if (!dialogKey) return;
    setSaving(true);
    try {
      await saveFn({ data: { connectorKey: dialogKey, values } });
      toast.success("Compte connecté avec succès.");
      setDialogKey(null);
      void qc.invalidateQueries({ queryKey: ["my-connections"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Connexion impossible.");
    } finally {
      setSaving(false);
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
            Vous autorisez la connexion une seule fois sur la page officielle du fournisseur. Kobyde n'accède qu'aux
            autorisations que vous cochez et vous pouvez retirer l'accès à tout moment.
          </p>
        </Card>

        {items.map((c) => {
          const cdef = CONNECTOR_MAP.get(c.key);
          const catalog = cdef?.oauth?.scopeCatalog ?? [];
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
                  <p className="text-xs font-medium">Autorisations à accorder</p>
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
                    <Button disabled={connecting === c.key} onClick={() => void connect(c.key)}>
                      Mettre à jour les autorisations
                    </Button>
                    <Button
                      variant="outline"
                      onClick={async () => {
                        await stopFn({ data: { connectorKey: c.key } });
                        toast.success("Compte déconnecté.");
                        void qc.invalidateQueries({ queryKey: ["my-connections"] });
                      }}
                    >
                      Déconnecter le compte
                    </Button>
                  </>
                ) : (
                  <Button disabled={connecting === c.key} onClick={() => void connect(c.key)}>
                    {connecting === c.key ? "Ouverture…" : "Connecter le compte"}
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

      <Dialog open={dialogKey !== null} onOpenChange={(o) => !o && setDialogKey(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{def?.name ?? "Connexion"}</DialogTitle>
            <DialogDescription>
              La connexion automatique n'est pas disponible pour ce compte. Renseignez vos identifiants pour l'activer.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[55vh] space-y-3 overflow-y-auto pr-1">
            {dialogFields.map((fd) => (
              <div key={fd.key} className="space-y-1.5">
                <Label htmlFor={`mc-f-${fd.key}`}>
                  {fd.label}
                  {fd.required !== false && <span className="text-destructive"> *</span>}
                </Label>
                <Input
                  id={`mc-f-${fd.key}`}
                  type={fd.secret ? "password" : "text"}
                  autoComplete="off"
                  value={values[fd.key] ?? ""}
                  onChange={(e) => setValues((v) => ({ ...v, [fd.key]: e.target.value }))}
                />
              </div>
            ))}
            <div className="space-y-1.5">
              <Label htmlFor="mc-f-account_label">Nom du compte (facultatif)</Label>
              <Input
                id="mc-f-account_label"
                value={values["account_label"] ?? ""}
                onChange={(e) => setValues((v) => ({ ...v, account_label: e.target.value }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogKey(null)}>
              Annuler
            </Button>
            <Button disabled={saving} onClick={() => void submitManual()}>
              {saving ? "Enregistrement…" : "Enregistrer et connecter"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
