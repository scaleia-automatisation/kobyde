import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, Plus, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/lib/db";

export const Route = createFileRoute("/_authenticated/bienvenue")({
  head: () => ({
    meta: [
      { title: "Bienvenue dans votre équipe IA — Kobyde" },
      {
        name: "description",
        content:
          "Configurez Kobyde en 7 étapes simples : entreprise, TVA, offre, client idéal et connexions. Votre équipe de 10 agents IA est prête en quelques minutes.",
      },
      { property: "og:title", content: "Bienvenue dans votre équipe IA — Kobyde" },
      { property: "og:description", content: "Un onboarding en 7 étapes pour activer vos 10 agents IA." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: OnboardingPage,
});

type Offer = { name: string; description: string; price: string; vat: string; category: string };

const CONNECTIONS = [
  { key: "google", label: "Google", hint: "Connexion unique à votre compte Google." },
  { key: "gmail", label: "Gmail", hint: "Vos agents envoient et suivent vos emails." },
  { key: "google_calendar", label: "Google Calendar", hint: "Rendez-vous et relances planifiés." },
  { key: "google_drive", label: "Google Drive", hint: "Devis, factures et documents archivés." },
  { key: "stripe", label: "Stripe", hint: "Encaissements et suivi des paiements." },
  { key: "google_analytics", label: "Google Analytics", hint: "Audience et conversions analysées." },
  { key: "search_console", label: "Search Console", hint: "Visibilité et mots-clés suivis." },
];

const STEPS = ["Bienvenue", "Entreprise", "TVA", "Produits", "Client idéal", "Connexions", "C'est prêt"];

/* eslint-disable @typescript-eslint/no-explicit-any */
function OnboardingPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: profile } = useProfile();
  const org = (profile?.organizations ?? null) as Record<string, any> | null;
  const orgId = profile?.current_org_id as string | undefined;

  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [company, setCompany] = useState({ name: "", company_type: "", siret: "", country: "France", industry: "" });
  const [vat, setVat] = useState({ vat_rate: "20", vat_regime: "" });
  const [offers, setOffers] = useState<Offer[]>([{ name: "", description: "", price: "", vat: "20", category: "" }]);
  const [ideal, setIdeal] = useState({
    ideal_client_type: "",
    ideal_client_sector: "",
    ideal_client_location: "",
    ideal_client_size: "",
    ideal_client_needs: "",
  });
  const [connections, setConnections] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!org) return;
    setCompany((c) => ({
      name: org.name ?? c.name,
      company_type: org.company_type ?? c.company_type,
      siret: org.siret ?? c.siret,
      country: org.country ?? c.country,
      industry: org.industry ?? c.industry,
    }));
    setVat((v) => ({
      vat_rate: org.vat_rate != null ? String(org.vat_rate) : v.vat_rate,
      vat_regime: org.vat_regime ?? v.vat_regime,
    }));
    setIdeal((i) => ({
      ideal_client_type: org.ideal_client_type ?? i.ideal_client_type,
      ideal_client_sector: org.ideal_client_sector ?? i.ideal_client_sector,
      ideal_client_location: org.ideal_client_location ?? i.ideal_client_location,
      ideal_client_size: org.ideal_client_size ?? i.ideal_client_size,
      ideal_client_needs: org.ideal_client_needs ?? i.ideal_client_needs,
    }));
    setConnections((c) => ({ ...(org.integrations ?? {}), ...c }));
  }, [org]);

  async function saveOrg(patch: Record<string, any>) {
    if (!orgId) return;
    const { error } = await supabase.from("organizations").update(patch as any).eq("id", orgId);
    if (error) throw error;
    await qc.invalidateQueries({ queryKey: ["profile"] });
  }

  async function next() {
    if (!orgId && step > 0) return;
    setSaving(true);
    try {
      if (step === 1) {
        if (!company.name.trim()) {
          toast.error("Le nom de l'entreprise est requis.");
          return;
        }
        await saveOrg(company);
      }
      if (step === 2) {
        await saveOrg({ vat_rate: Number(vat.vat_rate || 0), vat_regime: vat.vat_regime || null });
      }
      if (step === 3) {
        const valid = offers.filter((o) => o.name.trim());
        if (valid.length) {
          const { error } = await supabase.from("products").insert(
            valid.map((o) => ({
              org_id: orgId!,
              name: o.name.trim(),
              kind: "service",
              category: o.category || null,
              description: o.description || null,
              price: Number(o.price || 0),
              unit: o.vat ? `TVA ${o.vat}%` : null,
            })) as any,
          );
          if (error) throw error;
          await saveOrg({
            products_text: valid
              .map((o) => `${o.name} — ${o.price || 0} € (TVA ${o.vat || 0}%)${o.category ? ` · ${o.category}` : ""}`)
              .join("\n"),
          });
          await qc.invalidateQueries({ queryKey: ["rows", "products"] });
        }
      }
      if (step === 4) {
        await saveOrg({
          ...ideal,
          target_audience: [
            ideal.ideal_client_type,
            ideal.ideal_client_sector,
            ideal.ideal_client_location,
            ideal.ideal_client_size,
            ideal.ideal_client_needs,
          ]
            .filter(Boolean)
            .join(" · "),
        });
      }
      if (step === 5) {
        await saveOrg({ integrations: connections });
      }
      if (step === 6) {
        await saveOrg({ onboarding_completed: true });
        navigate({ to: "/eric", replace: true });
        return;
      }
      setStep((s) => Math.min(s + 1, STEPS.length - 1));
    } catch (e: any) {
      toast.error(e?.message ?? "Une erreur est survenue.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="aurora-bg min-h-screen px-4 py-10">
      <div className="mx-auto w-full max-w-2xl">
        <div className="mb-6 flex items-center justify-center gap-2">
          {STEPS.map((s, i) => (
            <span
              key={s}
              className={`h-1.5 flex-1 rounded-full transition-colors ${i <= step ? "bg-primary" : "bg-muted"}`}
              aria-label={s}
            />
          ))}
        </div>

        <div className="rounded-2xl border border-border/60 bg-card/90 p-6 shadow-xl backdrop-blur md:p-10">
          {step === 0 && (
            <div className="space-y-6 text-center">
              <Sparkles className="mx-auto h-10 w-10 text-primary" />
              <h1 className="text-3xl font-black italic tracking-tight md:text-4xl">Bienvenue dans votre équipe IA.</h1>
              <p className="text-muted-foreground">
                Quelques minutes pour configurer vos 10 agents. Vous pourrez tout modifier ensuite.
              </p>
              <Button size="lg" onClick={() => setStep(1)}>
                Commencer
              </Button>
            </div>
          )}

          {step === 1 && (
            <Section title="Votre entreprise" subtitle="Ces informations servent à tous vos agents.">
              <Field label="Nom de l'entreprise" value={company.name} onChange={(v) => setCompany({ ...company, name: v })} placeholder="Kobyde SAS" />
              <Field label="Type d'entreprise" value={company.company_type} onChange={(v) => setCompany({ ...company, company_type: v })} placeholder="SAS, SARL, auto-entrepreneur…" />
              <Field label="SIRET" value={company.siret} onChange={(v) => setCompany({ ...company, siret: v })} placeholder="123 456 789 00012" />
              <Field label="Pays" value={company.country} onChange={(v) => setCompany({ ...company, country: v })} placeholder="France" />
              <Field label="Activité" value={company.industry} onChange={(v) => setCompany({ ...company, industry: v })} placeholder="Bâtiment, conseil, e-commerce…" />
            </Section>
          )}

          {step === 2 && (
            <Section title="TVA" subtitle="Appliquée automatiquement à vos devis et factures.">
              <Field label="Taux de TVA (%)" type="number" value={vat.vat_rate} onChange={(v) => setVat({ ...vat, vat_rate: v })} placeholder="20" />
              <Field label="Régime (si nécessaire)" value={vat.vat_regime} onChange={(v) => setVat({ ...vat, vat_regime: v })} placeholder="Franchise en base, régime réel…" />
            </Section>
          )}

          {step === 3 && (
            <Section title="Produits et services" subtitle="Ajoutez votre offre principale, vous pourrez en ajouter d'autres.">
              <div className="space-y-4">
                {offers.map((o, i) => (
                  <div key={i} className="space-y-3 rounded-xl border border-border/60 p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold">Offre {i + 1}</span>
                      {offers.length > 1 && (
                        <Button variant="ghost" size="icon" aria-label="Supprimer" onClick={() => setOffers(offers.filter((_, j) => j !== i))}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    <Field label="Nom" value={o.name} onChange={(v) => setOffers(offers.map((x, j) => (j === i ? { ...x, name: v } : x)))} placeholder="Audit stratégique" />
                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Textarea
                        value={o.description}
                        onChange={(e) => setOffers(offers.map((x, j) => (j === i ? { ...x, description: e.target.value } : x)))}
                        placeholder="Ce que le client obtient."
                      />
                    </div>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <Field label="Prix (€)" type="number" value={o.price} onChange={(v) => setOffers(offers.map((x, j) => (j === i ? { ...x, price: v } : x)))} placeholder="990" />
                      <Field label="TVA (%)" type="number" value={o.vat} onChange={(v) => setOffers(offers.map((x, j) => (j === i ? { ...x, vat: v } : x)))} placeholder="20" />
                      <Field label="Catégorie" value={o.category} onChange={(v) => setOffers(offers.map((x, j) => (j === i ? { ...x, category: v } : x)))} placeholder="Conseil" />
                    </div>
                  </div>
                ))}
                <Button variant="outline" onClick={() => setOffers([...offers, { name: "", description: "", price: "", vat: vat.vat_rate, category: "" }])}>
                  <Plus className="mr-2 h-4 w-4" /> Ajouter une offre
                </Button>
              </div>
            </Section>
          )}

          {step === 4 && (
            <Section title="Votre client idéal" subtitle="Vos agents ciblent et personnalisent grâce à ce profil.">
              <Field label="Type" value={ideal.ideal_client_type} onChange={(v) => setIdeal({ ...ideal, ideal_client_type: v })} placeholder="B2B, B2C, collectivités…" />
              <Field label="Secteur" value={ideal.ideal_client_sector} onChange={(v) => setIdeal({ ...ideal, ideal_client_sector: v })} placeholder="Industrie, santé, retail…" />
              <Field label="Localisation" value={ideal.ideal_client_location} onChange={(v) => setIdeal({ ...ideal, ideal_client_location: v })} placeholder="Île-de-France, France entière…" />
              <Field label="Taille" value={ideal.ideal_client_size} onChange={(v) => setIdeal({ ...ideal, ideal_client_size: v })} placeholder="10 à 50 salariés" />
              <div className="space-y-2">
                <Label>Besoins</Label>
                <Textarea value={ideal.ideal_client_needs} onChange={(e) => setIdeal({ ...ideal, ideal_client_needs: e.target.value })} placeholder="Les problèmes que vous résolvez." />
              </div>
            </Section>
          )}

          {step === 5 && (
            <Section title="Connexions" subtitle="Chaque connexion peut être faite plus tard.">
              <div className="space-y-3">
                {CONNECTIONS.map((c) => {
                  const on = !!connections[c.key];
                  return (
                    <div key={c.key} className="flex items-center justify-between gap-4 rounded-xl border border-border/60 p-4">
                      <div>
                        <p className="font-semibold">{c.label}</p>
                        <p className="text-sm text-muted-foreground">{c.hint}</p>
                      </div>
                      <Button
                        variant={on ? "secondary" : "outline"}
                        onClick={() => setConnections({ ...connections, [c.key]: !on })}
                      >
                        {on ? (
                          <>
                            <Check className="mr-2 h-4 w-4" /> Prévu
                          </>
                        ) : (
                          "Plus tard"
                        )}
                      </Button>
                    </div>
                  );
                })}
              </div>
            </Section>
          )}

          {step === 6 && (
            <div className="space-y-6 text-center">
              <Check className="mx-auto h-10 w-10 text-primary" />
              <h1 className="text-3xl font-black italic tracking-tight md:text-4xl">Votre équipe IA est prête.</h1>
              <p className="text-muted-foreground">Éric et ses 9 agents connaissent votre entreprise et attendent votre première demande.</p>
              <Button size="lg" onClick={next} disabled={saving}>
                Découvrir mon espace
              </Button>
            </div>
          )}

          {step > 0 && step < 6 && (
            <div className="mt-8 flex items-center justify-between">
              <Button variant="ghost" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={saving}>
                Retour
              </Button>
              <div className="flex items-center gap-2">
                <Button variant="ghost" onClick={() => setStep((s) => s + 1)} disabled={saving}>
                  Plus tard
                </Button>
                <Button onClick={next} disabled={saving}>
                  {saving ? "Enregistrement…" : "Continuer"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}
