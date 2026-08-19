import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useCreditHistory, useCredits } from "@/lib/credits";
import { CREDIT_ACTIONS, creditAction, creditLabel } from "@/lib/credit-catalog";

export const Route = createFileRoute("/_authenticated/credits")({
  component: CreditsPage,
  head: () => ({
    meta: [
      { title: "Crédits IA et historique — Kobyde" },
      {
        name: "description",
        content:
          "Suivez votre solde de crédits IA, le coût de chaque action et l'historique complet des transactions de vos agents Kobyde.",
      },
      { property: "og:title", content: "Crédits IA et historique — Kobyde" },
      {
        property: "og:description",
        content: "Solde, coûts par action et historique détaillé des crédits IA de votre entreprise.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

const STATUS: Record<string, { label: string; variant: "default" | "secondary" | "destructive" }> = {
  reserved: { label: "En cours", variant: "secondary" },
  completed: { label: "Réussi", variant: "default" },
  refunded: { label: "Remboursé", variant: "destructive" },
  failed: { label: "Échec", variant: "destructive" },
};

const dt = (s: string) =>
  new Date(s).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });

function CreditsPage() {
  const { balance, total } = useCredits();
  const { data: history } = useCreditHistory(200);

  const groups = Array.from(new Set(CREDIT_ACTIONS.map((a) => a.group)));

  return (
    <AppShell title="Crédits IA" subtitle="Vous ne payez que les actions réellement traitées par l'IA">
      <div className="space-y-8">
        <Card className="p-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Solde actuel</p>
              <p className="font-display text-4xl font-bold">{balance}</p>
            </div>
            <p className="text-sm text-muted-foreground">sur {total} crédits</p>
          </div>
          <Progress className="mt-4" value={total > 0 ? (balance / total) * 100 : 0} />
          <p className="mt-3 text-sm text-muted-foreground">
            Navigation, création et modification de fiches : 0 crédit. Les crédits sont débités uniquement
            après la réussite réelle d'une action IA, et remboursés automatiquement en cas d'échec.
          </p>
        </Card>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Historique des transactions</h2>
          <Card className="divide-y divide-border">
            {(history ?? []).length === 0 && (
              <p className="p-6 text-sm text-muted-foreground">Aucune transaction pour le moment.</p>
            )}
            {(history ?? []).map((t) => {
              const st = STATUS[t.status] ?? { label: t.status, variant: "secondary" as const };
              return (
                <div key={t.id} className="flex flex-wrap items-center gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {t.action_label ?? creditAction(t.action_key ?? "").label}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {dt(t.created_at)} · solde {t.balance_before ?? "—"} → {t.balance_after ?? "—"}
                    </p>
                  </div>
                  <Badge variant={st.variant}>{st.label}</Badge>
                  <span
                    className={`w-20 text-right text-sm font-semibold ${
                      t.amount < 0 ? "text-destructive" : "text-emerald-600"
                    }`}
                  >
                    {t.amount > 0 ? "+" : ""}
                    {t.amount}
                  </span>
                </div>
              );
            })}
          </Card>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Grille tarifaire des actions</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {groups.map((g) => (
              <Card key={g} className="p-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {g}
                </p>
                <ul className="space-y-1.5">
                  {CREDIT_ACTIONS.filter((a) => a.group === g).map((a) => (
                    <li key={a.key} className="flex items-center justify-between gap-3 text-sm">
                      <span className="min-w-0 truncate text-muted-foreground">{a.label}</span>
                      <span className="shrink-0 font-medium">
                        {a.cost === 0 ? "Gratuit" : creditLabel(a.cost)}
                      </span>
                    </li>
                  ))}
                </ul>
              </Card>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
