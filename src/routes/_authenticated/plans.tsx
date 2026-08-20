import { createFileRoute } from "@tanstack/react-router";
import { Check, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  CREDIT_PACKS,
  PAID_PLANS,
  useChangePlan,
  usePlan,
  usePurchaseCredits,
  type PlanKey,
} from "@/lib/plans";

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
  const buy = usePurchaseCredits();

  const buyPack = (creditsCount: number) => {
    buy.mutate(creditsCount, {
      onSuccess: () => toast.success(`${creditsCount} crédits ajoutés à votre solde.`),
      onError: (e) => toast.error(e instanceof Error ? e.message : "Achat impossible"),
    });
  };

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

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {PAID_PLANS.map((p) => (
            <PlanCard
              key={p.key}
              plan={p}
              current={p.key === plan.key}
              pending={change.isPending || buy.isPending}
              onChoose={choose}
              onExtra={buyPack}
            />
          ))}
        </div>

        <section id="packs" className="scroll-mt-24 space-y-4">
          <div>
            <h2 className="font-display text-2xl font-bold">Plus de crédits ? Achetez à la carte</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {credits === 0
                ? "Votre solde est épuisé : achetez un pack de crédits immédiatement utilisable, ou passez à une formule supérieure pour recevoir des crédits chaque mois."
                : "Réservé aux comptes déjà inscrits : ajoutez des crédits ponctuellement, sans changer de formule. Ils s'ajoutent à votre solde et ne expirent pas."}
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {CREDIT_PACKS.map((pack) => (
              <Card key={pack.credits} className="flex flex-col p-5">
                <p className="flex items-center gap-1.5 font-display text-2xl font-bold">
                  <Sparkles className="size-5 text-primary" /> {pack.credits} crédits
                </p>
                <p className="mt-1 text-3xl font-bold">{pack.price} €</p>
                <p className="mt-1 flex-1 text-sm text-muted-foreground">
                  Paiement unique · {(pack.price / pack.credits).toFixed(2).replace(".", ",")} € le crédit
                </p>
                <Button
                  className="mt-4"
                  variant="secondary"
                  disabled={buy.isPending}
                  onClick={() => buyPack(pack.credits)}
                >
                  Acheter {pack.credits} crédits
                </Button>
              </Card>
            ))}
          </div>
        </section>

        <p className="text-sm text-muted-foreground">
          Chaque mois, les crédits de votre formule s'ajoutent à votre solde : vos crédits non utilisés ne
          sont jamais perdus. Les crédits consommés restent visibles à tout moment sur cette page et dans
          l'historique des crédits.
        </p>
      </div>
    </AppShell>
  );
}
