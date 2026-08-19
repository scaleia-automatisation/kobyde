import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { CheckCircle2, FileText, FolderKanban, MessageSquare, Upload, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  getPortal,
  portalRespondQuote,
  portalRespondRequest,
  portalUploadDocument,
} from "@/lib/portal.functions";

/* eslint-disable @typescript-eslint/no-explicit-any */

const eur = (n: number) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(Number(n ?? 0));
const fr = (d: string | null) =>
  d ? new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }) : "—";

export const Route = createFileRoute("/espace/$token")({
  head: () => ({
    meta: [
      { title: "Votre espace client — Kobyde" },
      {
        name: "description",
        content: "Vos devis, projets, factures et documents au même endroit, accessibles par lien sécurisé.",
      },
      { property: "og:title", content: "Votre espace client — Kobyde" },
      { property: "og:description", content: "Suivez vos devis, paiements et projets en un coup d'œil." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PortalPage,
});

function PortalPage() {
  const { token } = Route.useParams();
  const [comment, setComment] = useState("");
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["portal", token],
    queryFn: () => getPortal({ data: { token } }),
    retry: false,
  });

  const respond = useMutation({
    mutationFn: (vars: { quoteId: string; action: "accepte" | "refuse" | "commente" }) =>
      portalRespondQuote({ data: { token, comment, ...vars } }),
    onSuccess: () => {
      toast.success("Merci, votre réponse a bien été transmise.");
      setComment("");
      void refetch();
    },
    onError: (e: any) => toast.error(e?.message ?? "Erreur"),
  });

  const upload = useMutation({
    mutationFn: (vars: { name: string; fileUrl: string | null }) =>
      portalUploadDocument({ data: { token, kind: "document", ...vars } }),
    onSuccess: () => {
      toast.success("Document transmis");
      void refetch();
    },
    onError: (e: any) => toast.error(e?.message ?? "Erreur"),
  });

  const answer = useMutation({
    mutationFn: (vars: { requestId: string; response: string }) =>
      portalRespondRequest({ data: { token, ...vars } }),
    onSuccess: () => {
      toast.success("Réponse envoyée");
      void refetch();
    },
    onError: (e: any) => toast.error(e?.message ?? "Erreur"),
  });

  if (isLoading) {
    return <main className="grid min-h-screen place-items-center text-muted-foreground">Chargement…</main>;
  }
  if (error || !data) {
    return (
      <main className="grid min-h-screen place-items-center px-4 text-center">
        <div>
          <h1 className="font-display text-2xl">Espace indisponible</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Ce lien est invalide ou a été désactivé. Contactez votre interlocuteur pour en obtenir un nouveau.
          </p>
        </div>
      </main>
    );
  }

  const d = data as any;

  return (
    <main className="min-h-screen bg-background">
      <header className="aurora-bg border-b border-border/60 px-4 py-10">
        <div className="mx-auto max-w-5xl">
          <p className="text-sm text-muted-foreground">{d.org?.name}</p>
          <h1 className="font-display mt-1 text-4xl">
            Bonjour {d.client?.full_name?.split(" ")[0] ?? ""}
          </h1>
          <p className="mt-2 max-w-xl text-muted-foreground">
            Vos devis, vos projets, vos factures et vos documents — au même endroit, sans compte à créer.
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-5xl space-y-10 px-4 py-10">
        {/* Devis */}
        <section className="space-y-3">
          <h2 className="font-display flex items-center gap-2 text-xl">
            <FileText className="size-5" /> Vos devis
          </h2>
          {d.quotes.length === 0 && <p className="text-sm text-muted-foreground">Aucun devis pour le moment.</p>}
          {d.quotes.map((q: any) => (
            <article key={q.id} className="surface p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-display text-lg">{q.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {q.number} · valable jusqu'au {fr(q.valid_until)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-display text-xl">{eur(q.total_ttc)}</p>
                  <Badge variant="outline">{q.status}</Badge>
                </div>
              </div>
              {q.status !== "accepte" && q.status !== "refuse" && (
                <div className="mt-4 space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor={`c-${q.id}`}>Un commentaire ou une question ?</Label>
                    <Textarea
                      id={`c-${q.id}`}
                      rows={2}
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      className="gap-2"
                      disabled={respond.isPending}
                      onClick={() => respond.mutate({ quoteId: q.id, action: "accepte" })}
                    >
                      <CheckCircle2 className="size-4" /> Accepter le devis
                    </Button>
                    <Button
                      variant="secondary"
                      className="gap-2"
                      disabled={respond.isPending || !comment.trim()}
                      onClick={() => respond.mutate({ quoteId: q.id, action: "commente" })}
                    >
                      <MessageSquare className="size-4" /> Envoyer un commentaire
                    </Button>
                    <Button
                      variant="ghost"
                      className="gap-2 text-destructive"
                      disabled={respond.isPending}
                      onClick={() => respond.mutate({ quoteId: q.id, action: "refuse" })}
                    >
                      <XCircle className="size-4" /> Refuser
                    </Button>
                  </div>
                </div>
              )}
            </article>
          ))}
        </section>

        {/* Paiements */}
        <section className="space-y-3">
          <h2 className="font-display text-xl">Vos paiements</h2>
          {d.payments.length === 0 && <p className="text-sm text-muted-foreground">Aucun paiement demandé.</p>}
          {d.payments.map((p: any) => (
            <div key={p.id} className="surface flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <p className="font-medium">{p.label}</p>
                <p className="text-sm text-muted-foreground">Échéance {fr(p.due_date)}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-display text-lg">{eur(p.amount_ttc)}</span>
                {p.status === "payee" ? (
                  <Badge>Payé</Badge>
                ) : (
                  <Button size="sm" asChild>
                    <a href={`/payer/${p.token}`}>Payer</a>
                  </Button>
                )}
              </div>
            </div>
          ))}
        </section>

        {/* Projets */}
        <section className="space-y-3">
          <h2 className="font-display flex items-center gap-2 text-xl">
            <FolderKanban className="size-5" /> Vos projets
          </h2>
          {d.projects.length === 0 && <p className="text-sm text-muted-foreground">Aucun projet en cours.</p>}
          {d.projects.map((p: any) => (
            <div key={p.id} className="surface p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="font-display text-lg">{p.name}</p>
                <Badge variant="outline">{p.status}</Badge>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                <div className="h-full bg-primary" style={{ width: `${Number(p.progress ?? 0)}%` }} />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{Number(p.progress ?? 0)} % réalisé</p>
            </div>
          ))}
        </section>

        {/* Factures */}
        <section className="space-y-3">
          <h2 className="font-display text-xl">Vos factures</h2>
          {d.invoices.length === 0 && <p className="text-sm text-muted-foreground">Aucune facture.</p>}
          {d.invoices.map((f: any) => (
            <div key={f.id} className="surface flex flex-wrap items-center justify-between gap-3 p-3 text-sm">
              <span className="font-mono text-xs text-muted-foreground">{f.number}</span>
              <span className="flex-1">{f.label ?? "Facture"}</span>
              <Badge variant={f.status === "payee" ? "default" : "outline"}>{f.status}</Badge>
              <span className="font-medium">{eur(f.amount_ttc)}</span>
            </div>
          ))}
        </section>

        {/* Demandes de l'entreprise */}
        {d.requests.length > 0 && (
          <section className="space-y-3">
            <h2 className="font-display text-xl">Informations demandées</h2>
            {d.requests.map((r: any) => (
              <div key={r.id} className="surface p-4">
                <p className="font-medium">{r.title}</p>
                {r.detail && <p className="mt-1 text-sm text-muted-foreground">{r.detail}</p>}
                {r.status === "repondu" ? (
                  <p className="mt-2 rounded-xl bg-muted/60 p-3 text-sm">{r.response}</p>
                ) : (
                  <form
                    className="mt-3 flex gap-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      const fd = new FormData(e.currentTarget);
                      const response = String(fd.get("response") ?? "").trim();
                      if (response) answer.mutate({ requestId: r.id, response });
                      e.currentTarget.reset();
                    }}
                  >
                    <Input name="response" aria-label={`Réponse à « ${r.title} »`} placeholder="Votre réponse" />
                    <Button type="submit" disabled={answer.isPending}>
                      Envoyer
                    </Button>
                  </form>
                )}
              </div>
            ))}
          </section>
        )}

        {/* Documents */}
        <section className="space-y-3">
          <h2 className="font-display flex items-center gap-2 text-xl">
            <Upload className="size-5" /> Vos documents
          </h2>
          <form
            className="surface grid gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end"
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              const name = String(fd.get("name") ?? "").trim();
              const url = String(fd.get("url") ?? "").trim();
              if (!name) { toast.error("Donnez un nom au document"); return; }
              upload.mutate({ name, fileUrl: url || null });
              e.currentTarget.reset();
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="doc_name">Nom du document</Label>
              <Input id="doc_name" name="name" placeholder="Kbis, logo, cahier des charges…" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="doc_url">Lien du fichier (facultatif)</Label>
              <Input id="doc_url" name="url" type="url" placeholder="https://…" />
            </div>
            <Button type="submit" disabled={upload.isPending}>
              Transmettre
            </Button>
          </form>
          {d.documents.map((doc: any) => (
            <div key={doc.id} className="surface flex items-center justify-between gap-3 p-3 text-sm">
              <span>{doc.name}</span>
              <span className="text-muted-foreground">{fr(doc.created_at)}</span>
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}
