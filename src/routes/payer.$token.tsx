import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { getPaymentRequest, startStripeCheckout } from "@/lib/portal.functions";
import { usePortalTracking } from "@/lib/use-portal-tracking";

/* eslint-disable @typescript-eslint/no-explicit-any */

const eur = (n: number) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(Number(n ?? 0));

export const Route = createFileRoute("/payer/$token")({
  head: () => ({
    meta: [
      { title: "Régler votre paiement — Kobyde" },
      { name: "description", content: "Page de paiement sécurisée : réglez votre acompte ou votre facture en ligne." },
      { property: "og:title", content: "Régler votre paiement — Kobyde" },
      { property: "og:description", content: "Paiement sécurisé, sans création de compte." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PayPage,
});

function PayPage() {
  const { token } = Route.useParams();
  const [redirecting, setRedirecting] = useState(false);
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["payment-request", token],
    queryFn: () => getPaymentRequest({ data: { token } }),
    retry: false,
  });

  useEffect(() => {
    if (typeof window !== "undefined" && window.location.search.includes("ok=1")) {
      void refetch();
    }
  }, [refetch]);

  const { track } = usePortalTracking(token, "payment");

  const pay = async () => {
    setRedirecting(true);
    track("payment_started", { entityType: "payment_request", entityId: (data as any)?.request?.id ?? null });
    try {
      const res = await startStripeCheckout({ data: { token, origin: window.location.origin } });
      if (res.alreadyPaid) {
        toast.success("Ce paiement a déjà été réglé");
        void refetch();
      } else if (res.url) {
        window.location.href = res.url;
        return;
      } else {
        toast.info("Le paiement en ligne n'est pas encore activé. Contactez l'entreprise pour régler.");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Paiement indisponible");
    }
    setRedirecting(false);
  };

  return (
    <main className="aurora-bg min-h-screen px-4 py-16">
      <div className="mx-auto max-w-lg rounded-3xl border border-border/60 bg-background/90 p-8 shadow-xl backdrop-blur">
        {isLoading ? (
          <p className="text-center text-muted-foreground">Chargement…</p>
        ) : error || !data ? (
          <div className="text-center">
            <h1 className="font-display text-2xl">Lien de paiement introuvable</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Ce lien est invalide ou a expiré. Demandez-en un nouveau à votre interlocuteur.
            </p>
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">{(data as any).org?.name}</p>
            <h1 className="font-display mt-1 text-3xl">{(data as any).request.label}</h1>
            <p className="font-display mt-6 text-5xl">{eur((data as any).request.amount_ttc)}</p>
            <p className="mt-1 text-sm text-muted-foreground">TTC, TVA incluse</p>

            {(data as any).request.message && (
              <p className="mt-6 rounded-2xl bg-muted/60 p-4 text-sm">{(data as any).request.message}</p>
            )}

            {(data as any).request.status === "payee" ? (
              <div className="mt-8 flex items-center gap-3 rounded-2xl bg-emerald-500/10 p-4 text-emerald-700 dark:text-emerald-400">
                <CheckCircle2 className="size-5" />
                <span className="text-sm font-medium">Paiement reçu. Merci !</span>
              </div>
            ) : (
              <Button className="mt-8 w-full" size="lg" disabled={redirecting} onClick={pay}>
                {redirecting ? "Redirection…" : `Payer ${eur((data as any).request.amount_ttc)}`}
              </Button>
            )}

            <p className="mt-6 flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="size-4" /> Paiement sécurisé — aucune donnée bancaire n'est stockée.
            </p>
          </>
        )}
      </div>
    </main>
  );
}
