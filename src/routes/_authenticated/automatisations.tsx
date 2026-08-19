import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { Switch } from "@/components/ui/switch";
import { agentByKey } from "@/lib/agents";

export const Route = createFileRoute("/_authenticated/automatisations")({
  head: () => ({
    meta: [
      { title: "Automatisations — Kobyde" },
      { name: "description", content: "Laissez vos agents IA travailler tout seuls : relances, résumés et alertes." },
      { property: "og:title", content: "Automatisations — Kobyde" },
      { property: "og:description", content: "Vos tâches répétitives, faites toutes seules." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Automations,
});

const RULES = [
  { id: "relance_devis", agent: "relances", title: "Relancer un devis sans réponse", detail: "Après 5 jours, Clara envoie un rappel poli." },
  { id: "relance_facture", agent: "devis", title: "Relancer une facture impayée", detail: "Michael prévient le client 3 jours après l'échéance." },
  { id: "resume_jour", agent: "directeur", title: "Résumé du matin", detail: "Éric vous envoie les 3 actions du jour à 8h." },
  { id: "veille_concurrent", agent: "analyse", title: "Surveiller les concurrents", detail: "Ethan vérifie chaque semaine ce qu'ils changent." },
  { id: "nouveau_prospect", agent: "commercial", title: "Qualifier les nouveaux prospects", detail: "Jason donne une note à chaque nouveau contact." },
  { id: "avis_client", agent: "clients", title: "Demander un avis client", detail: "Jennifer demande un avis après chaque projet livré." },
];


function Automations() {
  const [on, setOn] = useState<Record<string, boolean>>({ resume_jour: true, relance_facture: true });

  return (
    <AppShell title="Automatisations" subtitle="Cochez ce que vos agents doivent faire tout seuls.">
      <div className="grid gap-3 lg:grid-cols-2">
        {RULES.map((r) => {
          const a = agentByKey(r.agent);
          return (
            <article key={r.id} className="surface flex items-center gap-4 p-5">
              <span className={`grid size-11 shrink-0 place-items-center rounded-xl text-xl ring-2 ${a.ring}`}>
                {a.emoji}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-medium">{r.title}</p>
                <p className="text-sm text-muted-foreground">
                  {r.detail} <span className="text-xs">· par {a.name}</span>
                </p>
              </div>
              <Switch
                checked={!!on[r.id]}
                onCheckedChange={(v) => {
                  setOn((s) => ({ ...s, [r.id]: v }));
                  toast.success(v ? "Automatisation activée" : "Automatisation désactivée");
                }}
                aria-label={r.title}
              />
            </article>
          );
        })}
      </div>
    </AppShell>
  );
}
