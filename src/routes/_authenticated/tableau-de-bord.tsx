import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BadgeEuro,
  Briefcase,
  CheckCircle2,
  FileText,
  Inbox,
  Sparkles,
  TrendingUp,
  UserPlus,
  Users,
} from "lucide-react";

import type { LucideIcon } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { euros, useProfile, useRows } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/ui/states";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/tableau-de-bord")({
  head: () => ({
    meta: [
      { title: "Accueil — Kobyde" },
      {
        name: "description",
        content:
          "Votre tableau de bord Kobyde : chiffre d'affaires, recommandations IA et activité récente.",
      },
      { property: "og:title", content: "Accueil — Kobyde" },
      {
        property: "og:description",
        content: "Résumé de votre activité et recommandations de votre équipe IA.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Dashboard,
});

type Row = { id: string; created_at?: string };
type Quote = Row & { total_ttc: number; status: string; number?: string; title?: string };
type Payment = Row & { amount: number; status: string; due_date?: string | null };
type Prospect = Row & { full_name: string; score: number; status: string };
type Client = Row & { full_name: string };
type Project = Row & { name: string };
type Task = Row & { title: string; status: string };
type AgentTask = Row & { title: string; status: string };

function PrimaryStat({
  label,
  value,
  hint,
  icon: Icon,
  to,
}: {
  label: string;
  value: string;
  hint: string;
  icon: LucideIcon;
  to: string;
}) {
  return (
    <Link
      to={to}
      className="surface interactive block p-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="size-4" aria-hidden />
        <p className="text-label">{label}</p>
      </div>
      <p className="mt-3 font-display text-[2.5rem] leading-none tracking-tight">{value}</p>
      <p className="mt-2 text-caption">{hint}</p>
    </Link>
  );
}

function MiniStat({
  label,
  value,
  to,
}: {
  label: string;
  value: string;
  to: string;
}) {
  return (
    <Link
      to={to}
      className="flex items-baseline justify-between gap-3 rounded-xl px-4 py-3 transition-colors hover:bg-secondary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span className="truncate text-body text-muted-foreground">{label}</span>
      <span className="font-display text-lg leading-none tracking-tight">{value}</span>
    </Link>
  );
}


const dayjs = (d?: string) =>
  d ? new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }) : "";

function Dashboard() {
  const { data: profile } = useProfile();
  const { data: prospects } = useRows<Prospect>("prospects");
  const { data: clients } = useRows<Client>("clients");
  const { data: quotes } = useRows<Quote>("quotes");
  const { data: payments } = useRows<Payment>("payments");
  const { data: projects } = useRows<Project>("projects");
  const { data: tasks } = useRows<Task>("tasks");
  const { data: agentTasks } = useRows<AgentTask>("agent_tasks", { limit: 10 });

  const P = payments ?? [];
  const Q = quotes ?? [];
  const PR = prospects ?? [];
  const C = clients ?? [];
  const PJ = projects ?? [];
  const T = tasks ?? [];

  const ca = P.filter((p) => p.status === "paye").reduce((s, p) => s + Number(p.amount ?? 0), 0);
  const devisEnAttente = Q.filter((q) => q.status === "envoye" || q.status === "brouillon");
  const devisAcceptes = Q.filter((q) => q.status === "accepte");
  const paiementsRetard = P.filter(
    (p) => p.status !== "paye" && p.due_date && new Date(p.due_date) < new Date(),
  );
  const paiementsEnAttente = P.filter((p) => p.status !== "paye");
  const prospectsChauds = PR.filter((p) => Number(p.score ?? 0) >= 70);
  const tachesOuvertes = T.filter((t) => t.status !== "termine" && t.status !== "fait");
  const firstName = (profile?.full_name ?? "").split(" ")[0] || "vous";

  const recos: { title: string; desc: string; cta: string; to: string; search?: Record<string, unknown> }[] = [];
  if (devisEnAttente.length > 0)
    recos.push({
      title: `${devisEnAttente.length} devis attendent une relance`,
      desc: "Clara peut relancer automatiquement les devis sans réponse.",
      cta: "Relancer",
      to: "/devis",
    });
  if (prospectsChauds.length > 0)
    recos.push({
      title: `${prospectsChauds.length} prospects sont très intéressants`,
      desc: "Jason a repéré des prospects avec un score élevé.",
      cta: "Voir les prospects",
      to: "/prospects",
    });
  if (paiementsRetard.length > 0)
    recos.push({
      title: `${paiementsRetard.length} paiements sont en retard`,
      desc: "Audrey conseille de relancer ces factures aujourd'hui.",
      cta: "Voir les paiements",
      to: "/paiements",
    });
  if (tachesOuvertes.length > 0)
    recos.push({
      title: `${tachesOuvertes.length} tâches sont en cours`,
      desc: "Chloé suit l'avancement de vos projets.",
      cta: "Voir les projets",
      to: "/projets",
    });
  if (PR.length === 0)
    recos.push({
      title: "Aucun prospect pour le moment",
      desc: "Demandez à Éric de lancer une recherche de prospects.",
      cta: "Parler à Éric",
      to: "/eric",
      search: { agent: undefined },
    });
  if (C.length === 0)
    recos.push({
      title: "Ajoutez votre premier client",
      desc: "Jennifer créera sa fiche 360° automatiquement.",
      cta: "Voir les clients",
      to: "/clients",
    });
  const recommendations = recos.slice(0, 5);

  const activity = [
    ...PR.slice(0, 5).map((p) => ({
      id: `pr-${p.id}`,
      at: p.created_at,
      label: `Nouveau prospect : ${p.full_name}`,
      icon: UserPlus,
    })),
    ...P.filter((p) => p.status === "paye")
      .slice(0, 5)
      .map((p) => ({
        id: `pa-${p.id}`,
        at: p.created_at,
        label: `Paiement reçu : ${euros(p.amount)}`,
        icon: BadgeEuro,
      })),
    ...devisAcceptes.slice(0, 5).map((q) => ({
      id: `q-${q.id}`,
      at: q.created_at,
      label: `Devis accepté : ${q.title ?? q.number ?? ""}`,
      icon: FileText,
    })),
    ...PJ.slice(0, 5).map((p) => ({
      id: `pj-${p.id}`,
      at: p.created_at,
      label: `Projet créé : ${p.name}`,
      icon: Briefcase,
    })),
    ...C.slice(0, 5).map((c) => ({
      id: `c-${c.id}`,
      at: c.created_at,
      label: `Client ajouté : ${c.full_name}`,
      icon: Users,
    })),
    ...(agentTasks ?? [])
      .filter((t) => t.status === "termine" || t.status === "done")
      .slice(0, 5)
      .map((t) => ({
        id: `at-${t.id}`,
        at: t.created_at,
        label: `Un agent a terminé : ${t.title}`,
        icon: CheckCircle2,
      })),
  ]
    .sort((a, b) => new Date(b.at ?? 0).getTime() - new Date(a.at ?? 0).getTime())
    .slice(0, 8);

  return (
    <AppShell
      title={`Bonjour, ${firstName}`}
      subtitle="Voici le résumé de votre activité aujourd'hui."
      action={
        <Button asChild className="gap-2">
          <Link to="/eric" search={{ agent: undefined }}>
            <Sparkles className="size-4" />
            <span className="hidden sm:inline">Demander à Éric</span>
          </Link>
        </Button>
      }
    >
      <div className="grid gap-4 stagger-children md:grid-cols-3">
        <PrimaryStat
          label="Chiffre d'affaires"
          value={euros(ca)}
          hint="Paiements encaissés à ce jour"
          icon={TrendingUp}
          to="/paiements"
        />
        <PrimaryStat
          label="Devis en attente"
          value={String(devisEnAttente.length)}
          hint={`sur ${Q.length} devis au total`}
          icon={FileText}
          to="/devis"
        />
        <PrimaryStat
          label="À encaisser"
          value={String(paiementsEnAttente.length)}
          hint={
            paiementsRetard.length > 0
              ? `dont ${paiementsRetard.length} en retard`
              : "aucun retard de paiement"
          }
          icon={BadgeEuro}
          to="/paiements"
        />
      </div>

      <div className="surface mt-4 grid gap-1 p-2 sm:grid-cols-2 lg:grid-cols-5">
        <MiniStat label="Prospects" value={String(PR.length)} to="/prospects" />
        <MiniStat label="Clients" value={String(C.length)} to="/clients" />
        <MiniStat label="Projets" value={String(PJ.length)} to="/projets" />
        <MiniStat label="Tâches à faire" value={String(tachesOuvertes.length)} to="/projets" />
        <MiniStat label="Agents IA" value="10" to="/equipe" />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[3fr_2fr]">
        <SectionCard
          className=""
          title="La prochaine action utile"
          description="Ce que votre équipe IA vous conseille de faire maintenant."
        >
          {recommendations.length === 0 ? (
            <div className="flex items-center gap-3 rounded-xl bg-secondary/50 p-4">
              <CheckCircle2 className="size-5 shrink-0 text-success" aria-hidden />
              <p className="text-body text-muted-foreground">
                Tout est à jour. Rien ne vous attend pour l'instant.
              </p>
            </div>
          ) : (
            <ul className="space-y-2.5 stagger-children">
              {recommendations.map((r, i) => (
                <li
                  key={r.title}
                  className={cn(
                    "interactive flex flex-wrap items-center gap-3 rounded-xl border border-border p-4",
                    i === 0 && "border-accent/40 bg-accent/5",
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-h3">{r.title}</p>
                    <p className="mt-0.5 text-caption">{r.desc}</p>
                  </div>
                  <Button
                    asChild
                    size="sm"
                    variant={i === 0 ? "default" : "ghost"}
                    className="gap-1"
                  >
                    <Link to={r.to} {...(r.search ? { search: r.search } : {})}>
                      {r.cta} <ArrowRight className="size-4" />
                    </Link>
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard
          className=""
          title="Activité récente"
          description="Ce qui s'est passé dans votre entreprise."
        >
          {activity.length === 0 ? (
            <div className="py-6 text-center">
              <span className="mx-auto mb-3 grid size-10 place-items-center rounded-xl bg-secondary text-muted-foreground">
                <Inbox className="size-4" aria-hidden />
              </span>
              <p className="text-body text-muted-foreground">
                Rien encore. Les événements s'afficheront ici.
              </p>
            </div>
          ) : (
            <ul className="space-y-1">
              {activity.map((a) => (
                <li
                  key={a.id}
                  className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-secondary/60"
                >
                  <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-secondary text-muted-foreground">
                    <a.icon className="size-4" aria-hidden />
                  </span>
                  <p className="min-w-0 flex-1 truncate text-body">{a.label}</p>
                  <span className="shrink-0 text-caption">{dayjs(a.at)}</span>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>

    </AppShell>
  );
}
