import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "./mentions-legales";

export const Route = createFileRoute("/data-deletion")({
  head: () => ({
    meta: [
      { title: "Suppression des données — Kobyde" },
      {
        name: "description",
        content:
          "Comment demander la suppression de votre compte Kobyde et de toutes vos données : procédure, délais et contact.",
      },
      { property: "og:title", content: "Suppression des données — Kobyde" },
      {
        property: "og:description",
        content: "Demandez la suppression définitive de votre compte et de vos données Kobyde.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <LegalPage title="Suppression des données">
      <p>
        Vous pouvez demander à tout moment la suppression de votre compte Kobyde et de l'ensemble des données
        associées. Cette page décrit la procédure officielle (URL :{" "}
        <strong>https://www.kobyde.com/data-deletion</strong>).
      </p>

      <h2>Depuis votre espace</h2>
      <p>
        Connectez-vous, puis rendez-vous dans <strong>Paramètres</strong> : vous pouvez y supprimer individuellement
        vos fiches (prospects, clients, devis, projets, candidatures, documents) et vos contenus générés.
      </p>

      <h2>Suppression complète du compte</h2>
      <p>
        Envoyez un email à <strong>contact@kobyde.com</strong> depuis l'adresse de votre compte, avec pour objet
        « Suppression de mes données ». Précisez le nom de votre entreprise. Aucune pièce justificative
        supplémentaire n'est demandée si la requête provient de l'adresse enregistrée.
      </p>

      <h2>Données supprimées</h2>
      <p>
        Compte utilisateur et identifiants, fiche entreprise, prospects, clients, devis, factures et paiements,
        projets, emails et séquences, campagnes marketing, candidatures (CV et enregistrements audio inclus),
        historiques de conversations avec les agents IA, notifications et journaux d'activité.
      </p>

      <h2>Délais</h2>
      <p>
        La demande est traitée sous 30 jours maximum. Les sauvegardes chiffrées sont purgées dans un délai
        supplémentaire de 30 jours. Seules les données que la loi impose de conserver (facturation, comptabilité) sont
        archivées pour la durée légale.
      </p>

      <h2>Connexion via Google</h2>
      <p>
        Si vous vous êtes inscrit avec Google, la suppression du compte Kobyde supprime également le lien avec votre
        compte Google. Vous pouvez révoquer l'accès à tout moment depuis les paramètres de sécurité de votre compte
        Google.
      </p>

      <h2>Contact</h2>
      <p>
        Pour toute question sur vos données : <strong>contact@kobyde.com</strong>.
      </p>
    </LegalPage>
  ),
});
