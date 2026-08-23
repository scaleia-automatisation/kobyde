/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  adminCostOverview,
  adminDeleteBudget,
  adminDeletePricing,
  adminListBudgets,
  adminListLogs,
  adminListPricing,
  adminUpsertBudget,
  adminUpsertPricing,
} from "@/lib/connectors.functions";

const eur = (n: number, digits = 2) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: digits }).format(
    Number(n ?? 0),
  );
const dt = (s?: string | null) =>
  s ? new Date(s).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" }) : "—";

function Stat({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <Card className="p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-2xl">{value}</p>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </Card>
  );
}

function Table({ title, rows }: { title: string; rows: { key: string; name?: string; requests: number; cost: number; avgCost: number; credits: number }[] }) {
  return (
    <Card className="overflow-x-auto p-0">
      <p className="border-b border-border p-3 text-sm font-medium">{title}</p>
      <table className="w-full text-sm">
        <thead className="border-b border-border text-left text-xs text-muted-foreground">
          <tr>
            <th className="p-3">Élément</th>
            <th className="p-3">Requêtes</th>
            <th className="p-3">Coût</th>
            <th className="p-3">Coût moyen</th>
            <th className="p-3">Crédits</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key} className="border-b border-border/60 last:border-0">
              <td className="p-3 font-medium">{r.name ?? r.key}</td>
              <td className="p-3">{r.requests}</td>
              <td className="p-3">{eur(r.cost)}</td>
              <td className="p-3">{eur(r.avgCost, 5)}</td>
              <td className="p-3">{r.credits}</td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td className="p-4 text-muted-foreground" colSpan={5}>
                Aucune donnée sur la période.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </Card>
  );
}

export function CostsPanel() {
  const fn = useServerFn(adminCostOverview);
  const q = useQuery({ queryKey: ["admin-costs"], refetchInterval: 60000, queryFn: () => fn({ data: undefined }) });
  const o = q.data;

  if (q.isLoading) return <Card className="p-6 text-sm text-muted-foreground">Chargement…</Card>;
  if (!o) return null;

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Coût aujourd'hui" value={eur(o.kpis.today)} />
        <Stat label="Coût ce mois" value={eur(o.kpis.month)} hint={`${o.kpis.evolution} % vs mois dernier`} />
        <Stat label="Projection fin de mois" value={eur(o.kpis.projection)} />
        <Stat label="Mois précédent" value={eur(o.kpis.previousMonth)} />
        <Stat label="Requêtes" value={o.kpis.requests} hint={`${eur(o.kpis.avgPerRequest, 5)} / requête`} />
        <Stat label="Coût / utilisateur" value={eur(o.kpis.avgPerUser, 3)} />
        <Stat label="Coût / entreprise" value={eur(o.kpis.avgPerOrg, 3)} />
        <Stat label="Crédits consommés" value={o.kpis.credits} />
        <Stat label="Revenu abonnements" value={eur(o.kpis.revenue)} />
        <Stat label="Marge estimée" value={eur(o.kpis.margin)} hint="Revenu − coûts API du mois" />
      </div>

      {o.budgets.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold">Budgets</h3>
          {o.budgets.map((b) => (
            <Card key={b.id} className="p-4">
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="font-medium">
                  {b.scope} {b.connector_key ? `· ${b.connector_key}` : ""} · {b.period === "daily" ? "jour" : "mois"}
                </span>
                <span className="text-muted-foreground">
                  {eur(b.spent)} / {eur(Number(b.amount_eur))} ({b.ratio} %)
                </span>
                <Badge variant={b.level === "critique" ? "destructive" : "secondary"}>{b.level}</Badge>
              </div>
              <Progress className="mt-2" value={Math.min(100, b.ratio)} />
            </Card>
          ))}
        </div>
      )}

      <Table title="Par connecteur / API" rows={o.byConnector} />
      <Table title="Par agent IA" rows={o.byAgent} />
      <Table title="Par fonctionnalité" rows={o.byFeature} />
      <Table title="Par entreprise" rows={o.byOrg} />
    </div>
  );
}

