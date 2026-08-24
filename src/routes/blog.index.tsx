import { createFileRoute, Link } from "@tanstack/react-router";
import { listPublishedPosts } from "@/lib/blog.functions";

export const Route = createFileRoute("/blog/")({
  loader: () => listPublishedPosts(),
  head: () => ({
    meta: [
      { title: "Blog Kobyde — Piloter son entreprise avec des agents IA" },
      {
        name: "description",
        content:
          "Conseils concrets pour trouver des clients, envoyer des devis, relancer et livrer vos projets avec une équipe d'agents IA.",
      },
      { property: "og:title", content: "Blog Kobyde — Piloter son entreprise avec des agents IA" },
      { property: "og:description", content: "Conseils concrets pour faire tourner votre entreprise avec l'IA." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  errorComponent: () => <BlogShell><p className="text-muted-foreground">Blog momentanément indisponible.</p></BlogShell>,
  notFoundComponent: () => <BlogShell><p className="text-muted-foreground">Aucun article.</p></BlogShell>,
  component: BlogIndex,
});

function BlogShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <Link to="/" className="text-sm text-muted-foreground underline-offset-2 hover:underline">
        ← Retour à l'accueil
      </Link>
      <h1 className="hero-title mt-6 text-4xl font-black italic md:text-6xl">Le blog Kobyde</h1>
      <p className="mt-3 max-w-2xl text-lg text-muted-foreground">
        Des méthodes simples pour vendre, facturer et livrer, avec vos agents IA.
      </p>
      <div className="mt-10">{children}</div>
    </main>
  );
}

function BlogIndex() {
  const { posts } = Route.useLoaderData();

  return (
    <BlogShell>
      {posts.length === 0 && (
        <p className="text-muted-foreground">
          Les premiers articles arrivent très bientôt. Revenez dans quelques jours.
        </p>
      )}
      <div className="grid gap-5 md:grid-cols-2">
        {posts.map((p) => (
          <article key={p.id} className="surface overflow-hidden p-6">
            {p.cover_url && (
              <img
                src={p.cover_url}
                alt={p.title}
                loading="lazy"
                className="mb-4 aspect-[16/9] w-full rounded-xl object-cover"
              />
            )}
            <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium">{p.category}</span>
            <h2 className="mt-3 text-xl font-semibold">
              <Link to="/blog/$slug" params={{ slug: p.slug }} className="hover:underline">
                {p.title}
              </Link>
            </h2>
            {p.excerpt && <p className="mt-2 text-sm text-muted-foreground">{p.excerpt}</p>}
            <Link
              to="/blog/$slug"
              params={{ slug: p.slug }}
              className="mt-4 inline-block text-sm font-medium text-primary"
            >
              Lire l'article →
            </Link>
          </article>
        ))}
      </div>
    </BlogShell>
  );
}
