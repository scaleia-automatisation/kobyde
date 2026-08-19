import { createFileRoute } from "@tanstack/react-router";
import { ModulePage } from "@/components/module-page";

export const Route = createFileRoute("/_authenticated/emails")({
  head: () => ({
    meta: [
      { title: "Emails — Kobyde" },
      { name: "description", content: "Préparez et suivez les emails envoyés à vos prospects et clients." },
      { property: "og:title", content: "Emails — Kobyde" },
      { property: "og:description", content: "Vos emails professionnels." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <ModulePage
      config={{
        table: "emails",
        title: "Emails",
        subtitle: "Les messages envoyés à vos prospects et clients.",
        emptyText: "Préparez un email : Clara et Lamine peuvent l'écrire pour vous.",
        addLabel: "Préparer un email",
        badgeField: "status",
        fields: [
          { name: "to_email", label: "Destinataire", type: "email", required: true },
          { name: "subject", label: "Objet", required: true, placeholder: "Votre devis est prêt" },
          { name: "body", label: "Message", type: "textarea", inList: false },
        ],
      }}
    />
  ),
});
