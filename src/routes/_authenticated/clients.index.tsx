import { createFileRoute } from "@tanstack/react-router";
import { ModulePage } from "@/components/module-page";

export const Route = createFileRoute("/_authenticated/clients/")({
  head: () => ({
    meta: [
      { title: "Clients — Kobyde" },
      { name: "description", content: "Tous vos clients, leurs coordonnées et leur chiffre d'affaires." },
      { property: "og:title", content: "Clients — Kobyde" },
      { property: "og:description", content: "Vos clients, au même endroit." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <ModulePage
      config={{
        table: "clients",
        title: "Clients",
        subtitle: "Les personnes et entreprises qui vous font déjà confiance.",
        emptyText: "Ajoutez votre premier client pour suivre ses devis, factures et projets.",
        addLabel: "Ajouter un client",
        badgeField: "status",
        detailTo: "/clients/$id",
        detailLabel: "Fiche 360",
        fields: [
          { name: "full_name", label: "Nom du contact", required: true, placeholder: "Marie Dupont" },
          { name: "company_name", label: "Entreprise", placeholder: "Dupont & Fils" },
          { name: "email", label: "Email", type: "email" },
          { name: "phone", label: "Téléphone" },
          { name: "address", label: "Adresse", inList: false },
          { name: "notes", label: "Notes", type: "textarea", inList: false },
        ],
      }}
    />
  ),
});
