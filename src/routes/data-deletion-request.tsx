import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "./mentions-legales";

export const Route = createFileRoute("/data-deletion-request")({
  head: () => ({
    meta: [
      { title: "Demande de suppression des données — Kobyde" },
      {
        name: "description",
        content:
          "Rappelez votre droit à la suppression et demandez la suppression de vos données personnelles ou de votre compte Kobyde.",
      },
      { property: "og:title", content: "Demande de suppression des données — Kobyde" },
      {
        property: "og:description",
        content:
          "Formulaire et procédure pour demander la suppression de votre compte et de vos données sur Kobyde.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <LegalPage title="Rappel & demande de suppression des données">
      <p>
        Vous disposez à tout moment d’un droit d’effacement de vos données personnelles (RGPD, article 17). Cette page
        vous permet de nous adresser une demande officielle de suppression (URL :{" "}
        <strong>https://www.kobyde.com/data-deletion-request</strong>).
      </p>

      <h2>Données concernées par la suppression</h2>
      <p>
        Sur simple demande, nous effaçons : votre compte utilisateur, votre profil, votre fiche entreprise, l’ensemble
        de vos contacts (prospects, clients, fournisseurs), vos devis, factures, paiements, projets, tâches, emails et
        séquences, campagnes marketing, candidatures et pièces jointes (CV, enregistrements), ainsi que l’historique de
        vos conversations avec les agents IA.
      </p>

      <h2>Comment faire la demande</h2>
      <p>
        Envoyez un email à <strong>contact@kobyde.com</strong> depuis l’adresse associée à votre compte Kobyde, avec
        pour objet <strong>« Demande de suppression de mes données »</strong>. Précisez :
      </p>
      <ul className="list-disc space-y-1 pl-5">
        <li>l’adresse email de votre compte ;</li>
        <li>le nom de votre entreprise ou organisation ;</li>
        <li>si vous souhaitez une suppression partielle (certaines données) ou totale (compte + données).</li>
      </ul>

      <h2>Délais de traitement</h2>
      <p>
        Nous accusons réception de votre demande sous 48 heures. La suppression effective est réalisée dans un délai
        maximum de <strong>30 jours</strong>. Les sauvegardes chiffrées sont purgées dans les 30 jours suivants. Les
        données comptables et fiscales légalement conservables sont archivées pour la durée imposée par la loi, puis
        effacées.
      </p>

      <h2>Connexion via Google</h2>
      <p>
        Si vous vous êtes inscrit avec Google, la suppression de votre compte Kobyde supprime le lien entre les deux
        services. Vous pouvez également révoquer l’accès depuis les paramètres de sécurité de votre compte Google.
      </p>

      <h2>Contact</h2>
      <p>
        Pour toute question relative à vos données ou à l’exercice de vos droits :{" "}
        <strong>contact@kobyde.com</strong>.
      </p>
    </LegalPage>
  ),
});
