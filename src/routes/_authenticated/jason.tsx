import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useId, useState } from "react";
import { CheckCircle2, ExternalLink, Loader2, Search, Sparkles, UserRound } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CreditActionButton } from "@/components/credit-action";
import { useOrgId } from "@/lib/db";
import { CHANNELS, NOT_FOUND, TOOLS, WORKFLOW_STEPS, searchActionKey } from "@/lib/prospection";
import { findProspects, generatePersona, savePersona } from "@/lib/prospection.functions";

export const Route = createFileRoute("/_authenticated/jason")({
  component: JasonPage,
  head: () => ({
    meta: [
      { title: "Jason — Recherche de prospects — Kobyde" },
      {
        name: "description",
        content:
          "Jason, votre commercial IA : persona, recherche multicanale et prospects qualifiés avec leurs sources réelles.",
      },
      { property: "og:title", content: "Jason — Recherche de prospects — Kobyde" },
      {
        property: "og:description",
        content: "Générez un persona puis trouvez des prospects réels, qualifiés et sourcés.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

type Params = {
  target: string;
  continent: string;
  country: string;
  region: string;
  department: string;
  city: string;
  district: string;
  count: number;
  offer: string;
  channel: string;
  tool: string;
};

const DEFAULT_PARAMS: Params = {
  target: "",
  continent: "Europe",
  country: "France",
  region: "",
  department: "",
  city: "",
  district: "",
  count: 20,
  offer: "",
  channel: "Google Search",
  tool: "Automatique",
};

type PersonaRow = { id: string; title: string; content: string; status: string };
type SearchResult = Awaited<ReturnType<typeof findProspects>>;

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
      <Label htmlFor={id} className="text-xs text-muted-foreground">{label}</Label>
      <Input id={id} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}

function JasonPage() {
  const orgId = useOrgId();
  const qc = useQueryClient();

  const [params, setParams] = useState<Params>(DEFAULT_PARAMS);
  const [persona, setPersona] = useState<PersonaRow | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [result, setResult] = useState<SearchResult | null>(null);

  const set = <K extends keyof Params>(k: K, v: Params[K]) => setParams((p) => ({ ...p, [k]: v }));

  const callPersona = useServerFn(generatePersona);
  const callSave = useServerFn(savePersona);
  const callFind = useServerFn(findProspects);

  const personaMutation = useMutation({
    mutationFn: (key: string) =>
      callPersona({ data: { orgId: orgId!, idempotencyKey: key, params } }),
    onSuccess: (d) => {
      setPersona(d.persona);
      setDraft(d.persona.content);
      setEditing(false);
      qc.invalidateQueries();
      toast.success("Persona généré par Jason.");
    },
    onError: (e: Error) => toast.error(e.message || "Jason n'a pas pu générer le persona."),
  });

  const saveMutation = useMutation({
    mutationFn: (vars: { content?: string; status?: "brouillon" | "valide" }) =>
      callSave({ data: { orgId: orgId!, personaId: persona!.id, ...vars } }),
    onSuccess: (_d, vars) => {
      setPersona((p) =>
        p ? { ...p, content: vars.content ?? p.content, status: vars.status ?? p.status } : p,
      );
      setEditing(false);
      toast.success(vars.status === "valide" ? "Persona validé." : "Persona enregistré.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const findMutation = useMutation({
    mutationFn: (key: string) =>
      callFind({
        data: {
          orgId: orgId!,
          idempotencyKey: key,
          params,
          personaId: persona?.id ?? null,
          personaText: persona?.content ?? "",
        },
      }),
    onSuccess: (d) => {
      setResult(d);
      qc.invalidateQueries();
      toast.success(`${d.inserted} prospect(s) ajouté(s) à votre CRM.`);
    },
    onError: (e: Error) => toast.error(e.message || "La recherche n'a pas abouti."),
  });

  const running = findMutation.isPending;

  return (
    <AppShell title="Jason — Rechercher des prospects" subtitle="Votre commercial IA trouve, qualifie et prépare vos futurs clients.">
      <div className="mx-auto w-full max-w-5xl space-y-8 pb-16">
        <Card className="space-y-5 p-6">
          <h2 className="text-lg font-bold">Paramètres de recherche</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Cible" value={params.target} onChange={(v) => set("target", v)} placeholder="Restaurants indépendants" />
            <Field label="Produit / service" value={params.offer} onChange={(v) => set("offer", v)} placeholder="Création de site web" />
            <Field label="Continent" value={params.continent} onChange={(v) => set("continent", v)} placeholder="Europe" />
            <Field label="Pays" value={params.country} onChange={(v) => set("country", v)} placeholder="France" />
            <Field label="Région" value={params.region} onChange={(v) => set("region", v)} placeholder="Île-de-France" />
            <Field label="Département" value={params.department} onChange={(v) => set("department", v)} placeholder="Paris (75)" />
            <Field label="Ville" value={params.city} onChange={(v) => set("city", v)} placeholder="Paris" />
            <Field label="Quartier" value={params.district} onChange={(v) => set("district", v)} placeholder="Le Marais" />

            <div className="space-y-1.5">
              <Label htmlFor="prospect-count" className="text-xs text-muted-foreground">Nombre de résultats (0 à 100)</Label>
              <Input
                id="prospect-count"
                type="number"
                min={0}
                max={100}
                value={params.count}
                onChange={(e) =>
                  set("count", Math.max(0, Math.min(100, Number(e.target.value) || 0)))
                }
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Canal</Label>
              <Select value={params.channel} onValueChange={(v) => set("channel", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CHANNELS.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Outil</Label>
              <Select value={params.tool} onValueChange={(v) => set("tool", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TOOLS.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>

        <Card className="space-y-4 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-lg font-bold">
              <UserRound className="size-5" /> Persona
            </h2>
            {persona && (
              <Badge variant={persona.status === "valide" ? "default" : "secondary"}>
                {persona.status === "valide" ? "Validé" : "Brouillon"}
              </Badge>
            )}
          </div>

          {!persona && (
            <CreditActionButton
              actionKey="prospect.persona"
              pending={personaMutation.isPending}
              disabled={!orgId}
              onConfirm={(key) => personaMutation.mutateAsync(key)}
              className="max-w-xs"
            >
              {personaMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Sparkles className="size-4" />
              )}
              Générer le persona
            </CreditActionButton>
          )}

          {persona && (
            <div className="space-y-4">
              <p className="font-semibold">{persona.title}</p>
              {editing ? (
                <Textarea rows={12} value={draft} onChange={(e) => setDraft(e.target.value)} />
              ) : (
                <p className="whitespace-pre-wrap text-sm text-muted-foreground">{persona.content}</p>
              )}
              <div className="flex flex-wrap items-start gap-3">
                {editing ? (
                  <>
                    <Button onClick={() => saveMutation.mutate({ content: draft })} disabled={saveMutation.isPending}>
                      Enregistrer
                    </Button>
                    <Button variant="outline" onClick={() => { setEditing(false); setDraft(persona.content); }}>
                      Annuler
                    </Button>
                  </>
                ) : (
                  <Button variant="outline" onClick={() => setEditing(true)}>Modifier</Button>
                )}
                <CreditActionButton
                  actionKey="prospect.persona"
                  pending={personaMutation.isPending}
                  onConfirm={(key) => personaMutation.mutateAsync(key)}
                  className="w-auto"
                  buttonClassName="gap-2"
                  variant="secondary"
                >
                  <Sparkles className="size-4" /> Régénérer
                </CreditActionButton>
                <Button
                  onClick={() => saveMutation.mutate({ status: "valide", content: editing ? draft : persona.content })}
                  disabled={saveMutation.isPending || persona.status === "valide"}
                  className="gap-2"
                >
                  <CheckCircle2 className="size-4" /> Valider
                </Button>
              </div>
            </div>
          )}
        </Card>

        <Card className="space-y-4 p-6">
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <Search className="size-5" /> Recherche
          </h2>
          <p className="text-sm text-muted-foreground">
            Workflow appliqué par Jason : {WORKFLOW_STEPS.join(" → ")}.
          </p>
          <p className="rounded-lg bg-muted p-3 text-sm">
            <strong>Règle absolue :</strong> Jason n'invente jamais une entreprise. Si une information
            n'est pas trouvée, elle est affichée « {NOT_FOUND} », et chaque donnée importante conserve sa source.
          </p>
          <CreditActionButton
            actionKey={searchActionKey(params.count)}
            pending={running}
            disabled={!orgId || params.count === 0}
            onConfirm={(key) => findMutation.mutateAsync(key)}
            className="max-w-xs"
          >
            {running ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
            Trouver les prospects
          </CreditActionButton>
        </Card>

        {result && (
          <Card className="space-y-5 p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-bold">Résultats</h2>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">{result.inserted} ajoutés au CRM</Badge>
                <Badge variant="outline">{result.doublons} doublon(s) écarté(s)</Badge>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">{result.rapport}</p>

            <div className="flex flex-wrap gap-2">
              {result.etapes.map((e, i) => (
                <Badge key={`${e.step}-${i}`} variant="outline" title={e.detail}>
                  {i + 1}. {e.step}
                </Badge>
              ))}
            </div>

            <div className="space-y-3">
              {result.prospects.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Aucun prospect réel n'a pu être confirmé pour ces critères. Élargissez la zone ou changez de canal.
                </p>
              )}
              {result.prospects.map((p, i) => (
                <div key={`${p.company_name}-${i}`} className="rounded-xl border p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold">{p.company_name}</p>
                    <div className="flex gap-2">
                      <Badge variant="secondary">Score {p.score}</Badge>
                      <Badge variant="outline">{p.channel}</Badge>
                    </div>
                  </div>
                  <dl className="mt-2 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
                    <div><dt className="inline text-muted-foreground">Contact : </dt><dd className="inline">{p.full_name}</dd></div>
                    <div><dt className="inline text-muted-foreground">Ville : </dt><dd className="inline">{p.city}</dd></div>
                    <div><dt className="inline text-muted-foreground">Email : </dt><dd className="inline">{p.email}</dd></div>
                    <div><dt className="inline text-muted-foreground">Téléphone : </dt><dd className="inline">{p.phone}</dd></div>
                    <div><dt className="inline text-muted-foreground">Site : </dt><dd className="inline">{p.website}</dd></div>
                    <div><dt className="inline text-muted-foreground">Qualification : </dt><dd className="inline">{p.qualification}</dd></div>
                  </dl>
                  <p className="mt-2 text-sm"><span className="text-muted-foreground">Angle commercial : </span>{p.angle}</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm"><span className="text-muted-foreground">Message : </span>{p.personalized_message}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {p.source_url !== NOT_FOUND && (
                      <a
                        className="inline-flex items-center gap-1 text-xs text-primary underline"
                        href={p.source_url}
                        target="_blank"
                        rel="noreferrer noopener"
                      >
                        <ExternalLink className="size-3" /> Source
                      </a>
                    )}
                    {p.sources.map((s, k) => (
                      <span key={k} className="rounded-full bg-muted px-2 py-0.5 text-[11px]">
                        {s.champ} · {s.source}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
