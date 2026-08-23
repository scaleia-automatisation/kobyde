import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Check, Sparkles } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { useNavigate } from "@tanstack/react-router";

const fmt = (n: number) => n.toLocaleString("fr-FR");
import {
  CREDIT_PACKS,
  PAID_PLANS,
  usePlan,
  planTiers,
  type Plan,
  type PlanKey,
  type CreditPack,
} from "@/lib/plans";

const TITLE = "Formules et abonnements — Kobyde";
const DESC =
  "4 formules mensuelles Kobyde : Gratuit 0 €, Starter 49 €, Business 79 €, Pro 149 €. Crédits IA renouvelés chaque mois et crédits non utilisés reportés.";

const PLAN_PRICE_ID: Record<PlanKey, string> = {
  gratuit: "",
  starter: "starter_monthly",
  business: "business_monthly",
  pro: "pro_monthly",
};

const CREDIT_PRICE_ID: Record<number, string> = {
  50: "credits_50",
  100: "credits_100",
  150: "credits_150",
  200: "credits_200",
};

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
  const navigate = useNavigate();
  const [busyPriceId, setBusyPriceId] = useState<string | null>(null);

  const startCheckout = (priceId: string, returnPath: string, titre: string) => {
    setBusyPriceId(priceId);
    void navigate({
      to: "/paiement",
      search: { priceId, retour: returnPath, titre },
    });
  };

  const choosePlan = (key: PlanKey) => {
    const priceId = PLAN_PRICE_ID[key];
    if (!priceId) return;
    startCheckout(priceId, `/merci?type=plan&plan=${key}`, `Formule ${key}`);
  };

  const buyPack = (pack: CreditPack) => {
    const priceId = CREDIT_PRICE_ID[pack.credits];
    if (!priceId) return;
    startCheckout(priceId, `/merci?type=credits&credits=${pack.credits}`, `${pack.credits} crédits IA`);
  };

  return (
    <AppShell
      title="Formules"
      subtitle="Abonnement mensuel, renouvelé automatiquement. Les crédits non utilisés sont reportés au mois suivant."
    >
      <PaymentTestModeBanner />
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
              busyPriceId={busyPriceId}
              onChoose={() => choosePlan(p.key)}
            />
          ))}
        </div>

        <section id="packs" className="scroll-mt-24 space-y-4">
          <div>
            <h2 className="font-display text-2xl font-bold">Plus de crédits ? Achetez à la carte</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {credits === 0
                ? "Votre solde est épuisé : achetez un pack de crédits immédiatement utilisable, ou passez à une formule supérieure pour recevoir des crédits chaque mois."
                : "Réservé aux comptes déjà inscrits : ajoutez des crédits ponctuellement, sans changer de formule. Ils s'ajoutent à votre solde et n'expirent pas."}
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
                  disabled={busyPriceId === CREDIT_PRICE_ID[pack.credits]}
                  onClick={() => buyPack(pack)}
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

function PlanCard({
  plan,
  current,
  busyPriceId,
  onChoose,
}: {
  plan: Plan;
  current: boolean;
  busyPriceId: string | null;
  onChoose: () => void;
}) {
  const tiers = planTiers(plan);
  const [tierCredits, setTierCredits] = useState(String(plan.credits));
  const tier = tiers.find((t) => String(t.credits) === tierCredits) ?? tiers[0]!;
  const extra = tier.credits - plan.credits;
  const priceId = PLAN_PRICE_ID[plan.key];

  return (
    <Card className={`flex flex-col p-6 ${plan.highlight ? "ring-2 ring-primary" : ""}`}>
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-display text-xl font-bold">{plan.name}</h2>
        {current ? (
          <Badge>Formule actuelle</Badge>
        ) : (
          plan.highlight && <Badge variant="secondary">Recommandé</Badge>
        )}
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{plan.tagline}</p>

      <p className="mt-5 font-display text-5xl font-bold tracking-tight">{tier.price} €</p>
      <p className="mt-1 text-sm text-muted-foreground">par mois, TVA incl.</p>

      <Select value={tierCredits} onValueChange={setTierCredits}>
        <SelectTrigger className="mt-4 h-11">
          <span>{fmt(tier.credits)} crédits mensuels</span>
        </SelectTrigger>
        <SelectContent>
          {tiers.map((t) => (
            <SelectItem key={t.credits} value={String(t.credits)}>
              <span className="flex w-full items-center justify-between gap-3">
                <span className="flex items-center gap-2">
                  {fmt(t.credits)} crédits mensuels
                  {current && t.credits === plan.credits && (
                    <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
                      Actuel
                    </Badge>
                  )}
                  {t.saving > 0 && (
                    <Badge variant="outline" className="px-1.5 py-0 text-[10px] text-accent">
                      Économisez {t.saving} %
                    </Badge>
                  )}
                </span>
                <span className="text-muted-foreground">{t.price} € /mois</span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button
        className="mt-4"
        variant={current && extra === 0 ? "outline" : "cta"}
        disabled={busyPriceId === priceId || (current && extra === 0)}
        onClick={onChoose}
      >
        {current && extra === 0 ? "Formule active" : current ? "Mettre à niveau" : `Choisir ${plan.name}`}
      </Button>

      <p className="mt-5 flex items-center gap-1.5 text-sm font-semibold text-primary">
        <Sparkles className="size-4" /> {fmt(tier.credits)} crédits IA / mois
      </p>
      <ul className="mt-3 flex-1 space-y-1.5 text-sm">
        {plan.features.map((f) => (
          <li key={f} className="flex items-start gap-2">
            <Check className="mt-0.5 size-4 shrink-0 text-accent" />
            <span className="text-muted-foreground">{f}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
