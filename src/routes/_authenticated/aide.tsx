import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export const Route = createFileRoute("/_authenticated/aide")({
  head: () => ({
    meta: [
      { title: "Aide — Kobyde" },
      { name: "description", content: "Comment utiliser Kobyde en 3 minutes, expliqué simplement." },
      { property: "og:title", content: "Aide — Kobyde" },
      { property: "og:description", content: "Guide simple de Kobyde." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Help,
});

const FAQ = [
  {
    q: "Par où je commence ?",
    a: "Ajoutez un prospect, puis créez un devis. C'est tout. Le reste se remplit tout seul au fur et à mesure.",
  },
  {
    q: "C'est quoi un agent IA ?",
    a: "Un collègue virtuel qui travaille pour vous. Vous lui écrivez ce dont vous avez besoin, il s'en occupe.",
  },
  {
    q: "C'est quoi les crédits ?",
    a: "Chaque tâche demandée à un agent consomme un peu de crédits. Vous voyez le solde en bas du menu.",
  },
  {
    q: "Mes données sont-elles privées ?",
    a: "Oui. Chaque entreprise est isolée : personne d'une autre entreprise ne peut voir vos données.",
  },
  {
    q: "Quelle est la différence entre prospect et client ?",
    a: "Un prospect n'a pas encore acheté. Un client, oui.",
  },
];

function Help() {
  return (
    <AppShell title="Aide" subtitle="Tout Kobyde en 3 minutes.">
      <div className="surface mx-auto max-w-2xl p-6">
        <Accordion type="single" collapsible>
          {FAQ.map((f) => (
            <AccordionItem key={f.q} value={f.q}>
              <AccordionTrigger className="text-left">{f.q}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">{f.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </AppShell>
  );
}
