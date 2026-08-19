import { createFileRoute } from "@tanstack/react-router";
import { ModulePage } from "@/components/module-page";

export const Route = createFileRoute("/_authenticated/projets")({
  head: () => ({
    meta: [
      { title: "Projets — Kobyde" },
      { name: "description", content: "Organisez vos projets clients en étapes simples." },
      { property: "og:title", content: "Projets — Kobyde" },
      { property: "og:description", content: "Vos projets, livrés sans stress." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <ModulePage
      config={{
        table: "projects",
        title: "Projets",
        subtitle: "Ce que vous devez livrer, étape par étape.",
        emptyText: "Créez un projet quand un client dit oui. Tom, votre chef de projet IA, s'occupe du reste.",
        addLabel: "Créer un projet",
        badgeField: "status",
        fields: [
          { name: "name", label: "Nom du projet", required: true, placeholder: "Site internet Dupont" },
          { name: "budget", label: "Budget", type: "money" },
          { name: "start_date", label: "Date de début", type: "date" },
          { name: "end_date", label: "Date de fin prévue", type: "date" },
          { name: "description", label: "Description", type: "textarea", inList: false },
        ],
      }}
    />
  ),
});
