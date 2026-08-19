import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, Copy, CreditCard, Plus, Receipt } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PaymentRequestDialog } from "@/components/payment-request-dialog";
import { useRows, eur2, frDate } from "@/lib/db";
import { markPaymentReceived } from "@/lib/payments.functions";

/* eslint-disable @typescript-eslint/no-explicit-any */

export const Route = createFileRoute("/_authenticated/paiements")({
  head: () => ({
    meta: [
      { title: "Paiements — Kobyde" },
      {
        name: "description",
        content: "Demandes de paiement, encaissements et factures générées automatiquement.",
      },
      { property: "og:title", content: "Paiements — Kobyde" },
      { property: "og:description", content: "Suivez vos encaissements et vos factures." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PaiementsPage,
});

function PaiementsPage() {
  const { data: requests, refetch } = useRows<any>("payment_requests");
  const { data: invoices, refetch: refetchInvoices } = useRows<any>("invoices");
  const { data: clients } = useRows<any>("clients");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const clientName = (id: string | null) => {
    const c = (clients ?? []).find((x: any) => x.id === id);
    return c ? c.company_name || c.full_name : "—";
  };

  const confirm = async (id: string, method: string) => {
    setBusy(id);
    try {
      await markPaymentReceived({ data: { requestId: id, method: method || "virement" } });
      toast.success("Paiement encaissé — facture générée");
      await Promise.all([refetch(), refetchInvoices()]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    }
    setBusy(null);
  };

  const paid = (requests ?? []).filter((r: any) => r.status === "payee");
  const total = paid.reduce((s: number, r: any) => s + Number(r.amount_ttc ?? 0), 0);
  const pending = (requests ?? []).filter((r: any) => r.status !== "payee");
  const pendingTotal = pending.reduce((s: number, r: any) => s + Number(r.amount_ttc ?? 0), 0);

  return (
    <AppShell
      title="Paiements"
      subtitle="Chaque paiement encaissé génère automatiquement sa facture."
      action={
        <Button className="gap-2" onClick={() => setOpen(true)}>
          <Plus className="size-4" /> <span className="hidden sm:inline">Demander un paiement</span>
        </Button>
      }
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Encaissé" value={eur2(total)} />
        <Stat label="En attente" value={eur2(pendingTotal)} />
        <Stat label="Factures" value={String((invoices ?? []).length)} />
      </div>

      <section className="mt-6 space-y-3">
        <h2 className="font-display text-lg">Demandes de paiement</h2>
        {(requests ?? []).length === 0 ? (
          <div className="surface p-10 text-center">
            <CreditCard className="mx-auto size-8 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">
              Créez un lien de paiement : votre client règle en ligne, sans compte à créer.
            </p>
          </div>
        ) : (
          (requests ?? []).map((r: any) => (
            <article
              key={r.id}
              className="surface flex flex-wrap items-center justify-between gap-4 p-4"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-display text-lg">{r.label}</h3>
                  <Badge variant={r.status === "payee" ? "default" : "outline"}>
                    {r.status === "payee" ? "Payée" : "En attente"}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {clientName(r.client_id)} · échéance {frDate(r.due_date)} · {r.method}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-display text-xl">{eur2(r.amount_ttc)}</span>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-2"
                  onClick={() => {
                    void navigator.clipboard.writeText(`${window.location.origin}/payer/${r.token}`);
                    toast.success("Lien copié");
                  }}
                >
                  <Copy className="size-4" /> Lien
                </Button>
                {r.status !== "payee" && (
                  <Button
                    size="sm"
                    className="gap-2"
                    disabled={busy === r.id}
                    onClick={() => confirm(r.id, r.method)}
                  >
                    <CheckCircle2 className="size-4" />
                    {busy === r.id ? "…" : "Marquer payé"}
                  </Button>
                )}
              </div>
            </article>
          ))
        )}
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="font-display flex items-center gap-2 text-lg">
          <Receipt className="size-4" /> Factures
        </h2>
        {(invoices ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Les factures sont créées automatiquement dès qu'un paiement est encaissé.
          </p>
        ) : (
          <div className="grid gap-2">
            {(invoices ?? []).map((f: any) => (
              <div
                key={f.id}
                className="surface flex flex-wrap items-center justify-between gap-3 p-3 text-sm"
              >
                <span className="font-mono text-xs text-muted-foreground">{f.number}</span>
                <span className="min-w-0 flex-1 truncate">{f.label ?? "Facture"}</span>
                <span>{clientName(f.client_id)}</span>
                <Badge variant={f.status === "payee" ? "default" : "outline"}>
                  {f.status === "payee" ? "Payée" : f.status}
                </Badge>
                <span className="font-medium">{eur2(f.amount_ttc)}</span>
                <span className="text-muted-foreground">{frDate(f.paid_at ?? f.created_at)}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <PaymentRequestDialog open={open} onOpenChange={setOpen} />
    </AppShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="surface p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="font-display mt-1 text-2xl">{value}</p>
    </div>
  );
}
