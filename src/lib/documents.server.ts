import { base64ToBytes, fileBlock, type UploadedFile } from "./hr.server";

/* eslint-disable @typescript-eslint/no-explicit-any */

const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

const SYSTEM = `Tu es l'assistant documentaire de Kobyde.
Tu réponds en français, de façon factuelle et structurée.
Règle absolue : tu n'inventes jamais une information. Si elle n'est pas dans le document, écris « Non trouvé ».
Quand on te demande une extraction de données, présente-les sous forme de liste « Libellé : valeur ».`;

export async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as any;
}

const isImage = (f: UploadedFile) => f.mime.startsWith("image/") || /\.(png|jpe?g|webp|gif)$/i.test(f.name);

function blockFor(f: UploadedFile): any {
  if (isImage(f)) {
    return {
      type: "image_url",
      image_url: { url: `data:${f.mime || "image/png"};base64,${f.base64.split(",").pop()}` },
    };
  }
  return fileBlock(f, `Document « ${f.name} »`);
}

/** Stocke un document dans le bucket privé et renvoie son chemin. */
export async function storeDocument(orgId: string, f: UploadedFile): Promise<{ path: string; sizeKb: number }> {
  const db = await admin();
  const bytes = base64ToBytes(f.base64);
  const safe = f.name.replace(/[^a-zA-Z0-9._-]/g, "-").slice(-60);
  const path = `${orgId}/${crypto.randomUUID()}-${safe}`;
  const { error } = await db.storage
    .from("documents")
    .upload(path, bytes, { contentType: f.mime || "application/octet-stream", upsert: false });
  if (error) throw new Error(`Envoi du fichier impossible : ${error.message}`);
  return { path, sizeKb: Math.round(bytes.length / 1024) };
}

export async function documentUrl(path: string, seconds = 900): Promise<string> {
  const db = await admin();
  const { data, error } = await db.storage.from("documents").createSignedUrl(path, seconds);
  if (error) throw new Error(error.message);
  return data.signedUrl as string;
}

export async function removeDocument(path: string) {
  const db = await admin();
  await db.storage.from("documents").remove([path]);
}

/** Relit un fichier stocké et le renvoie en base64. */
export async function loadStoredFile(path: string, name: string, mime: string): Promise<UploadedFile> {
  const db = await admin();
  const { data, error } = await db.storage.from("documents").download(path);
  if (error || !data) throw new Error("Fichier introuvable dans le coffre.");
  const buf = new Uint8Array(await data.arrayBuffer());
  let bin = "";
  for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
  return { name, mime: mime || (data as any).type || "application/octet-stream", base64: btoa(bin) };
}

/** Pose une question sur un document et renvoie la réponse en texte. */
export async function askDocumentAI(file: UploadedFile, question: string): Promise<string> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("Clé IA indisponible.");

  const res = await fetch(GATEWAY, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: SYSTEM },
        {
          role: "user",
          content: [blockFor(file), { type: "text", text: `Question de l'utilisateur :\n${question}` }],
        },
      ],
    }),
  });

  if (res.status === 429) throw new Error("Trop de demandes d'un coup, réessayez dans un instant.");
  if (res.status === 402) throw new Error("Crédits IA épuisés.");
  if (!res.ok) throw new Error(`Erreur IA (${res.status})`);
  const json = (await res.json()) as any;
  const out = String(json?.choices?.[0]?.message?.content ?? "").trim();
  if (!out) throw new Error("Aucune réponse n'a pu être extraite du document.");
  return out;
}
