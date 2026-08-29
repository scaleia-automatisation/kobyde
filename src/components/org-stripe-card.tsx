import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { CreditCard, ExternalLink, RefreshCw } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  disconnectOrgStripeAccount,
  myOrgStripe,
  refreshOrgStripeAccountFn,
  startOrgStripeConnect,
} from "@/lib/stripe-connect.functions";

/** Connexion Stripe de l'entreprise (paiements de SES clients). Aucune clé à copier. */
export function OrgStripeCard() {
  const statusFn = useServerFn(myOrgStripe);
  const startFn = useServerFn(startOrgStripeConnect);
  const stopFn = useServerFn(disconnectOrgStripeAccount);
  const syncFn = useServerFn(refreshOrgStripeAccountFn);
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const q = useQuery({ queryKey: ["org-stripe"], queryFn: () => statusFn({ data: undefined }) });
  const data = q.data;
  const acc = data?.account;

  const connect = async () => {
    setBusy(true);
    try {
      const res = await startFn({ data: { origin: window.location.origin } });
      if (res.url) {
        window.location.href = res.url;
        return;
      }
      toast.error(res.error ?? "Connexion Stripe indisponible.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Connexion impossible.");
    } finally {
      setBusy(false);
    }
  };

  const disconnect = async () => {
    if (!window.confirm("Déconnecter votre compte Stripe ? Vos agents ne pourront plus encaisser vos clients.")) return;
    setBusy(true);
    try {
      await stopFn({ data: undefined });
      toast.success("Compte Stripe déconnecté.");
      void qc.invalidateQueries({ queryKey: ["org-stripe"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Déconnexion impossible.");
    } finally {
      setBusy(false);
    }
  };

  const sync = async () => {
    setBusy(true);
    try {
      await syncFn({ data: undefined });
      void qc.invalidateQueries({ queryKey: ["org-stripe"] });
      toast.success("Connexion Stripe actualisée.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Actualisation impossible.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="space-y-4 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <CreditCard className="size-4 text-muted-foreground" />
            <h3 className="font-medium">Stripe Connect</h3>
            {acc ? (
              <Badge className="bg-emerald-500/15 text-emerald-600">● Stripe connecté</Badge>
            ) : data?.available === false ? (
              <Badge variant="outline">Bientôt disponible</Badge>
            ) : (
              <Badge variant="secondary">Disponible</Badge>
            )}
          </div>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Connectez votre compte Stripe pour permettre aux agents de créer des demandes de paiement, suivre les
            paiements et gérer les échéances de vos propres clients. Vos clés secrètes restent chez Stripe : vous
            n'avez rien à copier.
          </p>
        </div>
      </div>

      {acc && showDetails && (
        <div className="rounded-lg border bg-muted/40 p-3 text-sm">
          <p>
            Compte : <span className="font-medium">{acc.businessName ?? acc.accountId}</span>
          </p>
          <p className="text-muted-foreground">
            {acc.country ?? "—"} · {acc.currency} · {acc.livemode ? "Mode réel" : "Mode test"} ·{" "}
            {acc.chargesEnabled ? "Encaissements actifs" : "Encaissements en attente de validation Stripe"} ·{" "}
            {acc.payoutsEnabled ? "Virements actifs" : "Virements en attente"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Connecté le {new Date(acc.connectedAt).toLocaleDateString("fr-FR")}
          </p>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {acc ? (
          <>
            <Button variant="outline" size="sm" onClick={() => setShowDetails((v) => !v)}>
              {showDetails ? "Masquer la connexion" : "Voir la connexion"}
            </Button>
            <Button variant="outline" size="sm" disabled={busy} onClick={() => void sync()}>
              <RefreshCw className="mr-1 size-4" /> Actualiser
            </Button>
            <Button variant="ghost" size="sm" disabled={busy} onClick={() => void disconnect()}>
              Déconnecter
            </Button>
          </>
        ) : (
          <Button size="sm" disabled={busy || data?.available === false} onClick={() => void connect()}>
            <ExternalLink className="mr-1 size-4" /> Connecter Stripe Connect
          </Button>
        )}
      </div>
    </Card>
  );
}
