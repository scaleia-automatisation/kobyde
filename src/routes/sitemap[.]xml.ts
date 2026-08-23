import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { listPublishedPosts } from "@/lib/blog.functions";

const BASE_URL = "https://kobyde.com";

interface SitemapEntry {
  path: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const entries: SitemapEntry[] = [
          { path: "/", changefreq: "weekly", priority: "1.0" },
          { path: "/blog", changefreq: "weekly", priority: "0.8" },
          { path: "/auth", changefreq: "monthly", priority: "0.5" },
          { path: "/cgv", changefreq: "yearly", priority: "0.3" },
          { path: "/confidentialite", changefreq: "yearly", priority: "0.3" },
          { path: "/mentions-legales", changefreq: "yearly", priority: "0.3" },
          { path: "/data-deletion", changefreq: "yearly", priority: "0.3" },
          { path: "/data-deletion-request", changefreq: "yearly", priority: "0.3" },
        ];

        try {
          const { posts } = await listPublishedPosts();
          for (const p of posts) {
            entries.push({ path: `/blog/${p.slug}`, changefreq: "monthly", priority: "0.7" });
          }
        } catch {
          // blog unavailable — ship the static entries
        }

        const urls = entries.map((e) =>
          [
            `  <url>`,
            `    <loc>${BASE_URL}${e.path}</loc>`,
            e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
            e.priority ? `    <priority>${e.priority}</priority>` : null,
            `  </url>`,
          ]
            .filter(Boolean)
            .join("\n"),
        );

        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          ...urls,
          `</urlset>`,
        ].join("\n");

        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
