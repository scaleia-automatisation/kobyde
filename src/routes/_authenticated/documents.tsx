import { createFileRoute } from "@tanstack/react-router";
import { ModulePage } from "@/components/module-page";

export const Route = createFileRoute("/_authenticated/documents")({
  head: () => ({
    meta: [
      { title: "Documents — Kobyde" },
      { name: "description", content: "Rangez vos contrats, devis signés et pièces importantes." },
      { property: "og:title", content: "Documents — Kobyde" },
      { property: "og:description", content: "Tous vos documents au même endroit." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <ModulePage
      config={{
        table: "documents",
        title: "Documents",
        subtitle: "Contrats, devis signés et pièces importantes.",
        emptyText: "Référencez un document et retrouvez-le en 2 secondes.",
        addLabel: "Ajouter un document",
        badgeField: "kind",
        fields: [
          { name: "name", label: "Nom du document", required: true, placeholder: "Contrat Dupont signé" },
          { name: "kind", label: "Type", defaultValue: "contrat" },
          { name: "file_url", label: "Lien du fichier", placeholder: "https://…" },
        ],
      }}
    />
  ),
});
