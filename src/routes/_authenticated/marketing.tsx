import { createFileRoute } from "@tanstack/react-router";
import { ModulePage } from "@/components/module-page";

export const Route = createFileRoute("/_authenticated/marketing")({
  head: () => ({
    meta: [
      { title: "Marketing — Kobyde" },
      { name: "description", content: "Vos campagnes pour vous faire connaître, préparées par Sam, votre agent marketing." },
      { property: "og:title", content: "Marketing — Kobyde" },
      { property: "og:description", content: "Vos campagnes marketing." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <ModulePage
      config={{
        table: "campaigns",
        title: "Marketing",
        subtitle: "Vos campagnes pour vous faire connaître.",
        emptyText: "Lancez une première campagne : un nom, une cible, et Sam écrit les messages.",
        addLabel: "Créer une campagne",
        badgeField: "status",
        fields: [
          { name: "name", label: "Nom de la campagne", required: true, placeholder: "Offre de printemps" },
          { name: "channel", label: "Canal", defaultValue: "email" },
          { name: "audience", label: "Cible", placeholder: "Anciens clients" },
        ],
      }}
    />
  ),
});
