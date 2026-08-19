import { createFileRoute } from "@tanstack/react-router";
import { ModulePage } from "@/components/module-page";

export const Route = createFileRoute("/_authenticated/devis")({
  head: () => ({
    meta: [
      { title: "Devis — Kobyde" },
      { name: "description", content: "Créez et suivez vos devis en quelques secondes." },
      { property: "og:title", content: "Devis — Kobyde" },
      { property: "og:description", content: "Vos devis, créés et suivis simplement." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <ModulePage
      config={{
        table: "quotes",
        title: "Devis",
        subtitle: "Un prix écrit, envoyé vite, devient une vente.",
        emptyText: "Créez votre premier devis : un titre, un montant, c'est parti.",
        addLabel: "Créer un devis",
        badgeField: "status",
        fields: [
          { name: "title", label: "Objet du devis", required: true, placeholder: "Rénovation cuisine" },
          {
            name: "number",
            label: "Numéro",
            required: true,
            defaultValue: `DEV-${new Date().getFullYear()}-${Math.floor(Math.random() * 900 + 100)}`,
          },
          { name: "total_ht", label: "Montant HT", type: "money", placeholder: "1500" },
          { name: "total_ttc", label: "Montant TTC", type: "money", placeholder: "1800" },
          { name: "valid_until", label: "Valable jusqu'au", type: "date", inList: false },
          { name: "notes", label: "Notes", type: "textarea", inList: false },
        ],
      }}
    />
  ),
});
