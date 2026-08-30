import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "./mentions-legales";

export const Route = createFileRoute("/cgu")({
  head: () => ({
    meta: [
      { title: "Conditions d'utilisation — Kobyde" },
      {
        name: "description",
        content:
          "Conditions générales d'utilisation du service Kobyde : compte, agents IA, contenus générés, responsabilités et suspension.",
      },
      { property: "og:title", content: "Conditions d'utilisation — Kobyde" },
      { property: "og:description", content: "Règles d'utilisation du service Kobyde et de ses agents IA." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <LegalPage title="Conditions d'utilisation">
      <h2>1. Objet</h2>
      <p>
        Les présentes conditions régissent l'accès et l'utilisation de Kobyde, une plateforme d'agents IA pour les
        entreprises accessible à l'adresse kobyde.com. En créant un compte ou en utilisant le service, vous acceptez
        ces conditions.
      </p>
      <h2>2. Compte utilisateur</h2>
      <p>
        Vous devez fournir des informations exactes lors de l'inscription et préserver la confidentialité de vos
        identifiants. Vous êtes responsable de toutes les actions réalisées depuis votre compte. Un compte est
        strictement personnel à votre organisation et ne peut être revendu ou partagé avec des tiers.
      </p>
      <h2>3. Usage du service</h2>
      <p>
        Vous vous engagez à utiliser Kobyde dans le respect des lois en vigueur. Sont notamment interdits : l'envoi de
        spam ou de prospection non sollicitée en masse, la génération de contenus illicites, haineux ou trompeurs,
        l'usurpation d'identité, la tentative d'intrusion dans le service ou l'extraction automatisée de données
        (scraping) de la plateforme.
      </p>
      <h2>4. Contenus générés par les agents IA</h2>
      <p>
        Les textes, visuels, devis, emails et autres contenus produits par les agents IA pour votre compte vous
        appartiennent. Ils constituent des propositions : vous devez les relire et les valider avant tout envoi,
        publication ou engagement contractuel. Kobyde ne saurait être tenu responsable des conséquences d'un contenu
        généré utilisé sans vérification.
      </p>
      <h2>5. Services tiers et connecteurs</h2>
      <p>
        Kobyde peut se connecter à des services tiers (Google, Meta, Notion, Slack, Stripe, etc.) avec votre
        autorisation. L'utilisation de ces services reste soumise à leurs propres conditions. Vous pouvez révoquer
        une connexion à tout moment depuis la page « Mes connexions ».
      </p>
      <h2>6. Disponibilité</h2>
      <p>
        Nous mettons tout en œuvre pour assurer une disponibilité continue du service, sans garantie d'absence
        d'interruption. Des opérations de maintenance peuvent temporairement limiter l'accès.
      </p>
      <h2>7. Responsabilité</h2>
      <p>
        Kobyde est un outil d'aide à la décision et à la production. Les analyses, prévisions et recommandations des
        agents IA ont une valeur indicative. Notre responsabilité est limitée aux dommages directs prouvés, dans la
        limite des montants payés au cours des 12 derniers mois.
      </p>
      <h2>8. Suspension et résiliation</h2>
      <p>
        En cas de non-respect de ces conditions, nous pouvons suspendre ou supprimer votre compte après notification.
        Vous pouvez supprimer votre compte à tout moment depuis les paramètres ou en nous contactant ; vos données
        sont alors traitées conformément à notre politique de confidentialité.
      </p>
      <h2>9. Modification des conditions</h2>
      <p>
        Ces conditions peuvent évoluer. En cas de modification substantielle, vous serez informé par email ou via le
        service. La poursuite de l'utilisation après notification vaut acceptation.
      </p>
      <h2>10. Droit applicable</h2>
      <p>
        Les présentes conditions sont soumises au droit français. Tout litige relatif à leur exécution sera soumis
        aux tribunaux compétents. Contact : contact@kobyde.com.
      </p>
    </LegalPage>
  ),
});
