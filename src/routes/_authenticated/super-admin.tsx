import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  amIPlatformAdmin,
  changePlatformUserPlan,
  getPlatformOverview,
  listPlatformAccounts,
  suspendPlatformUser,
} from "@/lib/admin.functions";
import { USER_EVENT_LABELS } from "@/lib/user-events";
import { ConnectorsPanel } from "@/components/admin/connectors-panel";
import { BudgetsPanel, CostsPanel, LogsPanel, PricingPanel } from "@/components/admin/costs-panel";

export const Route = createFileRoute("/_authenticated/super-admin")({
  component: SuperAdminPage,
  head: () => ({
    meta: [
      { title: "Super Admin plateforme — Kobyde" },
      {
        name: "description",
        content:
          "Espace Super Admin Kobyde : utilisateurs, entreprises, revenus MRR/ARR, utilisation IA, agents, funnel SaaS et gestion des comptes.",
      },
      { property: "og:title", content: "Super Admin plateforme — Kobyde" },
      {
        property: "og:description",
        content: "Pilotage temps réel de la plateforme Kobyde : croissance, revenus, IA et comptes.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

const eur = (n: number) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(
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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function SuperAdminPage() {
  const checkAdmin = useServerFn(amIPlatformAdmin);
  const overviewFn = useServerFn(getPlatformOverview);
  const listFn = useServerFn(listPlatformAccounts);
  const suspendFn = useServerFn(suspendPlatformUser);
  const planFn = useServerFn(changePlatformUserPlan);
  const qc = useQueryClient();

  const [search, setSearch] = useState("");
  const [applied, setApplied] = useState("");

  const access = useQuery({ queryKey: ["is-platform-admin"], queryFn: () => checkAdmin({ data: undefined }) });
  const isAdmin = access.data?.isAdmin === true;

  const overview = useQuery({
    queryKey: ["platform-overview"],
    enabled: isAdmin,
    refetchInterval: 60000,
    queryFn: () => overviewFn({ data: undefined }),
  });

  const accounts = useQuery({
    queryKey: ["platform-accounts", applied],
    enabled: isAdmin,
    queryFn: () => listFn({ data: { query: applied } }),
  });

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ["platform-accounts"] });
    void qc.invalidateQueries({ queryKey: ["platform-overview"] });
  };

  const suspend = useMutation({
    mutationFn: (v: { userId: string; suspended: boolean }) => suspendFn({ data: v }),
    onSuccess: (_d, v) => {
      toast.success(v.suspended ? "Compte suspendu." : "Compte réactivé.");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const setPlan = useMutation({
    mutationFn: (v: { userId: string; plan: string }) => planFn({ data: v }),
    onSuccess: () => {
      toast.success("Formule mise à jour.");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const o = overview.data;
  const maxFunnel = useMemo(() => Math.max(1, ...(o?.funnel ?? []).map((f) => f.value)), [o]);

  if (access.isLoading) {
    return (
      <AppShell title="Super Admin" subtitle="Vérification des droits…">
        <Card className="p-6 text-sm text-muted-foreground">Chargement…</Card>
      </AppShell>
    );
  }

  if (!isAdmin) {
    return (
      <AppShell title="Super Admin" subtitle="Espace réservé">
        <Card className="p-8 text-center">
          <ShieldCheck className="mx-auto size-8 text-muted-foreground" />
          <p className="mt-3 font-medium">Accès réservé aux administrateurs de la plateforme.</p>
          <p className="text-sm text-muted-foreground">
            Cet espace est totalement séparé de votre entreprise et n'est visible que par l'équipe Kobyde.
          </p>
        </Card>
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Super Admin"
      subtitle="Pilotage temps réel de la plateforme Kobyde"
      action={
        <Button variant="outline" onClick={() => void overview.refetch()}>
          Actualiser
        </Button>
      }
    >
      <Tabs defaultValue="dashboard" className="space-y-6">
        <TabsList>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="agents">Agents</TabsTrigger>
          <TabsTrigger value="funnel">Funnel SaaS</TabsTrigger>
          <TabsTrigger value="comportement">Comportement</TabsTrigger>
          <TabsTrigger value="utilisateurs">Utilisateurs</TabsTrigger>
          <TabsTrigger value="connecteurs">Connecteurs</TabsTrigger>
          <TabsTrigger value="couts">Coûts API</TabsTrigger>
          <TabsTrigger value="tarifs">Tarifs</TabsTrigger>
          <TabsTrigger value="budgets">Budgets</TabsTrigger>
          <TabsTrigger value="logs">Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-8">
          {overview.isLoading && <Card className="p-6 text-sm text-muted-foreground">Chargement…</Card>}
          {o && (
            <>
              <Section title="Utilisateurs">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <Stat label="Inscrits" value={o.users.registered} />
                  <Stat label="Actifs (30 j)" value={o.users.active30} />
                  <Stat label="Nouveaux (30 j)" value={o.users.new30} hint={`${o.users.new7} sur 7 jours`} />
                  <Stat label="Gratuits" value={o.users.free} />
                  <Stat label="Payants" value={o.users.paid} />
                  <Stat label="Abonnements" value={o.users.subscriptions} />
                  <Stat label="Churn (30 j)" value={`${o.users.churnRate} %`} />
                  <Stat label="ARPU" value={eur(o.revenue.arpu)} />
                </div>
              </Section>

              <Section title="Entreprises">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                  <Stat label="Nombre" value={o.orgs.total} />
                  <Stat label="Nouvelles (30 j)" value={o.orgs.new30} />
                  <Stat label="Actives" value={o.orgs.active} />
                  <Stat label="Inactives" value={o.orgs.inactive} />
                  <Stat label="Suspendues" value={o.orgs.suspended} />
                </div>
              </Section>

              <Section title="Revenus">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <Stat label="MRR" value={eur(o.revenue.mrr)} />
                  <Stat label="ARR" value={eur(o.revenue.arr)} />
                  <Stat label="CA encaissé" value={eur(o.revenue.revenue)} />
                  <Stat label="Paiements" value={o.revenue.payments} hint={`${o.revenue.pendingPayments} en attente`} />
                  <Stat label="Abonnements actifs" value={o.users.subscriptions} />
                  <Stat label="Remboursements" value={o.revenue.refunds} />
                  <Stat label="Factures" value={o.revenue.invoices} />
                </div>
              </Section>

              <Section title="Utilisation IA">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <Stat label="Crédits consommés" value={o.ai.creditsConsumed} />
                  <Stat label="Crédits restants" value={o.ai.creditsLeft} />
                  <Stat label="Agents utilisés" value={o.ai.agentsUsed} />
                  <Stat label="Actions utilisées" value={o.ai.actionsUsed} />
                  <Stat label="Coût IA estimé" value={eur(o.ai.estimatedCostEur)} />
                  <Stat label="Coût par utilisateur" value={eur(o.ai.costPerUser)} />
                </div>
                {o.ai.topActions.length > 0 && (
                  <Card className="p-4">
                    <p className="mb-2 text-sm font-medium">Actions les plus utilisées</p>
                    <div className="flex flex-wrap gap-2">
                      {o.ai.topActions.map((a) => (
                        <Badge key={a.key} variant="secondary">
                          {a.key} · {a.count}
                        </Badge>
                      ))}
                    </div>
                  </Card>
                )}
              </Section>
            </>
          )}
        </TabsContent>

        <TabsContent value="agents" className="space-y-4">
          {o && (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <Stat label="Agent le plus utilisé" value={o.agents[0]?.name ?? "—"} hint={`${o.agents[0]?.tasks ?? 0} tâches`} />
                <Stat
                  label="Agent le moins utilisé"
                  value={o.agents[o.agents.length - 1]?.name ?? "—"}
                  hint={`${o.agents[o.agents.length - 1]?.tasks ?? 0} tâches`}
                />
              </div>
              <Card className="overflow-x-auto p-0">
                <table className="w-full text-sm">
                  <thead className="border-b border-border text-left text-xs text-muted-foreground">
                    <tr>
                      <th className="p-3">Agent</th>
                      <th className="p-3">Tâches</th>
                      <th className="p-3">Erreurs</th>
                      <th className="p-3">Temps moyen</th>
                      <th className="p-3">Crédits</th>
                    </tr>
                  </thead>
                  <tbody>
                    {o.agents.map((a) => (
                      <tr key={a.key} className="border-b border-border/60 last:border-0">
                        <td className="p-3 font-medium">
                          {a.name} <span className="text-xs text-muted-foreground">({a.key})</span>
                        </td>
                        <td className="p-3">{a.tasks}</td>
                        <td className="p-3">{a.errors}</td>
                        <td className="p-3">{a.avgSeconds ? `${a.avgSeconds} s` : "—"}</td>
                        <td className="p-3">{a.credits}</td>
                      </tr>
                    ))}
                    {o.agents.length === 0 && (
                      <tr>
                        <td className="p-4 text-muted-foreground" colSpan={5}>
                          Aucune tâche d'agent enregistrée pour le moment.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="funnel" className="space-y-3">
          {o?.funnel.map((f) => (
            <Card key={f.step} className="p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{f.step}</span>
                <span className="text-muted-foreground">
                  {f.value} · {f.rate} % du total · {f.stepRate} % de l'étape précédente
                </span>
              </div>
              <Progress className="mt-2" value={(f.value / maxFunnel) * 100} />
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="comportement" className="space-y-6">
          <Section title="Parcours utilisateur">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {o?.journey.map((j) => (
                <Stat key={j.name} label={USER_EVENT_LABELS[j.name] ?? j.name} value={j.users} hint="utilisateurs" />
              ))}
            </div>
          </Section>
          <Section title="Cohortes mensuelles">
            <Card className="overflow-x-auto p-0">
              <table className="w-full text-sm">
                <thead className="border-b border-border text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="p-3">Cohorte</th>
                    <th className="p-3">Inscrits</th>
                    <th className="p-3">Activés</th>
                    <th className="p-3">Abonnés</th>
                    <th className="p-3">Actifs (30 j)</th>
                  </tr>
                </thead>
                <tbody>
                  {(o?.cohorts ?? []).map((c) => (
                    <tr key={c.month} className="border-b border-border/60 last:border-0">
                      <td className="p-3 font-medium">{c.month}</td>
                      <td className="p-3">{c.signups}</td>
                      <td className="p-3">{c.activated}</td>
                      <td className="p-3">{c.paid}</td>
                      <td className="p-3">{c.retained}</td>
                    </tr>
                  ))}
                  {(o?.cohorts ?? []).length === 0 && (
                    <tr>
                      <td className="p-4 text-muted-foreground" colSpan={5}>
                        Aucune cohorte disponible.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </Card>
          </Section>
        </TabsContent>

        <TabsContent value="utilisateurs" className="space-y-4">
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              setApplied(search);
            }}
          >
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher par email, nom ou entreprise…"
            />
            <Button type="submit">Rechercher</Button>
          </form>

          <Card className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead className="border-b border-border text-left text-xs text-muted-foreground">
                <tr>
                  <th className="p-3">Utilisateur</th>
                  <th className="p-3">Entreprise</th>
                  <th className="p-3">Formule</th>
                  <th className="p-3">Inscription</th>
                  <th className="p-3">Dernière connexion</th>
                  <th className="p-3">Statut</th>
                  <th className="p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(accounts.data ?? []).map((u) => (
                  <tr key={u.id} className="border-b border-border/60 last:border-0">
                    <td className="p-3">
                      <p className="font-medium">{u.fullName}</p>
                      <p className="text-xs text-muted-foreground">{u.email}</p>
                    </td>
                    <td className="p-3">
                      {u.orgName}
                      <p className="text-xs text-muted-foreground">{u.credits} crédits</p>
                    </td>
                    <td className="p-3">
                      <Select
                        value={u.plan}
                        onValueChange={(plan) => setPlan.mutate({ userId: u.id, plan })}
                      >
                        <SelectTrigger className="w-[130px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="gratuit">Gratuit</SelectItem>
                          <SelectItem value="starter">Starter</SelectItem>
                          <SelectItem value="business">Business</SelectItem>
                          <SelectItem value="pro">Pro</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="p-3 text-xs text-muted-foreground">{dt(u.createdAt)}</td>
                    <td className="p-3 text-xs text-muted-foreground">{dt(u.lastSignInAt)}</td>
                    <td className="p-3">
                      <Badge variant={u.banned || u.orgSuspended ? "destructive" : "secondary"}>
                        {u.banned || u.orgSuspended ? "Suspendu" : "Actif"}
                      </Badge>
                    </td>
                    <td className="p-3">
                      <Button
                        size="sm"
                        variant={u.banned ? "default" : "outline"}
                        disabled={suspend.isPending}
                        onClick={() => suspend.mutate({ userId: u.id, suspended: !u.banned })}
                      >
                        {u.banned ? "Réactiver" : "Suspendre"}
                      </Button>
                    </td>
                  </tr>
                ))}
                {(accounts.data ?? []).length === 0 && !accounts.isLoading && (
                  <tr>
                    <td className="p-4 text-muted-foreground" colSpan={7}>
                      Aucun utilisateur trouvé.
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
