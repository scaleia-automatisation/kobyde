import { createFileRoute } from "@tanstack/react-router";
import { ModulePage } from "@/components/module-page";

export const Route = createFileRoute("/_authenticated/catalogue")({
  head: () => ({
    meta: [
      { title: "Catalogue — Kobyde" },
      { name: "description", content: "Vos produits et services avec leurs prix, prêts pour vos devis." },
      { property: "og:title", content: "Catalogue — Kobyde" },
      { property: "og:description", content: "Vos produits et services." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <ModulePage
      config={{
        table: "products",
        title: "Catalogue",
        subtitle: "Ce que vous vendez, avec vos prix.",
        emptyText: "Ajoutez un produit ou un service pour l'insérer en un clic dans vos devis.",
        addLabel: "Ajouter au catalogue",
        badgeField: "kind",
        fields: [
          { name: "name", label: "Nom", required: true, placeholder: "Prestation de conseil" },
          { name: "price", label: "Prix", type: "money", placeholder: "500" },
          { name: "category", label: "Catégorie", placeholder: "Conseil" },
          { name: "unit", label: "Unité", defaultValue: "unité" },
          { name: "description", label: "Description", type: "textarea", inList: false },
        ],
      }}
    />
  ),
});
