import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { useId, useState } from "react";
import { ExternalLink, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CreditActionButton } from "@/components/credit-action";
import { GenerationActions } from "@/components/generation-actions";
import { toReadableText } from "@/lib/generation-text";

import { frDate, useOrgId, useRows } from "@/lib/db";
import { importanceTone, sentimentTone, WATCH_AXES, type Source } from "@/lib/intel";
import {
  analyzeReputation,
  draftReviewReply,
  generateAnalysis,
  generateCompetitive,
  runWatch,
  saveWatchTopic,
  updateReviewReply,
} from "@/lib/intel.functions";

export const Route = createFileRoute("/_authenticated/ethan")({
  component: EthanPage,
  head: () => ({
    meta: [
      { title: "Ethan — Analyse, veille et e-réputation — Kobyde" },
      {
        name: "description",
        content:
          "Ethan, votre analyste IA : business plan, étude de marché, analyse sectorielle et concurrentielle sourcée, veille et e-réputation.",
      },
      { property: "og:title", content: "Ethan — Analyse et veille — Kobyde" },
      {
        property: "og:description",
        content: "Analyses stratégiques sourcées, veille programmée et gestion des avis en ligne.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

/* eslint-disable @typescript-eslint/no-explicit-any */

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const id = useId();
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs text-muted-foreground">
        {label}
      </Label>
      <Input id={id} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}

function Area({
  label,
  value,
  onChange,
  placeholder,
  rows = 3,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  const id = useId();
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs text-muted-foreground">
        {label}
      </Label>
      <Textarea id={id} rows={rows} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border bg-card/60 p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
      <div className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed">{children}</div>
    </div>
  );
}

function Bullets({ title, items }: { title: string; items: string[] }) {
  if (!items?.length) return null;
  return (
    <Block title={title}>
      <ul className="list-disc space-y-1 pl-4">
        {items.map((t, i) => (
          <li key={i}>{t}</li>
        ))}
      </ul>
    </Block>
  );
}

function Sources({ items }: { items: Source[] }) {
  if (!items?.length) return null;
  return (
    <div className="rounded-xl border bg-muted/30 p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Sources</p>
      <ul className="mt-1.5 space-y-1 text-sm">
        {items.map((s, i) => (
          <li key={i}>
            <a
              href={s.url}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-1 text-primary underline underline-offset-2"
            >
              {s.titre || s.url}
              <ExternalLink className="size-3" />
            </a>
            {s.date ? <span className="ml-2 text-xs text-muted-foreground">{s.date}</span> : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

const LABELS: Record<string, string> = {
  entreprise: "Entreprise",
  marche: "Marché",
  cible: "Cible",
  offre: "Offre",
  modele_economique: "Modèle économique",
  strategie: "Stratégie",
  risques: "Risques",
  opportunites: "Opportunités",
  demande: "Demande",
  tendances: "Tendances",
  clients: "Clients",
  concurrents: "Concurrents",
  evolution_du_secteur: "Évolution du secteur",
  acteurs: "Acteurs",
  technologies: "Technologies",
  menaces: "Menaces",
};

/* -------------------------------- Analyses -------------------------------- */

const ANALYSIS_TABS = [
  { kind: "business_plan" as const, label: "Business plan", action: "analysis.business_plan" },
  { kind: "market_study" as const, label: "Étude de marché", action: "analysis.market_study" },
  { kind: "sector" as const, label: "Analyse sectorielle", action: "analysis.sector" },
];

function AnalysisTab({ kind, label, action }: { kind: any; label: string; action: string }) {
  const orgId = useOrgId();
  const [scope, setScope] = useState("");
  const [notes, setNotes] = useState("");
  const [result, setResult] = useState<any>(null);
  const [edited, setEdited] = useState<string | null>(null);
  const fn = useServerFn(generateAnalysis);

  const run = useMutation({
    mutationFn: (idempotencyKey: string) =>
      fn({ data: { orgId: orgId!, idempotencyKey, kind, scope, notes } }),
    onSuccess: (r: any) => {
      setResult(r.result);
      setEdited(null);
      toast.success(`${label} généré${label.startsWith("Analyse") || label.startsWith("Étude") ? "e" : ""}.`);

    },
    onError: (e: any) => toast.error(e?.message ?? "Échec de la génération."),
  });

  return (
    <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
      <Card className="h-fit space-y-4 p-5">
        <div>
          <h2 className="font-semibold">{label}</h2>
          <p className="text-sm text-muted-foreground">Ethan analyse à partir de votre fiche entreprise et du web.</p>
        </div>
        <Field label="Périmètre" value={scope} onChange={setScope} placeholder="Ex. activité principale, France" />
        <Area label="Informations complémentaires" value={notes} onChange={setNotes} rows={4} />
        <CreditActionButton actionKey={action} pending={run.isPending} onConfirm={(k) => run.mutateAsync(k)}>
          Générer {label.toLowerCase()}
        </CreditActionButton>
      </Card>

      <div className="space-y-4">
        {run.isPending ? (
          <Card className="flex items-center gap-3 p-6 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Ethan recherche et analyse…
          </Card>
        ) : null}
        {result ? (
          <>
            <Card className="p-4">
              <GenerationActions
                title={label}
                text={edited ?? toReadableText(result)}
                onEdit={setEdited}
                regenerateSlot={
                  <CreditActionButton
                    actionKey={action}
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
            </Card>
            {result.synthese ? <Block title="Synthèse">{result.synthese}</Block> : null}
            {Object.entries(result.sections as Record<string, string>).map(([k, v]) => (
              <Block key={k} title={LABELS[k] ?? k.replace(/_/g, " ")}>
                {v}
              </Block>
            ))}
            <Sources items={result.sources} />
          </>
        ) : run.isPending ? null : (

          <Card className="p-6 text-sm text-muted-foreground">Aucun résultat pour l'instant.</Card>
        )}
      </div>
    </div>
  );
}

/* -------------------------- Analyse concurrentielle -------------------------- */

function CompetitiveTab() {
  const orgId = useOrgId();
  const [competitors, setCompetitors] = useState("");
  const [notes, setNotes] = useState("");
  const [result, setResult] = useState<any>(null);
  const [edited, setEdited] = useState<string | null>(null);
  const fn = useServerFn(generateCompetitive);

  const run = useMutation({
    mutationFn: (idempotencyKey: string) => fn({ data: { orgId: orgId!, idempotencyKey, competitors, notes } }),
    onSuccess: (r: any) => {
      setResult(r.result);
      setEdited(null);
      toast.success("Analyse concurrentielle terminée.");
    },


    onError: (e: any) => toast.error(e?.message ?? "Échec de l'analyse."),
  });

  return (
    <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
      <Card className="h-fit space-y-4 p-5">
        <div>
          <h2 className="font-semibold">Analyse concurrentielle</h2>
          <p className="text-sm text-muted-foreground">
            Recherche Google en direct : chaque information web est sourcée, aucun prix n'est inventé.
          </p>
        </div>
        <Area
          label="Concurrents (un par ligne, ou laissez vide)"
          value={competitors}
          onChange={setCompetitors}
          rows={4}
          placeholder={"exemple.com\nAutre concurrent"}
        />
        <Area label="Informations complémentaires" value={notes} onChange={setNotes} rows={3} />
        <CreditActionButton
          actionKey="analysis.competitive"
          pending={run.isPending}
          onConfirm={(k) => run.mutateAsync(k)}
        >
          Lancer l'analyse
        </CreditActionButton>
      </Card>

      <div className="space-y-4">
        {run.isPending ? (
          <Card className="flex items-center gap-3 p-6 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Ethan compare les concurrents sur le web…
          </Card>
        ) : null}
        {result ? (
          <>
            <Card className="p-4">
              <GenerationActions
                title="Analyse concurrentielle"
                text={edited ?? toReadableText(result)}
                onEdit={setEdited}
                regenerateSlot={
                  <CreditActionButton
                    actionKey="analysis.competitive"
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
            </Card>
            {result.concurrents.map((c: any, i: number) => (

              <Card key={i} className="space-y-3 p-5">
                <h3 className="text-lg font-semibold">{c.nom}</h3>
                <div className="grid gap-3 md:grid-cols-2">
                  {[
                    ["Offre", c.offre],
                    ["Fonctionnalités", c.fonctionnalites],
                    ["Prix publics", c.prix_publics],
                    ["Positionnement", c.positionnement],
                    ["Cible", c.cible],
                    ["Avantages", c.avantages],
                    ["Différenciation", c.differenciation],
                    ["Promesse", c.promesse],
                    ["Visibilité", c.visibilite],
                  ].map(([t, v]) => (
                    <Block key={t as string} title={t as string}>
                      {v as string}
                    </Block>
                  ))}
                </div>
                <Sources items={c.sources} />
              </Card>
            ))}
            <div className="grid gap-4 md:grid-cols-2">
              <Bullets title="Forces" items={result.forces} />
              <Bullets title="Faiblesses" items={result.faiblesses} />
              <Bullets title="Écarts" items={result.ecarts} />
              <Bullets title="Opportunités" items={result.opportunites} />
            </div>
            <Bullets title="Recommandations" items={result.recommandations} />
            <Sources items={result.sources} />
          </>
        ) : run.isPending ? null : (
          <Card className="p-6 text-sm text-muted-foreground">Lancez l'analyse pour comparer vos concurrents.</Card>
        )}
      </div>
    </div>
  );
}

/* --------------------------------- Veille --------------------------------- */

function WatchResultView({ result }: { result: any }) {
  return (
    <div className="space-y-4">
      {result.synthese ? <Block title="Synthèse">{result.synthese}</Block> : null}
      {result.items?.map((i: any, k: number) => (
        <Card key={k} className="space-y-2 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="font-semibold">{i.titre}</h4>
            {i.categorie ? <Badge variant="outline">{i.categorie}</Badge> : null}
            {i.acteur ? <Badge variant="secondary">{i.acteur}</Badge> : null}
            {i.date ? <span className="text-xs text-muted-foreground">{i.date}</span> : null}
          </div>
          <p className="whitespace-pre-wrap text-sm">{i.resume}</p>
          {i.impact ? <p className="text-sm text-muted-foreground">Impact : {i.impact}</p> : null}
          {i.source ? <Sources items={[i.source]} /> : null}
        </Card>
      ))}
      <Bullets title="Actions recommandées" items={result.actions ?? []} />
      <Sources items={result.sources ?? []} />
    </div>
  );
}

function WatchTab({ kind }: { kind: "concurrentielle" | "generale" }) {
  const orgId = useOrgId();
  const topics = useRows<any>("watch_topics", { order: "created_at" });
  const assets = useRows<any>("intel_assets", { order: "created_at", limit: 50 });
  const [subject, setSubject] = useState("");
  const [competitors, setCompetitors] = useState("");
  const [frequency, setFrequency] = useState("hebdomadaire");
  const [active, setActive] = useState(true);
  const [result, setResult] = useState<any>(null);
  const [edited, setEdited] = useState<string | null>(null);


  const runFn = useServerFn(runWatch);
  const saveFn = useServerFn(saveWatchTopic);

  const myTopics = (topics.data ?? []).filter((t: any) => t.kind === kind);
  const assetKind = kind === "concurrentielle" ? "watch_competitive" : "watch_general";
  const lastBriefing = (assets.data ?? []).find((a: any) => a.kind === assetKind);

  const launch = useMutation({
    mutationFn: (args: { idempotencyKey: string; topicId?: string; subject: string; competitors: string; refresh: boolean }) =>
      runFn({
        data: {
          orgId: orgId!,
          idempotencyKey: args.idempotencyKey,
          kind,
          subject: args.subject,
          competitors: args.competitors,
          topicId: args.topicId,
          refresh: args.refresh,
        },
      }),
    onSuccess: (r: any) => {
      setResult(r.result);
      setEdited(null);
      assets.refetch();

      topics.refetch();
      toast.success("Briefing de veille prêt.");
    },
    onError: (e: any) => toast.error(e?.message ?? "Échec de la veille."),
  });

  const schedule = useMutation({
    mutationFn: () => saveFn({ data: { orgId: orgId!, kind, subject, competitors, frequency: frequency as any, active } }),
    onSuccess: () => {
      topics.refetch();
      toast.success(`Veille programmée (${frequency}).`);
    },
    onError: (e: any) => toast.error(e?.message ?? "Échec de la programmation."),
  });

  const actionKey = kind === "concurrentielle" ? "watch.competitive" : "watch.web";

  return (
    <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
      <Card className="h-fit space-y-4 p-5">
        <div>
          <h2 className="font-semibold">{kind === "concurrentielle" ? "Veille concurrentielle" : "Veille générale"}</h2>
          <p className="text-sm text-muted-foreground">
            {kind === "concurrentielle"
              ? `Surveille : ${WATCH_AXES.join(", ")}.`
              : "Exemple : « Je veux suivre les nouveautés dans l'IA et l'automatisation pour les entreprises. »"}
          </p>
        </div>
        <Area
          label="Sujet de veille"
          value={subject}
          onChange={setSubject}
          rows={3}
          placeholder={
            kind === "concurrentielle"
              ? "Ex. nouveautés produits et prix de mes concurrents"
              : "Ex. nouveautés IA et automatisation pour les PME"
          }
        />
        {kind === "concurrentielle" ? (
          <Area label="Concurrents surveillés" value={competitors} onChange={setCompetitors} rows={3} />
        ) : null}
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Fréquence</Label>
          <Select value={frequency} onValueChange={setFrequency}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="quotidienne">Quotidienne</SelectItem>
              <SelectItem value="hebdomadaire">Hebdomadaire</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center justify-between rounded-lg border p-3">
          <Label className="text-sm">Veille active</Label>
          <Switch checked={active} onCheckedChange={setActive} />
        </div>

        <CreditActionButton
          actionKey={actionKey}
          pending={launch.isPending}
          disabled={subject.trim().length < 3}
          onConfirm={(k) => launch.mutateAsync({ idempotencyKey: k, subject, competitors, refresh: false })}
        >
          Lancer la veille
        </CreditActionButton>

        <Button
          type="button"
          variant="secondary"
          className="w-full"
          disabled={schedule.isPending || subject.trim().length < 3}
          onClick={() => schedule.mutate()}
        >
          Programmer la veille
        </Button>

        <Button
          type="button"
          variant="outline"
          className="w-full"
          disabled={!lastBriefing}
          onClick={() => setResult(lastBriefing?.data)}
        >
          Voir le dernier briefing
        </Button>
      </Card>

      <div className="space-y-4">
        {myTopics.length ? (
          <Card className="space-y-3 p-5">
            <h3 className="font-semibold">Veilles programmées</h3>
            {myTopics.map((t: any) => (
              <div key={t.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3">
                <div>
                  <p className="text-sm font-medium">{t.subject}</p>
                  <p className="text-xs text-muted-foreground">
                    {t.frequency} · {t.active ? "active" : "en pause"} ·{" "}
                    {t.last_run_at ? `dernière : ${frDate(t.last_run_at)}` : "jamais lancée"}
                    {t.next_run_at ? ` · prochaine : ${frDate(t.next_run_at)}` : ""}
                  </p>
                </div>
                <CreditActionButton
                  actionKey="watch.refresh"
                  className="shrink-0"
                  buttonClassName="gap-2"
                  variant="outline"
                  size="sm"
                  pending={launch.isPending}
                  onConfirm={(k) =>
                    launch.mutateAsync({
                      idempotencyKey: k,
                      topicId: t.id,
                      subject: t.subject,
                      competitors: t.competitors ?? "",
                      refresh: true,
                    })
                  }
                >
                  <RefreshCw className="size-4" /> Actualiser maintenant
                </CreditActionButton>
              </div>
            ))}
          </Card>
        ) : null}

        {launch.isPending ? (
          <Card className="flex items-center gap-3 p-6 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Ethan collecte les informations récentes…
          </Card>
        ) : result ? (
          <>
            <Card className="p-4">
              <GenerationActions
                title={kind === "concurrentielle" ? "Veille concurrentielle" : "Veille générale"}
                text={edited ?? toReadableText(result)}
                onEdit={setEdited}
                regenerateSlot={
                  <CreditActionButton
                    actionKey="watch.refresh"
                    className="inline-block"
                    buttonClassName="gap-1.5"
                    variant="outline"
                    size="sm"
                    pending={launch.isPending}
                    onConfirm={(k) =>
                      launch.mutateAsync({ idempotencyKey: k, subject, competitors, refresh: true })
                    }
                  >
                    <RefreshCw className="h-4 w-4" /> Régénérer
                  </CreditActionButton>
                }
              />
            </Card>
            <WatchResultView result={result} />
          </>

        ) : (
          <Card className="p-6 text-sm text-muted-foreground">Aucun briefing affiché pour l'instant.</Card>
        )}
      </div>
    </div>
  );
}

/* ------------------------------ E-réputation ------------------------------ */

function ReputationTab() {
  const orgId = useOrgId();
  const reviews = useRows<any>("reviews", { order: "created_at", limit: 100 });
  const [query, setQuery] = useState("");
  const [notes, setNotes] = useState("");
  const [result, setResult] = useState<any>(null);
  const [edited, setEdited] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const analyzeFn = useServerFn(analyzeReputation);
  const draftFn = useServerFn(draftReviewReply);
  const updateFn = useServerFn(updateReviewReply);

  const analyze = useMutation({
    mutationFn: (idempotencyKey: string) => analyzeFn({ data: { orgId: orgId!, idempotencyKey, query, notes } }),
    onSuccess: (r: any) => {
      setResult(r.result);
      setEdited(null);
      reviews.refetch();

      toast.success("Analyse d'e-réputation terminée.");
    },
    onError: (e: any) => toast.error(e?.message ?? "Échec de l'analyse."),
  });

  const draft = useMutation({
    mutationFn: (args: { idempotencyKey: string; reviewId: string }) =>
      draftFn({ data: { orgId: orgId!, idempotencyKey: args.idempotencyKey, reviewId: args.reviewId, tone: "" } }),
    onSuccess: (r: any, vars) => {
      setDrafts((d) => ({ ...d, [vars.reviewId]: r.reponse }));
      reviews.refetch();
      toast.success("Réponse préparée — à valider avant publication.");
    },
    onError: (e: any) => toast.error(e?.message ?? "Échec de la génération de réponse."),
  });

  const update = useMutation({
    mutationFn: (args: { reviewId: string; replyDraft?: string; status?: any }) =>
      updateFn({ data: { orgId: orgId!, ...args } }),
    onSuccess: (_r, vars) => {
      reviews.refetch();
      toast.success(
        vars.status === "publie" ? "Réponse publiée." : vars.status === "valide" ? "Réponse validée." : "Réponse enregistrée.",
      );
    },
    onError: (e: any) => toast.error(e?.message ?? "Action impossible."),
  });

  const rows = reviews.data ?? [];

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <Card className="h-fit space-y-4 p-5">
          <div>
            <h2 className="font-semibold">Analyser mon e-réputation</h2>
            <p className="text-sm text-muted-foreground">
              Avis Google, mentions, articles, réseaux et pages web — chaque élément avec son lien.
            </p>
          </div>
          <Field label="Rechercher sur" value={query} onChange={setQuery} placeholder="Nom de l'entreprise" />
          <Area label="Précisions" value={notes} onChange={setNotes} rows={3} />
          <CreditActionButton actionKey="rep.analysis" pending={analyze.isPending} onConfirm={(k) => analyze.mutateAsync(k)}>
            Analyser mon e-réputation
          </CreditActionButton>
        </Card>

        <div className="space-y-4">
          {analyze.isPending ? (
            <Card className="flex items-center gap-3 p-6 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Ethan parcourt le web…
            </Card>
          ) : null}
          {result ? (
            <>
              <Card className="p-4">
                <GenerationActions
                  title="Analyse d'e-réputation"
                  text={edited ?? toReadableText(result)}
                  onEdit={setEdited}
                  regenerateSlot={
                    <CreditActionButton
                      actionKey="rep.analysis"
                      className="inline-block"
                      buttonClassName="gap-1.5"
                      variant="outline"
                      size="sm"
                      pending={analyze.isPending}
                      onConfirm={(k) => analyze.mutateAsync(k)}
                    >
                      <RefreshCw className="h-4 w-4" /> Régénérer
                    </CreditActionButton>
                  }
                />
              </Card>
              {result.synthese ? <Block title="Synthèse">{result.synthese}</Block> : null}

              <div className="grid gap-4 md:grid-cols-2">
                <Bullets title="Points forts" items={result.points_forts} />
                <Bullets title="Points faibles" items={result.points_faibles} />
              </div>
              <Bullets title="Actions" items={result.actions} />
            </>
          ) : null}
        </div>
      </div>

      <Card className="space-y-4 p-5">
        <div>
          <h3 className="font-semibold">Mentions et avis</h3>
          <p className="text-sm text-muted-foreground">
            Aucune réponse n'est publiée sans validation humaine explicite.
          </p>
        </div>

        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune mention enregistrée. Lancez une analyse.</p>
        ) : null}

        {rows.map((r: any) => {
          const value = drafts[r.id] ?? r.reply_draft ?? "";
          return (
            <div key={r.id} className="space-y-3 rounded-xl border p-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">{r.source}</Badge>
                {r.author ? <span className="text-sm font-medium">{r.author}</span> : null}
                {r.rating != null ? <Badge variant="secondary">{r.rating}/5</Badge> : null}
                <Badge className={sentimentTone(r.sentiment)} variant="outline">
                  {r.sentiment}
                </Badge>
                <Badge className={importanceTone(r.importance)} variant="outline">
                  {r.importance}
                </Badge>
                {r.topic ? <span className="text-xs text-muted-foreground">{r.topic}</span> : null}
                {r.url ? (
                  <a
                    href={r.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="inline-flex items-center gap-1 text-xs text-primary underline underline-offset-2"
                  >
                    Voir la page <ExternalLink className="size-3" />
                  </a>
                ) : null}
              </div>
              {r.page || r.section ? (
                <p className="text-xs text-muted-foreground">
                  {[r.page, r.section].filter(Boolean).join(" · ")}
                </p>
              ) : null}
              <p className="whitespace-pre-wrap text-sm">{r.summary || r.content}</p>

              <div className="flex flex-wrap items-center gap-2">
                <CreditActionButton
                  actionKey="rep.review_reply"
                  buttonClassName="gap-2"
                  variant="secondary"
                  size="sm"
                  pending={draft.isPending}
                  onConfirm={(k) => draft.mutateAsync({ idempotencyKey: k, reviewId: r.id })}
                >
                  Générer une réponse
                </CreditActionButton>
                <Badge variant="outline">
                  {r.reply_status === "publie"
                    ? "Publiée"
                    : r.reply_status === "valide"
                      ? "Validée"
                      : r.reply_status === "brouillon"
                        ? "Réponse préparée"
                        : "Sans réponse"}
                </Badge>
              </div>

              {value ? (
                <div className="space-y-2">
                  <Textarea
                    rows={5}
                    value={value}
                    onChange={(e) => setDrafts((d) => ({ ...d, [r.id]: e.target.value }))}
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => update.mutate({ reviewId: r.id, replyDraft: value, status: "brouillon" })}
                    >
                      Modifier
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => update.mutate({ reviewId: r.id, replyDraft: value, status: "valide" })}
                    >
                      Valider
                    </Button>
                    <Button
                      size="sm"
                      disabled={r.reply_status !== "valide"}
                      onClick={() => update.mutate({ reviewId: r.id, status: "publie" })}
                    >
                      Publier
                    </Button>
                  </div>
                  {r.reply_status !== "valide" && r.reply_status !== "publie" ? (
                    <p className="text-xs text-muted-foreground">
                      La publication est bloquée tant qu'un humain n'a pas validé la réponse.
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>
          );
        })}
      </Card>
    </div>
  );
}

/* ---------------------------------- Page ---------------------------------- */

function EthanPage() {
  return (
    <AppShell
      title="Ethan — Analyse, veille et e-réputation"
      subtitle="Analyses stratégiques, veille sourcée par recherche Google et gestion des avis en ligne."
    >
      <div className="space-y-6">
        <Tabs defaultValue="business_plan">
          <TabsList className="flex w-full flex-wrap justify-start">
            {ANALYSIS_TABS.map((t) => (
              <TabsTrigger key={t.kind} value={t.kind}>
                {t.label}
              </TabsTrigger>
            ))}
            <TabsTrigger value="competitive">Analyse concurrentielle</TabsTrigger>
            <TabsTrigger value="watch">Veille concurrentielle</TabsTrigger>
            <TabsTrigger value="watch_general">Veille générale</TabsTrigger>
            <TabsTrigger value="reputation">E-réputation</TabsTrigger>
          </TabsList>

          {ANALYSIS_TABS.map((t) => (
            <TabsContent key={t.kind} value={t.kind} className="mt-6">
              <AnalysisTab kind={t.kind} label={t.label} action={t.action} />
            </TabsContent>
          ))}
          <TabsContent value="competitive" className="mt-6">
            <CompetitiveTab />
          </TabsContent>
          <TabsContent value="watch" className="mt-6">
            <WatchTab kind="concurrentielle" />
          </TabsContent>
          <TabsContent value="watch_general" className="mt-6">
            <WatchTab kind="generale" />
          </TabsContent>
          <TabsContent value="reputation" className="mt-6">
            <ReputationTab />
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}
