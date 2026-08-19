import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { FileText, Plus, Sparkles, Wand2 } from "lucide-react";
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
import { CreditActionButton } from "@/components/credit-action-button";
import { supabase } from "@/integrations/supabase/client";
import { useOrgId, useRows, eur2, frDate } from "@/lib/db";
import {
  MEETING_SOURCES,
  QUOTE_STATUS_LABEL,
  addDays,
  detectionAction,
  isoDate,
  nextNumber,
} from "@/lib/sales";
import { analyzeMeeting } from "@/lib/sales.functions";

/* eslint-disable @typescript-eslint/no-explicit-any */

export const Route = createFileRoute("/_authenticated/devis/")({
  head: () => ({
    meta: [
      { title: "Devis — Kobyde" },
      {
        name: "description",
        content:
          "Créez vos devis à la main ou laissez Michael les détecter automatiquement depuis un compte rendu de réunion.",
      },
      { property: "og:title", content: "Devis — Kobyde" },
      { property: "og:description", content: "Devis, versions, validation et envoi au client." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DevisPage,
});

function DevisPage() {
  const orgId = useOrgId();
  const navigate = useNavigate();
  const { data: quotes, isLoading, refetch } = useRows<any>("quotes");
  const { data: clients } = useRows<any>("clients");
  const [manual, setManual] = useState(false);
  const [meeting, setMeeting] = useState(false);
  const [analysis, setAnalysis] = useState<any | null>(null);
  const [meetingClient, setMeetingClient] = useState("");
  const [transcript, setTranscript] = useState("");

  const clientName = (id: string | null) => {
    const c = (clients ?? []).find((x: any) => x.id === id);
    return c ? c.company_name || c.full_name : "Client non renseigné";
  };

  const createManual = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!orgId) return;
    const fd = new FormData(e.currentTarget);
    const { data, error } = await supabase
      .from("quotes")
      .insert({
        org_id: orgId,
        client_id: String(fd.get("client_id") ?? "") || null,
        number: nextNumber("DEV"),
        title: String(fd.get("title") ?? "Nouveau devis"),
        status: "brouillon",
        validity_days: 30,
        valid_until: isoDate(addDays(30)),
        source: "manuel",
      })
      .select("id")
      .single();
    if (error) return toast.error(error.message);
    setManual(false);
    navigate({ to: "/devis/$id", params: { id: data.id } });
  };

  const runAnalysis = async () => {
    const res = await analyzeMeeting({
      data: { clientId: meetingClient || null, transcript, source: "Transcription" },
    });
    setAnalysis(res);
    return res;
  };

  const createFromAnalysis = async () => {
    if (!orgId || !analysis) return;
    const retained = (analysis.lignes ?? []).filter((l: any) => detectionAction(l.detection) !== "exclure");
    const { data: quote, error } = await supabase
      .from("quotes")
      .insert({
        org_id: orgId,
        client_id: meetingClient || null,
        number: nextNumber("DEV"),
        title: analysis.titre ?? "Devis issu de la réunion",
        status: "brouillon",
        validity_days: 30,
        valid_until: isoDate(addDays(30)),
        source: "reunion",
        analysis: analysis,
        notes: analysis.synthese ?? null,
      })
      .select("id")
      .single();
    if (error) return toast.error(error.message);

    if (retained.length) {
      const { error: e2 } = await supabase.from("quote_items").insert(
        retained.map((l: any) => ({
          org_id: orgId,
          quote_id: quote.id,
          label: l.libelle,
          description: l.detail ?? null,
          quantity: Number(l.quantite ?? 1),
          unit_price: Number(l.prix_ht ?? 0),
          vat_rate: 20,
          detection: l.detection ?? "Discuté",
          source_quote: l.citation ?? null,
          in_catalog: !!l.au_catalogue,
        })),
      );
      if (e2) toast.error(e2.message);
    }
    setMeeting(false);
    setAnalysis(null);
    void refetch();
    navigate({ to: "/devis/$id", params: { id: quote.id } });
  };

  return (
    <AppShell
      title="Devis"
      subtitle="Michael transforme un besoin — ou un compte rendu de réunion — en devis prêt à envoyer."
      action={
        <div className="flex gap-2">
          <Button variant="secondary" className="gap-2" onClick={() => setMeeting(true)}>
            <Sparkles className="size-4" /> <span className="hidden sm:inline">Depuis une réunion</span>
          </Button>
          <Button className="gap-2" onClick={() => setManual(true)}>
            <Plus className="size-4" /> <span className="hidden sm:inline">Nouveau devis</span>
          </Button>
        </div>
      }
    >
      {isLoading ? (
        <div className="surface p-10 text-center text-muted-foreground">Chargement…</div>
      ) : (quotes ?? []).length === 0 ? (
        <div className="surface p-12 text-center">
          <FileText className="mx-auto size-8 text-muted-foreground" />
          <p className="font-display mt-3 text-xl">Aucun devis pour le moment</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Collez le compte rendu d'une réunion : Michael identifie ce qui a été validé et prépare le devis.
          </p>
          <Button className="mt-6 gap-2" onClick={() => setMeeting(true)}>
            <Wand2 className="size-4" /> Analyser une réunion
          </Button>
        </div>
      ) : (
        <div className="grid gap-3">
          {(quotes ?? []).map((q: any) => (
            <Link
              key={q.id}
              to="/devis/$id"
              params={{ id: q.id }}
              className="surface flex flex-wrap items-center justify-between gap-4 p-4 transition hover:shadow-md"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs text-muted-foreground">{q.number}</span>
                  <h3 className="font-display truncate text-lg">{q.title}</h3>
                  <Badge variant="secondary">{QUOTE_STATUS_LABEL[q.status] ?? q.status}</Badge>
                  {q.version > 1 && <Badge variant="outline">v{q.version}</Badge>}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {clientName(q.client_id)} · valable jusqu'au {frDate(q.valid_until)}
                </p>
              </div>
              <div className="text-right">
                <p className="font-display text-xl">{eur2(q.total_ttc)}</p>
                <p className="text-xs text-muted-foreground">{eur2(q.total_ht)} HT</p>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Devis manuel */}
      <Dialog open={manual} onOpenChange={setManual}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouveau devis</DialogTitle>
            <DialogDescription>Vous ajouterez les lignes juste après.</DialogDescription>
          </DialogHeader>
          <form onSubmit={createManual} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="q_title">Titre</Label>
              <Input id="q_title" name="title" required placeholder="Refonte du site vitrine" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="q_client">Client</Label>
              <select
                id="q_client"
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
            <DialogFooter>
              <Button type="submit">Créer le devis</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Depuis une réunion */}
      <Dialog
        open={meeting}
        onOpenChange={(o) => {
          setMeeting(o);
          if (!o) setAnalysis(null);
        }}
      >
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Devis depuis une réunion</DialogTitle>
            <DialogDescription>
              Collez la transcription, le résumé ou le compte rendu ({MEETING_SOURCES.join(", ")}). Michael
              distingue ce qui est validé, discuté ou refusé — sans jamais inventer un prix.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="m_client">Client</Label>
              <select
                id="m_client"
                value={meetingClient}
                onChange={(e) => setMeetingClient(e.target.value)}
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
            <div className="space-y-1.5">
              <Label htmlFor="m_text">Compte rendu</Label>
              <Textarea
                id="m_text"
                rows={8}
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                placeholder="Collez ici la transcription de la réunion…"
              />
            </div>

            {analysis && (
              <div className="surface space-y-3 p-4">
                <p className="font-display text-lg">{analysis.titre}</p>
                {analysis.synthese && <p className="text-sm text-muted-foreground">{analysis.synthese}</p>}
                <ul className="grid gap-2">
                  {(analysis.lignes ?? []).map((l: any, i: number) => (
                    <li key={i} className="rounded-xl bg-muted/50 p-3 text-sm">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-medium">{l.libelle}</span>
                        <span className="flex items-center gap-2">
                          <Badge variant="outline">{l.detection}</Badge>
                          <span>{l.prix_ht ? eur2(l.prix_ht) : "Non trouvé"}</span>
                        </span>
                      </div>
                      {l.citation && (
                        <p className="mt-1 text-xs italic text-muted-foreground">« {l.citation} »</p>
                      )}
                    </li>
                  ))}
                </ul>
                {Array.isArray(analysis.manquants) && analysis.manquants.length > 0 && (
                  <p className="text-sm text-muted-foreground">
                    À préciser : {analysis.manquants.join(", ")}
                  </p>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            {analysis ? (
              <Button onClick={createFromAnalysis}>Créer le devis</Button>
            ) : (
              <CreditActionButton
                actionKey="quote.from_meeting"
                label="Analyser la réunion"
                disabled={transcript.trim().length < 20}
                onConfirm={runAnalysis}
              />
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
