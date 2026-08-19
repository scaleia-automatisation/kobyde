import { createFileRoute } from "@tanstack/react-router";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AppShell } from "@/components/app-shell";
import { euros, useRows } from "@/lib/db";

export const Route = createFileRoute("/_authenticated/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics — Kobyde" },
      { name: "description", content: "Vos chiffres expliqués simplement par Ethan, votre agent Analyse." },
      { property: "og:title", content: "Analytics — Kobyde" },
      { property: "og:description", content: "Vos chiffres, expliqués simplement." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Analytics,
});

function Analytics() {
  const { data: prospects } = useRows<{ id: string }>("prospects");
  const { data: clients } = useRows<{ id: string }>("clients");
  const { data: quotes } = useRows<{ total_ttc: number }>("quotes");
  const { data: payments } = useRows<{ amount: number; status: string }>("payments");

  const encaisse = (payments ?? [])
    .filter((p) => p.status === "paye")
    .reduce((s, p) => s + Number(p.amount ?? 0), 0);
  const devis = (quotes ?? []).reduce((s, q) => s + Number(q.total_ttc ?? 0), 0);
  const taux = prospects?.length ? Math.round(((clients?.length ?? 0) / prospects.length) * 100) : 0;

  const chart = [
    { name: "Prospects", valeur: prospects?.length ?? 0 },
    { name: "Clients", valeur: clients?.length ?? 0 },
    { name: "Devis", valeur: quotes?.length ?? 0 },
    { name: "Paiements", valeur: payments?.length ?? 0 },
  ];

  return (
    <AppShell title="Analytics" subtitle="Vos chiffres, expliqués en français simple.">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="surface p-5">
          <p className="text-sm text-muted-foreground">Argent encaissé</p>
          <p className="mt-1 font-display text-3xl">{euros(encaisse)}</p>
        </div>
        <div className="surface p-5">
          <p className="text-sm text-muted-foreground">Devis émis</p>
          <p className="mt-1 font-display text-3xl">{euros(devis)}</p>
        </div>
        <div className="surface p-5">
          <p className="text-sm text-muted-foreground">Prospects devenus clients</p>
          <p className="mt-1 font-display text-3xl">{taux}%</p>
        </div>
      </div>

      <section className="surface mt-6 p-6">
        <h2 className="text-lg">Votre activité en un coup d'œil</h2>
        <div className="mt-6 h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chart}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
              <XAxis dataKey="name" stroke="var(--color-muted-foreground)" fontSize={12} />
              <YAxis allowDecimals={false} stroke="var(--color-muted-foreground)" fontSize={12} />
              <Tooltip />
              <Bar dataKey="valeur" fill="var(--color-chart-1)" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-4 text-sm text-muted-foreground">
          Conseil d'Ethan : si vous avez beaucoup de prospects mais peu de clients, envoyez plus de devis.
        </p>
      </section>
    </AppShell>
  );
}
