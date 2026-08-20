import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/mentions-legales")({
  head: () => ({
    meta: [
      { title: "Mentions légales — Kobyde" },
      { name: "description", content: "Éditeur, hébergement et contact du service Kobyde." },
      { property: "og:title", content: "Mentions légales — Kobyde" },
      { property: "og:description", content: "Informations légales du service Kobyde." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <LegalPage title="Mentions légales">
      <h2>Éditeur</h2>
      <p>Kobyde — plateforme d'agents IA pour les entreprises. Contact : contact@kobyde.com</p>
      <h2>Hébergement</h2>
      <p>Le service est hébergé sur une infrastructure cloud européenne.</p>
      <h2>Propriété intellectuelle</h2>
      <p>
        L'ensemble des contenus du service (textes, interfaces, marques) est protégé. Les contenus générés par les
        agents IA pour votre compte vous appartiennent.
      </p>
      <h2>Responsabilité</h2>
      <p>
        Les résultats produits par les agents IA sont des propositions : ils doivent être relus et validés avant tout
        envoi ou publication.
      </p>
    </LegalPage>
  ),
});

export function LegalPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <Link to="/" className="text-sm text-muted-foreground underline-offset-2 hover:underline">
        ← Retour à l'accueil
      </Link>
      <h1 className="mt-6 text-3xl font-black md:text-4xl">{title}</h1>
      <div className="prose-legal mt-8 space-y-4 text-base leading-relaxed [&_h2]:pt-4 [&_h2]:text-xl [&_h2]:font-bold">
        {children}
      </div>
    </main>
  );
}
