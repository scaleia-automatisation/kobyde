import type { SupabaseClient } from "@supabase/supabase-js";
import { loadCompanyMemory } from "./eric.server";

/* eslint-disable @typescript-eslint/no-explicit-any */

async function chatJson(system: string, user: string): Promise<any> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("Clé IA indisponible.");

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      response_format: { type: "json_object" },
    }),
  });

  if (res.status === 429) throw new Error("Trop de demandes d'un coup, réessayez dans un instant.");
  if (res.status === 402) throw new Error("Crédits IA épuisés.");
  if (!res.ok) throw new Error(`Erreur IA (${res.status})`);

  const json = (await res.json()) as any;
  const content: string = json?.choices?.[0]?.message?.content ?? "{}";
  try {
    return JSON.parse(content);
  } catch {
    return JSON.parse(content.slice(content.indexOf("{"), content.lastIndexOf("}") + 1));
  }
}

export type NeedDetection = {
  service: string;
  detection: "Validé" | "Discuté" | "Refusé";
  justification: string;
  product_id: string | null;
  quantite: number;
  prix_ht: number;
  vat_rate: number;
  retenu: boolean;
};

export type MeetingAnalysis = {
  resume: string;
  compte_rendu: string;
  besoins: NeedDetection[];
};

export async function analyzeMeetingAI(
  supabase: SupabaseClient<any>,
  orgId: string,
  input: { transcript: string; source: string; title: string },
): Promise<MeetingAnalysis> {
  const [{ data: products }, memory] = await Promise.all([
    supabase
      .from("products")
      .select("id,name,description,price_ht,price,vat_rate,unit,category")
      .eq("org_id", orgId)
      .limit(200),
    loadCompanyMemory(supabase, orgId),
  ]);

  const catalogue = (products ?? []).map((p: any) => ({
    id: p.id,
    nom: p.name,
    description: p.description,
    prix_ht: Number(p.price_ht || p.price || 0),
    tva: Number(p.vat_rate ?? 20),
    unite: p.unit,
    categorie: p.category,
  }));

  const parsed = await chatJson(
    `Tu es Michael, l'agent IA « Devis » de Kobyde.
Tu analyses la transcription d'une réunion client, tu identifies les besoins réels, puis tu les compares au catalogue de l'entreprise.
Règles absolues :
- N'invente jamais un service qui n'a pas été évoqué.
- "detection" vaut "Validé" (clairement demandé), "Discuté" (évoqué sans décision) ou "Refusé" (écarté par le client).
- Utilise le prix du catalogue quand le service correspond ; sinon prix_ht = 0 et product_id = null.
- Chaque besoin porte une justification courte citant ce qui a été dit.
Réponds UNIQUEMENT en JSON :
{"resume":"...","compte_rendu":"...","besoins":[{"service":"...","detection":"Validé","justification":"...","product_id":null,"quantite":1,"prix_ht":0,"tva":20}]}`,
    `Fiche entreprise : ${JSON.stringify(memory).slice(0, 6000)}

Catalogue : ${JSON.stringify(catalogue).slice(0, 6000)}

Réunion « ${input.title} » (source : ${input.source}) :
${input.transcript.slice(0, 20000)}`,
  );

  const besoins: NeedDetection[] = Array.isArray(parsed.besoins)
    ? parsed.besoins.slice(0, 20).map((b: any) => {
        const detection: NeedDetection["detection"] =
          b.detection === "Refusé" ? "Refusé" : b.detection === "Discuté" ? "Discuté" : "Validé";
        const match = catalogue.find((c) => c.id === b.product_id);
        return {
          service: String(b.service ?? "Service"),
          detection,
          justification: String(b.justification ?? ""),
          product_id: match ? match.id : null,
          quantite: Number(b.quantite) > 0 ? Number(b.quantite) : 1,
          prix_ht: Number(b.prix_ht) > 0 ? Number(b.prix_ht) : Number(match?.prix_ht ?? 0),
          vat_rate: Number(b.tva) > 0 ? Number(b.tva) : Number(match?.tva ?? 20),
          retenu: detection === "Validé",
        };
      })
    : [];

  return {
    resume: String(parsed.resume ?? ""),
    compte_rendu: String(parsed.compte_rendu ?? ""),
    besoins,
  };
}

export async function followupEmailsAI(
  supabase: SupabaseClient<any>,
  orgId: string,
  quote: { number: string; title: string; total_ttc: number; client: string; valid_until: string | null },
): Promise<{ kind: string; subject: string; body: string }[]> {
  const memory = await loadCompanyMemory(supabase, orgId);
  const parsed = await chatJson(
    `Tu es Clara, l'agent IA des relances de Kobyde. Tu rédiges 3 emails de relance de devis en français,
courtois, courts et concrets : "j3" (3 jours après l'envoi), "j7" (7 jours après), "expiration" (juste avant l'expiration).
Réponds UNIQUEMENT en JSON : {"emails":[{"kind":"j3","subject":"...","body":"..."}]}`,
    `Entreprise : ${JSON.stringify(memory).slice(0, 4000)}
Devis ${quote.number} — « ${quote.title} » pour ${quote.client}, montant ${quote.total_ttc} € TTC, valable jusqu'au ${quote.valid_until ?? "non précisé"}.`,
  );

  const list = Array.isArray(parsed.emails) ? parsed.emails : [];
  const kinds = ["j3", "j7", "expiration"];
  return kinds.map((kind, i) => {
    const found = list.find((e: any) => e.kind === kind) ?? list[i] ?? {};
    return {
      kind,
      subject: String(found.subject ?? `Votre devis ${quote.number}`),
      body: String(found.body ?? ""),
    };
  });
}
