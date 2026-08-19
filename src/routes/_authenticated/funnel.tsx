import { createFileRoute } from "@tanstack/react-router";
import { ArrowRight, TrendingDown } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { useRows } from "@/lib/db";
import { FUNNEL_STAGES } from "@/lib/marketing";

export const Route = createFileRoute("/_authenticated/funnel")({
  component: FunnelPage,
  head: () => ({
    meta: [
      { title: "Funnel — Kobyde" },
      {
        name: "description",
        content:
          "Visualisez votre funnel de Visiteur à Fidélisation et le taux de conversion réel entre chaque étape.",
      },
      { property: "og:title", content: "Funnel — Kobyde" },
      { property: "og:description", content: "Vos conversions étape par étape, sans jargon." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

/* eslint-disable @typescript-eslint/no-explicit-any */

function FunnelPage() {
  const prospects = useRows<any>("prospects", { limit: 1000 });
  const clients = useRows<any>("clients", { limit: 1000 });
  const quotes = useRows<any>("quotes", { limit: 1000 });
  const meetings = useRows<any>("meetings", { limit: 1000 });
  const payments = useRows<any>("payments", { limit: 1000 });
  const events = useRows<any>("analytics_events", { limit: 1000 });

  const p = prospects.data ?? [];
  const c = clients.data ?? [];
  const q = quotes.data ?? [];
  const m = meetings.data ?? [];
  const pay = (payments.data ?? []).filter((x: any) => x.status === "paye" || x.status === "paid");
  const ev = events.data ?? [];

  const paidByClient = new Map<string, number>();
  for (const x of pay) {
    if (!x.client_id) continue;
    paidByClient.set(x.client_id, (paidByClient.get(x.client_id) ?? 0) + 1);
  }

  const counts: Record<string, number> = {
    visiteur: ev.length + p.length + c.length,
    lead: p.filter((x: any) => x.email || x.phone).length,
    prospect: p.filter((x: any) => ["qualifie", "contacte", "interesse"].includes(x.status)).length,
    rendez_vous: m.length,
    devis: q.filter((x: any) => x.status !== "brouillon").length,
    client: c.length,
    paiement: pay.length,
    fidelisation: [...paidByClient.values()].filter((n) => n > 1).length,
  };

  const max = Math.max(1, ...Object.values(counts));
  const loading = prospects.isLoading || clients.isLoading || quotes.isLoading;

  return (
    <AppShell
      title="Funnel"
      subtitle="De la première visite au client fidèle : où passent vos opportunités."
    >
      <Card className="p-5 sm:p-7">
        <div className="space-y-4">
          {FUNNEL_STAGES.map((stage, i) => {
            const value = counts[stage.key] ?? 0;
            const prev = i > 0 ? (counts[FUNNEL_STAGES[i - 1]!.key] ?? 0) : null;
            const rate = prev && prev > 0 ? Math.round((value / prev) * 100) : null;
            return (
              <div key={stage.key}>
                {i > 0 && (
                  <div className="mb-3 flex items-center gap-2 pl-1 text-xs text-muted-foreground">
                    <ArrowRight className="h-3.5 w-3.5" />
                    <span>
                      Conversion{" "}
                      <strong className={rate !== null && rate < 30 ? "text-destructive" : "text-foreground"}>
                        {rate === null ? "—" : `${rate} %`}
                      </strong>{" "}
                      depuis « {FUNNEL_STAGES[i - 1]!.label} »
                    </span>
                    {rate !== null && rate < 30 && <TrendingDown className="h-3.5 w-3.5 text-destructive" />}
                  </div>
                )}
                <div className="rounded-2xl border bg-card/60 p-4">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold">
                        {i + 1}. {stage.label}
                      </p>
                      <p className="text-xs text-muted-foreground">{stage.hint}</p>
                    </div>
                    <p className="text-2xl font-black tabular-nums">{loading ? "…" : value}</p>
                  </div>
                  <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-fuchsia-500 via-violet-500 to-cyan-400 transition-all"
                      style={{ width: `${Math.max(3, Math.round((value / max) * 100))}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <p className="mt-4 text-xs text-muted-foreground">
        Chiffres calculés sur vos données réelles : prospects, rendez-vous, devis envoyés, clients et
        paiements encaissés. Aucun chiffre n'est inventé.
      </p>
    </AppShell>
  );
}
