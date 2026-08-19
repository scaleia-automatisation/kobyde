import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  CheckCircle2,
  Copy,
  CreditCard,
  History,
  Mail,
  Plus,
  Send,
  Trash2,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { CreditActionButton } from "@/components/credit-action";
import { PaymentRequestDialog, makeToken } from "@/components/payment-request-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useChildRows, useOrgId, useRow, useRows, eur2, frDate } from "@/lib/db";
import {
  DEFAULT_INSTALLMENTS,
  DISCOUNT_OPTIONS,
  QUOTE_STATUS_LABEL,
  VALIDITY_OPTIONS,
  addDays,
  computeTotals,
  isoDate,
  round2,
} from "@/lib/sales";
import { generateFollowups } from "@/lib/sales.functions";

/* eslint-disable @typescript-eslint/no-explicit-any */

export const Route = createFileRoute("/_authenticated/devis/$id")({
  head: () => ({
    meta: [
      { title: "Détail du devis — Kobyde" },
      {
        name: "description",
        content: "Lignes, remise, validité, versions, envoi au client, relances et échéances de paiement.",
      },
      { property: "og:title", content: "Détail du devis — Kobyde" },
      { property: "og:description", content: "Pilotez un devis de la création au paiement." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: QuoteDetail,
});

function QuoteDetail() {
  const { id } = Route.useParams();
  const orgId = useOrgId();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: quote, refetch: refetchQuote } = useRow<any>("quotes", id);
  const { data: items, refetch: refetchItems } = useChildRows<any>("quote_items", "quote_id", id, {
    order: "position",
    ascending: true,
  });
  const { data: installments, refetch: refetchInst } = useChildRows<any>(
    "quote_installments",
    "quote_id",
    id,
    { order: "position", ascending: true },
  );
  const { data: followups, refetch: refetchFollowups } = useChildRows<any>(
    "quote_followups",
    "quote_id",
    id,
    { order: "scheduled_at", ascending: true },
  );
  const { data: versions } = useChildRows<any>("quote_versions", "quote_id", id);
  const { data: products } = useRows<any>("products");
  const { data: clients } = useRows<any>("clients");

  const [discountType, setDiscountType] = useState("aucune");
  const [discountValue, setDiscountValue] = useState(0);
  const [validity, setValidity] = useState(30);
  const [payOpen, setPayOpen] = useState(false);
  const [payDefaults, setPayDefaults] = useState<{ label: string; ht: number }>({ label: "", ht: 0 });

  useEffect(() => {
    if (quote) {
      setDiscountType(quote.discount_type ?? "aucune");
      setDiscountValue(Number(quote.discount_value ?? 0));
      setValidity(Number(quote.validity_days ?? 30));
    }
  }, [quote]);

  const lines = useMemo(
    () =>
      (items ?? []).map((i: any) => ({
        quantity: Number(i.quantity ?? 1),
        unit_price: Number(i.unit_price ?? 0),
        vat_rate: Number(i.vat_rate ?? 20),
      })),
    [items],
  );
  const totals = useMemo(
    () => computeTotals(lines as any, discountType, discountValue),
    [lines, discountType, discountValue],
  );

  const client = (clients ?? []).find((c: any) => c.id === quote?.client_id);
  const clientLabel = client ? client.company_name || client.full_name : "Client non renseigné";
  const locked = quote?.status === "accepte";

  const persistTotals = async (extra: Record<string, unknown> = {}) => {
    await (supabase as any)
      .from("quotes")
      .update({
        subtotal_ht: totals.subtotal,
        discount_type: discountType,
        discount_value: discountValue,
        discount_amount: totals.remise,
        total_ht: totals.totalHt,
        vat_rate: totals.vatRate,
        total_ttc: totals.totalTtc,
        validity_days: validity,
        valid_until: isoDate(addDays(validity)),
        ...extra,
      })
      .eq("id", id);
    await refetchQuote();
    void qc.invalidateQueries({ queryKey: ["rows", "quotes"] });
  };

  const addLine = async (productId: string) => {
    if (!orgId) return;
    const p = (products ?? []).find((x: any) => x.id === productId);
    const { error } = await (supabase as any).from("quote_items").insert({
      org_id: orgId,
      quote_id: id,
      product_id: p?.id ?? null,
      label: p?.name ?? "Nouvelle ligne",
      quantity: Number(p?.default_quantity ?? 1),
      unit_price: Number(p?.price_ht || p?.price || 0),
      vat_rate: Number(p?.vat_rate ?? 20),
      subservices: p?.subservices ?? [],
      position: (items?.length ?? 0) + 1,
    });
    if (error) { toast.error(error.message); return; }
    await refetchItems();
  };

  const updateLine = async (lineId: string, patch: Record<string, unknown>) => {
    await (supabase as any).from("quote_items").update(patch).eq("id", lineId);
    await refetchItems();
  };

  const removeLine = async (lineId: string) => {
    await (supabase as any).from("quote_items").delete().eq("id", lineId);
    await refetchItems();
  };

  const snapshot = () => ({
    lignes: items ?? [],
    totaux: totals,
    remise: { type: discountType, valeur: discountValue },
  });

  const saveVersion = async (change: string, reason?: string) => {
    if (!orgId || !quote) return;
    await (supabase as any).from("quote_versions").insert({
      org_id: orgId,
      quote_id: id,
      version: Number(quote.version ?? 1),
      change,
      reason: reason ?? null,
      snapshot: snapshot(),
    });
    await (supabase as any).from("quotes").update({ version: Number(quote.version ?? 1) + 1 }).eq("id", id);
    await refetchQuote();
  };

  const validate = async () => {
    await persistTotals({ status: "envoye" });
    await saveVersion("Devis validé en interne");
    toast.success("Devis validé");
  };

  const sendToClient = async () => {
    if (!orgId || !quote?.client_id) { toast.error("Ajoutez d'abord un client"); return; }
    await persistTotals({ status: "envoye", sent_at: new Date().toISOString() });

    const { data: existing } = await (supabase as any)
      .from("client_portal_access")
      .select("token")
      .eq("client_id", quote.client_id)
      .maybeSingle();
    let token = existing?.token as string | undefined;
    if (!token) {
      token = makeToken().slice(0, 48);
      const { error } = await (supabase as any)
        .from("client_portal_access")
        .insert({ org_id: orgId, client_id: quote.client_id, token });
      if (error) { toast.error(error.message); return; }
    }
    const url = `${window.location.origin}/espace/${token}`;
    await navigator.clipboard.writeText(url).catch(() => undefined);
    toast.success("Devis envoyé — lien de l'espace client copié");
  };

  const decide = async (status: "accepte" | "refuse") => {
    await (supabase as any)
      .from("quotes")
      .update({
        status,
        [status === "accepte" ? "accepted_at" : "refused_at"]: new Date().toISOString(),
      })
      .eq("id", id);
    await refetchQuote();
    toast.success(status === "accepte" ? "Devis accepté" : "Devis refusé");
  };

  const createInstallments = async () => {
    if (!orgId) return;
    await (supabase as any).from("quote_installments").delete().eq("quote_id", id);
    const rows = DEFAULT_INSTALLMENTS.map((inst, i) => ({
      org_id: orgId,
      quote_id: id,
      label: inst.label,
      percentage: inst.percentage,
      amount_ttc: round2((totals.totalTtc * inst.percentage) / 100),
      position: i,
      due_date: isoDate(addDays(i * 15)),
      status: "a_payer",
    }));
    const { error } = await (supabase as any).from("quote_installments").insert(rows);
    if (error) { toast.error(error.message); return; }
    await refetchInst();
    toast.success("Échéancier créé");
  };

  const runFollowups = async (idempotencyKey: string) => {
    if (!orgId) return;
    await generateFollowups({ data: { orgId, quoteId: id, idempotencyKey } });
    await refetchFollowups();
    toast.success("Relances préparées");
  };

  const toProject = async () => {
    if (!orgId || !quote) return;
    const { data: project, error } = await (supabase as any)
      .from("projects")
      .insert({
        org_id: orgId,
        client_id: quote.client_id,
        quote_id: id,
        name: quote.title,
        status: "en_cours",
        progress: 0,
        budget: Number(quote.total_ttc ?? 0),
        start_date: isoDate(new Date()),
      })
      .select("id")
      .single();
    if (error) { toast.error(error.message); return; }
    const steps = ["Analyse", "Maquette", "Développement", "Tests", "Mise en ligne"];
    await (supabase as any).from("project_steps").insert(
      steps.map((name, i) => ({
        org_id: orgId,
        project_id: project.id,
        name,
        status: i === 0 ? "en_cours" : "a_faire",
        position: i,
      })),
    );
    navigate({ to: "/projets/$id", params: { id: project.id } });
  };

  if (!quote) {
    return (
      <AppShell title="Devis" subtitle="Chargement…">
        <div className="surface p-10 text-center text-muted-foreground">Chargement du devis…</div>
      </AppShell>
    );
  }

  return (
    <AppShell
      title={`${quote.number} — ${quote.title}`}
      subtitle={`${clientLabel} · ${QUOTE_STATUS_LABEL[quote.status] ?? quote.status} · version ${quote.version}`}
      action={
        <Button variant="ghost" className="gap-2" asChild>
          <Link to="/devis">
            <ArrowLeft className="size-4" /> Tous les devis
          </Link>
        </Button>
      }
    >
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          {/* Lignes */}
          <section className="surface p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-display text-lg">Lignes du devis</h2>
              <div className="flex items-center gap-2">
                <select
                  aria-label="Ajouter une ligne depuis le catalogue"
                  className="h-9 rounded-xl border border-input bg-background px-3 text-sm"
                  value=""
                  onChange={(e) => e.target.value && addLine(e.target.value)}
                  disabled={locked}
                >
                  <option value="">Depuis le catalogue…</option>
                  {(products ?? []).map((p: any) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                <Button size="sm" variant="secondary" className="gap-2" disabled={locked} onClick={() => addLine("")}>
                  <Plus className="size-4" /> Ligne libre
                </Button>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {(items ?? []).length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Aucune ligne pour l'instant : ajoutez un service du catalogue ou une ligne libre.
                </p>
              )}
              {(items ?? []).map((it: any) => (
                <div key={it.id} className="rounded-xl border border-border/60 p-3">
                  <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_88px_120px_92px_auto] sm:items-end">
                    <div className="space-y-1">
                      <Label htmlFor={`lbl-${it.id}`} className="text-xs">
                        Désignation
                      </Label>
                      <Input
                        id={`lbl-${it.id}`}
                        defaultValue={it.label}
                        disabled={locked}
                        onBlur={(e) => updateLine(it.id, { label: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor={`qty-${it.id}`} className="text-xs">
                        Qté
                      </Label>
                      <Input
                        id={`qty-${it.id}`}
                        type="number"
                        step="0.01"
                        defaultValue={it.quantity}
                        disabled={locked}
                        onBlur={(e) => updateLine(it.id, { quantity: Number(e.target.value) })}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor={`pu-${it.id}`} className="text-xs">
                        Prix HT
                      </Label>
                      <Input
                        id={`pu-${it.id}`}
                        type="number"
                        step="0.01"
                        defaultValue={it.unit_price}
                        disabled={locked}
                        onBlur={(e) => updateLine(it.id, { unit_price: Number(e.target.value) })}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor={`tva-${it.id}`} className="text-xs">
                        TVA %
                      </Label>
                      <Input
                        id={`tva-${it.id}`}
                        type="number"
                        step="0.1"
                        defaultValue={it.vat_rate}
                        disabled={locked}
                        onBlur={(e) => updateLine(it.id, { vat_rate: Number(e.target.value) })}
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Supprimer la ligne ${it.label}`}
                      disabled={locked}
                      onClick={() => removeLine(it.id)}
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    {it.detection && <Badge variant="outline">{it.detection}</Badge>}
                    {it.product_id ? (
                      <Badge variant="secondary">Au catalogue</Badge>
                    ) : (
                      <Badge variant="outline">Hors catalogue</Badge>
                    )}
                    <span>
                      Total ligne : {eur2(Number(it.quantity ?? 0) * Number(it.unit_price ?? 0))} HT
                    </span>
                  </div>
                  {it.description && <p className="mt-1 text-xs italic text-muted-foreground">{it.description}</p>}
                </div>
              ))}
            </div>
          </section>

          {/* Echeances */}
          <section className="surface p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-display text-lg">Paiements et échéances</h2>
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" onClick={createInstallments}>
                  Échéancier 30/40/30
                </Button>
                <Button
                  size="sm"
                  className="gap-2"
                  onClick={() => {
                    setPayDefaults({ label: `Paiement — ${quote.title}`, ht: totals.totalHt });
                    setPayOpen(true);
                  }}
                >
                  <CreditCard className="size-4" /> Demande de paiement
                </Button>
              </div>
            </div>
            <div className="mt-3 grid gap-2">
              {(installments ?? []).length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Paiement en une fois, ou créez un échéancier (acompte, intermédiaire, solde).
                </p>
              )}
              {(installments ?? []).map((inst: any) => (
                <div
                  key={inst.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-muted/50 px-3 py-2 text-sm"
                >
                  <span className="font-medium">
                    {inst.label} · {inst.percentage}%
                  </span>
                  <span className="flex items-center gap-3">
                    <span>{eur2(inst.amount_ttc)}</span>
                    <Badge variant={inst.status === "payee" ? "default" : "outline"}>
                      {inst.status === "payee" ? "Payée" : `Échéance ${frDate(inst.due_date)}`}
                    </Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setPayDefaults({
                          label: `${inst.label} — ${quote.title}`,
                          ht: round2(Number(inst.amount_ttc) / (1 + Number(quote.vat_rate ?? 20) / 100)),
                        });
                        setPayOpen(true);
                      }}
                    >
                      Lien de paiement
                    </Button>
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* Relances */}
          <section className="surface p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-display text-lg">Relances automatiques</h2>
              <CreditActionButton actionKey="quote.followup" size="sm" onConfirm={runFollowups}>
                <Mail className="size-4" /> Préparer les relances
              </CreditActionButton>
            </div>
            <div className="mt-3 space-y-3">
              {(followups ?? []).length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Clara prépare 3 relances (J+3, J+7 et avant expiration) que vous pouvez modifier avant envoi.
                </p>
              )}
              {(followups ?? []).map((f: any) => (
                <div key={f.id} className="rounded-xl border border-border/60 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Badge variant="secondary">{f.kind.toUpperCase()}</Badge>
                    <span className="text-xs text-muted-foreground">
                      Programmée le {frDate(f.scheduled_at)}
                    </span>
                  </div>
                  <Input
                    aria-label="Objet de la relance"
                    className="mt-2"
                    defaultValue={f.subject}
                    onBlur={(e) =>
                      (supabase as any).from("quote_followups").update({ subject: e.target.value }).eq("id", f.id)
                    }
                  />
                  <Textarea
                    aria-label="Message de la relance"
                    className="mt-2"
                    rows={4}
                    defaultValue={f.body}
                    onBlur={(e) =>
                      (supabase as any).from("quote_followups").update({ body: e.target.value }).eq("id", f.id)
                    }
                  />
                  <div className="mt-2 flex justify-end">
                    <Button
                      size="sm"
                      variant="secondary"
                      className="gap-2"
                      onClick={async () => {
                        await (supabase as any)
                          .from("quote_followups")
                          .update({ status: "envoyee", sent_at: new Date().toISOString() })
                          .eq("id", f.id);
                        await refetchFollowups();
                        toast.success("Relance marquée comme envoyée");
                      }}
                    >
                      <Send className="size-4" /> Marquer envoyée
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Historique */}
          <section className="surface p-4">
            <h2 className="font-display flex items-center gap-2 text-lg">
              <History className="size-4" /> Historique des versions
            </h2>
            <ul className="mt-3 space-y-2 text-sm">
              {(versions ?? []).length === 0 && (
                <li className="text-muted-foreground">Aucune modification enregistrée pour l'instant.</li>
              )}
              {(versions ?? []).map((v: any) => (
                <li key={v.id} className="flex justify-between gap-3 rounded-xl bg-muted/50 px-3 py-2">
                  <span>
                    v{v.version} — {v.change}
                    {v.reason ? ` (${v.reason})` : ""}
                  </span>
                  <span className="text-muted-foreground">{frDate(v.created_at)}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>

        {/* Colonne droite */}
        <aside className="space-y-4">
          <section className="surface space-y-3 p-4">
            <h2 className="font-display text-lg">Total</h2>
            <Row label="Sous-total HT" value={eur2(totals.subtotal)} />
            <div className="space-y-1.5">
              <Label htmlFor="remise_type">Remise</Label>
              <select
                id="remise_type"
                value={discountType}
                disabled={locked}
                onChange={(e) => setDiscountType(e.target.value)}
                className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"
              >
                {DISCOUNT_OPTIONS.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </select>
              {(discountType === "pct" || discountType === "fixe") && (
                <Input
                  aria-label="Valeur de la remise"
                  type="number"
                  step="0.01"
                  value={discountValue}
                  disabled={locked}
                  onChange={(e) => setDiscountValue(Number(e.target.value))}
                />
              )}
            </div>
            <Row label="Remise" value={`− ${eur2(totals.remise)}`} />
            <Row label="Total HT" value={eur2(totals.totalHt)} />
            <Row label="TVA" value={eur2(totals.tva)} />
            <Row label="Total TTC" value={eur2(totals.totalTtc)} strong />

            <div className="space-y-1.5">
              <Label htmlFor="validite">Validité</Label>
              <select
                id="validite"
                value={validity}
                disabled={locked}
                onChange={(e) => setValidity(Number(e.target.value))}
                className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"
              >
                {VALIDITY_OPTIONS.map((v) => (
                  <option key={v} value={v}>
                    {v} jours
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                Expire le {frDate(isoDate(addDays(validity)))}
              </p>
            </div>

            <Button className="w-full" disabled={locked} onClick={() => persistTotals()}>
              Enregistrer
            </Button>
          </section>

          <section className="surface space-y-2 p-4">
            <h2 className="font-display text-lg">Actions</h2>
            <Button variant="secondary" className="w-full gap-2" disabled={locked} onClick={validate}>
              <CheckCircle2 className="size-4" /> Valider le devis
            </Button>
            <Button className="w-full gap-2" onClick={sendToClient}>
              <Send className="size-4" /> Envoyer au client
            </Button>
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={() => saveVersion("Nouvelle version créée", "Modification après échange client")}
            >
              <Copy className="size-4" /> Créer une nouvelle version
            </Button>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="secondary" className="gap-2" onClick={() => decide("accepte")}>
                <CheckCircle2 className="size-4" /> Accepté
              </Button>
              <Button variant="ghost" className="gap-2 text-destructive" onClick={() => decide("refuse")}>
                <XCircle className="size-4" /> Refusé
              </Button>
            </div>
            <Button
              variant="outline"
              className="w-full"
              disabled={quote.status !== "accepte"}
              onClick={toProject}
            >
              Transformer en projet
            </Button>
            {quote.client_comment && (
              <p className="rounded-xl bg-muted/60 p-3 text-sm">
                Commentaire client : « {quote.client_comment} »
              </p>
            )}
          </section>
        </aside>
      </div>

      <PaymentRequestDialog
        open={payOpen}
        onOpenChange={setPayOpen}
        clientId={quote.client_id ?? undefined}
        quoteId={id}
        defaultLabel={payDefaults.label}
        defaultAmount={payDefaults.ht}
        defaultVat={Number(quote.vat_rate ?? 20)}
      />
    </AppShell>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between text-sm ${strong ? "font-display text-lg" : ""}`}>
      <span className={strong ? "" : "text-muted-foreground"}>{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
