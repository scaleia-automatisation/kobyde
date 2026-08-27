import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { FileText, Mic, Package, Plus, Sparkles, Trash2, X } from "lucide-react";
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
import { CreditActionButton } from "@/components/credit-action";
import { supabase } from "@/integrations/supabase/client";
import { useDeleteAllRows, useDeleteRow, useOrgId, useRows, eur2, frDate } from "@/lib/db";
import { MEETING_SOURCES, QUOTE_STATUS_LABEL, addDays, isoDate, nextNumber } from "@/lib/sales";
import { analyzeMeeting, analyzeMeetingAudio } from "@/lib/sales.functions";
import { detectDuplicates, type DuplicateMatch } from "@/lib/context-engine";
import { DuplicateGuardDialog } from "@/components/duplicate-guard";

/* eslint-disable @typescript-eslint/no-explicit-any */

export const Route = createFileRoute("/_authenticated/devis/")({
  head: () => ({
    meta: [
      { title: "Devis — Kobyde" },
      {
        name: "description",
        content:
          "Créez vos devis en quelques clics : depuis un audio, une transcription de réunion ou directement depuis vos offres.",
      },
      { property: "og:title", content: "Devis — Kobyde" },
      { property: "og:description", content: "Devis, versions, validation et envoi au client." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DevisPage,
});

const readFile = (file: File) =>
  new Promise<{ name: string; mime: string; base64: string }>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Lecture du fichier impossible."));
    reader.onload = () =>
      resolve({ name: file.name, mime: file.type || "", base64: String(reader.result ?? "").split(",").pop() ?? "" });
    reader.readAsDataURL(file);
  });

function DevisPage() {
  const orgId = useOrgId();
  const navigate = useNavigate();
  const { data: quotes, isLoading, refetch } = useRows<any>("quotes");
  const removeQuote = useDeleteRow("quotes");
  const removeAllQuotes = useDeleteAllRows("quotes");
  const { data: clients } = useRows<any>("clients");
  const { data: products } = useRows<any>("products");

  const [manual, setManual] = useState(false);
  const [meeting, setMeeting] = useState(false);
  const [audioOpen, setAudioOpen] = useState(false);
  const [catalog, setCatalog] = useState(false);

  const [analysis, setAnalysis] = useState<any | null>(null);
  const [meetingClient, setMeetingClient] = useState("");
  const [transcript, setTranscript] = useState("");
  const [meetingTitle, setMeetingTitle] = useState("");

  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioTitle, setAudioTitle] = useState("");
  const [audioClient, setAudioClient] = useState("");

  const [catalogClient, setCatalogClient] = useState("");
  const [catalogTitle, setCatalogTitle] = useState("");
  const [picked, setPicked] = useState<Record<string, number>>({});
  const [dupe, setDupe] = useState<{ matches: DuplicateMatch[]; create: () => void } | null>(null);

  const FINALISES = ["accepte", "accepté", "refuse", "refusé", "expire", "expiré", "annule", "annulé"];

  /** Non-duplication : un devis similaire non finalisé existe-t-il déjà ? */
  const guardQuote = (candidate: Record<string, unknown>, create: () => void) => {
    const ouverts = (quotes ?? []).filter(
      (q: any) => !FINALISES.includes(String(q.status ?? "").toLowerCase()),
    );
    const matches = detectDuplicates("devis", candidate, ouverts, { recentDays: 90, threshold: 0.8 }).filter(
      (m: DuplicateMatch) => !candidate["client_id"] || String((m.row as any).client_id ?? "") === String(candidate["client_id"]),
    );
    if (matches.length) { setDupe({ matches, create }); return; }
    create();
  };

  const clientName = (id: string | null) => {
    const c = (clients ?? []).find((x: any) => x.id === id);
    return c ? c.company_name || c.full_name : "Client non renseigné";
  };

  const createManual = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!orgId) return;
    const fd = new FormData(e.currentTarget);
    const clientId = String(fd.get("client_id") ?? "") || null;
    const titre = String(fd.get("title") ?? "Nouveau devis");
    const run = async () => {
    const { data, error } = await supabase
      .from("quotes")
      .insert({
        org_id: orgId,
        client_id: clientId,
        number: nextNumber("DEV"),
        title: titre,
        status: "brouillon",
        validity_days: 30,
        valid_until: isoDate(addDays(30)),
        source: "manuel",
      })
      .select("id")
      .single();
    if (error) { toast.error(error.message); return; }
    setManual(false);
    navigate({ to: "/devis/$id", params: { id: data.id } });
    };
    guardQuote({ client_id: clientId, title: titre }, () => void run());
  };

  const runAnalysis = async (idempotencyKey: string) => {
    if (!orgId) return;
    const res = await analyzeMeeting({
      data: {
        orgId,
        idempotencyKey,
        title: meetingTitle.trim() || "Réunion client",
        clientId: meetingClient || null,
        transcript,
        source: "Transcription",
      },
    });
    setAnalysis(res);
  };

  const runAudioAnalysis = async (idempotencyKey: string) => {
    if (!orgId || !audioFile) return;
    const res = await analyzeMeetingAudio({
      data: {
        orgId,
        idempotencyKey,
        title: audioTitle.trim() || "Réunion client (audio)",
        clientId: audioClient || null,
        audio: await readFile(audioFile),
      },
    });
    setMeetingTitle(audioTitle.trim() || "Réunion client (audio)");
    setMeetingClient(audioClient);
    setTranscript(res.transcript ?? "");
    setAnalysis(res);
  };

  const createFromAnalysis = async () => {
    if (!orgId || !analysis) return;
    guardQuote(
      { client_id: meetingClient || null, title: meetingTitle.trim() || "Devis issu de la réunion" },
      () => void doCreateFromAnalysis(),
    );
  };

  const doCreateFromAnalysis = async () => {
    if (!orgId || !analysis) return;
    const retained = (analysis.besoins ?? []).filter((b: any) => b.retenu);
    const { data: quote, error } = await supabase
      .from("quotes")
      .insert({
        org_id: orgId,
        client_id: meetingClient || null,
        number: nextNumber("DEV"),
        title: meetingTitle.trim() || "Devis issu de la réunion",
        status: "brouillon",
        validity_days: 30,
        valid_until: isoDate(addDays(30)),
        source: "reunion",
        meeting_id: analysis.meetingId ?? null,
        analysis: analysis.besoins ?? [],
        notes: analysis.compte_rendu ?? null,
      })
      .select("id")
      .single();
    if (error) { toast.error(error.message); return; }

    if (retained.length) {
      const { error: e2 } = await supabase.from("quote_items").insert(
        retained.map((b: any, i: number) => ({
          org_id: orgId,
          quote_id: quote.id,
          product_id: b.product_id ?? null,
          label: b.service,
          quantity: Number(b.quantite ?? 1),
          unit_price: Number(b.prix_ht ?? 0),
          vat_rate: Number(b.vat_rate ?? 20),
          position: i,
        })),
      );
      if (e2) toast.error(e2.message);
    }
    setMeeting(false);
    setAudioOpen(false);
    setAnalysis(null);
    void refetch();
    navigate({ to: "/devis/$id", params: { id: quote.id } });
  };

  const createFromCatalog = async () => {
    if (!orgId) return;
    if (!Object.entries(picked).some(([, q]) => q > 0)) {
      toast.error("Sélectionnez au moins un produit ou service.");
      return;
    }
    guardQuote(
      { client_id: catalogClient || null, title: catalogTitle.trim() || "Devis catalogue" },
      () => void doCreateFromCatalog(),
    );
  };

  const doCreateFromCatalog = async () => {
    if (!orgId) return;
    const lines = Object.entries(picked).filter(([, qty]) => qty > 0);
    if (!lines.length) { toast.error("Sélectionnez au moins un produit ou service."); return; }

    const { data: quote, error } = await supabase
      .from("quotes")
      .insert({
        org_id: orgId,
        client_id: catalogClient || null,
        number: nextNumber("DEV"),
        title: catalogTitle.trim() || "Devis catalogue",
        status: "brouillon",
        validity_days: 30,
        valid_until: isoDate(addDays(30)),
        source: "manuel",
      })
      .select("id")
      .single();
    if (error) { toast.error(error.message); return; }

    const { error: e2 } = await supabase.from("quote_items").insert(
      lines.map(([id, qty], i) => {
        const p = (products ?? []).find((x: any) => x.id === id);
        return {
          org_id: orgId,
          quote_id: quote.id,
          product_id: id,
          label: p?.name ?? "Prestation",
          quantity: qty,
          unit_price: Number(p?.price_ht ?? p?.price ?? 0),
          vat_rate: Number(p?.vat_rate ?? 20),
          position: i,
        };
      }),
    );
    if (e2) toast.error(e2.message);

    setCatalog(false);
    setPicked({});
    void refetch();
    navigate({ to: "/devis/$id", params: { id: quote.id } });
  };

  const clientSelect = (id: string, value: string, onChange: (v: string) => void) => (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"
    >
      <option value="">— Choisir —</option>
      {(clients ?? []).map((c: any) => (
        <option key={c.id} value={c.id}>
          {c.company_name || c.full_name}
        </option>
      ))}
    </select>
  );

  return (
    <AppShell
      title="Devis"
      subtitle="Michael transforme un besoin — ou un compte rendu de réunion — en devis prêt à envoyer."
      action={
        <div className="flex items-center gap-2">
          {(quotes ?? []).length > 0 && (
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => {
                if (!window.confirm("Supprimer définitivement tous les devis ?")) return;
                removeAllQuotes.mutate(undefined, { onSuccess: () => toast.success("Tous les devis ont été supprimés") });
              }}
            >
              <Trash2 className="size-4" /> <span className="hidden sm:inline">Tout supprimer</span>
            </Button>
          )}
          <Button variant="secondary" className="gap-2" onClick={() => setManual(true)}>
            <Plus className="size-4" /> <span className="hidden sm:inline">Devis vierge</span>
          </Button>
        </div>
      }
    >
      <section className="surface p-6 sm:p-8">
        <h2 className="font-display text-2xl sm:text-3xl">Votre devis créé en quelques clics</h2>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Choisissez votre point de départ : un enregistrement audio, une transcription écrite, ou directement
          votre catalogue de produits et services.
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <button
            type="button"
            onClick={() => setAudioOpen(true)}
            className="agent-suggestion-chip flex items-start gap-3 p-4 text-left"
          >
            <Mic className="mt-0.5 size-5 text-primary" />
            <span>
              <span className="block font-medium">Insérer un audio</span>
              <span className="block text-xs text-muted-foreground">
                Transcription puis analyse de l'enregistrement.
              </span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => setMeeting(true)}
            className="agent-suggestion-chip flex items-start gap-3 p-4 text-left"
          >
            <Sparkles className="mt-0.5 size-5 text-primary" />
            <span>
              <span className="block font-medium">Insérer une transcription</span>
              <span className="block text-xs text-muted-foreground">
                Collez le compte rendu, Michael analyse les besoins.
              </span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => setCatalog(true)}
            className="agent-suggestion-chip flex items-start gap-3 p-4 text-left"
          >
            <Package className="mt-0.5 size-5 text-primary" />
            <span>
              <span className="block font-medium">À partir des offres</span>
              <span className="block text-xs text-muted-foreground">
                Choisissez les produits ou services et le client.
              </span>
            </span>
          </button>
        </div>
      </section>

      {/* Suivi des devis : envoyés, acceptés, en attente, refusés */}
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {STATS.map((s) => (
          <button
            key={s.key}
            type="button"
            onClick={() => setFilter((f) => (f === s.key ? "tous" : s.key))}
            className={`surface p-4 text-left transition hover:shadow-md ${
              filter === s.key ? "ring-2 ring-primary" : ""
            }`}
          >
            <p className="text-sm text-muted-foreground">{s.label}</p>
            <p className="font-display mt-1 text-3xl">{counts[s.key]}</p>
            <p className="text-xs text-muted-foreground">{eur2(amounts[s.key])}</p>
          </button>
        ))}
      </div>

      {filter !== "tous" && (
        <button
          type="button"
          onClick={() => setFilter("tous")}
          className="mt-3 text-sm text-primary underline-offset-4 hover:underline"
        >
          Afficher tous les devis
        </button>
      )}

      {events && events.length > 0 && (
        <section className="surface mt-6 p-5">
          <h3 className="font-display text-lg">Derniers événements écoutés</h3>
          <p className="text-xs text-muted-foreground">
            Emails, SMS, WhatsApp et actions du client sur ses devis, en temps réel.
          </p>
          <ul className="mt-3 space-y-2">
            {events.slice(0, 8).map((e: any) => (
              <li key={e.id} className="flex flex-wrap items-center gap-2 text-sm">
                <Badge variant="outline">{e.channel}</Badge>
                <span className="font-medium">{e.title}</span>
                <span className="text-xs text-muted-foreground">{frDate(e.occurred_at)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="mt-6">
        {isLoading ? (
          <div className="surface p-10 text-center text-muted-foreground">Chargement…</div>
        ) : (quotes ?? []).length === 0 ? (
          <div className="surface p-12 text-center">
            <FileText className="mx-auto size-8 text-muted-foreground" />
            <p className="font-display mt-3 text-xl">Aucun devis pour le moment</p>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              Démarrez avec l'un des trois parcours ci-dessus.
            </p>
          </div>
        ) : visibles.length === 0 ? (
          <div className="surface p-10 text-center text-muted-foreground">
            Aucun devis dans cette catégorie.
          </div>
        ) : (
          <div className="grid gap-3">
            {visibles.map((q: any) => (

              <div key={q.id} className="relative">
                <Link
                  to="/devis/$id"
                  params={{ id: q.id }}
                  className="surface flex flex-wrap items-center justify-between gap-4 p-4 pr-12 transition hover:shadow-md"
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
                <button
                  type="button"
                  aria-label="Supprimer le devis"
                  onClick={() => {
                    if (!window.confirm(`Supprimer le devis ${q.number} ?`)) return;
                    removeQuote.mutate(q.id, { onSuccess: () => toast.success("Devis supprimé") });
                  }}
                  className="absolute right-3 top-3 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted"
                >
                  <X className="size-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

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

      {/* Depuis un audio */}
      <Dialog
        open={audioOpen}
        onOpenChange={(o) => {
          setAudioOpen(o);
          if (!o) setAnalysis(null);
        }}
      >
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Devis depuis un audio</DialogTitle>
            <DialogDescription>
              Importez l'enregistrement de la réunion : il est transcrit, puis analysé pour préparer le devis.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="a_title">Titre de la réunion</Label>
              <Input
                id="a_title"
                value={audioTitle}
                onChange={(e) => setAudioTitle(e.target.value)}
                placeholder="Point besoin — refonte du site"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="a_client">Client</Label>
              {clientSelect("a_client", audioClient, setAudioClient)}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="a_file">Fichier audio</Label>
              <Input
                id="a_file"
                type="file"
                accept="audio/*"
                onChange={(e) => setAudioFile(e.target.files?.[0] ?? null)}
              />
              <p className="text-xs text-muted-foreground">Formats mp3, m4a, wav, ogg, webm — 20 Mo maximum.</p>
            </div>

            {analysis?.transcript && (
              <div className="surface space-y-2 p-4">
                <p className="font-display text-lg">Transcription</p>
                <p className="max-h-40 overflow-y-auto whitespace-pre-wrap text-sm text-muted-foreground">
                  {analysis.transcript}
                </p>
              </div>
            )}
            {analysis && <AnalysisCard analysis={analysis} />}
          </div>

          <DialogFooter className="gap-2">
            {analysis ? (
              <Button onClick={createFromAnalysis}>Créer le devis</Button>
            ) : (
              <CreditActionButton
                actionKey="meeting.audio_analysis"
                disabled={!audioFile}
                onConfirm={runAudioAnalysis}
              >
                Analyser l'audio
              </CreditActionButton>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Depuis une transcription */}
      <Dialog
        open={meeting}
        onOpenChange={(o) => {
          setMeeting(o);
          if (!o) setAnalysis(null);
        }}
      >
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Devis depuis une transcription</DialogTitle>
            <DialogDescription>
              Collez la transcription, le résumé ou le compte rendu ({MEETING_SOURCES.join(", ")}). Michael
              distingue ce qui est validé, discuté ou refusé — sans jamais inventer un prix.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="m_title">Titre de la réunion</Label>
              <Input
                id="m_title"
                value={meetingTitle}
                onChange={(e) => setMeetingTitle(e.target.value)}
                placeholder="Point besoin — refonte du site"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="m_client">Client</Label>
              {clientSelect("m_client", meetingClient, setMeetingClient)}
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

            {analysis && <AnalysisCard analysis={analysis} />}
          </div>

          <DialogFooter className="gap-2">
            {analysis ? (
              <Button onClick={createFromAnalysis}>Créer le devis</Button>
            ) : (
              <CreditActionButton
                actionKey="quote.from_meeting"
                disabled={transcript.trim().length < 20}
                onConfirm={runAnalysis}
              >
                Analyser la transcription
              </CreditActionButton>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Depuis vos offres */}
      <Dialog open={catalog} onOpenChange={setCatalog}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Devis à partir du catalogue</DialogTitle>
            <DialogDescription>
              Sélectionnez les produits ou services, ajustez les quantités, puis choisissez le client.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="c_title">Titre du devis</Label>
              <Input
                id="c_title"
                value={catalogTitle}
                onChange={(e) => setCatalogTitle(e.target.value)}
                placeholder="Prestation de janvier"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c_client">Client</Label>
              {clientSelect("c_client", catalogClient, setCatalogClient)}
            </div>

            {(products ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Vos offres sont vides. Ajoutez d'abord des produits ou services depuis la page Offres.
              </p>
            ) : (
              <ul className="grid gap-2">
                {(products ?? []).map((p: any) => {
                  const qty = picked[p.id] ?? 0;
                  return (
                    <li key={p.id} className="flex flex-wrap items-center gap-3 rounded-xl bg-muted/50 p-3">
                      <input
                        type="checkbox"
                        className="size-4"
                        checked={qty > 0}
                        onChange={(e) =>
                          setPicked((prev) => ({
                            ...prev,
                            [p.id]: e.target.checked ? Number(p.default_quantity ?? 1) || 1 : 0,
                          }))
                        }
                        aria-label={`Ajouter ${p.name}`}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{p.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {eur2(Number(p.price_ht ?? p.price ?? 0))} HT
                          {p.unit ? ` · ${p.unit}` : ""}
                        </p>
                      </div>
                      <Input
                        type="number"
                        min={1}
                        step="1"
                        className="h-9 w-20"
                        value={qty || 1}
                        disabled={qty === 0}
                        onChange={(e) =>
                          setPicked((prev) => ({ ...prev, [p.id]: Math.max(1, Number(e.target.value) || 1) }))
                        }
                        aria-label={`Quantité pour ${p.name}`}
                      />
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <DialogFooter>
            <Button onClick={createFromCatalog} disabled={!Object.values(picked).some((q) => q > 0)}>
              Créer le devis
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DuplicateGuardDialog
        open={!!dupe}
        onOpenChange={(v) => !v && setDupe(null)}
        title="Un devis similaire existe déjà"
        description="Avant de créer, vérifiez s'il s'agit du même besoin. Vous pouvez reprendre le devis existant plutôt que d'en créer un doublon."
        matches={dupe?.matches ?? []}
        render={(row) => ({
          primary: row.title || row.number || "Devis",
          details: [
            row.number ? `Référence ${row.number}` : "",
            row.total_ht != null ? `Montant HT : ${eur2(Number(row.total_ht))}` : "",
            row.created_at ? `Créé le ${new Date(row.created_at).toLocaleDateString("fr-FR")}` : "",
          ],
          status: row.status,
        })}
        options={[
          {
            label: "Ouvrir et compléter le devis existant",
            recommended: true,
            onSelect: (row) => {
              setDupe(null);
              setManual(false);
              navigate({ to: "/devis/$id", params: { id: row.id } });
            },
          },
          {
            label: "Créer quand même un nouveau devis",
            variant: "outline",
            onSelect: () => {
              const create = dupe?.create;
              setDupe(null);
              create?.();
            },
          },
          { label: "Annuler", variant: "ghost", onSelect: () => setDupe(null) },
        ]}
      />
    </AppShell>

  );
}

function AnalysisCard({ analysis }: { analysis: any }) {
  return (
    <div className="surface space-y-3 p-4">
      <p className="font-display text-lg">Ce que Michael a compris</p>
      {analysis.resume && <p className="text-sm text-muted-foreground">{analysis.resume}</p>}
      <ul className="grid gap-2">
        {(analysis.besoins ?? []).map((b: any, i: number) => (
          <li key={i} className="rounded-xl bg-muted/50 p-3 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-medium">{b.service}</span>
              <span className="flex items-center gap-2">
                <Badge variant="outline">{b.detection}</Badge>
                <span>{b.prix_ht > 0 ? eur2(b.prix_ht) : "Non trouvé"}</span>
              </span>
            </div>
            {b.justification && (
              <p className="mt-1 text-xs italic text-muted-foreground">« {b.justification} »</p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
