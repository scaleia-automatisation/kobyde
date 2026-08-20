import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "./mentions-legales";

export const Route = createFileRoute("/confidentialite")({
  head: () => ({
    meta: [
      { title: "Confidentialité et RGPD — Kobyde" },
      {
        name: "description",
        content: "Comment Kobyde collecte, utilise, conserve et supprime vos données et celles de vos clients.",
      },
      { property: "og:title", content: "Confidentialité et RGPD — Kobyde" },
      { property: "og:description", content: "Vos données, vos règles : transparence complète." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <LegalPage title="Confidentialité et RGPD">
      <h2>Données collectées</h2>
      <p>
        Compte utilisateur (nom, email), fiche entreprise, et les données métier que vous saisissez : prospects,
        clients, devis, factures, projets, emails, candidatures.
      </p>
      <h2>Utilisation</h2>
      <p>
        Vos données servent uniquement à faire fonctionner le service et à alimenter la mémoire de vos agents IA. Elles
        ne sont ni vendues, ni utilisées pour entraîner des modèles.
      </p>
      <h2>Conservation</h2>
      <p>
        Les candidatures sont conservées pour une durée limitée, avec une date de suppression automatique. Les CV et
        enregistrements audio peuvent être supprimés à tout moment depuis l'espace Recrutement.
      </p>
      <h2>Vos droits</h2>
      <p>
        Accès, rectification, export et suppression : chaque fiche peut être exportée ou supprimée depuis l'interface.
        Toutes les suppressions sont journalisées.
      </p>
      <h2>Mesure d'audience</h2>
      <p>
        Les espaces clients utilisent une mesure anonyme (pages vues, temps passé) sans cookie publicitaire ni revente
        de données.
      </p>
    </LegalPage>
  ),
});
