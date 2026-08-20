import type { SupabaseClient } from "@supabase/supabase-js";
import { loadCompanyMemory } from "./eric.server";
import { EMAIL_ROUTING, type SequenceStep } from "./emails";

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

const PRIORITIES = ["urgent", "important", "normal", "faible"];
const CATEGORIES = EMAIL_ROUTING.map((r) => r.category);

export type EmailAnalysis = {
  categorie: string;
  agent_key: string;
  priorite: string;
  resume: string;
  action: string;
  reponse_objet: string;
  reponse_corps: string;
};

/** Clara analyse un email entrant : catégorie, routage, priorité, résumé, action et brouillon de réponse. */
export async function analyzeEmailAI(
  supabase: SupabaseClient<any>,
  orgId: string,
  email: { from_name?: string | null; from_email?: string | null; subject: string; body?: string | null },
): Promise<EmailAnalysis> {
  const memory = await loadCompanyMemory(supabase, orgId);

  const parsed = await chatJson(
    `Tu es Clara, l'agent IA « Relances et emails » de Kobyde. Tu tries la boîte de réception de l'entreprise.
Tu dois :
1. classer l'email dans une catégorie parmi : ${CATEGORIES.join(", ")} ;
2. le router vers l'agent responsable (commercial=Jason, devis=Michael, client=Jennifer, relance=Clara, rh=Mariéme, marketing=Lamine, facturation=Audrey, projet=Chloé, analyse=Ethan, autre=Éric) ;
3. donner une priorité parmi : ${PRIORITIES.join(", ")} ;
4. écrire un résumé d'une à deux phrases ;
5. proposer l'action recommandée en une phrase ;
6. préparer un brouillon de réponse professionnel, en français, signé au nom de l'entreprise.
Règles : n'invente jamais un prix, une date ou un engagement absents de la mémoire centrale. Aucun email n'est envoyé sans validation humaine : ton brouillon est une proposition.
Réponds uniquement en JSON : {"categorie":"","agent_key":"","priorite":"","resume":"","action":"","reponse_objet":"","reponse_corps":""}`,
    `Mémoire centrale (JSON) :\n${JSON.stringify(memory).slice(0, 8000)}\n\nEmail reçu :\nExpéditeur : ${email.from_name ?? ""} <${email.from_email ?? ""}>\nObjet : ${email.subject}\nContenu :\n${(email.body ?? "").slice(0, 6000)}`,
  );

  const categorie = CATEGORIES.includes(parsed?.categorie) ? parsed.categorie : "autre";
  const route = EMAIL_ROUTING.find((r) => r.category === categorie)!;

  return {
    categorie,
    agent_key: EMAIL_ROUTING.some((r) => r.agentKey === parsed?.agent_key) ? parsed.agent_key : route.agentKey,
    priorite: PRIORITIES.includes(parsed?.priorite) ? parsed.priorite : "normal",
    resume: String(parsed?.resume ?? "").slice(0, 800),
    action: String(parsed?.action ?? "").slice(0, 400),
    reponse_objet: String(parsed?.reponse_objet ?? `Re : ${email.subject}`).slice(0, 200),
    reponse_corps: String(parsed?.reponse_corps ?? "").slice(0, 6000),
  };
}

/** Clara rédige les étapes d'une séquence d'emails (J0 → relance finale). */
export async function generateSequenceAI(
  supabase: SupabaseClient<any>,
  orgId: string,
  input: { name: string; objective: string; audience: string; steps: SequenceStep[] },
): Promise<SequenceStep[]> {
  const memory = await loadCompanyMemory(supabase, orgId);

  const parsed = await chatJson(
    `Tu es Clara, l'agent IA « Relances » de Kobyde, aidée de Jason (commercial) et Jennifer (clients).
Tu rédiges une séquence d'emails professionnelle en français : email initial puis relances, une par étape fournie.
Chaque email : objet court et concret (max 70 caractères), corps de 5 à 10 lignes, ton humain, une seule action claire, signature au nom de l'entreprise.
N'invente aucun prix, aucune référence ni aucun engagement absent de la mémoire centrale.
Réponds uniquement en JSON : {"etapes":[{"objet":"","corps":""}]} avec exactement ${input.steps.length} étapes, dans l'ordre.`,
    `Mémoire centrale (JSON) :\n${JSON.stringify(memory).slice(0, 8000)}\n\nSéquence : ${input.name}\nObjectif : ${input.objective}\nAudience : ${input.audience}\nÉtapes attendues :\n${input.steps
      .map((s, i) => `${i + 1}. ${s.kind} — J${s.day} — condition : ${s.condition}`)
      .join("\n")}`,
  );

  const etapes: any[] = Array.isArray(parsed?.etapes) ? parsed.etapes : [];
  return input.steps.map((step, i) => ({
    ...step,
    subject: String(etapes[i]?.objet ?? step.subject ?? "").slice(0, 200),
    body: String(etapes[i]?.corps ?? step.body ?? "").slice(0, 6000),
  }));
}
