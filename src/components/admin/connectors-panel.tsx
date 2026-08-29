import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { AlertTriangle, ArrowDownAZ, ArrowUpAZ, Copy, Plug, Search, Settings2, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  adminCreateCustomConnector,
  adminDeleteConnector,
  adminListConnectors,
  adminSaveConnector,
  adminTestConnector,
  adminToggleConnector,
} from "@/lib/connectors.functions";
import { CATEGORY_LABELS } from "@/lib/connectors.catalog";

type Connector = Awaited<ReturnType<typeof adminListConnectors>>[number];

const copy = (v: string) => {
  void navigator.clipboard.writeText(v);
  toast.success("Copié");
};

function UrlRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="truncate font-mono text-xs">{value}</p>
      </div>
      <Button type="button" size="sm" variant="outline" onClick={() => copy(value)}>
        <Copy className="mr-1 size-3" /> Copier
      </Button>
    </div>
  );
}

function ConnectorRow({ connector, onChanged }: { connector: Connector; onChanged: () => void }) {
  const save = useServerFn(adminSaveConnector);
  const test = useServerFn(adminTestConnector);
  const toggle = useServerFn(adminToggleConnector);
  const remove = useServerFn(adminDeleteConnector);

  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({});
  const [services, setServices] = useState<string[]>(connector.services ?? []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(connector.lastError ?? null);

  // Une fois configuré, le connecteur reste connecté tant que l'admin ne le déconnecte pas.
  const ok = connector.status === "configure";
  const failed = !ok && (connector.status === "erreur" || Boolean(connector.lastError));
  const warn = ok && Boolean(error ?? connector.lastError);

  const dot = failed ? "bg-destructive" : ok ? "bg-emerald-500" : "bg-muted-foreground/40";
  const statusBadge = failed ? (
    <Badge variant="destructive">Erreur</Badge>
  ) : ok ? (
    <Badge className="bg-emerald-500/15 text-emerald-600">
      {connector.isEnabled ? "Connecté — actif" : "Connecté — désactivé"}
    </Badge>
  ) : (
    <Badge variant="secondary">Non configuré</Badge>
  );

  const runTest = async () => {
    const r = await test({ data: { key: connector.key } });
    if (r.ok) {
      setError(null);
      toast.success(r.message);
    } else {
      setError(r.message);
      toast.error(r.message);
    }
    onChanged();
    return r.ok;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await save({ data: { key: connector.key, values, services } });
      setValues({});
      const success = await runTest();
      if (success) setOpen(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Enregistrement impossible.";
      setError(message);
      toast.error(message);
    } finally {
      setBusy(false);
    }
  };

  const onToggle = async (v: boolean) => {
    if (v && connector.status !== "configure") {
      setOpen(true);
      return;
    }
    try {
      await toggle({ data: { key: connector.key, enabled: v } });
      if (v) await runTest();
      else onChanged();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Activation impossible.";
      setError(message);
      toast.error(message);
    }
  };

  const isCustom =
    !CATEGORY_LABELS[connector.category as keyof typeof CATEGORY_LABELS] || connector.category === "custom";

  return (
    <>
      <Card className="flex flex-wrap items-center gap-4 p-4">
        <span className={`size-2.5 shrink-0 rounded-full ${dot}`} aria-hidden />
        <div className="min-w-[220px] flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Plug className="size-4 text-muted-foreground" />
            <h3 className="font-medium">{connector.name}</h3>
            {statusBadge}
            <span className="text-xs text-muted-foreground">
              {CATEGORY_LABELS[connector.category as keyof typeof CATEGORY_LABELS] ?? connector.category}
            </span>
          </div>
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{connector.description}</p>
          {error && (
            <p className={`mt-1 text-xs ${failed ? "text-destructive" : "text-amber-600"}`}>
              {failed ? error : `Dernier test en échec : ${error} — la connexion reste active.`}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Button type="button" size="sm" variant="outline" onClick={() => setOpen(true)}>
            <Settings2 className="mr-1 size-4" /> Configurer
          </Button>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{connector.isEnabled ? "Activé" : "Désactivé"}</span>
            <Switch checked={connector.isEnabled} onCheckedChange={(v) => void onToggle(v)} />
          </div>
        </div>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {connector.name} {statusBadge}
            </DialogTitle>
            <DialogDescription>{connector.description}</DialogDescription>
          </DialogHeader>

          {error && (
            <Alert variant={failed ? "destructive" : "default"}>
              <AlertTriangle className="size-4" />
              <AlertTitle>{failed ? "La connexion a échoué" : "Dernier test en échec"}</AlertTitle>
              <AlertDescription>
                {error}
                {warn ? " — le connecteur reste connecté tant que vous ne le déconnectez pas." : ""}
              </AlertDescription>
            </Alert>
          )}

          <form className="space-y-4" onSubmit={submit}>
            <div className="grid gap-3 sm:grid-cols-2">
              {[...connector.fields, ...connector.optionalFields].map((field) => (
                <div key={field.key} className="space-y-1">
                  <Label className="text-xs">
                    {field.label}
                    {field.required === false ||
                    connector.optionalFields.some((o: { key: string }) => o.key === field.key) ? (
                      <span className="ml-1 text-muted-foreground">(facultatif)</span>
                    ) : null}
                  </Label>
                  <Input
                    type="text"
                    autoComplete="off"
                    placeholder={connector.values[field.key] || "—"}
                    value={values[field.key] ?? ""}
                    onChange={(e) => setValues((v) => ({ ...v, [field.key]: e.target.value }))}
                  />
                </div>
              ))}
            </div>

            {connector.servicesCatalog.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium">Services activés</p>
                <div className="flex flex-wrap gap-3">
                  {connector.servicesCatalog.map((s: { key: string; label: string }) => (
                    <label key={s.key} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={services.includes(s.key)}
                        onCheckedChange={(v) =>
                          setServices((list) => (v ? [...new Set([...list, s.key])] : list.filter((x) => x !== s.key)))
                        }
                      />
                      {s.label}
                    </label>
                  ))}
                </div>
              </div>
            )}

            {(connector.userConnect || connector.authType === "oauth") && (
              <div className="space-y-2 rounded-lg border border-border/60 bg-muted/30 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Redirect URI</p>
                <UrlRow label="Production" value={connector.urls.redirectProd} />
                <UrlRow label="Développement" value={connector.urls.redirectDev} />
              </div>
            )}

            {connector.webhook && (
              <div className="space-y-2 rounded-lg border border-border/60 bg-muted/30 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Webhook URL</p>
                <UrlRow label="Production" value={connector.urls.webhookProd} />
                <UrlRow label="Développement" value={connector.urls.webhookDev} />
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={busy}>
                Enregistrer et connecter
              </Button>
              <Button type="button" variant="outline" onClick={() => void runTest()}>
                Tester la connexion
              </Button>
              {connector.lastTestAt && (
                <span className="self-center text-xs text-muted-foreground">
                  Dernier test : {new Date(connector.lastTestAt).toLocaleString("fr-FR")}
                </span>
              )}
              {isCustom ? (
                <Button
                  type="button"
                  variant="ghost"
                  className="text-destructive"
                  onClick={async () => {
                    await remove({ data: { key: connector.key } });
                    setOpen(false);
                    onChanged();
                  }}
                >
                  <Trash2 className="mr-1 size-4" /> Supprimer
                </Button>
              ) : null}
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function ConnectorsPanel() {
  const listFn = useServerFn(adminListConnectors);
  const createFn = useServerFn(adminCreateCustomConnector);
  const qc = useQueryClient();
  const [category, setCategory] = useState("all");
  const [sort, setSort] = useState<"name-asc" | "name-desc" | "status">("name-asc");
  const [query, setQuery] = useState("");
  const [custom, setCustom] = useState({ key: "", name: "", baseUrl: "", authType: "api_key" });

  const list = useQuery({ queryKey: ["admin-connectors"], queryFn: () => listFn({ data: undefined }) });
  const refresh = () => void qc.invalidateQueries({ queryKey: ["admin-connectors"] });

  const create = useMutation({
    mutationFn: () =>
      createFn({
        data: {
          key: custom.key.trim().toLowerCase(),
          name: custom.name.trim(),
          baseUrl: custom.baseUrl.trim(),
          authType: custom.authType as "api_key" | "oauth" | "custom",
          category: "custom",
        },
      }),
    onSuccess: () => {
      toast.success("Connecteur personnalisé créé.");
      setCustom({ key: "", name: "", baseUrl: "", authType: "api_key" });
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const categories = useMemo(() => {
    const set = new Set((list.data ?? []).map((c) => c.category));
    return ["all", ...set];
  }, [list.data]);

  const items = useMemo(() => {
    const filtered = (list.data ?? []).filter((c) => category === "all" || c.category === category);
    return [...filtered].sort((a, b) => {
      if (sort === "name-asc") return a.name.localeCompare(b.name, "fr");
      if (sort === "name-desc") return b.name.localeCompare(a.name, "fr");
      const order = { configure: 0, erreur: 1, default: 2 };
      return (order[a.status as keyof typeof order] ?? order.default) - (order[b.status as keyof typeof order] ?? order.default);
    });
  }, [list.data, category, sort]);

  return (
    <div className="space-y-5">
      <Card className="grid gap-3 p-4 sm:grid-cols-5">
        <div className="sm:col-span-1">
          <Label className="text-xs">Clé</Label>
          <Input value={custom.key} onChange={(e) => setCustom({ ...custom, key: e.target.value })} placeholder="mon_api" />
        </div>
        <div className="sm:col-span-1">
          <Label className="text-xs">Nom</Label>
          <Input value={custom.name} onChange={(e) => setCustom({ ...custom, name: e.target.value })} placeholder="Mon API" />
        </div>
        <div className="sm:col-span-1">
          <Label className="text-xs">Base URL</Label>
          <Input
            value={custom.baseUrl}
            onChange={(e) => setCustom({ ...custom, baseUrl: e.target.value })}
            placeholder="https://api.exemple.com"
          />
        </div>
        <div className="sm:col-span-1">
          <Label className="text-xs">Authentification</Label>
          <Select value={custom.authType} onValueChange={(v) => setCustom({ ...custom, authType: v })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="api_key">API Key / Bearer</SelectItem>
              <SelectItem value="oauth">OAuth</SelectItem>
              <SelectItem value="custom">Basic Auth</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-end">
          <Button
            className="w-full"
            disabled={!custom.key || !custom.name || create.isPending}
            onClick={() => create.mutate()}
          >
            Ajouter un connecteur
          </Button>
        </div>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => (
            <Button key={c} size="sm" variant={category === c ? "default" : "outline"} onClick={() => setCategory(c)}>
              {c === "all" ? "Tous" : (CATEGORY_LABELS[c as keyof typeof CATEGORY_LABELS] ?? c)}
            </Button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Trier par</span>
          <Button
            size="sm"
            variant={sort === "name-asc" ? "default" : "outline"}
            onClick={() => setSort("name-asc")}
            aria-label="Tri par nom croissant"
          >
            <ArrowDownAZ className="mr-1 size-4" /> Nom A-Z
          </Button>
          <Button
            size="sm"
            variant={sort === "name-desc" ? "default" : "outline"}
            onClick={() => setSort("name-desc")}
            aria-label="Tri par nom décroissant"
          >
            <ArrowUpAZ className="mr-1 size-4" /> Nom Z-A
          </Button>
          <Button
            size="sm"
            variant={sort === "status" ? "default" : "outline"}
            onClick={() => setSort("status")}
            aria-label="Tri par statut"
          >
            Statut
          </Button>
        </div>
      </div>

      {list.isLoading && <Card className="p-6 text-sm text-muted-foreground">Chargement…</Card>}
      <div className="flex flex-col gap-3">
        {items.map((c) => (
          <ConnectorRow key={c.key} connector={c} onChanged={refresh} />
        ))}
      </div>
    </div>
  );
}
