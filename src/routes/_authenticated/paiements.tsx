import { createFileRoute } from "@tanstack/react-router";
import { ModulePage } from "@/components/module-page";

export const Route = createFileRoute("/_authenticated/paiements")({
  head: () => ({
    meta: [
      { title: "Paiements — Kobyde" },
      { name: "description", content: "Suivez l'argent reçu et les paiements en attente." },
      { property: "og:title", content: "Paiements — Kobyde" },
      { property: "og:description", content: "Vos encaissements, sous contrôle." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <ModulePage
      config={{
        table: "payments",
        title: "Paiements",
        subtitle: "Qui a payé, qui doit encore payer.",
        emptyText: "Enregistrez un paiement dès qu'un client vous règle. Les paiements par carte arrivent automatiquement.",
        addLabel: "Enregistrer un paiement",
        badgeField: "status",
        fields: [
          { name: "amount", label: "Montant", type: "money", required: true, placeholder: "1200" },
          { name: "method", label: "Moyen de paiement", defaultValue: "virement" },
          { name: "status", label: "Statut", defaultValue: "paye" },
          { name: "paid_at", label: "Date de paiement", type: "date" },
        ],
      }}
    />
  ),
});
