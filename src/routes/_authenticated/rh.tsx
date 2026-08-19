import { createFileRoute } from "@tanstack/react-router";
import { ModulePage } from "@/components/module-page";

export const Route = createFileRoute("/_authenticated/rh")({
  head: () => ({
    meta: [
      { title: "RH — Kobyde" },
      { name: "description", content: "Candidatures, entretiens et recrutements suivis par Clara, votre agent RH." },
      { property: "og:title", content: "RH — Kobyde" },
      { property: "og:description", content: "Vos recrutements simplifiés." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <ModulePage
      config={{
        table: "candidates",
        title: "RH",
        subtitle: "Les personnes qui veulent travailler avec vous.",
        emptyText: "Ajoutez une candidature : Clara la note et prépare les questions d'entretien.",
        addLabel: "Ajouter un candidat",
        badgeField: "status",
        fields: [
          { name: "full_name", label: "Nom du candidat", required: true },
          { name: "position", label: "Poste visé", placeholder: "Commercial" },
          { name: "email", label: "Email", type: "email" },
          { name: "notes", label: "Notes", type: "textarea", inList: false },
        ],
      }}
    />
  ),
});
