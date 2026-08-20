import { useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Copy as CopyIcon,
  Download,
  FileAudio,
  FileText,
  Loader2,
  RefreshCw,
  Shield,
  Trash2,
  Upload,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CreditActionButton } from "@/components/credit-action";
import { GenerationActions } from "@/components/generation-actions";
import { toReadableText } from "@/lib/generation-text";
import { frDate, useOrgId, useRows } from "@/lib/db";
import {
  HR_STAGES,
  HR_STAGE_LABELS,
  INVITE_STATUSES,
  RGPD_NOTICE,
  RETENTION_MONTHS,
  scoreTone,
  stageProgress,
} from "@/lib/hr";
import {
  analyzeInterviewAudio,
  analyzeJobOffer,
  deleteCandidateData,
  exportCandidate,
  getHrFileUrl,
  importCandidate,
  proposeInterview,
  scoreCandidate,
  updateCandidate,
  updateInterview,
} from "@/lib/hr.functions";

/* eslint-disable @typescript-eslint/no-explicit-any */

export const Route = createFileRoute("/_authenticated/rh")({
  head: () => ({
    meta: [
      { title: "RH et recrutement — Kobyde" },
      {
        name: "description",
        content:
          "Mariéme analyse vos offres, lit les CV, note les candidats, organise les entretiens et respecte le RGPD.",
      },
      { property: "og:title", content: "RH et recrutement — Kobyde" },
      { property: "og:description", content: "De l'offre à la décision : un recrutement piloté par votre agent RH." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: HrPage,
});

/* --------------------------------- utilitaires -------------------------------- */

const readFile = (file: File) =>
  new Promise<{ name: string; mime: string; base64: string }>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      resolve({ name: file.name, mime: file.type || "", base64: String(reader.result ?? "").split(",").pop() ?? "" });
    reader.onerror = () => reject(new Error("Lecture du fichier impossible."));
    reader.readAsDataURL(file);
  });

function FilePick({
  label,
  accept,
  file,
  onPick,
}: {
  label: string;
  accept: string;
  file: File | null;
  onPick: (f: File | null) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div className="flex items-center gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => ref.current?.click()}>
          <Upload className="mr-1.5 size-4" /> Choisir
        </Button>
        <span className="truncate text-sm text-muted-foreground">{file ? file.name : "Aucun fichier"}</span>
        {file ? (
          <Button type="button" variant="ghost" size="sm" onClick={() => onPick(null)}>
            Retirer
          </Button>
        ) : null}
      </div>
      <input
        ref={ref}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => onPick(e.target.files?.[0] ?? null)}
      />
    </div>
  );
}

function Bullets({ title, items }: { title: string; items: any }) {
  const list = Array.isArray(items) ? items.filter(Boolean) : [];
  if (!list.length) return null;
  return (
    <div>
      <p className="text-sm font-semibold">{title}</p>
      <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
        {list.map((x: any, i: number) => (
          <li key={i}>{typeof x === "string" ? x : toReadableText(x)}</li>
        ))}
      </ul>
    </div>
  );
}

/* ----------------------------------- Offres ----------------------------------- */

function OffersTab() {
  const orgId = useOrgId();
  const qc = useQueryClient();
  const { data: offers = [] } = useRows<any>("job_offers", { order: "created_at" });
  const [mode, setMode] = useState<"texte" | "lien">("texte");
  const [content, setContent] = useState("");
  const [url, setUrl] = useState("");
  const [result, setResult] = useState<any>(null);
  const [edited, setEdited] = useState<string | null>(null);
  const fn = useServerFn(analyzeJobOffer);

  const run = useMutation({
    mutationFn: (idempotencyKey: string) =>
      fn({ data: { orgId: orgId!, idempotencyKey, mode, content, url, offerId: null } }),
    onSuccess: (r: any) => {
      setResult(r.analysis);
      setEdited(null);
      void qc.invalidateQueries({ queryKey: ["rows", "job_offers"] });
      toast.success("Offre analysée par Mariéme.");
    },
    onError: (e: any) => toast.error(e?.message ?? "Échec de l'analyse."),
  });

  return (
    <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
      <Card className="h-fit space-y-4 p-5">
        <div>
          <h2 className="font-semibold">Offre d'emploi</h2>
          <p className="text-sm text-muted-foreground">Collez l'offre ou importez-la depuis un lien.</p>
        </div>
        <div className="flex gap-2">
          <Button variant={mode === "texte" ? "default" : "outline"} size="sm" onClick={() => setMode("texte")}>
            Coller l'offre
          </Button>
          <Button variant={mode === "lien" ? "default" : "outline"} size="sm" onClick={() => setMode("lien")}>
            Importer depuis un lien
          </Button>
        </div>
        {mode === "texte" ? (
          <Textarea rows={12} value={content} onChange={(e) => setContent(e.target.value)} placeholder="Collez ici le texte complet de l'offre…" />
        ) : (
          <div className="space-y-1.5">
            <Label>Lien de l'offre</Label>
            <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" />
          </div>
        )}
        <CreditActionButton actionKey="hr.job_analysis" pending={run.isPending} onConfirm={(k) => run.mutateAsync(k)}>
          Analyser l'offre
        </CreditActionButton>
      </Card>

      <div className="space-y-4">
        {run.isPending ? (
          <Card className="flex items-center gap-3 p-6 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Mariéme lit l'offre…
          </Card>
        ) : null}

        {result ? (
          <Card className="space-y-4 p-5">
            <GenerationActions
              title={`Offre — ${result.intitule || "analyse"}`}
              text={edited ?? toReadableText(result)}
              onEdit={setEdited}
              regenerateSlot={
                <CreditActionButton
                  actionKey="hr.job_analysis"
                  className="inline-block"
                  buttonClassName="gap-1.5"
                  variant="outline"
                  size="sm"
                  pending={run.isPending}
                  onConfirm={(k) => run.mutateAsync(k)}
                >
                  <RefreshCw className="h-4 w-4" /> Régénérer
                </CreditActionButton>
              }
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1 text-sm">
                <p className="font-semibold">{result.intitule || "Poste"}</p>
                <p className="text-muted-foreground">Expérience : {result.experience || "Non trouvé"}</p>
                <p className="text-muted-foreground">Formation : {result.formation || "Non trouvé"}</p>
                <p className="text-muted-foreground">Localisation : {result.localisation || "Non trouvé"}</p>
                <p className="text-muted-foreground">Contrat : {result.contrat || "Non trouvé"}</p>
                <p className="text-muted-foreground">Langues : {(result.langues ?? []).join(", ") || "Non trouvé"}</p>
              </div>
              <div className="space-y-3">
                <Bullets title="Critères obligatoires" items={result.criteres_obligatoires} />
                <Bullets title="Critères souhaités" items={result.criteres_souhaites} />
              </div>
            </div>
            <Bullets title="Missions" items={result.missions} />
            <Bullets title="Compétences" items={result.competences} />
          </Card>
        ) : null}

        <Card className="p-5">
          <h3 className="mb-3 font-semibold">Vos offres</h3>
          {offers.length ? (
            <ul className="space-y-2 text-sm">
              {offers.map((o: any) => (
                <li key={o.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="font-medium">{o.title}</p>
                    <p className="text-muted-foreground">
                      {[o.contract, o.location].filter(Boolean).join(" · ") || "—"} · {frDate(o.created_at)}
                    </p>
                  </div>
                  <Badge variant="secondary">{o.status ?? "ouverte"}</Badge>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">Analysez une première offre pour démarrer un recrutement.</p>
          )}
        </Card>
      </div>
    </div>
  );
}

/* --------------------------------- Candidats ---------------------------------- */

function ImportCandidate({ offers, onDone }: { offers: any[]; onDone: () => void }) {
  const orgId = useOrgId();
  const [offerId, setOfferId] = useState<string>("");
  const [cv, setCv] = useState<File | null>(null);
  const [letter, setLetter] = useState<File | null>(null);
  const fn = useServerFn(importCandidate);

  const run = useMutation({
    mutationFn: async (idempotencyKey: string) => {
      if (!cv) throw new Error("Ajoutez d'abord un CV (PDF ou DOCX).");
      return fn({
        data: {
          orgId: orgId!,
          idempotencyKey,
          offerId: offerId || null,
          cv: await readFile(cv),
          letter: letter ? await readFile(letter) : null,
        },
      });
    },
    onSuccess: () => {
      setCv(null);
      setLetter(null);
      onDone();
      toast.success("Candidature importée et analysée.");
    },
    onError: (e: any) => toast.error(e?.message ?? "Échec de l'import."),
  });

  return (
    <Card className="h-fit space-y-4 p-5">
      <div>
        <h2 className="font-semibold">Nouveau candidat</h2>
        <p className="text-sm text-muted-foreground">CV et lettre au format PDF ou DOCX.</p>
      </div>
      <div className="space-y-1.5">
        <Label>Offre concernée</Label>
        <select
          className="h-10 w-full rounded-md border bg-background px-3 text-sm"
          value={offerId}
          onChange={(e) => setOfferId(e.target.value)}
        >
          <option value="">— Aucune offre —</option>
          {offers.map((o: any) => (
            <option key={o.id} value={o.id}>
              {o.title}
            </option>
          ))}
        </select>
      </div>
      <FilePick label="CV (PDF ou DOCX)" accept=".pdf,.docx" file={cv} onPick={setCv} />
      <FilePick label="Lettre de motivation (facultatif)" accept=".pdf,.docx" file={letter} onPick={setLetter} />
      <CreditActionButton actionKey="hr.cv_analysis" pending={run.isPending} onConfirm={(k) => run.mutateAsync(k)}>
        Importer et analyser
      </CreditActionButton>
      <p className="text-xs text-muted-foreground">
        Conservation {RETENTION_MONTHS} mois. Le candidat peut demander l'accès ou la suppression à tout moment.
      </p>
    </Card>
  );
}

function InterviewsBlock({ candidate, onChange }: { candidate: any; onChange: () => void }) {
  const orgId = useOrgId();
  const proposeFn = useServerFn(proposeInterview);
  const analyzeFn = useServerFn(analyzeInterviewAudio);
  const updateFn = useServerFn(updateInterview);
  const [slots, setSlots] = useState<string[]>(["", "", ""]);
  const [message, setMessage] = useState("");
  const [audio, setAudio] = useState<File | null>(null);
  const [notes, setNotes] = useState("");
  const [target, setTarget] = useState<string>("");

  const { data, refetch } = useQuery({
    queryKey: ["hr_interviews", candidate.id],
    queryFn: async () => {
      const { supabase } = await import("@/integrations/supabase/client");
      const [iv, inv] = await Promise.all([
        supabase.from("hr_interviews").select("*").eq("candidate_id", candidate.id).order("round"),
        supabase.from("hr_interview_invites").select("*").eq("candidate_id", candidate.id).order("created_at"),
      ]);
      return { interviews: (iv.data as any[]) ?? [], invites: (inv.data as any[]) ?? [] };
    },
  });
  const interviews = data?.interviews ?? [];
  const invites = data?.invites ?? [];

  const propose = useMutation({
    mutationFn: () =>
      proposeFn({
        data: {
          orgId: orgId!,
          candidateId: candidate.id,
          round: Math.min(3, interviews.length + 1),
          slots: slots.filter(Boolean).map((s) => new Date(s).toISOString()),
          message,
        },
      }),
    onSuccess: () => {
      setSlots(["", "", ""]);
      setMessage("");
      void refetch();
      onChange();
      toast.success("Créneaux proposés. Copiez le lien pour l'envoyer au candidat.");
    },
    onError: (e: any) => toast.error(e?.message ?? "Erreur"),
  });

  const analyze = useMutation({
    mutationFn: async (idempotencyKey: string) => {
      if (!audio) throw new Error("Ajoutez d'abord l'enregistrement de l'entretien.");
      if (!target) throw new Error("Choisissez l'entretien concerné.");
      return analyzeFn({
        data: { orgId: orgId!, idempotencyKey, interviewId: target, audio: await readFile(audio), notes },
      });
    },
    onSuccess: () => {
      setAudio(null);
      void refetch();
      toast.success("Entretien transcrit et analysé.");
    },
    onError: (e: any) => toast.error(e?.message ?? "Échec de l'analyse."),
  });

  const rate = useMutation({
    mutationFn: (v: { interviewId: string; rating?: number | null; comment?: string }) =>
      updateFn({ data: { orgId: orgId!, ...v } }),
    onSuccess: () => {
      void refetch();
      toast.success("Entretien mis à jour.");
    },
    onError: (e: any) => toast.error(e?.message ?? "Erreur"),
  });

  const inviteLink = (token: string) =>
    typeof window === "undefined" ? "" : `${window.location.origin}/entretien/${token}`;

  return (
    <div className="space-y-4">
      <Card className="space-y-3 p-5">
        <h3 className="font-semibold">Proposer un entretien</h3>
        <p className="text-sm text-muted-foreground">
          Trois créneaux au maximum. Le candidat répond par un lien sécurisé, sans créer de compte.
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          {slots.map((s, i) => (
            <div key={i} className="space-y-1.5">
              <Label>Créneau {i + 1}</Label>
              <Input
                type="datetime-local"
                value={s}
                onChange={(e) => setSlots(slots.map((v, j) => (i === j ? e.target.value : v)))}
              />
            </div>
          ))}
        </div>
        <Textarea
          rows={2}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Message au candidat (facultatif)"
        />
        <Button onClick={() => propose.mutate()} disabled={propose.isPending || !slots.some(Boolean)}>
          {propose.isPending ? <Loader2 className="mr-1.5 size-4 animate-spin" /> : null} Proposer un entretien
        </Button>

        {invites.length ? (
          <ul className="space-y-2 pt-2 text-sm">
            {invites.map((inv: any) => (
              <li key={inv.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                <div className="min-w-0">
                  <p className="font-medium">{INVITE_STATUSES[inv.status] ?? inv.status}</p>
                  <p className="truncate text-muted-foreground">
                    {inv.chosen_slot
                      ? new Date(inv.chosen_slot).toLocaleString("fr-FR")
                      : inv.proposal || inviteLink(inv.token)}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    void navigator.clipboard.writeText(inviteLink(inv.token));
                    toast.success("Lien candidat copié.");
                  }}
                >
                  <CopyIcon className="mr-1.5 size-4" /> Lien
                </Button>
              </li>
            ))}
          </ul>
        ) : null}
      </Card>

      <Card className="space-y-3 p-5">
        <h3 className="font-semibold">Analyser l'entretien avec l'IA</h3>
        <div className="space-y-1.5">
          <Label>Entretien concerné</Label>
          <select
            className="h-10 w-full rounded-md border bg-background px-3 text-sm"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
          >
            <option value="">— Choisir —</option>
            {interviews.map((iv: any) => (
              <option key={iv.id} value={iv.id}>
                Entretien {iv.round} · {iv.scheduled_at ? new Date(iv.scheduled_at).toLocaleString("fr-FR") : "à planifier"}
              </option>
            ))}
          </select>
        </div>
        <FilePick label="Enregistrement audio" accept="audio/*" file={audio} onPick={setAudio} />
        <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes du recruteur (facultatif)" />
        <CreditActionButton actionKey="hr.interview_audio" pending={analyze.isPending} onConfirm={(k) => analyze.mutateAsync(k)}>
          <FileAudio className="mr-1.5 size-4" /> Analyser l'entretien avec l'IA
        </CreditActionButton>
        <p className="text-xs text-muted-foreground">L'IA reste un outil d'aide à la décision : la décision finale est humaine.</p>
      </Card>

      {interviews.map((iv: any) => (
        <Card key={iv.id} className="space-y-3 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-semibold">
              Entretien {iv.round}{" "}
              <span className="text-sm font-normal text-muted-foreground">
                {iv.scheduled_at ? new Date(iv.scheduled_at).toLocaleString("fr-FR") : "à planifier"}
              </span>
            </p>
            <Badge variant="secondary">{iv.status}</Badge>
          </div>
          <div className="grid gap-3 sm:grid-cols-[120px_1fr]">
            <div className="space-y-1.5">
              <Label>Note /10</Label>
              <Input
                type="number"
                min={0}
                max={10}
                defaultValue={iv.rating ?? ""}
                onBlur={(e) =>
                  rate.mutate({ interviewId: iv.id, rating: e.target.value === "" ? null : Number(e.target.value) })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Commentaire</Label>
              <Textarea
                rows={2}
                defaultValue={iv.comment ?? ""}
                onBlur={(e) => rate.mutate({ interviewId: iv.id, comment: e.target.value })}
              />
            </div>
          </div>
          {iv.analysis && Object.keys(iv.analysis).length ? (
            <div className="space-y-3 rounded-lg border p-4">
              <GenerationActions title={`Entretien ${iv.round} — ${candidate.full_name}`} text={toReadableText(iv.analysis)} />
              <div className="flex items-center gap-2">
                <Badge className={scoreTone(Number(iv.analysis.score ?? 0))} variant="outline">
                  Score {iv.analysis.score}/100
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">{iv.analysis.resume}</p>
              <Bullets title="Sujets abordés" items={iv.analysis.sujets} />
              <Bullets title="Points forts" items={iv.analysis.points_forts} />
              <Bullets title="Points de vigilance" items={iv.analysis.points_vigilance} />
              <div className="text-sm">
                <p className="font-semibold">Recommandation</p>
                <p className="text-muted-foreground">{iv.analysis.recommandation}</p>
              </div>
            </div>
          ) : null}
        </Card>
      ))}
    </div>
  );
}

function CandidateDetail({ candidate, onChange }: { candidate: any; onChange: () => void }) {
  const orgId = useOrgId();
  const scoreFn = useServerFn(scoreCandidate);
  const updateFn = useServerFn(updateCandidate);
  const fileFn = useServerFn(getHrFileUrl);
  const s = candidate.scoring ?? {};
  const sub = s.sous_scores ?? {};

  const run = useMutation({
    mutationFn: (idempotencyKey: string) =>
      scoreFn({ data: { orgId: orgId!, idempotencyKey, candidateId: candidate.id } }),
    onSuccess: () => {
      onChange();
      toast.success("Candidat noté par Mariéme.");
    },
    onError: (e: any) => toast.error(e?.message ?? "Échec du scoring."),
  });

  const move = useMutation({
    mutationFn: (stage: string) => updateFn({ data: { orgId: orgId!, candidateId: candidate.id, stage } }),
    onSuccess: () => {
      onChange();
      toast.success("Pipeline mis à jour.");
    },
    onError: (e: any) => toast.error(e?.message ?? "Erreur"),
  });

  const openFile = async (path: string) => {
    try {
      const { url } = await fileFn({ data: { orgId: orgId!, path } });
      window.open(url, "_blank", "noopener");
    } catch (e: any) {
      toast.error(e?.message ?? "Fichier indisponible.");
    }
  };

  return (
    <div className="space-y-4">
      <Card className="space-y-4 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">{candidate.full_name}</h2>
            <p className="text-sm text-muted-foreground">
              {[candidate.email, candidate.phone, candidate.location].filter(Boolean).join(" · ") || "Non trouvé"}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {candidate.cv_path ? (
              <Button variant="outline" size="sm" onClick={() => void openFile(candidate.cv_path)}>
                <FileText className="mr-1.5 size-4" /> CV
              </Button>
            ) : null}
            {candidate.letter_path ? (
              <Button variant="outline" size="sm" onClick={() => void openFile(candidate.letter_path)}>
                <FileText className="mr-1.5 size-4" /> Lettre
              </Button>
            ) : null}
            <CreditActionButton
              actionKey="hr.candidate_score"
              variant="outline"
              size="sm"
              pending={run.isPending}
              onConfirm={(k) => run.mutateAsync(k)}
            >
              {candidate.score ? "Recalculer le score" : "Noter le candidat"}
            </CreditActionButton>
          </div>
        </div>

        <div>
          <div className="mb-2 flex flex-wrap gap-2">
            {HR_STAGES.map((st) => (
              <Button
                key={st}
                size="sm"
                variant={candidate.stage === st ? "default" : "outline"}
                onClick={() => move.mutate(st)}
              >
                {HR_STAGE_LABELS[st]}
              </Button>
            ))}
          </div>
          <Progress value={stageProgress(candidate.stage)} />
          <p className="mt-1 text-xs text-muted-foreground">{stageProgress(candidate.stage)} %</p>
        </div>
      </Card>

      {s.score !== undefined ? (
        <Card className="space-y-4 p-5">
          <GenerationActions title={`Évaluation — ${candidate.full_name}`} text={toReadableText(s)} />
          <div className="flex items-center gap-3">
            <Badge variant="outline" className={`text-base ${scoreTone(Number(s.score ?? 0))}`}>
              {s.score}/100
            </Badge>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {Object.entries({
              Expérience: sub.experience,
              Compétences: sub.competences,
              Formation: sub.formation,
              Missions: sub.missions,
              "Critères obligatoires": sub.criteres_obligatoires,
              "Critères souhaités": sub.criteres_souhaites,
              Lettre: sub.lettre,
            }).map(([k, v]) => (
              <div key={k} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>{k}</span>
                  <span className="text-muted-foreground">{Number(v ?? 0)}/100</span>
                </div>
                <Progress value={Number(v ?? 0)} />
              </div>
            ))}
          </div>
          <Bullets title="Points forts" items={s.points_forts} />
          <Bullets title="Points faibles" items={s.points_faibles} />
          <Bullets title="Compétences manquantes" items={s.competences_manquantes} />
          <div className="text-sm">
            <p className="font-semibold">Recommandation</p>
            <p className="text-muted-foreground">{s.recommandation}</p>
          </div>
        </Card>
      ) : null}

      {candidate.extraction && Object.keys(candidate.extraction).length ? (
        <Card className="space-y-3 p-5">
          <h3 className="font-semibold">Informations extraites du CV</h3>
          <p className="text-sm text-muted-foreground">{candidate.extraction.resume}</p>
          <Bullets
            title="Expériences"
            items={(candidate.extraction.experiences ?? []).map(
              (x: any) => `${x.poste} — ${x.entreprise} (${x.dates})`,
            )}
          />
          <Bullets
            title="Formations"
            items={(candidate.extraction.formations ?? []).map(
              (x: any) => `${x.diplome} — ${x.etablissement} (${x.dates})`,
            )}
          />
          <Bullets title="Certifications" items={candidate.extraction.certifications} />
          <Bullets title="Compétences" items={candidate.extraction.competences} />
          <Bullets title="Langues" items={candidate.extraction.langues} />
        </Card>
      ) : null}

      <InterviewsBlock candidate={candidate} onChange={onChange} />
    </div>
  );
}

function PipelineTab() {
  const { data: offers = [] } = useRows<any>("job_offers", { order: "created_at" });
  const { data: candidates = [], refetch } = useRows<any>("candidates", { order: "created_at" });
  const [selected, setSelected] = useState<string>("");
  const current = useMemo(
    () => candidates.find((c: any) => c.id === selected) ?? candidates[0] ?? null,
    [candidates, selected],
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
      <div className="space-y-4">
        <ImportCandidate offers={offers} onDone={() => void refetch()} />
        <Card className="p-5">
          <h3 className="mb-3 font-semibold">Candidats</h3>
          {candidates.length ? (
            <ul className="space-y-2">
              {candidates.map((c: any) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => setSelected(c.id)}
                    className={`w-full rounded-lg border p-3 text-left text-sm transition hover:bg-muted/50 ${
                      current?.id === c.id ? "border-primary bg-muted/40" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2 font-medium">
                        <UserRound className="size-4" /> {c.full_name}
                      </span>
                      {c.score ? (
                        <Badge variant="outline" className={scoreTone(Number(c.score))}>
                          {c.score}
                        </Badge>
                      ) : null}
                    </div>
                    <p className="mt-1 text-muted-foreground">{HR_STAGE_LABELS[c.stage] ?? "Candidature"}</p>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">Importez un premier CV : Mariéme l'analyse et le note.</p>
          )}
        </Card>
      </div>

      {current ? (
        <CandidateDetail candidate={current} onChange={() => void refetch()} />
      ) : (
        <Card className="p-6 text-sm text-muted-foreground">Sélectionnez un candidat pour voir son dossier.</Card>
      )}
    </div>
  );
}

/* ------------------------------------ RGPD ------------------------------------- */

function RgpdTab() {
  const orgId = useOrgId();
  const { data: candidates = [], refetch } = useRows<any>("candidates", { order: "created_at" });
  const { data: logs = [] } = useRows<any>("hr_audit_log", { order: "created_at", limit: 100 });
  const exportFn = useServerFn(exportCandidate);
  const deleteFn = useServerFn(deleteCandidateData);

  const doExport = async (id: string, name: string) => {
    try {
      const payload = await exportFn({ data: { orgId: orgId!, candidateId: id } });
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `export-${name.replace(/\s+/g, "-").toLowerCase()}.json`;
      a.click();
      toast.success("Export RGPD téléchargé.");
    } catch (e: any) {
      toast.error(e?.message ?? "Export impossible.");
    }
  };

  const doDelete = async (id: string, scope: "cv" | "audio" | "tout") => {
    if (!window.confirm("Cette suppression est définitive. Confirmer ?")) return;
    try {
      await deleteFn({ data: { orgId: orgId!, candidateId: id, scope } });
      void refetch();
      toast.success("Suppression effectuée.");
    } catch (e: any) {
      toast.error(e?.message ?? "Suppression impossible.");
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="space-y-3 p-5">
        <h3 className="flex items-center gap-2 font-semibold">
          <Shield className="size-4" /> Information candidat
        </h3>
        <p className="whitespace-pre-line text-sm text-muted-foreground">{RGPD_NOTICE}</p>
      </Card>

      <Card className="space-y-3 p-5">
        <h3 className="font-semibold">Données des candidats</h3>
        {candidates.length ? (
          <ul className="space-y-2 text-sm">
            {candidates.map((c: any) => (
              <li key={c.id} className="rounded-lg border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium">{c.full_name}</p>
                    <p className="text-muted-foreground">
                      Conservation jusqu'au {c.retention_until ? frDate(c.retention_until) : "—"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <Button variant="outline" size="sm" onClick={() => void doExport(c.id, c.full_name)}>
                      <Download className="mr-1.5 size-4" /> Exporter
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => void doDelete(c.id, "cv")}>
                      Supprimer le CV
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => void doDelete(c.id, "audio")}>
                      Supprimer les audios
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => void doDelete(c.id, "tout")}>
                      <Trash2 className="mr-1.5 size-4" /> Tout
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">Aucun candidat enregistré.</p>
        )}
      </Card>

      <Card className="space-y-3 p-5 lg:col-span-2">
        <h3 className="font-semibold">Journal des accès et traitements</h3>
        {logs.length ? (
          <ul className="space-y-1 text-sm text-muted-foreground">
            {logs.map((l: any) => (
              <li key={l.id} className="flex justify-between gap-3 border-b py-1 last:border-0">
                <span>
                  {l.action.replace(/_/g, " ")} {l.detail ? `— ${l.detail}` : ""}
                </span>
                <span className="shrink-0">{new Date(l.created_at).toLocaleString("fr-FR")}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">Aucune opération journalisée pour l'instant.</p>
        )}
      </Card>
    </div>
  );
}

/* ------------------------------------ Page ------------------------------------- */

function HrPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">RH et recrutement</h1>
        <p className="text-muted-foreground">
          Mariéme vous accompagne de l'offre à la décision : analyse, CV, score, entretiens, RGPD.
        </p>
      </header>

      <Tabs defaultValue="offres">
        <TabsList>
          <TabsTrigger value="offres">Offres</TabsTrigger>
          <TabsTrigger value="pipeline">Candidats et pipeline</TabsTrigger>
          <TabsTrigger value="rgpd">RGPD</TabsTrigger>
        </TabsList>
        <TabsContent value="offres" className="mt-6">
          <OffersTab />
        </TabsContent>
        <TabsContent value="pipeline" className="mt-6">
          <PipelineTab />
        </TabsContent>
        <TabsContent value="rgpd" className="mt-6">
          <RgpdTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
