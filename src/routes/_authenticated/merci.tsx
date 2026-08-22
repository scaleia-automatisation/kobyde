import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, CheckCircle2, LayoutDashboard, Sparkles } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PAID_PLANS, usePlan, type PlanKey } from "@/lib/plans";

const TITLE = "Merci pour votre achat — Kobyde";
const DESC =
  "Confirmation de paiement Kobyde : votre nouvelle formule ou vos crédits IA sont activés. Retournez au tableau de bord pour piloter votre équipe d'agents.";

type Search = { type: "plan" | "credits"; plan?: PlanKey; credits?: number };

export const Route = createFileRoute("/_authenticated/merci")({
  validateSearch: (search: Record<string, unknown>): Search => ({
    type: search['type'] === "credits" ? "credits" : "plan",
    plan: typeof search['plan'] === "string" ? (search['plan'] as PlanKey) : undefined,
    credits: search['credits'] ? Number(search['credits']) : undefined,
  }),
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
  component: MerciPage,
});

function MerciPage() {
  const search = Route.useSearch();
  const { plan: activePlan, credits } = usePlan();
  const isCredits = search.type === "credits";
  const boughtPlan = PAID_PLANS.find((p) => p.key === search.plan) ?? activePlan;

  return (
    <AppShell
      title={isCredits ? "Crédits ajoutés" : "Bienvenue dans votre nouvelle formule"}
      subtitle="Paiement confirmé"
    >
      <div className="mx-auto max-w-2xl">
        <Card className="p-8 text-center">
          <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-accent/10">
            <CheckCircle2 className="size-9 text-accent" />
          </div>

          <h1 className="mt-6 font-display text-3xl font-bold tracking-tight">
            {isCredits ? "Merci, vos crédits sont disponibles" : `Merci, bienvenue en formule ${boughtPlan.name}`}
          </h1>

          <p className="mt-3 text-muted-foreground">
            {isCredits
              ? `Votre paiement est confirmé. ${search.credits ? `${search.credits} crédits IA ont été ajoutés` : "Vos crédits IA ont été ajoutés"} à votre solde et n'expirent jamais.`
              : `Votre abonnement est actif. Votre équipe d'agents IA dispose désormais des crédits et fonctionnalités de la formule ${boughtPlan.name}, renouvelés chaque mois.`}
          </p>

          <div className="mt-6 flex items-center justify-center gap-2 rounded-xl border bg-muted/40 px-4 py-3">
            <Sparkles className="size-5 text-primary" />
            <span className="font-semibold">{credits} crédits disponibles</span>
          </div>

          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Button asChild variant="cta" size="lg">
              <Link to="/tableau-de-bord">
                <LayoutDashboard className="size-4" /> Retour au tableau de bord
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link to="/plans">
                Voir ma formule <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>

          <p className="mt-6 text-xs text-muted-foreground">
            Un reçu vous a été envoyé par e-mail. La mise à jour du solde peut prendre quelques secondes.
          </p>
        </Card>
      </div>
    </AppShell>
  );
}
