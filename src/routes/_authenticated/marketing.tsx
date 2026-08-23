import { createFileRoute } from "@tanstack/react-router";
import { ModulePage } from "@/components/module-page";

export const Route = createFileRoute("/_authenticated/marketing")({
  head: () => ({
    meta: [
      { title: "Marketing — Kobyde" },
      { name: "description", content: "Vos campagnes pour vous faire connaître, préparées par Lamine, votre agent Marketing." },
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
        emptyText: "Lancez une première campagne : un nom, une cible, et Lamine écrit les messages.",
        addLabel: "Créer une campagne",
        badgeField: "status",
        fields: [
          {
            name: "name",
            label: "Nom de la campagne",
            type: "select",
            required: true,
            placeholder: "Nom de votre campagne",
            options: [
              "Offre de lancement",
              "Offre de printemps",
              "Offre d'été",
              "Black Friday",
              "Offre de fin d'année",
              "Réactivation d'anciens clients",
              "Parrainage",
              "Nouveauté produit",
              "Portes ouvertes",
              "Newsletter mensuelle",
            ],
          },
          {
            name: "channel",
            label: "Canal",
            type: "select",
            defaultValue: "email",
            options: [
              "email",
              "SMS",
              "LinkedIn",
              "Instagram",
              "Facebook",
              "WhatsApp",
              "TikTok",
              "Google Ads",
              "Appel téléphonique",
              "Courrier",
            ],
          },
          {
            name: "audience",
            label: "Cible",
            type: "select",
            options: [
              "Anciens clients",
              "Clients actifs",
              "Prospects chauds",
              "Prospects froids",
              "Abonnés newsletter",
              "Partenaires et prescripteurs",
              "Nouveaux inscrits",
              "Clients inactifs depuis 6 mois",
            ],
          },
        ],
      }}
    />
  ),
});
