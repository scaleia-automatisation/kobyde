import { createFileRoute } from "@tanstack/react-router";
import { ModulePage } from "@/components/module-page";

export const Route = createFileRoute("/_authenticated/prospects")({
  head: () => ({
    meta: [
      { title: "Prospects — Kobyde" },
      { name: "description", content: "Suivez les personnes et entreprises qui pourraient devenir vos clients." },
      { property: "og:title", content: "Prospects — Kobyde" },
      { property: "og:description", content: "Vos futurs clients, au même endroit." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <ModulePage
      config={{
        table: "prospects",
        title: "Prospects",
        subtitle: "Les personnes qui pourraient devenir vos clients.",
        emptyText: "Ajoutez votre premier prospect : un nom et un email suffisent pour commencer.",
        addLabel: "Ajouter un prospect",
        badgeField: "status",
        fields: [
          { name: "full_name", label: "Nom de la personne", required: true, placeholder: "Marie Dupont" },
          { name: "company_name", label: "Entreprise", placeholder: "Dupont & Fils" },
          { name: "email", label: "Email", type: "email", placeholder: "marie@exemple.fr" },
          { name: "phone", label: "Téléphone", placeholder: "06 12 34 56 78" },
          { name: "city", label: "Ville", inList: false },
          { name: "notes", label: "Notes", type: "textarea", inList: false },
        ],
      }}
    />
  ),
});
