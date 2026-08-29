import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { saasStripeOverview, testSaasStripe, toggleSaasStripe } from "@/lib/stripe-saas.functions";

/* eslint-disable @typescript-eslint/no-explicit-any */

const eur = (n: number) => `${Number(n ?? 0).toFixed(2)} €`;
const date = (d?: string | null) => (d ? new Date(d).toLocaleString("fr-FR") : "—");

/** Super Admin → Stripe SaaS (abonnements Kobyde uniquement). */
export function StripeSaasPanel({ onConfigure }: { onConfigure?: () => void }) {
  const overviewFn = useServerFn(saasStripeOverview);
  const testFn = useServerFn(testSaasStripe);
  const toggleFn = useServerFn(toggleSaasStripe);
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);

  const q = useQuery({ queryKey: ["saas-stripe"], queryFn: () => overviewFn({ data: undefined }) });
  const d = q.data;

  const test = async () => {
    setBusy(true);
    try {
      const res = await testFn({ data: undefined });
      if (res.ok) toast.success(res.message);
      else toast.error(res.message);
      void qc.invalidateQueries({ queryKey: ["saas-stripe"] });
    } finally {
      setBusy(false);
    }
  };

  const toggle = async (enabled: boolean) => {
    setBusy(true);
    try {
      await toggleFn({ data: { enabled } });
      toast.success(enabled ? "Stripe SaaS activé." : "Stripe SaaS désactivé.");
      void qc.invalidateQueries({ queryKey: ["saas-stripe"] });
    } finally {
      setBusy(false);
    }
  };

  if (q.isLoading || !d) return <Card className="p-6 text-sm text-muted-foreground">Chargement…</Card>;

  return (
    <div className="space-y-4">
      <Card className="space-y-4 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-medium">Stripe SaaS</h3>
              {d.configured ? (
                <Badge className="bg-emerald-500/15 text-emerald-600">Configuré</Badge>
              ) : (
                <Badge variant="outline">Non configuré</Badge>
              )}
              {!d.enabled && <Badge variant="secondary">Désactivé</Badge>}
            </div>
            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
              Compte Stripe de la plateforme : abonnements Free / Starter / Business / Pro, renouvellements,
              annulations, échecs de paiement et facturation du SaaS. Ce compte n'encaisse jamais les clients des
              entreprises utilisatrices — celles-ci branchent leur propre Stripe via Stripe Connect.
            </p>
          </div>
        </div>

        <div className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <p>Webhook abonnements : {d.hasWebhookSecret ? "✅" : "—"}</p>
          <p>Connect (entreprises) : {d.connectReady ? "✅" : "—"}</p>
          <p>Webhook Connect : {d.connectWebhookReady ? "✅" : "—"}</p>
          <p>Entreprises connectées : {d.connectedOrgs}</p>
        </div>
        <p className="text-xs text-muted-foreground">
          Dernier test : {date(d.lastTestAt)} {d.lastError ? `· ${d.lastError}` : ""}
        </p>

        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={onConfigure}>
            {d.configured ? "Modifier" : "Configurer"}
          </Button>
          <Button size="sm" variant="outline" disabled={busy} onClick={() => void test()}>
            Tester Stripe
          </Button>
          <Button size="sm" variant="ghost" disabled={busy} onClick={() => void toggle(!d.enabled)}>
            {d.enabled ? "Désactiver" : "Activer"}
          </Button>
        </div>
      </Card>

      <Tabs defaultValue="abonnements" className="space-y-3">
        <TabsList>
          <TabsTrigger value="abonnements">Abonnements</TabsTrigger>
          <TabsTrigger value="paiements">Paiements</TabsTrigger>
          <TabsTrigger value="logs">Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="abonnements">
          <Card className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="p-3">Formule</th>
                  <th className="p-3">Statut</th>
                  <th className="p-3">Fin de période</th>
                  <th className="p-3">Créé le</th>
                </tr>
              </thead>
              <tbody>
                {d.subscriptions.map((s: any) => (
                  <tr key={s.id} className="border-t">
                    <td className="p-3">{s.price_id ?? "—"}</td>
                    <td className="p-3">{s.status}</td>
                    <td className="p-3">{date(s.current_period_end)}</td>
                    <td className="p-3">{date(s.created_at)}</td>
                  </tr>
                ))}
                {d.subscriptions.length === 0 && (
                  <tr>
                    <td className="p-4 text-muted-foreground" colSpan={4}>
                      Aucun abonnement pour le moment.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </Card>
        </TabsContent>

        <TabsContent value="paiements">
          <Card className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="p-3">Montant</th>
                  <th className="p-3">Statut</th>
                  <th className="p-3">Méthode</th>
                  <th className="p-3">Date</th>
                </tr>
              </thead>
              <tbody>
                {d.payments.map((p: any) => (
                  <tr key={p.id} className="border-t">
                    <td className="p-3">{eur(p.amount)}</td>
                    <td className="p-3">{p.status}</td>
                    <td className="p-3">{p.method ?? "—"}</td>
                    <td className="p-3">{date(p.paid_at ?? p.created_at)}</td>
                  </tr>
                ))}
                {d.payments.length === 0 && (
                  <tr>
                    <td className="p-4 text-muted-foreground" colSpan={4}>
                      Aucun paiement enregistré.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </Card>
        </TabsContent>

        <TabsContent value="logs">
          <Card className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="p-3">Évènement</th>
                  <th className="p-3">Entité</th>
                  <th className="p-3">Date</th>
                </tr>
              </thead>
              <tbody>
                {d.logs.map((l: any) => (
                  <tr key={l.id} className="border-t">
                    <td className="p-3">{l.action}</td>
                    <td className="p-3">{l.entity ?? "—"}</td>
                    <td className="p-3">{date(l.created_at)}</td>
                  </tr>
                ))}
                {d.logs.length === 0 && (
                  <tr>
                    <td className="p-4 text-muted-foreground" colSpan={3}>
                      Aucun évènement Stripe.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
