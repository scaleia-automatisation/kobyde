import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "./mentions-legales";

export const Route = createFileRoute("/cgv")({
  head: () => ({
    meta: [
      { title: "Conditions générales de vente — Kobyde" },
      {
        name: "description",
        content: "Abonnements, crédits IA, facturation, résiliation et support du service Kobyde.",
      },
      { property: "og:title", content: "Conditions générales de vente — Kobyde" },
      { property: "og:description", content: "Abonnements, crédits IA et facturation." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <LegalPage title="Conditions générales de vente">
      <h2>Service</h2>
      <p>
        Kobyde donne accès à une équipe de 10 agents IA pour piloter la prospection, les devis, les paiements, les
        projets, le marketing, le recrutement et l'analyse.
      </p>
      <h2>Abonnements</h2>
      <p>
        Trois formules mensuelles sans engagement : Starter, Business et Pro. Chaque formule inclut un volume de
        crédits IA renouvelé chaque mois.
      </p>
      <h2>Crédits IA</h2>
      <p>
        Seules les actions nécessitant une génération, une analyse, une recherche ou une transcription consomment des
        crédits. La navigation et la saisie de données sont gratuites. Le coût est affiché avant chaque action, et les
        crédits sont recrédités automatiquement en cas d'échec technique.
      </p>
      <h2>Crédits à la carte</h2>
      <p>Des packs complémentaires (50, 100, 150 ou 200 crédits) peuvent être achetés à tout moment.</p>
      <h2>Résiliation</h2>
      <p>L'abonnement peut être arrêté ou changé à tout moment ; l'accès reste actif jusqu'à la fin de la période payée.</p>
      <h2>Support</h2>
      <p>Support par email à contact@kobyde.com.</p>
    </LegalPage>
  ),
});
