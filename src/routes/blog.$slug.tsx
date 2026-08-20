import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { getPublishedPost } from "@/lib/blog.functions";

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
        ...(post.cover_url?.startsWith("https://")
          ? [
              { property: "og:image", content: post.cover_url },
              { name: "twitter:image", content: post.cover_url },
            ]
          : []),
      ],
    };
  },
  errorComponent: () => <Missing text="Article momentanément indisponible." />,
  notFoundComponent: () => <Missing text="Cet article n'existe pas ou n'est plus publié." />,
  component: BlogPostPage;
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
      <div className="mt-8 space-y-4 text-base leading-relaxed">
        {post.content.split("\n").filter(Boolean).map((line, i) =>
          line.startsWith("## ") ? (
            <h2 key={i} className="pt-4 text-2xl font-bold">
              {line.slice(3)}
            </h2>
          ) : (
            <p key={i}>{line}</p>
          ),
        )}
      </div>
    </main>
  );
}
