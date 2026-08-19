import { createFileRoute } from "@tanstack/react-router";
import { Check, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { PAID_PLANS, useChangePlan, usePlan, type PlanKey } from "@/lib/plans";

const TITLE = "Formules et abonnements — Kobyde";
const DESC =
  "4 formules mensuelles Kobyde : Gratuit 0 €, Starter 49 €, Business 79 €, Pro 149 €. Crédits IA renouvelés chaque mois et crédits non utilisés reportés.";

export const Route = createFileRoute("/_authenticated/plans")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PlansPage,
});

function PlansPage() {
  const { plan, credits, creditsUsed, creditsTotal, renewsAt } = usePlan();
  const change = useChangePlan();

  const choose = (key: PlanKey) => {
    change.mutate(key, {
      onSuccess: () => toast.success(`Formule ${key} activée : crédits ajoutés à votre solde.`),
      onError: (e) => toast.error(e instanceof Error ? e.message : "Changement impossible"),
    });
  };

  return (
    <AppShell
      title="Formules"
      subtitle="Abonnement mensuel, renouvelé automatiquement. Les crédits non utilisés sont reportés au mois suivant."
    >
      <div className="space-y-8">
        <Card className="p-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Votre formule</p>
              <p className="font-display text-3xl font-bold">
                {plan.name} · {plan.price} € / mois
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {plan.credits} crédits ajoutés chaque mois
                {renewsAt && ` · prochain renouvellement le ${renewsAt.toLocaleDateString("fr-FR")}`}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Crédits restants</p>
              <p className="font-display text-4xl font-bold">{credits}</p>
              <p className="text-xs text-muted-foreground">
                {creditsUsed} crédits consommés sur {creditsTotal} reçus
              </p>
            </div>
          </div>
          <Progress className="mt-4" value={creditsTotal > 0 ? (credits / creditsTotal) * 100 : 0} />
        </Card>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {PAID_PLANS.map((p) => {
            const current = p.key === plan.key;
            return (
              <Card
                key={p.key}
                className={`plan-card flex flex-col p-8 ${p.highlight ? "ring-2 ring-primary" : ""}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <h2 className="font-display text-xl font-bold">{p.name}</h2>
                  {current ? (
                    <Badge>Formule actuelle</Badge>
                  ) : (
                    p.highlight && <Badge variant="secondary">Recommandé</Badge>
                  )}
                </div>
                <p className="mt-3 font-display text-3xl font-bold">
                  {p.price} €<span className="text-base font-normal text-muted-foreground"> / mois</span>
                </p>
                <p className="mt-1 flex items-center gap-1.5 text-sm font-medium text-primary">
                  <Sparkles className="size-4" /> {p.credits} crédits IA / mois
                </p>
                <p className="mt-2 text-sm text-muted-foreground">{p.tagline}</p>
                <ul className="mt-4 flex-1 space-y-1.5 text-sm">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <Check className="mt-0.5 size-4 shrink-0 text-accent" />
                      <span className="text-muted-foreground">{f}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  className="mt-6"
                  variant={current ? "outline" : p.highlight ? "default" : "secondary"}
                  disabled={current || change.isPending}
                  onClick={() => choose(p.key)}
                >
                  {current ? "Formule active" : `Choisir ${p.name}`}
                </Button>
              </Card>
            );
          })}
        </div>

        <p className="text-sm text-muted-foreground">
          Chaque mois, les crédits de votre formule s'ajoutent à votre solde : vos crédits non utilisés ne
          sont jamais perdus. Les crédits consommés restent visibles à tout moment sur cette page et dans
          l'historique des crédits.
        </p>
      </div>
    </AppShell>
  );
}
