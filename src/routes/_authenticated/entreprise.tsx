import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Building2, Check } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/lib/db";
import { COMPANY_FIELDS, COMPANY_GROUPS, companyCompletion } from "@/lib/company";

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

/* eslint-disable @typescript-eslint/no-explicit-any */
function CompanyPage() {
  const { data: profile, refetch } = useProfile();
  const qc = useQueryClient();
  const org = (profile?.organizations ?? null) as Record<string, any> | null;
  const orgId = profile?.current_org_id as string | undefined;
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!org) return;
    const next: Record<string, string> = {};
    for (const f of COMPANY_FIELDS) next[f.key] = org[f.key] == null ? "" : String(org[f.key]);
    setValues(next);
  }, [org]);

  const completion = companyCompletion({ ...(org ?? {}), ...values });

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgId) return;
    setSaving(true);
    const payload: Record<string, unknown> = {};
    for (const f of COMPANY_FIELDS) {
      const raw = (values[f.key] ?? "").trim();
      if (f.type === "number") payload[f.key] = raw === "" ? 0 : Number(raw);
      else if (f.key === "name") payload[f.key] = raw || (org?.name ?? "Mon entreprise");
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
              <p className="font-display text-xl">{values["name"] || org?.name || "Mon entreprise"}</p>
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
                  ) : (
                    <Input
                      id={f.key}
                      type={f.type === "number" ? "number" : "text"}
                      step={f.type === "number" ? "0.1" : undefined}
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

        <div className="flex justify-end">
          <Button type="submit" disabled={saving}>
            {saving ? "Enregistrement…" : "Enregistrer la fiche entreprise"}
          </Button>
        </div>
      </form>
    </AppShell>
  );
}