export function PricingPanel() {
  const listFn = useServerFn(adminListPricing);
  const upsertFn = useServerFn(adminUpsertPricing);
  const delFn = useServerFn(adminDeletePricing);
  const qc = useQueryClient();
  const [form, setForm] = useState({ connectorKey: "", model: "", unit: "request", unitPrice: "" });

  const list = useQuery({ queryKey: ["admin-pricing"], queryFn: () => listFn({ data: undefined }) });
  const refresh = () => void qc.invalidateQueries({ queryKey: ["admin-pricing"] });

  const save = useMutation({
    mutationFn: () =>
      upsertFn({
        data: {
          connectorKey: form.connectorKey.trim(),
          model: form.model.trim() || undefined,
          unit: form.unit,
          unitPrice: Number(form.unitPrice),
        },
      }),
    onSuccess: () => {
      toast.success("Tarif enregistré.");
      setForm({ connectorKey: "", model: "", unit: "request", unitPrice: "" });
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <Card className="grid gap-3 p-4 sm:grid-cols-5">
        <div>
          <Label className="text-xs">Connecteur</Label>
          <Input value={form.connectorKey} onChange={(e) => setForm({ ...form, connectorKey: e.target.value })} placeholder="gemini" />
        </div>
        <div>
          <Label className="text-xs">Modèle (facultatif)</Label>
          <Input value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} placeholder="gemini-2.5-flash" />
        </div>
        <div>
          <Label className="text-xs">Unité</Label>
          <Select value={form.unit} onValueChange={(v) => setForm({ ...form, unit: v })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="request">Requête</SelectItem>
              <SelectItem value="1k_tokens">1 000 tokens</SelectItem>
              <SelectItem value="image">Image</SelectItem>
              <SelectItem value="minute">Minute</SelectItem>
              <SelectItem value="message">Message</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Prix unitaire (€)</Label>
          <Input
            type="number"
            step="0.000001"
            value={form.unitPrice}
            onChange={(e) => setForm({ ...form, unitPrice: e.target.value })}
          />
        </div>
        <div className="flex items-end">
          <Button className="w-full" disabled={!form.connectorKey || !form.unitPrice || save.isPending} onClick={() => save.mutate()}>
            Enregistrer le tarif
          </Button>
        </div>
      </Card>

      <Card className="overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="border-b border-border text-left text-xs text-muted-foreground">
            <tr>
              <th className="p-3">Connecteur</th>
              <th className="p-3">Modèle</th>
              <th className="p-3">Unité</th>
              <th className="p-3">Prix</th>
              <th className="p-3">Depuis</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {(list.data ?? []).map((p) => (
              <tr key={p.id} className="border-b border-border/60 last:border-0">
                <td className="p-3 font-medium">{p.connector_key}</td>
                <td className="p-3">{p.model ?? "—"}</td>
                <td className="p-3">{p.unit}</td>
                <td className="p-3">{eur(Number(p.unit_price), 6)}</td>
                <td className="p-3 text-xs text-muted-foreground">{dt(p.effective_from)}</td>
                <td className="p-3">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={async () => {
                      await delFn({ data: { id: p.id } });
                      refresh();
                    }}
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </td>
              </tr>
            ))}
            {(list.data ?? []).length === 0 && (
              <tr>
                <td className="p-4 text-muted-foreground" colSpan={6}>
                  Aucun tarif enregistré.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

export function BudgetsPanel() {
  const listFn = useServerFn(adminListBudgets);
  const upsertFn = useServerFn(adminUpsertBudget);
  const delFn = useServerFn(adminDeleteBudget);
  const qc = useQueryClient();
  const [form, setForm] = useState({ scope: "global", connectorKey: "", period: "monthly", amountEur: "", actionOnLimit: "notify" });

  const list = useQuery({ queryKey: ["admin-budgets"], queryFn: () => listFn({ data: undefined }) });
  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ["admin-budgets"] });
    void qc.invalidateQueries({ queryKey: ["admin-costs"] });
  };

  const save = useMutation({
    mutationFn: () =>
      upsertFn({
        data: {
          scope: form.scope,
          connectorKey: form.connectorKey.trim() || undefined,
          period: form.period,
          amountEur: Number(form.amountEur),
          actionOnLimit: form.actionOnLimit,
        },
      }),
    onSuccess: () => {
      toast.success("Budget enregistré.");
      setForm({ ...form, amountEur: "" });
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <Card className="grid gap-3 p-4 sm:grid-cols-5">
        <div>
          <Label className="text-xs">Portée</Label>
          <Select value={form.scope} onValueChange={(v) => setForm({ ...form, scope: v })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="global">Globale</SelectItem>
              <SelectItem value="connector">Par connecteur</SelectItem>
              <SelectItem value="agent">Par agent</SelectItem>
              <SelectItem value="org">Par entreprise</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Connecteur (facultatif)</Label>
          <Input value={form.connectorKey} onChange={(e) => setForm({ ...form, connectorKey: e.target.value })} />
        </div>
        <div>
          <Label className="text-xs">Période</Label>
          <Select value={form.period} onValueChange={(v) => setForm({ ...form, period: v })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Jour</SelectItem>
              <SelectItem value="monthly">Mois</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Montant (€)</Label>
          <Input type="number" step="1" value={form.amountEur} onChange={(e) => setForm({ ...form, amountEur: e.target.value })} />
        </div>
        <div>
          <Label className="text-xs">Action à la limite</Label>
          <Select value={form.actionOnLimit} onValueChange={(v) => setForm({ ...form, actionOnLimit: v })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="notify">Alerter</SelectItem>
              <SelectItem value="validate">Demander validation</SelectItem>
              <SelectItem value="throttle">Ralentir</SelectItem>
              <SelectItem value="disable">Bloquer</SelectItem>
              <SelectItem value="continue">Continuer</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="sm:col-span-5">
          <Button disabled={!form.amountEur || save.isPending} onClick={() => save.mutate()}>
            Enregistrer le budget
          </Button>
        </div>
      </Card>

      <Card className="overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="border-b border-border text-left text-xs text-muted-foreground">
            <tr>
              <th className="p-3">Portée</th>
              <th className="p-3">Connecteur</th>
              <th className="p-3">Période</th>
              <th className="p-3">Montant</th>
              <th className="p-3">Action</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {(list.data ?? []).map((b) => (
              <tr key={b.id} className="border-b border-border/60 last:border-0">
                <td className="p-3 font-medium">{b.scope}</td>
                <td className="p-3">{b.connector_key ?? "—"}</td>
                <td className="p-3">{b.period === "daily" ? "Jour" : "Mois"}</td>
                <td className="p-3">{eur(Number(b.amount_eur))}</td>
                <td className="p-3">{b.action_on_limit}</td>
                <td className="p-3">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={async () => {
                      await delFn({ data: { id: b.id } });
                      refresh();
                    }}
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </td>
              </tr>
            ))}
            {(list.data ?? []).length === 0 && (
              <tr>
                <td className="p-4 text-muted-foreground" colSpan={6}>
                  Aucun budget défini.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

export function LogsPanel() {
  const listFn = useServerFn(adminListLogs);
  const [filters, setFilters] = useState({ connectorKey: "", agentKey: "", status: "" });
  const list = useQuery({
    queryKey: ["admin-logs", filters],
    queryFn: () =>
      listFn({
        data: {
          ...(filters.connectorKey ? { connectorKey: filters.connectorKey } : {}),
          ...(filters.agentKey ? { agentKey: filters.agentKey } : {}),
          ...(filters.status ? { status: filters.status } : {}),
        },
      }),
  });

  return (
    <div className="space-y-4">
      <Card className="grid gap-3 p-4 sm:grid-cols-3">
        <Input
          placeholder="Connecteur"
          value={filters.connectorKey}
          onChange={(e) => setFilters({ ...filters, connectorKey: e.target.value })}
        />
        <Input placeholder="Agent" value={filters.agentKey} onChange={(e) => setFilters({ ...filters, agentKey: e.target.value })} />
        <Select value={filters.status || "all"} onValueChange={(v) => setFilters({ ...filters, status: v === "all" ? "" : v })}>
          <SelectTrigger>
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="success">Succès</SelectItem>
            <SelectItem value="error">Erreur</SelectItem>
          </SelectContent>
        </Select>
      </Card>

      <Card className="overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="border-b border-border text-left text-xs text-muted-foreground">
            <tr>
              <th className="p-3">Date</th>
              <th className="p-3">Entreprise</th>
              <th className="p-3">Agent</th>
              <th className="p-3">Connecteur</th>
              <th className="p-3">Action</th>
              <th className="p-3">Coût</th>
              <th className="p-3">Durée</th>
              <th className="p-3">Statut</th>
            </tr>
          </thead>
          <tbody>
            {(list.data ?? []).map((e: any) => (
              <tr key={e.id} className="border-b border-border/60 last:border-0">
                <td className="p-3 text-xs text-muted-foreground">{dt(e.created_at)}</td>
                <td className="p-3">{e.org_name ?? "—"}</td>
                <td className="p-3">{e.agent_key ?? "—"}</td>
                <td className="p-3">
                  {e.connector_key ?? "—"}
                  {e.model ? <span className="block text-xs text-muted-foreground">{e.model}</span> : null}
                </td>
                <td className="p-3">{e.feature ?? e.action_type ?? "—"}</td>
                <td className="p-3">{eur(Number(e.real_cost_eur ?? e.estimated_cost_eur ?? 0), 5)}</td>
                <td className="p-3">{e.duration_ms ? `${e.duration_ms} ms` : "—"}</td>
                <td className="p-3">
                  <Badge variant={e.status === "error" ? "destructive" : "secondary"}>{e.status}</Badge>
                </td>
              </tr>
            ))}
            {(list.data ?? []).length === 0 && (
              <tr>
                <td className="p-4 text-muted-foreground" colSpan={8}>
                  Aucun appel enregistré.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
