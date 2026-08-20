import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BadgeEuro,
  Briefcase,
  CheckCircle2,
  FileText,
  ListTodo,
  Sparkles,
  TrendingUp,
  UserPlus,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { euros, useProfile, useRows } from "@/lib/db";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/tableau-de-bord")({
  head: () => ({
    meta: [
      { title: "Accueil — Kobyde" },
      { name: "description", content: "Votre tableau de bord Kobyde : chiffre d'affaires, recommandations IA et activité récente." },
      { property: "og:title", content: "Accueil — Kobyde" },
      { property: "og:description", content: "Résumé de votre activité et recommandations de votre équipe IA." },
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

function Stat({
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
      className="surface interactive block p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-label">{label}</p>
        <Icon className="size-4 text-muted-foreground" aria-hidden />
      </div>
      <p className="mt-2 font-display text-[1.75rem] leading-none tracking-tight">{value}</p>
      <p className="mt-1.5 text-caption">{hint}</p>
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

  const recos: { title: string; desc: string; cta: string; to: string }[] = [];
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
          <Link to="/eric">
            <Sparkles className="size-4" />
            <span className="hidden sm:inline">Demander à Éric</span>
          </Link>
        </Button>
      }
    >
      <div className="grid gap-3 stagger-children sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Chiffre d'affaires" value={euros(ca)} hint="Paiements encaissés" icon={TrendingUp} to="/paiements" />
        <Stat label="Prospects" value={String(PR.length)} hint="Clients potentiels" icon={UserPlus} to="/prospects" />
        <Stat label="Clients" value={String(C.length)} hint="Ils vous font confiance" icon={Users} to="/clients" />
        <Stat label="Devis" value={String(Q.length)} hint={`${devisEnAttente.length} en attente`} icon={FileText} to="/devis" />
        <Stat
          label="Paiements"
          value={String(P.length)}
          hint={`${paiementsEnAttente.length} à encaisser`}
          icon={BadgeEuro}
          to="/paiements"
        />
        <Stat label="Projets" value={String(PJ.length)} hint="En cours et terminés" icon={Briefcase} to="/projets" />
        <Stat label="Tâches" value={String(T.length)} hint={`${tachesOuvertes.length} à faire`} icon={ListTodo} to="/projets" />
        <Stat label="Équipe IA" value="10" hint="Agents disponibles 24h/24" icon={Sparkles} to="/equipe" />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <SectionCard
          title="Votre IA vous recommande"
          description="Les prochaines actions les plus utiles, classées par priorité."
        >
          {recommendations.length === 0 ? (
            <p className="text-body text-muted-foreground">
              Tout est à jour, rien à faire pour l'instant.
            </p>
          ) : (
            <ul className="space-y-2.5 stagger-children">
              {recommendations.map((r, i) => (
                <li
                  key={r.title}
                  className={cn(
                    "interactive flex flex-wrap items-center gap-3 rounded-xl border border-border p-3.5",
                    i === 0 && "border-accent/40 bg-accent/5",
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-h3">{r.title}</p>
                    <p className="mt-0.5 text-caption">{r.desc}</p>
                  </div>
                  <Button asChild size="sm" variant={i === 0 ? "default" : "outline"} className="gap-1">
                    <Link to={r.to}>
                      {r.cta} <ArrowRight className="size-4" />
                    </Link>
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard title="Activité récente" description="Ce qui s'est passé dans votre entreprise.">
          {activity.length === 0 ? (
            <p className="text-body text-muted-foreground">Aucune activité pour le moment.</p>
          ) : (
            <ul className="space-y-1.5">
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

