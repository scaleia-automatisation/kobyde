import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Copy, Link2, Mail, MessageSquare, Phone, Plus } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { PaymentRequestDialog, makeToken } from "@/components/payment-request-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useChildRows, useOrgId, useRow, eur2, frDate } from "@/lib/db";
import { CLIENT_REQUEST_KINDS } from "@/lib/sales";

/* eslint-disable @typescript-eslint/no-explicit-any */

export const Route = createFileRoute("/_authenticated/clients/$id")({
  head: () => ({
    meta: [
      { title: "Fiche client 360° — Kobyde" },
      {
        name: "description",
        content: "Coordonnées, devis, factures, projets, échanges et documents d'un client, sur une seule page.",
      },
      { property: "og:title", content: "Fiche client 360° — Kobyde" },
      { property: "og:description", content: "Tout l'historique d'un client au même endroit." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ClientDetail,
});

function ClientDetail() {
  const { id } = Route.useParams();
  const orgId = useOrgId();
  const { data: client, refetch } = useRow<any>("clients", id);
  const { data: quotes } = useChildRows<any>("quotes", "client_id", id);
  const { data: invoices } = useChildRows<any>("invoices", "client_id", id);
  const { data: projects } = useChildRows<any>("projects", "client_id", id);
  const { data: meetings } = useChildRows<any>("meetings", "client_id", id, { order: "starts_at" });
  const { data: documents } = useChildRows<any>("documents", "client_id", id);
  const { data: requests, refetch: refetchRequests } = useChildRows<any>("client_requests", "client_id", id);
  const { data: portal, refetch: refetchPortal } = useChildRows<any>(
    "client_portal_access",
    "client_id",
    id,
  );
  const [payOpen, setPayOpen] = useState(false);

  const ca = (invoices ?? [])
    .filter((f: any) => f.status === "payee")
    .reduce((s: number, f: any) => s + Number(f.amount_ttc ?? 0), 0);

  const portalToken = portal?.[0]?.token as string | undefined;

  const createPortal = async () => {
    if (!orgId) return;
    const token = makeToken().slice(0, 48);
    const { error } = await supabase
      .from("client_portal_access")
      .insert({ org_id: orgId, client_id: id, token });
    if (error) return toast.error(error.message);
    await refetchPortal();
    toast.success("Espace client créé");
  };

  const addRequest = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!orgId) return;
    const fd = new FormData(e.currentTarget);
    const { error } = await supabase.from("client_requests").insert({
      org_id: orgId,
      client_id: id,
      kind: String(fd.get("kind") ?? "document"),
      title: String(fd.get("title") ?? "").trim(),
      detail: String(fd.get("detail") ?? "").trim() || null,
    });
    if (error) return toast.error(error.message);
    e.currentTarget.reset();
    await refetchRequests();
    toast.success("Demande envoyée au client");
  };

  if (!client) {
    return (
      <AppShell title="Client" subtitle="Chargement…">
        <div className="surface p-10 text-center text-muted-foreground">Chargement de la fiche…</div>
      </AppShell>
    );
  }

  return (
    <AppShell
      title={client.company_name || client.full_name}
      subtitle="Fiche 360° : tout ce qui concerne ce client, au même endroit."
      action={
        <Button variant="ghost" className="gap-2" asChild>
          <Link to="/clients">
            <ArrowLeft className="size-4" /> Tous les clients
          </Link>
        </Button>
      }
    >
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          <section className="surface grid gap-3 p-4 sm:grid-cols-4">
            <Stat label="Chiffre d'affaires" value={eur2(ca)} />
            <Stat label="Devis" value={String((quotes ?? []).length)} />
            <Stat label="Projets" value={String((projects ?? []).length)} />
            <Stat label="Factures" value={String((invoices ?? []).length)} />
          </section>

          <Block title="Devis">
            {(quotes ?? []).length === 0 && <Empty>Aucun devis pour ce client.</Empty>}
            {(quotes ?? []).map((q: any) => (
              <Link
                key={q.id}
                to="/devis/$id"
                params={{ id: q.id }}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-muted/50 px-3 py-2 text-sm hover:bg-muted"
              >
                <span className="font-medium">
                  {q.number} — {q.title}
                </span>
                <span className="flex items-center gap-3">
                  <Badge variant="outline">{q.status}</Badge>
                  <span>{eur2(q.total_ttc)}</span>
                </span>
              </Link>
            ))}
          </Block>

          <Block title="Projets">
            {(projects ?? []).length === 0 && <Empty>Aucun projet en cours.</Empty>}
            {(projects ?? []).map((p: any) => (
              <Link
                key={p.id}
                to="/projets/$id"
                params={{ id: p.id }}
                className="flex items-center justify-between gap-3 rounded-xl bg-muted/50 px-3 py-2 text-sm hover:bg-muted"
              >
                <span className="font-medium">{p.name}</span>
                <span className="text-muted-foreground">{Number(p.progress ?? 0)} %</span>
              </Link>
            ))}
          </Block>

          <Block title="Factures et paiements">
            {(invoices ?? []).length === 0 && <Empty>Aucune facture émise.</Empty>}
            {(invoices ?? []).map((f: any) => (
              <div key={f.id} className="flex items-center justify-between gap-3 rounded-xl bg-muted/50 px-3 py-2 text-sm">
                <span>{f.number}</span>
                <span className="flex items-center gap-3">
                  <Badge variant={f.status === "payee" ? "default" : "outline"}>{f.status}</Badge>
                  <span>{eur2(f.amount_ttc)}</span>
                  <span className="text-muted-foreground">{frDate(f.paid_at ?? f.created_at)}</span>
                </span>
              </div>
            ))}
          </Block>

          <Block title="Réunions et échanges">
            {(meetings ?? []).length === 0 && <Empty>Aucune réunion enregistrée.</Empty>}
            {(meetings ?? []).map((m: any) => (
              <div key={m.id} className="rounded-xl bg-muted/50 px-3 py-2 text-sm">
                <div className="flex justify-between gap-3">
                  <span className="font-medium">{m.title}</span>
                  <span className="text-muted-foreground">{frDate(m.starts_at)}</span>
                </div>
                {m.summary && <p className="mt-1 text-muted-foreground">{m.summary}</p>}
              </div>
            ))}
          </Block>

          <Block title="Documents">
            {(documents ?? []).length === 0 && <Empty>Aucun document partagé.</Empty>}
            {(documents ?? []).map((d: any) => (
              <div key={d.id} className="flex items-center justify-between gap-3 rounded-xl bg-muted/50 px-3 py-2 text-sm">
                <span>{d.name}</span>
                <span className="flex items-center gap-2 text-muted-foreground">
                  {d.from_client && <Badge variant="outline">Envoyé par le client</Badge>}
                  {frDate(d.created_at)}
                </span>
              </div>
            ))}
          </Block>

          <Block title="Demandes d'informations">
            <form onSubmit={addRequest} className="grid gap-3 sm:grid-cols-[160px_minmax(0,1fr)_auto] sm:items-end">
              <div className="space-y-1.5">
                <Label htmlFor="req_kind">Type</Label>
                <select
                  id="req_kind"
                  name="kind"
                  className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"
                >
                  {CLIENT_REQUEST_KINDS.map((k: any) => (
                    <option key={k.value ?? k} value={k.value ?? k}>
                      {k.label ?? k}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="req_title">Ce dont vous avez besoin</Label>
                <Input id="req_title" name="title" required placeholder="Votre logo en haute définition" />
              </div>
              <Button type="submit" className="gap-2">
                <Plus className="size-4" /> Demander
              </Button>
              <Textarea
                name="detail"
                aria-label="Précisions"
                rows={2}
                className="sm:col-span-3"
                placeholder="Précisions (facultatif)"
              />
            </form>
            <div className="mt-3 space-y-2">
              {(requests ?? []).map((r: any) => (
                <div key={r.id} className="rounded-xl bg-muted/50 px-3 py-2 text-sm">
                  <div className="flex justify-between gap-3">
                    <span className="font-medium">{r.title}</span>
                    <Badge variant={r.status === "repondu" ? "default" : "outline"}>
                      {r.status === "repondu" ? "Répondu" : "En attente"}
                    </Badge>
                  </div>
                  {r.response && <p className="mt-1 text-muted-foreground">{r.response}</p>}
                </div>
              ))}
            </div>
          </Block>
        </div>

        <aside className="space-y-4">
          <section className="surface space-y-3 p-4">
            <h2 className="font-display text-lg">Coordonnées</h2>
            <p className="text-sm">{client.full_name}</p>
            {client.email && (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="size-4" /> {client.email}
              </p>
            )}
            {client.phone && (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="size-4" /> {client.phone}
              </p>
            )}
            {client.address && <p className="text-sm text-muted-foreground">{client.address}</p>}
            <Textarea
              aria-label="Notes internes"
              rows={4}
              defaultValue={client.notes ?? ""}
              placeholder="Notes internes…"
              onBlur={async (e) => {
                await supabase.from("clients").update({ notes: e.target.value }).eq("id", id);
                await refetch();
              }}
            />
          </section>

          <section className="surface space-y-2 p-4">
            <h2 className="font-display text-lg">Espace client</h2>
            {portalToken ? (
              <>
                <p className="break-all text-xs text-muted-foreground">
                  {typeof window !== "undefined" ? `${window.location.origin}/espace/${portalToken}` : ""}
                </p>
                <Button
                  className="w-full gap-2"
                  onClick={() => {
                    void navigator.clipboard.writeText(`${window.location.origin}/espace/${portalToken}`);
                    toast.success("Lien copié");
                  }}
                >
                  <Copy className="size-4" /> Copier le lien
                </Button>
                <Button variant="secondary" className="w-full gap-2" asChild>
                  <a href={`/espace/${portalToken}`} target="_blank" rel="noreferrer">
                    <Link2 className="size-4" /> Ouvrir l'espace
                  </a>
                </Button>
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  Un lien sécurisé pour que votre client suive ses devis, projets et factures.
                </p>
                <Button className="w-full" onClick={createPortal}>
                  Créer l'espace client
                </Button>
              </>
            )}
            <Button variant="outline" className="w-full gap-2" onClick={() => setPayOpen(true)}>
              <MessageSquare className="size-4" /> Demander un paiement
            </Button>
          </section>
        </aside>
      </div>

      <PaymentRequestDialog open={payOpen} onOpenChange={setPayOpen} clientId={id} />
    </AppShell>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="surface p-4">
      <h2 className="font-display mb-3 text-lg">{title}</h2>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted-foreground">{children}</p>;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="font-display text-xl">{value}</p>
    </div>
  );
}
