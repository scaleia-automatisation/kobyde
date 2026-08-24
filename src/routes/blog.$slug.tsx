import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { getPublishedPost } from "@/lib/blog.functions";
import { Markdown } from "@/components/markdown";

const SITE = "https://kobyde.com";
const abs = (u: string | null) => (!u ? null : u.startsWith("http") ? u : `${SITE}${u}`);

export const Route = createFileRoute("/blog/$slug")({
  loader: async ({ params }) => {
    const { post } = await getPublishedPost({ data: { slug: params.slug } });
    if (!post) throw notFound();
    return { post };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return { meta: [{ title: "Article introuvable — Kobyde" }, { name: "robots", content: "noindex" }] };
    }
    const { post } = loaderData;
    const desc = post.meta_description ?? post.excerpt ?? "Article du blog Kobyde.";
    return {
      meta: [
        { title: `${post.title} — Blog Kobyde` },
        { name: "description", content: desc },
        { property: "og:title", content: post.title },
        { property: "og:description", content: desc },
        { property: "og:type", content: "article" },
        { name: "twitter:card", content: "summary_large_image" },
        ...(abs(post.cover_url)
          ? [
              { property: "og:image", content: abs(post.cover_url)! },
              { name: "twitter:image", content: abs(post.cover_url)! },
            ]
          : []),
      ],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BlogPosting",
            headline: post.title,
            description: desc,
            author: { "@type": "Person", name: post.author ?? "Équipe Kobyde" },
            publisher: { "@type": "Organization", name: "Kobyde" },
            ...(post.published_at ? { datePublished: post.published_at } : {}),
            ...(abs(post.cover_url) ? { image: abs(post.cover_url) } : {}),
            mainEntityOfPage: `https://kobyde.com/blog/${post.slug}`,
          }),
        },
      ],
    };
  },
  errorComponent: () => <Missing text="Article momentanément indisponible." />,
  notFoundComponent: () => <Missing text="Cet article n'existe pas ou n'est plus publié." />,
  component: BlogPostPage,
});

function Missing({ text }: { text: string }) {
  return (
    <main className="mx-auto max-w-3xl px-6 py-20 text-center">
      <p className="text-lg font-medium">{text}</p>
      <Link to="/blog" className="mt-4 inline-block text-primary underline-offset-2 hover:underline">
        ← Tous les articles
      </Link>
    </main>
  );
}

function BlogPostPage() {
  const { post } = Route.useLoaderData();

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <Link to="/blog" className="text-sm text-muted-foreground underline-offset-2 hover:underline">
        ← Tous les articles
      </Link>
      <span className="mt-6 inline-block rounded-full bg-muted px-2.5 py-1 text-xs font-medium">{post.category}</span>
      <h1 className="mt-3 text-3xl font-black md:text-5xl">{post.title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {post.author ? `Par ${post.author}` : "Par l'équipe Kobyde"}
        {post.published_at ? ` · ${new Date(post.published_at).toLocaleDateString("fr-FR")}` : ""}
      </p>
      {post.cover_url && (
        <img src={post.cover_url} alt={post.title} loading="lazy" className="mt-8 w-full rounded-2xl" />
      )}
      <article className="mt-8">
        <Markdown content={post.content} />
      </article>

      <aside className="surface mt-14 p-8 text-center">
        <h2 className="text-2xl font-bold">Passez à l'action avec Kobyde</h2>
        <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
          Dix agents IA spécialisés qui trouvent vos clients, rédigent vos devis, relancent vos factures et suivent vos
          projets — pour moins de 1,30 € par jour.
        </p>
        <Link
          to="/auth"
          className="mt-6 inline-block rounded-xl bg-primary px-6 py-3 font-semibold text-primary-foreground"
        >
          Essayer Kobyde gratuitement
        </Link>
      </aside>
    </main>
  );
}
