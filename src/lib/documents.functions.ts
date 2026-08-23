import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/* eslint-disable @typescript-eslint/no-explicit-any */

const assertMember = async (supabase: any, orgId: string, userId: string) => {
  const { data } = await supabase
    .from("memberships")
    .select("id")
    .eq("org_id", orgId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!data) throw new Error("Accès refusé.");
};

const fileSchema = z.object({
  name: z.string().min(1),
  mime: z.string().default(""),
  base64: z.string().min(10),
});

/** Enregistre un document (fichier téléversé ou simple lien). */
export const saveDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        orgId: z.string().uuid(),
        name: z.string().min(1),
        kind: z.string().min(1),
        fileUrl: z.string().url().optional().nullable(),
        file: fileSchema.optional().nullable(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    await assertMember(supabase, data.orgId, userId);

    let filePath: string | null = data.fileUrl ?? null;
    let sizeKb: number | null = null;

    if (data.file) {
      const { storeDocument } = await import("./documents.server");
      const stored = await storeDocument(data.orgId, data.file);
      filePath = stored.path;
      sizeKb = stored.sizeKb;
    }

    const { data: row, error } = await supabase
      .from("documents")
      .insert({
        org_id: data.orgId,
        name: data.name,
        kind: data.kind,
        file_url: filePath,
        size_kb: sizeKb,
        created_by: userId,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id as string };
  });

/** Lien de téléchargement temporaire d'un document stocké. */
export const documentDownloadUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ orgId: z.string().uuid(), documentId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    await assertMember(supabase, data.orgId, userId);
    const { data: doc, error } = await supabase
      .from("documents")
      .select("file_url")
      .eq("id", data.documentId)
      .eq("org_id", data.orgId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!doc?.file_url) throw new Error("Aucun fichier joint à ce document.");
    if (/^https?:\/\//i.test(doc.file_url)) return { url: doc.file_url as string };
    const { documentUrl } = await import("./documents.server");
    return { url: await documentUrl(doc.file_url) };
  });

/** Pose une question / extrait des données d'un document (stocké ou fourni à la volée). */
export const askDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        orgId: z.string().uuid(),
        question: z.string().min(3),
        documentId: z.string().uuid().optional().nullable(),
        file: fileSchema.optional().nullable(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    await assertMember(supabase, data.orgId, userId);

    const { askDocumentAI, loadStoredFile } = await import("./documents.server");

    let file = data.file ?? null;
    if (!file && data.documentId) {
      const { data: doc } = await supabase
        .from("documents")
        .select("name, file_url")
        .eq("id", data.documentId)
        .eq("org_id", data.orgId)
        .maybeSingle();
      if (!doc?.file_url || /^https?:\/\//i.test(doc.file_url))
        throw new Error("Ce document n'a pas de fichier analysable.");
      file = await loadStoredFile(doc.file_url, doc.name, "");
    }
    if (!file) throw new Error("Aucun document à analyser.");

    return { answer: await askDocumentAI(file, data.question) };
  });
