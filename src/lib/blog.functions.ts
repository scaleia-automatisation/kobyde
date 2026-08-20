import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";

/* eslint-disable @typescript-eslint/no-explicit-any */

export type BlogPost = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  content: string;
  category: string;
  author: string | null;
  cover_url: string | null;
  meta_description: string | null;
  published_at: string | null;
};

const publicClient = () => {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient(process.env["SUPABASE_URL"]!, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
};

const COLS = "id,slug,title,excerpt,content,category,author,cover_url,meta_description,published_at";

export const listPublishedPosts = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await (publicClient().from("blog_posts" as any) as any)
    .select(COLS)
    .eq("status", "publie")
    .order("published_at", { ascending: false })
    .limit(50);
  if (error) return { posts: [] as BlogPost[], error: "Blog momentanément indisponible." };
  return { posts: (data ?? []) as BlogPost[], error: null as string | null };
});

export const getPublishedPost = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => z.object({ slug: z.string().min(1).max(200) }).parse(data))
  .handler(async ({ data }) => {
    const { data: row } = await (publicClient().from("blog_posts" as any) as any)
      .select(COLS)
      .eq("status", "publie")
      .eq("slug", data.slug)
      .maybeSingle();
    return { post: (row ?? null) as BlogPost | null };
  });
