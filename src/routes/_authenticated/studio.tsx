import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import {
  Check,
  Copy,
  Download,
  Loader2,
  RefreshCw,
  Send,
  Sparkles,
  Wand2,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useOrgId, useRows } from "@/lib/db";
import { newIdempotencyKey, useCredits } from "@/lib/credits";
import { cn } from "@/lib/utils";
import {
  CAROUSEL_SIZES,
  CONTENT_KINDS,
  IMAGE_STYLES,
  KIND_LABEL,
  OBJECTIVES,
  PLATFORMS,
  TONES,
  VIDEO_CAMERA,
  detectKindLocal,
  platformLabel,
  type ContentKind,
  type ContentModel,
  type ContentParams,
} from "@/lib/content";
import {
  checkVideoContent,
  detectContentIntent,
  generateContent,
  publishContent,
  regenerateCaptions,
  regenerateSlide,
  updateCreation,
} from "@/lib/content.functions";

/* eslint-disable @typescript-eslint/no-explicit-any */

export const Route = createFileRoute("/_authenticated/studio")({
  component: StudioPage,
  validateSearch: (s: Record<string, unknown>) => ({ demande: typeof s["demande"] === "string" ? (s["demande"] as string) : undefined }),
  head: () => ({
    meta: [
      { title: "Studio de contenus IA — images, carrousels et vidéos — Kobyde" },
      {
        name: "description",
        content:
          "Créez et publiez des images, carrousels et vidéos générés par l'IA, adaptés à chaque réseau social, avec Lamine, votre agent marketing.",
      },
      { property: "og:title", content: "Studio de contenus IA — Kobyde" },
      {
        property: "og:description",
        content: "Décrivez votre besoin, l'IA prépare le contenu, les légendes et la publication.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const CHIP =
  "rounded-xl border px-3.5 py-2 text-sm font-semibold text-black transition-colors hover:bg-accent/60";
const CHIP_ON = "border-primary bg-primary/10";

function Section({ step, title, hint, children }: { step: number; title: string; hint?: string; children: React.ReactNode }) {
  return (
    <Card className="p-5">
      <div className="mb-3 flex items-baseline gap-2">
        <span className="flex size-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
          {step}
        </span>
        <h2 className="text-base font-bold text-black">{title}</h2>
      </div>
      {hint ? <p className="mb-3 text-xs text-muted-foreground">{hint}</p> : null}
      {children}
    </Card>
  );
}

function StudioPage() {
  const orgId = useOrgId();
  const { demande } = Route.useSearch();
  const { balance } = useCredits();

  const [message, setMessage] = useState(demande ?? "");
  const [kind, setKind] = useState<ContentKind>("image");
  const [slides, setSlides] = useState(4);
  const [productIds, setProductIds] = useState<string[]>([]);
  const [objective, setObjective] = useState<string>(OBJECTIVES[0]);
  const [platforms, setPlatforms] = useState<string[]>(["instagram"]);
  const [tone, setTone] = useState<string>("Professionnel");
  const [instructions, setInstructions] = useState("");
  const [modelKey, setModelKey] = useState("");
  const [params, setParams] = useState<ContentParams>({ ratio: "1:1", style: IMAGE_STYLES[0], withText: false });
  const [creation, setCreation] = useState<any>(null);

  const products = useRows<any>("products", { order: "name" });
  const activeProducts = (products.data ?? []).filter((p: any) => p.is_active !== false);

  const models = useQuery({
    queryKey: ["content-models"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("content_models")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as ContentModel[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const compatible = useMemo(
    () => (models.data ?? []).filter((m) => m.kind === (kind === "video" ? "video" : "image")),
    [models.data, kind],
  );

  useEffect(() => {
    if (!compatible.length) return;
    if (!compatible.some((m) => m.key === modelKey)) setModelKey(compatible[0]!.key);
  }, [compatible, modelKey]);

  const model = compatible.find((m) => m.key === modelKey);
  const units = kind === "carrousel" ? slides : 1;
  const estimated = (model?.credits ?? 0) * units;

  /* ------------------------------ Détection ------------------------------ */
  const detect = useServerFn(detectContentIntent);
  const detecting = useMutation({
    mutationFn: (m: string) => detect({ data: { message: m } }),
    onSuccess: (r: any) => {
      setKind(r.kind);
      if (r.kind === "carrousel") setSlides(r.slides || 4);
      if (r.objective) setObjective(r.objective);
      if (r.platforms?.length) setPlatforms(r.platforms);
      if (r.tone) setTone(r.tone);
      setParams((p) => ({ ...p, ratio: r.kind === "video" ? "9:16" : p.ratio }));
      toast.success(`Format détecté : ${KIND_LABEL[r.kind as ContentKind]}`);
    },
    onError: (e: any) => {
      const local = detectKindLocal(message);
      setKind(local.kind);
      setSlides(local.slides);
      toast.error(e?.message ?? "Analyse impossible, format estimé localement.");
    },
  });

  useEffect(() => {
    if (demande && demande.length > 3) detecting.mutate(demande);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demande]);

  /* ------------------------------ Génération ------------------------------ */
  const gen = useServerFn(generateContent);
  const check = useServerFn(checkVideoContent);
  const [polling, setPolling] = useState(false);

  const generating = useMutation({
    mutationFn: () =>
      gen({
        data: {
          orgId: orgId!,
          idempotencyKey: newIdempotencyKey(),
          kind,
          slides: units,
          productIds,
          objective,
          platforms,
          tone,
          instructions,
          modelKey,
          params,
        },
      }),
    onSuccess: (r: any) => {
      setCreation(r.creation);
      if (r.pending) {
        setPolling(true);
        toast.success("Vidéo en cours de génération (1 à 3 minutes).");
      } else {
        toast.success("Contenu généré.");
      }
    },
    onError: (e: any) => toast.error(e?.message ?? "Génération impossible."),
  });

  useEffect(() => {
    if (!polling || !creation?.id || !orgId) return;
    const timer = setInterval(async () => {
      try {
        const r: any = await check({ data: { orgId, creationId: creation.id } });
        if (r.status !== "en_cours") {
          setPolling(false);
          setCreation(r.creation);
          toast.success("Vidéo prête.");
        }
      } catch (e: any) {
        setPolling(false);
        toast.error(e?.message ?? "Génération vidéo échouée.");
      }
    }, 8000);
    return () => clearInterval(timer);
  }, [polling, creation?.id, orgId, check]);

  const toggle = (list: string[], value: string, set: (v: string[]) => void) =>
    set(list.includes(value) ? list.filter((x) => x !== value) : [...list, value]);

  const ready = Boolean(orgId && modelKey && objective && platforms.length);

  return (
    <AppShell title="Studio de contenus IA" subtitle="Lamine crée vos images, carrousels et vidéos, puis les publie.">
      <div className="mx-auto grid max-w-6xl gap-5 pb-16 lg:grid-cols-[1.35fr_1fr]">
        <div className="space-y-5">
          <Card className="p-5">
            <Label className="text-xs font-bold text-black">Que voulez-vous créer ?</Label>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
              <Input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Crée une publication pour promouvoir mon service d'automatisation IA."
              />
              <Button
                type="button"
                className="gap-2"
                disabled={message.trim().length < 4 || detecting.isPending}
                onClick={() => detecting.mutate(message)}
              >
                {detecting.isPending ? <Loader2 className="size-4 animate-spin" /> : <Wand2 className="size-4" />}
                Analyser
              </Button>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              L'IA détecte le format demandé et pré-remplit l'interface. Vous pouvez tout modifier.
            </p>
          </Card>

          <Section step={1} title="Type de contenu">
            <div className="grid gap-2 sm:grid-cols-3">
              {CONTENT_KINDS.map((k) => (
                <button
                  key={k.key}
                  type="button"
                  onClick={() => {
                    setKind(k.key);
                    setParams((p) => ({ ...p, ratio: k.key === "video" ? "9:16" : (p.ratio ?? "1:1") }));
                  }}
                  className={cn(CHIP, "text-left", kind === k.key && CHIP_ON)}
                >
                  <span className="mr-1.5">{k.emoji}</span>
                  {k.label}
                  <span className="mt-0.5 block text-[11px] font-normal text-muted-foreground">{k.hint}</span>
                </button>
              ))}
            </div>
            {kind === "carrousel" ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {CAROUSEL_SIZES.map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setSlides(n)}
                    className={cn(CHIP, slides === n && CHIP_ON)}
                  >
                    {n} images
                  </button>
                ))}
              </div>
            ) : null}
          </Section>

          <Section
            step={2}
            title="Produit ou service à promouvoir"
            hint="L'IA reprend automatiquement les informations déjà enregistrées (description, prix, bénéfices, cible)."
          >
            {activeProducts.length ? (
              <div className="flex flex-wrap gap-2">
                {activeProducts.map((p: any) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => toggle(productIds, p.id, setProductIds)}
                    className={cn(CHIP, productIds.includes(p.id) && CHIP_ON)}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Aucun produit enregistré : l'IA utilisera la fiche entreprise et vos instructions.
              </p>
            )}
          </Section>

          <Section step={3} title="Objectif du contenu">
            <div className="flex flex-wrap gap-2">
              {OBJECTIVES.map((o) => (
                <button key={o} type="button" onClick={() => setObjective(o)} className={cn(CHIP, objective === o && CHIP_ON)}>
                  {o}
                </button>
              ))}
            </div>
          </Section>

          <Section step={4} title="Plateformes de destination" hint="Une légende adaptée est générée pour chaque plateforme.">
            <div className="flex flex-wrap gap-2">
              {PLATFORMS.map((p) => (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => {
                    toggle(platforms, p.key, setPlatforms);
                    setParams((prev) => ({ ...prev, ratio: prev.ratio ?? p.ratio }));
                  }}
                  className={cn(CHIP, platforms.includes(p.key) && CHIP_ON)}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </Section>

          <Section step={5} title="Ton d'écriture">
            <div className="flex flex-wrap gap-2">
              {TONES.map((t) => (
                <button key={t} type="button" onClick={() => setTone(t)} className={cn(CHIP, tone === t && CHIP_ON)}>
                  {t}
                </button>
              ))}
            </div>
          </Section>

          <Section step={6} title="Instructions complémentaires (facultatif)">
            <Textarea
              rows={3}
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="Je veux mettre en avant le gain de temps et la simplicité."
            />
          </Section>

          <Section step={7} title="Modèle IA" hint="Seuls les modèles activés par l'administrateur sont proposés.">
            {models.isLoading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : compatible.length ? (
              <div className="grid gap-2 sm:grid-cols-2">
                {compatible.map((m) => (
                  <button
                    key={m.key}
                    type="button"
                    onClick={() => setModelKey(m.key)}
                    className={cn(CHIP, "text-left", modelKey === m.key && CHIP_ON)}
                  >
                    <span className="block">{m.label}</span>
                    <span className="mt-0.5 block text-[11px] font-normal text-muted-foreground">
                      {m.provider} · {m.speed} · {m.quality} · {m.credits} crédit{m.credits > 1 ? "s" : ""}
                      {m.formats?.length ? ` · ${m.formats.join(" / ")}` : ""}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Aucun modèle activé pour ce type de contenu.</p>
            )}
          </Section>

          {model ? (
            <Section step={8} title="Paramètres du modèle">
              <div className="grid gap-3 sm:grid-cols-2">
                {model.params?.["ratio"] || model.params?.["resolution"] ? (
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Format</Label>
                    <Select value={params.ratio ?? ""} onValueChange={(v) => setParams((p) => ({ ...p, ratio: v }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Format" />
                      </SelectTrigger>
                      <SelectContent>
                        {(model.formats?.length ? model.formats : ["1:1"]).map((f) => (
                          <SelectItem key={f} value={f}>
                            {f}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : null}

                {model.params?.["style"] ? (
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Style</Label>
                    <Select value={params.style ?? ""} onValueChange={(v) => setParams((p) => ({ ...p, style: v }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Style" />
                      </SelectTrigger>
                      <SelectContent>
                        {IMAGE_STYLES.map((s) => (
                          <SelectItem key={s} value={s}>
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : null}

                {model.params?.["duration"] ? (
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Durée</Label>
                    <Select
                      value={String(params.duration ?? 8)}
                      onValueChange={(v) => setParams((p) => ({ ...p, duration: Number(v) }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[4, 6, 8].map((d) => (
                          <SelectItem key={d} value={String(d)}>
                            {d} secondes
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : null}

                {model.params?.["resolution"] && model.kind === "video" ? (
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Résolution</Label>
                    <Select
                      value={params.resolution ?? "720p"}
                      onValueChange={(v) => setParams((p) => ({ ...p, resolution: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="720p">720p</SelectItem>
                        <SelectItem value="1080p">1080p (8 s)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ) : null}

                {model.params?.["camera"] ? (
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Mouvement de caméra</Label>
                    <Select value={params.camera ?? ""} onValueChange={(v) => setParams((p) => ({ ...p, camera: v }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Mouvement" />
                      </SelectTrigger>
                      <SelectContent>
                        {VIDEO_CAMERA.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : null}

                {model.params?.["audio"] ? (
                  <div className="flex items-center justify-between rounded-xl border px-3 py-2">
                    <Label className="text-xs text-muted-foreground">Bande son générée</Label>
                    <Switch
                      checked={params.audio !== false}
                      onCheckedChange={(v) => setParams((p) => ({ ...p, audio: v }))}
                    />
                  </div>
                ) : null}

                {model.kind === "image" ? (
                  <div className="flex items-center justify-between rounded-xl border px-3 py-2">
                    <Label className="text-xs text-muted-foreground">Texte intégré aux visuels</Label>
                    <Switch
                      checked={params.withText === true}
                      onCheckedChange={(v) => setParams((p) => ({ ...p, withText: v }))}
                    />
                  </div>
                ) : null}
              </div>

              <div className="mt-3 space-y-1.5">
                <Label className="text-xs text-muted-foreground">Prompt complémentaire (facultatif)</Label>
                <Textarea
                  rows={2}
                  value={params.prompt ?? ""}
                  onChange={(e) => setParams((p) => ({ ...p, prompt: e.target.value }))}
                  placeholder="Ambiance, décor, couleurs, éléments à intégrer…"
                />
              </div>
            </Section>
          ) : null}
          <History onOpen={setCreation} currentId={creation?.id ?? null} />
        </div>


        {/* --------------------------- Récapitulatif --------------------------- */}
        <div className="space-y-5 lg:sticky lg:top-4 lg:self-start">
          <Card className="p-5">
            <h2 className="text-base font-bold text-black">Récapitulatif</h2>
            <dl className="mt-3 space-y-1.5 text-sm">
              <Row label="Type" value={KIND_LABEL[kind] + (kind === "carrousel" ? ` — ${slides} images` : "")} />
              <Row
                label="Produit / service"
                value={
                  productIds.length
                    ? activeProducts
                        .filter((p: any) => productIds.includes(p.id))
                        .map((p: any) => p.name)
                        .join(", ")
                    : "Offre principale (fiche entreprise)"
                }
              />
              <Row label="Objectif" value={objective} />
              <Row label="Plateformes" value={platforms.map(platformLabel).join(", ") || "—"} />
              <Row label="Ton" value={tone} />
              <Row label="Modèle IA" value={model ? `${model.label} (${model.provider})` : "—"} />
              <Row
                label="Paramètres"
                value={
                  [params.ratio, params.style, params.resolution, params.duration ? `${params.duration}s` : null]
                    .filter(Boolean)
                    .join(" · ") || "—"
                }
              />
            </dl>
            <div className="mt-4 rounded-xl border bg-muted/40 p-3 text-sm">
              <p className="font-bold text-black">Coût estimé : {estimated} crédit{estimated > 1 ? "s" : ""}</p>
              <p className="text-xs text-muted-foreground">Solde actuel : {balance} crédits</p>
            </div>
            <Button
              className="mt-4 w-full gap-2"
              disabled={!ready || generating.isPending || polling || estimated > balance}
              onClick={() => generating.mutate()}
            >
              {generating.isPending || polling ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
              Générer le contenu
            </Button>
            {estimated > balance ? (
              <p className="mt-2 text-xs text-destructive">Crédits insuffisants pour cette génération.</p>
            ) : null}
          </Card>

          {creation ? <Result creation={creation} orgId={orgId!} onChange={setCreation} polling={polling} /> : null}
        </div>
      </div>
    </AppShell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <dt className="w-32 shrink-0 text-xs text-muted-foreground">{label}</dt>
      <dd className="flex-1 text-sm text-black">{value}</dd>
    </div>
  );
}

/* --------------------------------- Résultat --------------------------------- */

function Result({
  creation,
  orgId,
  onChange,
  polling,
}: {
  creation: any;
  orgId: string;
  onChange: (c: any) => void;
  polling: boolean;
}) {
  const regen = useServerFn(regenerateSlide);
  const recap = useServerFn(regenerateCaptions);
  const save = useServerFn(updateCreation);
  const publish = useServerFn(publishContent);

  const [captions, setCaptions] = useState<Record<string, any>>(creation.captions ?? {});
  useEffect(() => setCaptions(creation.captions ?? {}), [creation.captions]);

  const [schedule, setSchedule] = useState("");

  const regenSlide = useMutation({
    mutationFn: (index: number) =>
      regen({ data: { orgId, creationId: creation.id, index, idempotencyKey: newIdempotencyKey() } }),
    onSuccess: (r: any) => {
      onChange(r.creation);
      toast.success("Visuel régénéré.");
    },
    onError: (e: any) => toast.error(e?.message ?? "Régénération impossible."),
  });

  const regenCaptions = useMutation({
    mutationFn: () => recap({ data: { orgId, creationId: creation.id, idempotencyKey: newIdempotencyKey() } }),
    onSuccess: (r: any) => {
      onChange(r.creation);
      toast.success("Légendes régénérées.");
    },
    onError: (e: any) => toast.error(e?.message ?? "Régénération impossible."),
  });

  const saveCaptions = useMutation({
    mutationFn: () => save({ data: { orgId, creationId: creation.id, captions } }),
    onSuccess: () => toast.success("Légendes enregistrées."),
    onError: (e: any) => toast.error(e?.message ?? "Enregistrement impossible."),
  });

  const publishing = useMutation({
    mutationFn: (platform: string) =>
      publish({
        data: {
          orgId,
          creationId: creation.id,
          platform: platform as any,
          caption: captions[platform]?.texte ?? "",
          ...(schedule ? { scheduledAt: new Date(schedule).toISOString() } : {}),
        },
      }),
    onSuccess: (r: any) => {
      if (r.needsConnection) {
        toast.error("Connectez votre compte pour publier ce contenu.");
        window.location.href = `/connexions?connecteur=${r.platform}`;
        return;
      }
      toast.success(r.publication?.scheduled_at ? "Publication programmée." : "Publication envoyée.");
    },
    onError: (e: any) => toast.error(e?.message ?? "Publication impossible."),
  });

  const assets: any[] = creation.assets ?? [];
  const isVideo = creation.kind === "video";

  return (
    <Card className="p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-bold text-black">Résultat</h2>
        <Badge variant="secondary">{KIND_LABEL[creation.kind as ContentKind]}</Badge>
      </div>

      {polling || creation.status === "en_cours" ? (
        <div className="flex items-center gap-2 rounded-xl border bg-muted/40 p-4 text-sm">
          <Loader2 className="size-4 animate-spin" /> Génération de la vidéo en cours (1 à 3 minutes)…
        </div>
      ) : (
        <div className={cn("grid gap-3", assets.length > 1 && "sm:grid-cols-2")}>
          {assets.map((a, i) =>
            a.url ? (
              <div key={i} className="space-y-2">
                {isVideo ? (
                  <video src={a.url} controls className="w-full rounded-xl border" />
                ) : (
                  <img src={a.url} alt={a.slide?.titre ?? "Visuel généré"} className="w-full rounded-xl border" />
                )}
                {a.slide?.titre ? <p className="text-xs font-semibold text-black">{a.slide.titre}</p> : null}
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" className="gap-1.5" asChild>
                    <a href={a.url} download target="_blank" rel="noreferrer">
                      <Download className="size-3.5" /> Télécharger
                    </a>
                  </Button>
                  {!isVideo ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                      disabled={regenSlide.isPending}
                      onClick={() => regenSlide.mutate(i)}
                    >
                      <RefreshCw className="size-3.5" /> Régénérer
                    </Button>
                  ) : null}
                </div>
              </div>
            ) : null,
          )}
        </div>
      )}

      {creation.strategy?.concept ? (
        <div className="mt-4 rounded-xl border bg-muted/30 p-3">
          <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Concept</p>
          <p className="mt-1 whitespace-pre-wrap text-sm">{creation.strategy.concept}</p>
        </div>
      ) : null}

      <div className="mt-5 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold text-black">Légendes</p>
          <Button variant="outline" size="sm" className="gap-1.5" disabled={regenCaptions.isPending} onClick={() => regenCaptions.mutate()}>
            <RefreshCw className="size-3.5" /> Régénérer
          </Button>
        </div>
        {Object.entries(captions).map(([platform, value]: [string, any]) => (
          <div key={platform} className="space-y-1.5 rounded-xl border p-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-black">{platformLabel(platform)}</p>
              <div className="flex gap-1.5">
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => {
                    navigator.clipboard.writeText(
                      `${value?.texte ?? ""}${value?.hashtags?.length ? `\n\n${value.hashtags.map((h: string) => (h.startsWith("#") ? h : `#${h}`)).join(" ")}` : ""}`,
                    );
                    toast.success("Légende copiée.");
                  }}
                >
                  <Copy className="size-3.5" /> Copier
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  className="gap-1.5"
                  disabled={publishing.isPending}
                  onClick={() => publishing.mutate(platform)}
                >
                  <Send className="size-3.5" /> Publier
                </Button>
              </div>
            </div>
            <Textarea
              rows={5}
              value={value?.texte ?? ""}
              onChange={(e) => setCaptions((c) => ({ ...c, [platform]: { ...c[platform], texte: e.target.value } }))}
            />
            {value?.hashtags?.length ? (
              <p className="text-xs text-muted-foreground">
                {value.hashtags.map((h: string) => (h.startsWith("#") ? h : `#${h}`)).join(" ")}
              </p>
            ) : null}
          </div>
        ))}

        <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Programmer (facultatif)</Label>
            <Input type="datetime-local" value={schedule} onChange={(e) => setSchedule(e.target.value)} />
          </div>
          <Button variant="outline" className="gap-1.5 self-end" disabled={saveCaptions.isPending} onClick={() => saveCaptions.mutate()}>
            <Check className="size-4" /> Enregistrer
          </Button>
        </div>
      </div>
    </Card>
  );
}
