import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, CheckCircle2, Clock4, Moon, TrendingUp } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { AGENTS } from "@/lib/agents";
import { euros, useProfile, useRows } from "@/lib/db";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/tableau-de-bord")({
  head: () => ({
    meta: [
      { title: "Accueil — Kobyde" },
      { name: "description", content: "Votre tableau de bord Kobyde : ce que votre équipe IA a fait aujourd'hui." },
      { property: "og:title", content: "Accueil — Kobyde" },
      { property: "og:description", content: "Votre tableau de bord Kobyde." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Dashboard,
});

function Stat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="surface p-5">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-3xl">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

function Dashboard() {
  const { data: profile } = useProfile();
  const { data: prospects } = useRows<{ id: string }>("prospects");
  const { data: clients } = useRows<{ id: string }>("clients");
  const { data: quotes } = useRows<{ total_ttc: number; status: string }>("quotes");
  const { data: payments } = useRows<{ amount: number; status: string }>("payments");
  const { data: notifications } = useRows<{ id: string; title: string; body: string }>("notifications", {
    limit: 5,
  });

  const encaisse = (payments ?? [])
    .filter((p) => p.status === "paye")
    .reduce((s, p) => s + Number(p.amount ?? 0), 0);
  const enAttente = (quotes ?? [])
    .filter((q) => q.status !== "refuse")
    .reduce((s, q) => s + Number(q.total_ttc ?? 0), 0);

  const firstName = (profile?.full_name ?? "").split(" ")[0] || "vous";

  return (
    <AppShell
      title={`Bonjour ${firstName} 👋`}
      subtitle="Voici ce que votre équipe IA vous conseille aujourd'hui."
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Prospects" value={String(prospects?.length ?? 0)} hint="Des clients potentiels" />
        <Stat label="Clients" value={String(clients?.length ?? 0)} hint="Ils vous font confiance" />
        <Stat label="Devis en cours" value={euros(enAttente)} hint="Argent possible" />
        <Stat label="Encaissé" value={euros(encaisse)} hint="Argent reçu" />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <section className="surface p-6 lg:col-span-2">
          <h2 className="text-lg">Les 3 actions du jour</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Éric, votre Directeur IA, a préparé la liste. Faites-les dans l'ordre.
          </p>
          <ol className="mt-5 space-y-3">
            {[
              { t: "Ajoutez 1 prospect", d: "Une personne ou entreprise qui pourrait acheter.", to: "/prospects" },
              { t: "Créez 1 devis", d: "Un prix écrit, envoyé vite, se transforme en vente.", to: "/devis" },
              { t: "Relancez 1 facture", d: "Vérifiez qui n'a pas encore payé.", to: "/paiements" },
            ].map((a, i) => (
              <li key={a.t} className="flex items-start gap-3 rounded-xl border border-border p-4">
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-accent font-medium text-accent-foreground">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{a.t}</p>
                  <p className="text-sm text-muted-foreground">{a.d}</p>
                </div>
                <Button asChild variant="ghost" size="sm" className="gap-1">
                  <Link to={a.to}>
                    Y aller <ArrowRight className="size-4" />
                  </Link>
                </Button>
              </li>
            ))}
          </ol>
        </section>

        <section className="surface p-6">
          <h2 className="text-lg">Votre équipe</h2>
          <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
            <Clock4 className="size-4 text-accent" /> 24h/24 · <Moon className="size-4 text-accent" /> sans pause
          </p>
          <ul className="mt-4 space-y-3">
            {AGENTS.slice(0, 5).map((a) => (
              <li key={a.key} className="flex items-center gap-3">
                <span className={`grid size-9 place-items-center rounded-xl text-lg ring-2 ${a.ring}`}>
                  {a.emoji}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{a.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{a.role}</p>
                </div>
              </li>
            ))}
          </ul>
          <Button asChild variant="secondary" className="mt-5 w-full">
            <Link to="/equipe">Voir les 10 agents</Link>
          </Button>
        </section>
      </div>

      <section className="surface mt-6 p-6">
        <h2 className="flex items-center gap-2 text-lg">
          <TrendingUp className="size-5 text-accent" /> Dernières nouvelles
        </h2>
        <ul className="mt-4 space-y-3">
          {(notifications ?? []).length === 0 && (
            <li className="text-sm text-muted-foreground">Aucune nouvelle pour le moment.</li>
          )}
          {(notifications ?? []).map((n) => (
            <li key={n.id} className="flex items-start gap-3 rounded-xl border border-border p-4">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" />
              <div>
                <p className="font-medium">{n.title}</p>
                <p className="text-sm text-muted-foreground">{n.body}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </AppShell>
  );
}
