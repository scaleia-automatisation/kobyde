import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { useId, useState } from "react";
import { Copy, Loader2, Pencil, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { useOrgId } from "@/lib/db";
import { BRIEF_SECTIONS, SITE_STYLES, SITE_TONES, SITE_TYPES } from "@/lib/marketing";
import {
  generatePromise,
  generateSiteBrief,
  generateSiteContent,
  generateValueProp,
} from "@/lib/marketing.functions";


export const Route = createFileRoute("/_authenticated/lamine")({
  component: LaminePage,
  head: () => ({
    meta: [
      { title: "Lamine — Promesse, proposition de valeur et sites — Kobyde" },
      {
        name: "description",
        content:
          "Lamine, votre agent marketing IA : promesse, proposition de valeur, briefing de site et contenu page par page.",
      },
      { property: "og:title", content: "Lamine — Marketing IA — Kobyde" },
      {
        property: "og:description",
        content: "Générez votre promesse, votre proposition de valeur et le contenu complet de votre site.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

/* eslint-disable @typescript-eslint/no-explicit-any */

function copy(text: string) {
  navigator.clipboard
    .writeText(text)
    .then(() => toast.success("Copié."))
    .catch(() => toast.error("Copie impossible."));
}

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

/* ---------------------------------- Promesse --------------------------------- */

function PromiseTab() {
  const orgId = useOrgId();
  const call = useServerFn(generatePromise);
  const [form, setForm] = useState({ offer: "", audience: "", notes: "" });
  const [result, setResult] = useState<any>(null);

  const mut = useMutation({
    mutationFn: (key: string) => call({ data: { orgId: orgId!, idempotencyKey: key, ...form } }),
    onSuccess: (d) => {
      setResult(d.result);
      toast.success("Promesse générée par Lamine.");
    },
    onError: (e: any) => toast.error(e?.message ?? "Échec."),
  });

  const all = result
    ? [
        `Promesse : ${result.promesse}`,
        `Variantes : ${(result.variantes ?? []).join(" | ")}`,
        `Résultat : ${result.version_resultat}`,
        `Transformation : ${result.version_transformation}`,
        `Performance : ${result.version_performance}`,
        `Courte : ${result.version_courte}`,
        `Bénéfice : ${result.benefice}`,
        `Crédibilité : ${result.credibilite}`,
      ].join("\n\n")
    : "";

  return (
    <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
      <Card className="space-y-4 p-5">
        <Field label="Offre concernée" value={form.offer} onChange={(v) => setForm({ ...form, offer: v })} placeholder="Site vitrine clé en main" />
        <Field label="Cible" value={form.audience} onChange={(v) => setForm({ ...form, audience: v })} placeholder="Artisans en Île-de-France" />
        <Area label="Informations complémentaires" value={form.notes} onChange={(v) => setForm({ ...form, notes: v })} placeholder="Ce que vous voulez mettre en avant" />
        <CreditActionButton
          actionKey="mkt.promise"
          pending={mut.isPending}
          disabled={!orgId}
          onConfirm={(key) => mut.mutateAsync(key)}
        >
          {mut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Générer une promesse
        </CreditActionButton>
        <p className="text-xs text-muted-foreground">
          Lamine n'invente jamais une preuve : ce qui manque est indiqué « À fournir ».
        </p>
      </Card>

      <div className="space-y-4">
        {!result && (
          <Card className="p-8 text-center text-sm text-muted-foreground">
            Votre promesse principale, ses 3 variantes et ses déclinaisons apparaîtront ici.
          </Card>
        )}
        {result && (
          <Card className="space-y-4 p-5">
            <div className="flex items-start justify-between gap-3">
              <p className="text-lg font-bold leading-snug">{result.promesse}</p>
              <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => copy(all)}>
                <Copy className="h-4 w-4" /> Copier
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {(result.variantes ?? []).map((v: string, i: number) => (
                <Badge key={i} variant="secondary" className="whitespace-normal text-left">
                  {v}
                </Badge>
              ))}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Block title="Version résultat">{result.version_resultat}</Block>
              <Block title="Version transformation">{result.version_transformation}</Block>
              <Block title="Version performance">{result.version_performance}</Block>
              <Block title="Version courte">{result.version_courte}</Block>
            </div>
            <Block title="Bénéfice promis">{result.benefice}</Block>
            <Block title="Pourquoi c'est crédible">{result.credibilite}</Block>
          </Card>
        )}
      </div>
    </div>
  );
}

/* ---------------------------- Proposition de valeur --------------------------- */

function ValuePropTab() {
  const orgId = useOrgId();
  const call = useServerFn(generateValueProp);
  const [form, setForm] = useState({ offer: "", audience: "", notes: "", current: "", competitors: "" });
  const [result, setResult] = useState<any>(null);

  const mut = useMutation({
    mutationFn: (v: { key: string; mode: "generer" | "optimiser" | "concurrents" }) =>
      call({ data: { orgId: orgId!, idempotencyKey: v.key, mode: v.mode, ...form } }),
    onSuccess: (d) => {
      setResult(d.result);
      toast.success("Proposition de valeur prête.");
    },
    onError: (e: any) => toast.error(e?.message ?? "Échec."),
  });

  return (
    <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
      <Card className="space-y-4 p-5">
        <Field label="Offre" value={form.offer} onChange={(v) => setForm({ ...form, offer: v })} placeholder="Création de sites pour artisans" />
        <Field label="Cible" value={form.audience} onChange={(v) => setForm({ ...form, audience: v })} placeholder="Artisans du bâtiment" />
        <Area label="Proposition actuelle (pour l'optimiser)" value={form.current} onChange={(v) => setForm({ ...form, current: v })} />
        <Area label="Concurrents (noms, sites, promesses)" value={form.competitors} onChange={(v) => setForm({ ...form, competitors: v })} />
        <Area label="Informations complémentaires" value={form.notes} onChange={(v) => setForm({ ...form, notes: v })} />
        <div className="space-y-3">
          <CreditActionButton actionKey="mkt.value_prop" pending={mut.isPending} disabled={!orgId} onConfirm={(key) => mut.mutateAsync({ key, mode: "generer" })}>
            Générer une proposition de valeur
          </CreditActionButton>
          <CreditActionButton actionKey="mkt.value_prop_optimize" variant="secondary" pending={mut.isPending} disabled={!orgId} onConfirm={(key) => mut.mutateAsync({ key, mode: "optimiser" })}>
            Optimiser ma proposition
          </CreditActionButton>
          <CreditActionButton actionKey="mkt.competitor_props" variant="outline" pending={mut.isPending} disabled={!orgId} onConfirm={(key) => mut.mutateAsync({ key, mode: "concurrents" })}>
            Analyser les propositions concurrentes
          </CreditActionButton>
        </div>
      </Card>

      <div className="space-y-4">
        {!result && (
          <Card className="p-8 text-center text-sm text-muted-foreground">
            Proposition principale, bénéfice, différenciation, 3 variantes, accroche et preuves.
          </Card>
        )}
        {result && (
          <Card className="space-y-4 p-5">
            <div className="flex items-start justify-between gap-3">
              <p className="text-lg font-bold leading-snug">{result.proposition}</p>
              <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => copy(JSON.stringify(result, null, 2))}>
                <Copy className="h-4 w-4" /> Copier
              </Button>
            </div>
            <Block title="Accroche">{result.accroche}</Block>
            <div className="grid gap-3 sm:grid-cols-2">
              <Block title="Bénéfice">{result.benefice}</Block>
              <Block title="Différenciation">{result.differenciation}</Block>
            </div>
            <div className="flex flex-wrap gap-2">
              {(result.variantes ?? []).map((v: string, i: number) => (
                <Badge key={i} variant="secondary" className="whitespace-normal text-left">
                  {v}
                </Badge>
              ))}
            </div>
            <Block title="Preuves">
              {(result.preuves ?? []).map((v: string, i: number) => (
                <div key={i}>• {v}</div>
              ))}
            </Block>
            {(result.analyse_concurrents ?? []).length > 0 && (
              <Block title="Analyse des concurrents">
                {result.analyse_concurrents.map((v: string, i: number) => (
                  <div key={i}>• {v}</div>
                ))}
              </Block>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}

/* -------------------------------- Briefing site ------------------------------- */

function BriefTab({ onUseBrief }: { onUseBrief: (text: string) => void }) {
  const orgId = useOrgId();
  const call = useServerFn(generateSiteBrief);
  const [form, setForm] = useState({ siteType: "vitrine", product: "", notes: "" });
  const [brief, setBrief] = useState<Record<string, string> | null>(null);
  const [editing, setEditing] = useState(false);

  const mut = useMutation({
    mutationFn: (key: string) => call({ data: { orgId: orgId!, idempotencyKey: key, ...form } }),
    onSuccess: (d) => {
      setBrief(d.result as Record<string, string>);
      setEditing(false);
      toast.success("Briefing généré.");
    },
    onError: (e: any) => toast.error(e?.message ?? "Échec."),
  });

  const asText = brief
    ? BRIEF_SECTIONS.map(([k, label]) => `## ${label}\n${brief[k] ?? ""}`).join("\n\n")
    : "";

  return (
    <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
      <Card className="space-y-4 p-5">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Type de site</Label>
          <Select value={form.siteType} onValueChange={(v) => setForm({ ...form, siteType: v })}>
            <SelectTrigger aria-label="Type de site">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SITE_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Field label="Produit / service" value={form.product} onChange={(v) => setForm({ ...form, product: v })} placeholder="Site vitrine 5 pages" />
        <Area label="Informations complémentaires" value={form.notes} onChange={(v) => setForm({ ...form, notes: v })} rows={4} />
        <CreditActionButton actionKey="mkt.site_brief" pending={mut.isPending} disabled={!orgId} onConfirm={(key) => mut.mutateAsync(key)}>
          Générer le briefing
        </CreditActionButton>
      </Card>

      <div className="space-y-4">
        {!brief && (
          <Card className="p-8 text-center text-sm text-muted-foreground">
            Le briefing complet (contexte, objectifs, cible, pages, direction artistique, SEO, GEO,
            conversion…) apparaîtra ici.
          </Card>
        )}
        {brief && (
          <Card className="space-y-4 p-5">
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" size="sm" className="gap-1.5" onClick={() => setEditing((e) => !e)}>
                <Pencil className="h-4 w-4" /> {editing ? "Terminer" : "Modifier"}
              </Button>
              <CreditActionButton
                actionKey="mkt.site_brief"
                className="inline-block"
                buttonClassName="gap-1.5"
                variant="outline"
                size="sm"
                pending={mut.isPending}
                onConfirm={(key) => mut.mutateAsync(key)}
              >
                <RefreshCw className="h-4 w-4" /> Régénérer
              </CreditActionButton>
              <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => copy(asText)}>
                <Copy className="h-4 w-4" /> Copier
              </Button>
              <Button variant="ghost" size="sm" onClick={() => onUseBrief(asText)}>
                Utiliser pour le contenu du site
              </Button>
            </div>

            <div className="grid gap-3">
              {BRIEF_SECTIONS.map(([k, label]) => (
                <div key={k} className="rounded-xl border bg-card/60 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
                  {editing ? (
                    <Textarea
                      className="mt-2"
                      rows={4}
                      aria-label={label}
                      value={brief[k] ?? ""}
                      onChange={(e) => setBrief({ ...brief, [k]: e.target.value })}
                    />
                  ) : (
                    <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed">{brief[k]}</p>
                  )}
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

/* ------------------------------- Contenu du site ------------------------------ */

function ContentTab({ brief, setBrief }: { brief: string; setBrief: (v: string) => void }) {
  const orgId = useOrgId();
  const call = useServerFn(generateSiteContent);
  const [form, setForm] = useState({
    siteType: "vitrine",
    pages: "Accueil, Services, À propos, Contact",
    product: "",
    audience: "",
    goal: "Obtenir des demandes de devis",
    tone: "Professionnel",
    location: "",
    keywords: "",
    language: "Français",
    font: "",
    palette: "",
    style: SITE_STYLES[0],
    cta: "Demander un devis",
  });
  const [result, setResult] = useState<any>(null);

  const mut = useMutation({
    mutationFn: (key: string) => call({ data: { orgId: orgId!, idempotencyKey: key, brief, ...form } }),
    onSuccess: (d) => {
      setResult(d.result);
      toast.success("Contenu du site généré.");
    },
    onError: (e: any) => toast.error(e?.message ?? "Échec."),
  });

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
      <Card className="space-y-4 p-5">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Type de site</Label>
          <Select value={form.siteType} onValueChange={(v) => set("siteType", v)}>
            <SelectTrigger aria-label="Type de site à générer">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SITE_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Field label="Pages" value={form.pages} onChange={(v) => set("pages", v)} />
        <Field label="Produit / service" value={form.product} onChange={(v) => set("product", v)} />
        <Field label="Cible" value={form.audience} onChange={(v) => set("audience", v)} />
        <Field label="Objectif" value={form.goal} onChange={(v) => set("goal", v)} />
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Ton</Label>
            <Select value={form.tone} onValueChange={(v) => set("tone", v)}>
              <SelectTrigger aria-label="Ton">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SITE_TONES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Style</Label>
            <Select value={form.style} onValueChange={(v) => set("style", v)}>
              <SelectTrigger aria-label="Style">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SITE_STYLES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <Field label="Localisation" value={form.location} onChange={(v) => set("location", v)} placeholder="Lyon et sa région" />
        <Field label="Mots-clés" value={form.keywords} onChange={(v) => set("keywords", v)} placeholder="création site artisan lyon" />
        <Field label="Langue" value={form.language} onChange={(v) => set("language", v)} />
        <Field label="Police" value={form.font} onChange={(v) => set("font", v)} placeholder="Plus Jakarta Sans" />
        <Field label="Palette" value={form.palette} onChange={(v) => set("palette", v)} placeholder="Bleu nuit + ambre" />
        <Field label="CTA principal" value={form.cta} onChange={(v) => set("cta", v)} />
        <Area label="Briefing (repris de l'onglet Briefing site)" value={brief} onChange={setBrief} rows={5} />
        <CreditActionButton actionKey="mkt.site_content" pending={mut.isPending} disabled={!orgId} onConfirm={(key) => mut.mutateAsync(key)}>
          Générer le contenu du site
        </CreditActionButton>
      </Card>

      <div className="space-y-4">
        {!result && (
          <Card className="p-8 text-center text-sm text-muted-foreground">
            Stratégie, architecture, identité visuelle, contenu page par page et section par section,
            SEO, GEO, prompts d'images et d'icônes.
          </Card>
        )}
        {result && (
          <>
            <Card className="space-y-4 p-5">
              <div className="flex items-start justify-between gap-3">
                <p className="text-lg font-bold">Stratégie</p>
                <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => copy(JSON.stringify(result, null, 2))}>
                  <Copy className="h-4 w-4" /> Copier
                </Button>
              </div>
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{result.strategie}</p>
              <Block title="Architecture">
                {(result.architecture ?? []).map((a: string, i: number) => (
                  <div key={i}>• {a}</div>
                ))}
              </Block>
              <div className="grid gap-3 sm:grid-cols-2">
                <Block title="Palette">{result.identite_visuelle?.palette}</Block>
                <Block title="Polices">{result.identite_visuelle?.polices}</Block>
                <Block title="Style">{result.identite_visuelle?.style}</Block>
                <Block title="Principes">{result.identite_visuelle?.principes}</Block>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Block title="GEO (recherche IA)">{result.geo}</Block>
                <Block title="CTA global">{result.cta_global}</Block>
              </div>
            </Card>

            {(result.pages ?? []).map((page: any, pi: number) => (
              <Card key={pi} className="space-y-4 p-5">
                <div>
                  <p className="text-base font-bold">{page.page}</p>
                  <p className="text-xs text-muted-foreground">{page.objectif}</p>
                </div>
                <Block title="SEO">
                  <div>Title : {page.seo?.title}</div>
                  <div>Description : {page.seo?.description}</div>
                  <div>Mots-clés : {(page.seo?.mots_cles ?? []).join(", ")}</div>
                </Block>
                <div className="space-y-3">
                  {(page.sections ?? []).map((s: any, si: number) => (
                    <div key={si} className="rounded-xl border bg-card/60 p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge>{s.section}</Badge>
                        <span className="text-xs text-muted-foreground">{s.pourquoi}</span>
                      </div>
                      <p className="mt-2 font-semibold">{s.titre}</p>
                      <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">{s.texte}</p>
                      {s.cta && <p className="mt-2 text-sm font-medium">CTA : {s.cta}</p>}
                      <div className="mt-2 grid gap-1 text-[11px] text-muted-foreground">
                        {s.prompt_image && <span>Prompt image : {s.prompt_image}</span>}
                        {s.prompt_icone && <span>Prompt icône : {s.prompt_icone}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------ Page ----------------------------------- */

function LaminePage() {
  const [tab, setTab] = useState("promesse");
  const [brief, setBrief] = useState("");

  return (
    <AppShell
      title="Lamine — Marketing"
      subtitle="Promesse, proposition de valeur, briefing de site et contenu prêt à publier."
    >
      <Tabs value={tab} onValueChange={setTab} className="space-y-6">
        <TabsList className="flex-wrap">
          <TabsTrigger value="promesse">Promesse</TabsTrigger>
          <TabsTrigger value="proposition">Proposition de valeur</TabsTrigger>
          <TabsTrigger value="briefing">Briefing site</TabsTrigger>
          <TabsTrigger value="contenu">Contenu du site</TabsTrigger>
        </TabsList>

        <TabsContent value="promesse">
          <PromiseTab />
        </TabsContent>
        <TabsContent value="proposition">
          <ValuePropTab />
        </TabsContent>
        <TabsContent value="briefing">
          <BriefTab
            onUseBrief={(text) => {
              setBrief(text);
              setTab("contenu");
              toast.success("Briefing repris dans l'onglet Contenu du site.");
            }}
          />
        </TabsContent>
        <TabsContent value="contenu">
          <ContentTab brief={brief} setBrief={setBrief} />
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}
