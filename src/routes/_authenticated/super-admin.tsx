import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ShieldCheck, Users, Building2, BadgeEuro, Sparkles, RefreshCw, ArrowUpRight, type LucideIcon } from "lucide-react";
import { DashboardSection } from "@/components/dashboard-section";
import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StripeSaasPanel } from "@/components/admin/stripe-saas-panel";
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
import { ContentModelsPanel } from "@/components/admin/content-models-panel";

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

function Stat({ label, value, hint, icon: Icon, tone = "primary" }: { label: string; value: string | number; hint?: string; icon?: LucideIcon; tone?: "primary" | "success" | "pink" | "violet" }) {
  const tones = { primary: "bg-primary/10 text-primary", success: "bg-success/10 text-success", pink: "bg-aurora-5/10 text-aurora-5", violet: "bg-aurora-1/10 text-aurora-1" };
  return (
    <Card className="dashboard-metric min-w-0 gap-0 p-5">
      <div className="flex items-start justify-between gap-2"><p className="text-sm text-muted-foreground">{label}</p>{Icon && <span className={`grid size-9 shrink-0 place-items-center rounded-lg ${tones[tone]}`}><Icon className="size-4" /></span>}</div>
      <p className="mt-5 break-words font-display text-3xl font-semibold">{value}</p>
      {hint && <p className="mt-2 text-xs text-muted-foreground">{hint}</p>}
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

  const [tab, setTab] = useState("dashboard");
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
      title="Pilotage Kobyde"
      subtitle="Super admin · Vue globale de la plateforme"
      action={
        <Button variant="outline" disabled={overview.isFetching} onClick={() => void overview.refetch()}>
          <RefreshCw className={`size-4 ${overview.isFetching ? "animate-spin" : ""}`} /> Actualiser
        </Button>
      }
    >
      <div className="dashboard-workspace mx-auto max-w-7xl">
      <Tabs value={tab} onValueChange={setTab} className="space-y-7">
        <TabsList>
          <TabsTrigger value="dashboard">Vue d'ensemble</TabsTrigger>
          <TabsTrigger value="agents">Agents</TabsTrigger>
          <TabsTrigger value="funnel">Conversion</TabsTrigger>
          <TabsTrigger value="comportement">Parcours clients</TabsTrigger>
          <TabsTrigger value="utilisateurs">Utilisateurs</TabsTrigger>
          <TabsTrigger value="connecteurs">Connecteurs</TabsTrigger>
          <TabsTrigger value="stripe-saas">Stripe SaaS</TabsTrigger>
          <TabsTrigger value="couts">Coûts API</TabsTrigger>
          <TabsTrigger value="tarifs">Tarifs</TabsTrigger>
          <TabsTrigger value="budgets">Budgets</TabsTrigger>
          <TabsTrigger value="logs">Journal</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-8">
          {overview.isLoading && <Card className="p-6 text-sm text-muted-foreground">Chargement…</Card>}
          {overview.isError && <p role="alert" className="text-sm text-destructive">Impossible de charger les données. Réessayez avec le bouton Actualiser.</p>}
          {o && (
            <>
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div><p className="mb-1 text-xs font-medium text-primary">PLATEFORME</p><h2 className="font-display text-2xl font-semibold">L'essentiel, en un regard</h2></div>
                <span className="flex items-center gap-2 text-xs text-muted-foreground"><span className="size-1.5 rounded-full bg-success" /> Données actualisées chaque minute</span>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <Stat label="Revenu mensuel récurrent" value={eur(o.revenue.mrr)} hint="Abonnements · MRR" icon={BadgeEuro} tone="success" />
                <Stat label="Utilisateurs inscrits" value={o.users.registered} hint={`${o.users.active30} actifs sur 30 jours`} icon={Users} />
                <Stat label="Entreprises" value={o.orgs.total} hint={`${o.orgs.active} actives`} icon={Building2} tone="pink" />
                <Stat label="Crédits IA consommés" value={o.ai.creditsConsumed} hint={`${eur(o.ai.estimatedCostEur)} de coût estimé`} icon={Sparkles} tone="violet" />
              </div>
              <div className="grid gap-8 border-y border-border py-7 xl:grid-cols-2">
                <DashboardSection title="Abonnements et revenus">
                  <dl className="space-y-4">
                    {[['Revenu annuel récurrent', eur(o.revenue.arr)], ['Chiffre d’affaires encaissé', eur(o.revenue.revenue)], ['Abonnements actifs', o.users.subscriptions], ['Paiements en attente', o.revenue.pendingPayments]].map(([label, value]) => <div key={label} className="flex justify-between gap-3 border-b border-border/60 pb-3 text-sm"><dt className="text-muted-foreground">{label}</dt><dd className="font-semibold">{value}</dd></div>)}
                  </dl>
                </DashboardSection>
                <DashboardSection title="Accès rapides">
                  <div className="grid gap-2 sm:grid-cols-2">
                    {[{tab:'utilisateurs', label:'Gérer les utilisateurs',icon:Users},{tab:'connecteurs',label:'Connecteurs',icon:Building2},{tab:'agents',label:'Activité des agents',icon:Sparkles},{tab:'couts',label:'Suivre les coûts',icon:BadgeEuro}].map((item) => <Button key={item.tab} variant="outline" className="h-auto justify-start gap-3 rounded-lg px-4 py-4 text-left" onClick={() => setTab(item.tab)}><item.icon className="size-4 shrink-0 text-primary" /><span className="min-w-0 flex-1 whitespace-normal">{item.label}</span><ArrowUpRight className="size-4 shrink-0 text-muted-foreground" /></Button>)}
                  </div>
                </DashboardSection>
              </div>
              <details className="group border-b border-border pb-6">
                <summary className="cursor-pointer font-display text-lg font-semibold">Tous les indicateurs</summary>
                <div className="mt-6 space-y-8">
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
                </div>
              </details>
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
        <TabsContent value="connecteurs" className="space-y-4">
          <ConnectorsPanel />
          <ContentModelsPanel />
        </TabsContent>

        <TabsContent value="stripe-saas" className="space-y-4">
          <StripeSaasPanel onConfigure={() => setTab("connecteurs")} />
        </TabsContent>


        <TabsContent value="couts">
          <CostsPanel />
        </TabsContent>

        <TabsContent value="tarifs">
          <PricingPanel />
        </TabsContent>

        <TabsContent value="budgets">
          <BudgetsPanel />
        </TabsContent>

        <TabsContent value="logs">
          <LogsPanel />
        </TabsContent>
      </Tabs>
      </div>
    </AppShell>
  );
}
