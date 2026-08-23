import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { StripeEmbeddedCheckout } from "@/components/StripeEmbeddedCheckout";

const TITLE = "Paiement sécurisé — Kobyde";
const DESC =
  "Finalisez votre abonnement ou votre achat de crédits IA Kobyde sur une page de paiement Stripe sécurisée, avec enregistrement de carte pour vos prochains paiements.";

type PaymentSearch = {
  priceId: string;
  retour: string;
  titre?: string;
};

export const Route = createFileRoute("/_authenticated/paiement")({
  validateSearch: (search: Record<string, unknown>): PaymentSearch => {
    const priceId =
      typeof search['priceId'] === "string" && /^[a-zA-Z0-9_-]+$/.test(search['priceId'])
        ? search['priceId']
        : "";
    const retour =
      typeof search['retour'] === "string" && search['retour'].startsWith("/")
        ? search['retour']
        : "/plans";
    return {
      priceId,
      retour,
      ...(typeof search['titre'] === "string" ? { titre: search['titre'] } : {}),
    };
  },
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
  component: PaymentPage,
});

function PaymentPage() {
  const { priceId, retour, titre } = Route.useSearch();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-muted/30">
      <PaymentTestModeBanner />
      <div className="mx-auto w-full max-w-3xl px-4 py-8">
        <Button
          variant="ghost"
          className="mb-4 -ml-2"
          onClick={() => navigate({ to: "/plans" })}
        >
          <ArrowLeft className="size-4" /> Retour aux formules
        </Button>

        <h1 className="font-display text-3xl font-bold">Paiement sécurisé</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {titre ? `${titre} · ` : ""}Vos coordonnées bancaires sont traitées par Stripe. Vous
          pourrez enregistrer votre carte pour payer en un clic la prochaine fois.
        </p>

        <Card className="mt-6 overflow-hidden p-4 sm:p-6">
          {priceId ? (
            <StripeEmbeddedCheckout
              priceId={priceId}
              returnUrl={`${typeof window !== "undefined" ? window.location.origin : ""}${retour}`}
            />
          ) : (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Aucun produit sélectionné. Retournez à la page Formules pour choisir une offre.
            </p>
          )}
        </Card>

        <p className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="size-4 text-accent" /> Paiement chiffré et sécurisé par Stripe
        </p>
      </div>
    </div>
  );
}
