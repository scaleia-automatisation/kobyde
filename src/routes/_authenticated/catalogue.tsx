import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Plus, Trash2, FileText, CreditCard, Package } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useCreateRow, useDeleteRow, useOrgId, useRows, eur2 } from "@/lib/db";
import { isoDate, addDays, nextNumber, round2, ttcFrom } from "@/lib/sales";
import { PaymentRequestDialog } from "@/components/payment-request-dialog";

/* eslint-disable @typescript-eslint/no-explicit-any */

type OfferType = "produit" | "service";

export const Route = createFileRoute("/_authenticated/catalogue")({
  validateSearch: (search: Record<string, unknown>): { type?: OfferType } => {
    const t = search.type;
    return t === "produit" || t === "service" ? { type: t } : {};
  },
  head: () => ({
    meta: [
      { title: "Offres — Kobyde" },
      {
        name: "description",
        content: "Vos offres, produits et services : prix HT/TTC, TVA, SKU, sous-prestations et conditions.",
      },
      { property: "og:title", content: "Offres — Kobyde" },
      { property: "og:description", content: "Vos produits et services, prêts pour vos devis." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CataloguePage,
});

type Sub = { nom: string; prix: number };

function CataloguePage() {
  const orgId = useOrgId();
  const navigate = useNavigate();
  const { type: activeType } = Route.useSearch();
  const { data: products, isLoading } = useRows<any>("products");
  const { data: clients } = useRows<any>("clients");
  const create = useCreateRow("products");
  const remove = useDeleteRow("products");

  const [open, setOpen] = useState(false);
  const [subs, setSubs] = useState<Sub[]>([]);
  const [quoteFor, setQuoteFor] = useState<any | null>(null);
  const [payFor, setPayFor] = useState<any | null>(null);

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const num = (k: string, d = 0) => Number(fd.get(k) ?? d) || d;
    const priceHt = num("price_ht");
    const kind = (String(fd.get("kind") ?? "service") === "produit" ? "produit" : "service") as OfferType;
    create.mutate(
      {
        name: String(fd.get("name") ?? "").trim(),
        description: String(fd.get("description") ?? "").trim() || null,
        kind,
        category: String(fd.get("category") ?? "").trim() || null,
        sku: String(fd.get("sku") ?? "").trim() || null,
        unit: String(fd.get("unit") ?? "unité"),
        price_ht: priceHt,
        price: priceHt,
        vat_rate: num("vat_rate", 20),
        default_quantity: num("default_quantity", 1),
        subservices: subs.filter((s) => s.nom.trim()),
        terms: String(fd.get("terms") ?? "").trim() || null,
      },
      {
        onSuccess: () => {
          toast.success(kind === "produit" ? "Produit ajouté" : "Service ajouté");
          setOpen(false);
          setSubs([]);
          void navigate({ to: "/catalogue", search: { type: kind } });
        },
        onError: (err: any) => toast.error(err.message ?? "Erreur"),
      },
    );
  };

  const addToQuote = async (product: any, clientId: string, quantity: number) => {
    if (!orgId) return;
    const { data: existing } = await supabase
      .from("quotes")
      .select("id")
      .eq("org_id", orgId)
      .eq("client_id", clientId)
      .eq("status", "brouillon")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let quoteId = existing?.id as string | undefined;
    if (!quoteId) {
      const { data: q, error } = await supabase
        .from("quotes")
        .insert({
          org_id: orgId,
          client_id: clientId,
          number: nextNumber("DEV"),
          title: product.name,
          status: "brouillon",
          vat_rate: Number(product.vat_rate ?? 20),
          validity_days: 30,
          valid_until: isoDate(addDays(30)),
          source: "catalogue",
        })
        .select("id")
        .single();
      if (error) { toast.error(error.message); return; }
      quoteId = q.id;
    }

    const price = Number(product.price_ht || product.price || 0);
    const { error: itemErr } = await supabase.from("quote_items").insert({
      org_id: orgId,
      quote_id: quoteId,
      product_id: product.id,
      label: product.name,
      quantity,
      unit_price: price,
      vat_rate: Number(product.vat_rate ?? 20),
      subservices: product.subservices ?? [],
    });
    if (itemErr) { toast.error(itemErr.message); return; }

    toast.success("Ajouté au devis");
    setQuoteFor(null);
    navigate({ to: "/devis/$id", params: { id: quoteId! } });
  };

  return (
    <AppShell
      title="Catalogue"
      subtitle="Ce que vous vendez : prix HT/TTC, TVA, sous-prestations et conditions."
      action={
        <Button className="gap-2" onClick={() => setOpen(true)}>
          <Plus className="size-4" /> <span className="hidden sm:inline">Ajouter au catalogue</span>
        </Button>
      }
    >
      {isLoading ? (
        <div className="surface p-10 text-center text-muted-foreground">Chargement…</div>
      ) : (products ?? []).length === 0 ? (
        <div className="surface p-12 text-center">
          <Package className="mx-auto size-8 text-muted-foreground" />
          <p className="font-display mt-3 text-xl">Votre catalogue est vide</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Ajoutez un produit ou un service : il sera insérable en un clic dans vos devis et vos demandes de
            paiement.
          </p>
          <Button className="mt-6 gap-2" onClick={() => setOpen(true)}>
            <Plus className="size-4" /> Ajouter au catalogue
          </Button>
        </div>
      ) : (
        <div className="grid gap-3">
          {(products ?? []).map((p: any) => {
            const ht = Number(p.price_ht || p.price || 0);
            const vat = Number(p.vat_rate ?? 20);
            return (
              <article key={p.id} className="surface p-4">
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-display text-lg">{p.name}</h3>
                      {p.category && <Badge variant="secondary">{p.category}</Badge>}
                      {p.sku && <Badge variant="outline">SKU {p.sku}</Badge>}
                    </div>
                    {p.description && (
                      <p className="mt-1 text-sm text-muted-foreground">{p.description}</p>
                    )}
                    <div className="mt-3 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-4">
                      <Info label="Prix HT" value={eur2(ht)} />
                      <Info label={`TTC (TVA ${vat}%)`} value={eur2(ttcFrom(ht, vat))} />
                      <Info label="Unité" value={p.unit ?? "unité"} />
                      <Info label="Quantité par défaut" value={String(p.default_quantity ?? 1)} />
                    </div>
                    {Array.isArray(p.subservices) && p.subservices.length > 0 && (
                      <div className="mt-3">
                        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                          Sous-prestations
                        </p>
                        <ul className="mt-1 grid gap-1 text-sm sm:grid-cols-2">
                          {p.subservices.map((s: Sub, i: number) => (
                            <li key={i} className="flex justify-between gap-3 rounded-lg bg-muted/50 px-3 py-1.5">
                              <span className="truncate">{s.nom}</span>
                              <span className="shrink-0 text-muted-foreground">{eur2(s.prix)}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {p.terms && (
                      <p className="mt-3 text-xs text-muted-foreground">Conditions : {p.terms}</p>
                    )}
                  </div>

                  <div className="flex shrink-0 flex-wrap gap-2 lg:flex-col">
                    <Button size="sm" className="gap-2" onClick={() => setQuoteFor(p)}>
                      <FileText className="size-4" /> Ajouter au devis
                    </Button>
                    <Button size="sm" variant="secondary" className="gap-2" onClick={() => setPayFor(p)}>
                      <CreditCard className="size-4" /> Demande de paiement
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="gap-2 text-destructive"
                      aria-label={`Supprimer ${p.name}`}
                      onClick={() => remove.mutate(p.id)}
                    >
                      <Trash2 className="size-4" /> Supprimer
                    </Button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Ajout produit */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Ajouter au catalogue</DialogTitle>
            <DialogDescription>Un produit ou un service, avec son prix et ses conditions.</DialogDescription>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field name="name" label="Nom" required placeholder="Création de site web" />
              <Field name="category" label="Catégorie" placeholder="Web" />
              <Field name="sku" label="SKU" placeholder="WEB-001" />
              <div className="space-y-1.5">
                <Label htmlFor="kind">Type</Label>
                <select
                  id="kind"
                  name="kind"
                  defaultValue="service"
                  className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"
                >
                  <option value="service">Service</option>
                  <option value="produit">Produit</option>
                </select>
              </div>
              <Field name="price_ht" label="Prix HT (€)" type="number" defaultValue="0" />
              <Field name="vat_rate" label="TVA (%)" type="number" defaultValue="20" />
              <Field name="unit" label="Unité" defaultValue="unité" />
              <Field name="default_quantity" label="Quantité par défaut" type="number" defaultValue="1" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" name="description" rows={2} />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Sous-prestations</Label>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setSubs((s) => [...s, { nom: "", prix: 0 }])}
                >
                  <Plus className="size-4" /> Ajouter
                </Button>
              </div>
              {subs.map((s, i) => (
                <div key={i} className="flex gap-2">
                  <Input
                    aria-label={`Sous-prestation ${i + 1}`}
                    value={s.nom}
                    placeholder="Rédaction des contenus"
                    onChange={(e) =>
                      setSubs((arr) => arr.map((x, j) => (j === i ? { ...x, nom: e.target.value } : x)))
                    }
                  />
                  <Input
                    aria-label={`Prix sous-prestation ${i + 1}`}
                    type="number"
                    className="w-32"
                    value={s.prix}
                    onChange={(e) =>
                      setSubs((arr) =>
                        arr.map((x, j) => (j === i ? { ...x, prix: Number(e.target.value) } : x)),
                      )
                    }
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Retirer la sous-prestation"
                    onClick={() => setSubs((arr) => arr.filter((_, j) => j !== i))}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="terms">Conditions</Label>
              <Textarea id="terms" name="terms" rows={2} placeholder="Acompte de 30 % à la commande…" />
            </div>

            <DialogFooter>
              <Button type="submit" disabled={create.isPending}>
                {create.isPending ? "Enregistrement…" : "Enregistrer"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Ajouter au devis */}
      <Dialog open={!!quoteFor} onOpenChange={(o) => !o && setQuoteFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter au devis</DialogTitle>
            <DialogDescription>
              La ligne est ajoutée au devis brouillon du client (créé si besoin).
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              const clientId = String(fd.get("client_id") ?? "");
              if (!clientId) { toast.error("Choisissez un client"); return; }
              void addToQuote(quoteFor, clientId, Number(fd.get("quantity") ?? 1) || 1);
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="client_id">Client</Label>
              <select
                id="client_id"
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
            <Field
              name="quantity"
              label="Quantité"
              type="number"
              defaultValue={String(quoteFor?.default_quantity ?? 1)}
            />
            <DialogFooter>
              <Button type="submit">Ajouter au devis</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <PaymentRequestDialog
        open={!!payFor}
        onOpenChange={(o) => !o && setPayFor(null)}
        product={payFor}
        defaultAmount={round2(Number(payFor?.price_ht || payFor?.price || 0))}
        defaultVat={Number(payFor?.vat_rate ?? 20)}
      />
    </AppShell>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="truncate font-medium">{value}</p>
    </div>
  );
}

function Field({
  name,
  label,
  type = "text",
  required,
  placeholder,
  defaultValue,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
  defaultValue?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={name}>{label}</Label>
      <Input
        id={name}
        name={name}
        type={type}
        step={type === "number" ? "0.01" : undefined}
        required={required}
        placeholder={placeholder}
        defaultValue={defaultValue}
      />
    </div>
  );
}
