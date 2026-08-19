import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Copy, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useOrgId, useRows, eur2 } from "@/lib/db";
import { PAYMENT_METHODS, addDays, isoDate, round2, ttcFrom } from "@/lib/sales";

/* eslint-disable @typescript-eslint/no-explicit-any */

export function makeToken() {
  return (crypto.randomUUID() + crypto.randomUUID()).replace(/-/g, "");
}

export function PaymentRequestDialog({
  open,
  onOpenChange,
  product,
  clientId: fixedClient,
  quoteId,
  defaultLabel,
  defaultAmount = 0,
  defaultVat = 20,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: any;
  clientId?: string;
  quoteId?: string;
  defaultLabel?: string;
  defaultAmount?: number;
  defaultVat?: number;
}) {
  const orgId = useOrgId();
  const { data: clients } = useRows<any>("clients");
  const [amountHt, setAmountHt] = useState(defaultAmount);
  const [vat, setVat] = useState(defaultVat);
  const [discount, setDiscount] = useState(0);
  const [link, setLink] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setAmountHt(defaultAmount);
      setVat(defaultVat);
      setDiscount(0);
      setLink(null);
    }
  }, [open, defaultAmount, defaultVat]);

  const ttc = ttcFrom(amountHt, vat, discount);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!orgId) return;
    const fd = new FormData(e.currentTarget);
    const clientId = fixedClient ?? String(fd.get("client_id") ?? "");
    if (!clientId) return toast.error("Choisissez un client");
    setSaving(true);
    const token = makeToken();
    const { error } = await supabase.from("payment_requests").insert({
      org_id: orgId,
      client_id: clientId,
      quote_id: quoteId ?? null,
      product_id: product?.id ?? null,
      label: String(fd.get("label") ?? "").trim() || defaultLabel || product?.name || "Paiement",
      amount_ht: round2(amountHt),
      vat_rate: vat,
      discount_amount: round2(discount),
      amount_ttc: ttc,
      due_date: String(fd.get("due_date") ?? isoDate(addDays(15))),
      method: String(fd.get("method") ?? "stripe"),
      message: String(fd.get("message") ?? "").trim() || null,
      status: "en_attente",
      token,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    setLink(`${window.location.origin}/payer/${token}`);
    toast.success("Demande de paiement créée");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Demande de paiement</DialogTitle>
          <DialogDescription>
            Un lien sécurisé que votre client peut régler en ligne, sans créer de compte.
          </DialogDescription>
        </DialogHeader>

        {link ? (
          <div className="space-y-4">
            <div className="surface p-4">
              <p className="text-sm text-muted-foreground">Lien de paiement</p>
              <p className="mt-1 break-all font-medium">{link}</p>
            </div>
            <div className="flex gap-2">
              <Button
                className="gap-2"
                onClick={() => {
                  void navigator.clipboard.writeText(link);
                  toast.success("Lien copié");
                }}
              >
                <Copy className="size-4" /> Copier le lien
              </Button>
              <Button variant="secondary" className="gap-2" asChild>
                <a href={link} target="_blank" rel="noreferrer">
                  <Link2 className="size-4" /> Ouvrir
                </a>
              </Button>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => onOpenChange(false)}>
                Fermer
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            {!fixedClient && (
              <div className="space-y-1.5">
                <Label htmlFor="pr_client">Client</Label>
                <select
                  id="pr_client"
                  name="client_id"
                  className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"
                >
                  <option value="">— Choisir —</option>
                  {(clients ?? []).map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.company_name || c.full_name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="pr_label">Intitulé</Label>
              <Input
                id="pr_label"
                name="label"
                defaultValue={defaultLabel ?? product?.name ?? ""}
                placeholder="Acompte 30 %"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="pr_ht">Montant HT (€)</Label>
                <Input
                  id="pr_ht"
                  type="number"
                  step="0.01"
                  value={amountHt}
                  onChange={(e) => setAmountHt(Number(e.target.value))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pr_vat">TVA (%)</Label>
                <Input
                  id="pr_vat"
                  type="number"
                  step="0.1"
                  value={vat}
                  onChange={(e) => setVat(Number(e.target.value))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pr_remise">Remise (€)</Label>
                <Input
                  id="pr_remise"
                  type="number"
                  step="0.01"
                  value={discount}
                  onChange={(e) => setDiscount(Number(e.target.value))}
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="pr_due">Échéance</Label>
                <Input id="pr_due" name="due_date" type="date" defaultValue={isoDate(addDays(15))} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pr_method">Moyen de paiement</Label>
                <select
                  id="pr_method"
                  name="method"
                  className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"
                >
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pr_message">Message au client</Label>
              <Textarea id="pr_message" name="message" rows={2} />
            </div>
            <p className="rounded-xl bg-muted/60 p-3 text-sm">
              Total à payer : <strong>{eur2(ttc)}</strong>
            </p>
            <DialogFooter>
              <Button type="submit" disabled={saving}>
                {saving ? "Création…" : "Créer le lien de paiement"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
