import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Building2, Check, Clock, Sparkles, Upload } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/lib/db";
import {
  COMPANY_FIELDS,
  COMPANY_GROUPS,
  DEFAULT_OPENING_HOURS,
  HOUR_SLOTS,
  companyCompletion,
  type OpeningDay,
} from "@/lib/company";
import { generateKnowledgeBase, importKnowledgeBase } from "@/lib/knowledge.functions";

export const Route = createFileRoute("/_authenticated/entreprise")({
  head: () => ({
    meta: [
      { title: "Fiche entreprise — Kobyde" },
      {
        name: "description",
        content:
          "La mémoire centrale de votre entreprise : identité, coordonnées, offre et positionnement utilisés automatiquement par vos agents IA.",
      },
      { property: "og:title", content: "Fiche entreprise — Kobyde" },
      { property: "og:description", content: "Une source de vérité unique partagée par vos 10 agents IA." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CompanyPage,
});

const readFile = (file: File) =>
  new Promise<{ name: string; mime: string; base64: string }>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      resolve({
        name: file.name,
        mime: file.type || "",
        base64: String(reader.result ?? "").split(",").pop() ?? "",
      });
    reader.onerror = () => reject(new Error("Lecture du fichier impossible."));
    reader.readAsDataURL(file);
  });

/* eslint-disable @typescript-eslint/no-explicit-any */
function CompanyPage() {
  const { data: profile, refetch } = useProfile();
  const qc = useQueryClient();
  const org = (profile?.organizations ?? null) as Record<string, any> | null;
  const orgId = profile?.current_org_id as string | undefined;
  const [values, setValues] = useState<Record<string, string>>({});
  const [hours, setHours] = useState<OpeningDay[]>(DEFAULT_OPENING_HOURS);
  const [knowledge, setKnowledge] = useState("");
  const [pasted, setPasted] = useState("");
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState<"generate" | "import" | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!org) return;
    const next: Record<string, string> = {};
    for (const f of COMPANY_FIELDS) {
      next[f.key] = org[f.key] == null ? "" : String(org[f.key]);
      if (f.codeKey) next[f.codeKey] = org[f.codeKey] == null ? "" : String(org[f.codeKey]);
    }
    setValues(next);
    setKnowledge(org["knowledge_base"] ?? "");
    const raw = org["opening_hours"];
    setHours(Array.isArray(raw) && raw.length === 7 ? (raw as OpeningDay[]) : DEFAULT_OPENING_HOURS);
  }, [org]);

  const completion = companyCompletion({ ...(org ?? {}), ...values });

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgId) return;
    setSaving(true);
    const payload: Record<string, unknown> = { opening_hours: hours, knowledge_base: knowledge.trim() || null };
    for (const f of COMPANY_FIELDS) {
      const raw = (values[f.key] ?? "").trim();
      if (f.key === "vat_rate") payload[f.key] = raw === "" ? 0 : Number(raw);
      else if (f.type === "number") payload[f.key] = raw === "" ? 0 : Number(raw);
      else if (f.key === "name") payload[f.key] = raw || (org?.["name"] ?? "Mon entreprise");
      else if (f.key === "currency") payload[f.key] = raw || "EUR";
      else payload[f.key] = raw === "" ? null : raw;
    }
    const { error } = await supabase.from("organizations").update(payload as any).eq("id", orgId);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Fiche entreprise enregistrée — vos agents l'utilisent immédiatement.");
    await refetch();
    qc.invalidateQueries();
  };

  const runGenerate = async () => {
    if (!orgId) return;
    setBusy("generate");
    try {
      const res = await generateKnowledgeBase({ data: { orgId } });
      setKnowledge(res.knowledge);
      toast.success("Base de connaissance générée à partir de votre fiche entreprise.");
      await refetch();
    } catch (err: any) {
      toast.error(err?.message ?? "Génération impossible.");
    } finally {
      setBusy(null);
    }
  };

  const runImport = async (file?: File) => {
    if (!orgId) return;
    if (!file && !pasted.trim()) {
      toast.error("Ajoutez un fichier ou collez un texte.");
      return;
    }
    setBusy("import");
    try {
      const payload = file ? await readFile(file) : null;
      const res = await importKnowledgeBase({ data: { orgId, pasted: pasted || null, file: payload } });
      setKnowledge(res.knowledge);
      setPasted("");
      toast.success("Base de connaissance enrichie.");
      await refetch();
    } catch (err: any) {
      toast.error(err?.message ?? "Import impossible.");
    } finally {
      setBusy(null);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const setHour = (i: number, patch: Partial<OpeningDay>) =>
    setHours((h) => h.map((d, idx) => (idx === i ? { ...d, ...patch } : d)));

  return (
    <AppShell
      title="Fiche entreprise"
      subtitle="La source de vérité unique : vos agents s'en servent automatiquement et ne vous redemandent jamais ces informations."
    >
      <form onSubmit={save} className="space-y-6">
        <section className="surface flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            {values["logo_url"] ? (
              <img
                src={values["logo_url"]}
                alt={`Logo de ${values["name"] || "l'entreprise"}`}
                className="size-14 rounded-xl object-contain"
                loading="lazy"
              />
            ) : (
              <span className="grid size-14 place-items-center rounded-xl bg-secondary text-muted-foreground">
                <Building2 className="size-6" />
              </span>
            )}
            <div>
              <p className="font-display text-xl">{values["name"] || org?.["name"] || "Mon entreprise"}</p>
              <p className="text-sm text-muted-foreground">Mémoire centrale complétée à {completion} %</p>
              <div className="mt-2 h-2 w-56 max-w-full overflow-hidden rounded-full bg-secondary">
                <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${completion}%` }} />
              </div>
            </div>
          </div>
          <Button type="submit" disabled={saving}>
            {saving ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </section>

        {COMPANY_GROUPS.map((group) => (
          <section key={group.title} className="surface p-6">
            <h2 className="text-lg">{group.title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{group.description}</p>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {group.fields.map((f) => (
                <div key={f.key} className={f.type === "textarea" ? "space-y-1.5 md:col-span-2" : "space-y-1.5"}>
                  <Label htmlFor={f.key} className="flex items-center gap-2">
                    {f.label}
                    {(values[f.key] ?? "").trim() !== "" && <Check className="size-3.5 text-primary" />}
                  </Label>
                  {f.type === "textarea" ? (
                    <Textarea
                      id={f.key}
                      rows={3}
                      placeholder={f.placeholder}
                      value={values[f.key] ?? ""}
                      onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                    />
                  ) : f.type === "select" ? (
                    <Select
                      value={values[f.key] ?? ""}
                      onValueChange={(val) => setValues((v) => ({ ...v, [f.key]: val }))}
                    >
                      <SelectTrigger id={f.key}>
                        <SelectValue placeholder={f.placeholder ?? "Choisir"} />
                      </SelectTrigger>
                      <SelectContent>
                        {(f.options ?? []).map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      id={f.key}
                      type="text"
                      placeholder={f.placeholder}
                      value={values[f.key] ?? ""}
                      onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                    />
                  )}
                </div>
              ))}
            </div>
          </section>
        ))}

        <section className="surface p-6">
          <h2 className="flex items-center gap-2 text-lg">
            <Clock className="size-4" /> Horaires d'ouverture
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Utilisés par vos agents dans les réponses clients, les relances et vos fiches en ligne.
          </p>
          <div className="mt-5 space-y-3">
            {hours.map((d, i) => (
              <div key={d.day} className="grid grid-cols-1 items-center gap-3 sm:grid-cols-[8rem_auto_1fr_1fr]">
                <span className="text-sm font-medium">{d.day}</span>
                <div className="flex items-center gap-2">
                  <Switch checked={!d.closed} onCheckedChange={(c) => setHour(i, { closed: !c })} id={`open-${i}`} />
                  <Label htmlFor={`open-${i}`} className="text-sm text-muted-foreground">
                    {d.closed ? "Fermé" : "Ouvert"}
                  </Label>
                </div>
                <Select value={d.open} onValueChange={(v) => setHour(i, { open: v })} disabled={d.closed}>
                  <SelectTrigger aria-label={`Heure d'ouverture ${d.day}`}>
                    <SelectValue placeholder="Ouverture" />
                  </SelectTrigger>
                  <SelectContent>
                    {HOUR_SLOTS.map((h) => (
                      <SelectItem key={h} value={h}>
                        {h}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={d.close} onValueChange={(v) => setHour(i, { close: v })} disabled={d.closed}>
                  <SelectTrigger aria-label={`Heure de fermeture ${d.day}`}>
                    <SelectValue placeholder="Fermeture" />
                  </SelectTrigger>
                  <SelectContent>
                    {HOUR_SLOTS.map((h) => (
                      <SelectItem key={h} value={h}>
                        {h}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
        </section>

        <section className="surface p-6">
          <h2 className="text-lg">Base de connaissance</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Le socle documentaire de vos agents : générez-la depuis votre fiche, votre offre et votre site web, ou
            importez vos documents.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button type="button" onClick={runGenerate} disabled={busy !== null}>
              <Sparkles className="size-4" />
              {busy === "generate" ? "Génération…" : "Générer la base de connaissance"}
            </Button>
            <Button type="button" variant="outline" onClick={() => fileRef.current?.click()} disabled={busy !== null}>
              <Upload className="size-4" />
              {busy === "import" ? "Import…" : "Importer un fichier (PDF, Word, texte…)"}
            </Button>
            <input
              ref={fileRef}
              type="file"
              className="hidden"
              accept=".pdf,.docx,.doc,.txt,.md,.csv,.xlsx,.xls"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void runImport(f);
              }}
            />
          </div>

          <div className="mt-5 space-y-1.5">
            <Label htmlFor="pasted">Coller un texte ou du Markdown</Label>
            <Textarea
              id="pasted"
              rows={4}
              placeholder="Collez ici un extrait de vos documents, CGV, FAQ…"
              value={pasted}
              onChange={(e) => setPasted(e.target.value)}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => void runImport()}
              disabled={busy !== null || !pasted.trim()}
            >
              Ajouter à la base de connaissance
            </Button>
          </div>

          <div className="mt-5 space-y-1.5">
            <Label htmlFor="knowledge_base">Contenu de la base de connaissance</Label>
            <Textarea
              id="knowledge_base"
              rows={14}
              placeholder="Générez ou importez votre base de connaissance, puis affinez-la ici."
              value={knowledge}
              onChange={(e) => setKnowledge(e.target.value)}
            />
          </div>
        </section>

        <div className="flex justify-end">
          <Button type="submit" disabled={saving}>
            {saving ? "Enregistrement…" : "Enregistrer la fiche entreprise"}
          </Button>
        </div>
      </form>
    </AppShell>
  );
}
