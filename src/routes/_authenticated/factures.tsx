import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Loader2, Plus, Receipt, Sparkles, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { InvoiceActions } from "@/components/invoice-actions";
import { CreditActionButton, CreditCost } from "@/components/credit-action";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useCreateRow,
  useDeleteRow,
  useProfile,
  useRows,
  useUpdateRow,
  eur2,
  frDate,
} from "@/lib/db";
import {
  buildInvoiceText,
  emptyItem,
  nextInvoiceNumber,
  totals,
  type InvoiceDraft,
  type InvoiceItem,
} from "@/lib/invoices";
import { generateInvoiceDocument } from "@/lib/invoices.functions";

/* eslint-disable @typescript-eslint/no-explicit-any */

export const Route = createFileRoute("/_authenticated/factures")({
  head: () => ({
    meta: [
      { title: "Factures — Audrey, votre agent Gestion | Kobyde" },
      {
        name: "description",
        content:
          "Générez vos factures en PDF, Word ou JPEG avec Audrey : modification, régénération, téléchargement, envoi par email et copie en pièce jointe.",
      },
      { property: "og:title", content: "Factures — Audrey, votre agent Gestion | Kobyde" },
      {
        property: "og:description",
        content: "Facturation automatisée : PDF, Word, JPEG, email et pièce jointe.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: FacturesPage,
});

function FacturesPage() {
  const { data: profile } = useProfile();
  const org = (profile as any)?.organizations ?? null;
  const orgId = (profile as any)?.current_org_id as string | undefined;

  const { data: invoices } = useRows<any>("invoices");
  const { data: clients } = useRows<any>("clients");
  const createInvoice = useCreateRow("invoices");
  const updateInvoice = useUpdateRow("invoices");
  const deleteInvoice = useDeleteRow("invoices");

  const [openId, setOpenId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState<InvoiceDraft | null>(null);
  const [text, setText] = useState("");
  const [instruction, setInstruction] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [saving, setSaving] = useState(false);

  const clientOf = (id: string | null) => (clients ?? []).find((c: any) => c.id === id) ?? null;
  const clientName = (id: string | null) => {
    const c = clientOf(id);
    return c ? c.company_name || c.full_name : "Client non renseigné";
  };

  const t = useMemo(
    () => (draft ? totals(draft.items, draft.vat_rate) : { ht: 0, tva: 0, ttc: 0 }),
    [draft],
  );

  const startNew = () => {
    const d: InvoiceDraft = {
      number: nextInvoiceNumber(invoices ?? []),
      label: "",
      client_id: null,
      due_date: new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10),
      vat_rate: Number(org?.vat_rate ?? 20),
      items: [emptyItem()],
      notes: "Paiement à 30 jours. Pénalités de retard : 3 fois le taux d'intérêt légal. Indemnité forfaitaire pour frais de recouvrement : 40 €.",
    };
    setDraft(d);
    setOpenId(null);
    setCreating(true);
    setText(buildInvoiceText({ draft: d, org, client: null }));
    setInstruction("");
  };

  const openExisting = (inv: any) => {
    const d: InvoiceDraft = {
      number: inv.number,
      label: inv.label ?? "",
      client_id: inv.client_id ?? null,
      due_date: inv.due_date ? String(inv.due_date).slice(0, 10) : null,
      vat_rate: Number(inv.vat_rate ?? org?.vat_rate ?? 20),
      items: Array.isArray(inv.items) && inv.items.length ? (inv.items as InvoiceItem[]) : [emptyItem()],
      notes: inv.notes ?? "",
    };
    setDraft(d);
    setCreating(false);
    setOpenId(inv.id);
    setText(inv.content || buildInvoiceText({ draft: d, org, client: clientOf(d.client_id) }));
    setInstruction("");
  };

  const closeEditor = () => {
    setDraft(null);
    setOpenId(null);
    setCreating(false);
    setText("");
  };

  const rebuild = (d: InvoiceDraft) => {
    setText(buildInvoiceText({ draft: d, org, client: clientOf(d.client_id) }));
    toast.success("Facture régénérée à partir des données modifiées.");
  };

  const patch = (values: Partial<InvoiceDraft>) =>
    setDraft((prev) => (prev ? { ...prev, ...values } : prev));

  const setItem = (index: number, values: Partial<InvoiceItem>) =>
    setDraft((prev) =>
      prev
        ? { ...prev, items: prev.items.map((it, i) => (i === index ? { ...it, ...values } : it)) }
        : prev,
    );

  const aiWrite = async () => {
    if (!draft || !orgId) return;
    setAiBusy(true);
    try {
      const base = buildInvoiceText({ draft, org, client: clientOf(draft.client_id) });
      const res = await generateInvoiceDocument({
        data: { orgId, baseText: base, ...(instruction.trim() ? { instruction } : {}) },
      });
      setText(res.text);
      toast.success("Facture rédigée par Audrey.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Génération impossible.");
    }
    setAiBusy(false);
  };

  const save = async () => {
    if (!draft) return;
    if (!draft.label.trim()) {
      toast.error("Indiquez l'objet de la facture.");
      return;
    }
    setSaving(true);
    const values = {
      number: draft.number,
      label: draft.label,
      client_id: draft.client_id,
      due_date: draft.due_date,
      vat_rate: draft.vat_rate,
      items: draft.items,
      notes: draft.notes,
      content: text,
      amount_ht: t.ht,
      amount_ttc: t.ttc,
    };
    try {
      if (openId) {
        await updateInvoice.mutateAsync({ id: openId, values });
        toast.success("Facture mise à jour.");
      } else {
        const row = await createInvoice.mutateAsync({ ...values, status: "brouillon" });
        setOpenId((row as any).id);
        setCreating(false);
        toast.success("Facture enregistrée.");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Enregistrement impossible.");
    }
    setSaving(false);
  };

  const remove = async (id: string) => {
    await deleteInvoice.mutateAsync(id);
    if (openId === id) closeEditor();
    toast.success("Facture supprimée.");
  };

  return (
    <AppShell
      title="Factures"
      subtitle="Audrey, votre agent Gestion, rédige vos factures en PDF, Word ou image."
      action={
        <Button className="gap-2" onClick={startNew}>
          <Plus className="size-4" /> <span className="hidden sm:inline">Nouvelle facture</span>
        </Button>
      }
    >
      {draft && (
        <section className="surface mb-6 space-y-5 p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-lg">
                {creating ? "Nouvelle facture" : `Facture ${draft.number}`}
              </h2>
              <p className="text-sm text-muted-foreground">
                Modifiez les informations, régénérez, puis téléchargez ou envoyez.
              </p>
            </div>
            <Button variant="ghost" size="icon" onClick={closeEditor} aria-label="Fermer">
              <X className="size-4" />
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Numéro</Label>
              <Input value={draft.number} onChange={(e) => patch({ number: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Objet de la facture</Label>
              <Input
                value={draft.label}
                onChange={(e) => patch({ label: e.target.value })}
                placeholder="Prestation de conseil — janvier"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Client</Label>
              <Select
                value={draft.client_id ?? "none"}
                onValueChange={(v) => patch({ client_id: v === "none" ? null : v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choisir un client" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sans client</SelectItem>
                  {(clients ?? []).map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.company_name || c.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Échéance</Label>
                <Input
                  type="date"
                  value={draft.due_date ?? ""}
                  onChange={(e) => patch({ due_date: e.target.value || null })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>TVA (%)</Label>
                <Input
                  type="number"
                  value={draft.vat_rate}
                  onChange={(e) => patch({ vat_rate: Number(e.target.value) })}
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Lignes de la facture</Label>
            {draft.items.map((item, i) => (
              <div key={i} className="grid gap-2 sm:grid-cols-[1fr_90px_120px_40px]">
                <Input
                  value={item.description}
                  placeholder="Désignation"
                  onChange={(e) => setItem(i, { description: e.target.value })}
                />
                <Input
                  type="number"
                  value={item.quantity}
                  onChange={(e) => setItem(i, { quantity: Number(e.target.value) })}
                />
                <Input
                  type="number"
                  value={item.unit_price}
                  onChange={(e) => setItem(i, { unit_price: Number(e.target.value) })}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Supprimer la ligne"
                  onClick={() =>
                    patch({ items: draft.items.filter((_, idx) => idx !== i) || [emptyItem()] })
                  }
                >
                  <X className="size-4" />
                </Button>
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => patch({ items: [...draft.items, emptyItem()] })}
            >
              <Plus className="size-4" /> Ajouter une ligne
            </Button>
          </div>

          <div className="space-y-1.5">
            <Label>Conditions / notes</Label>
            <Textarea
              rows={3}
              value={draft.notes}
              onChange={(e) => patch({ notes: e.target.value })}
            />
          </div>

          <div className="flex flex-wrap items-center gap-4 text-sm">
            <span className="text-muted-foreground">Total HT : {eur2(t.ht)}</span>
            <span className="text-muted-foreground">TVA : {eur2(t.tva)}</span>
            <span className="font-semibold">Total TTC : {eur2(t.ttc)}</span>
          </div>

          <div className="flex flex-wrap items-end gap-2">
            <Button variant="outline" size="sm" onClick={() => rebuild(draft)}>
              Régénérer la facture
            </Button>
            <div className="min-w-[220px] flex-1 space-y-1.5">
              <Label className="text-xs text-muted-foreground">
                Consigne pour Audrey (optionnel)
              </Label>
              <Input
                value={instruction}
                onChange={(e) => setInstruction(e.target.value)}
                placeholder="Ton plus formel, ajouter mention d'acompte…"
              />
            </div>
            <div>
              <CreditActionButton
                actionKey="doc.create_simple"
                pending={aiBusy}
                onConfirm={() => aiWrite()}
              >
                {aiBusy ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Sparkles className="size-4" />
                )}{" "}
                Rédiger avec Audrey
              </CreditActionButton>
              <CreditCost actionKey="doc.create_simple" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Aperçu — modifiable</Label>
            <Textarea
              rows={16}
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="font-mono text-xs"
            />
          </div>

          <InvoiceActions
            title={`Facture ${draft.number}`}
            text={text}
            {...(clientOf(draft.client_id)?.email
              ? { defaultEmail: clientOf(draft.client_id)?.email as string }
              : {})}
          />

          <div className="flex justify-end">
            <Button onClick={() => void save()} disabled={saving}>
              {saving && <Loader2 className="mr-2 size-4 animate-spin" />} Enregistrer la facture
            </Button>
          </div>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="font-display text-lg">Mes factures</h2>
        {(invoices ?? []).length === 0 ? (
          <div className="surface p-10 text-center">
            <Receipt className="mx-auto size-8 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">
              Aucune facture pour le moment. Créez-en une : Audrey la rédige pour vous.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {(invoices ?? []).map((inv: any) => (
              <div
                key={inv.id}
                className="surface flex flex-wrap items-center justify-between gap-3 p-4"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">
                    {inv.number} — {inv.label || "Sans objet"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {clientName(inv.client_id)} · échéance {frDate(inv.due_date)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="secondary">{inv.status || "brouillon"}</Badge>
                  <span className="font-semibold">{eur2(inv.amount_ttc)}</span>
                  <Button variant="outline" size="sm" onClick={() => openExisting(inv)}>
                    Ouvrir
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Supprimer la facture"
                    onClick={() => void remove(inv.id)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </AppShell>
  );
}
