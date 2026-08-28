/* eslint-disable @typescript-eslint/no-explicit-any */

import { aiFetch } from "./ai-provider.server";

const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

const SYSTEM = `Tu es Audrey, agent IA Gestion (comptabilité et facturation) du SaaS Kobyde.
Tu rédiges des factures françaises claires, conformes et professionnelles.
Règles absolues :
- n'invente JAMAIS une donnée (montant, SIRET, adresse, client) : utilise uniquement ce qui est fourni ;
- garde la structure fournie (émetteur, client, objet, détail, totaux, conditions) ;
- améliore la formulation des désignations, des conditions de paiement et des mentions légales usuelles
  (pénalités de retard, indemnité forfaitaire de 40 € pour frais de recouvrement, TVA) ;
- réponds UNIQUEMENT par le texte final de la facture, sans commentaire ni balise markdown.`;

/** Fait rédiger / régénérer le texte de la facture par Audrey à partir des données réelles. */
export async function writeInvoiceDocument(input: {
  baseText: string;
  org: any;
  instruction?: string;
}) {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("IA indisponible : clé manquante.");

  const res = await aiFetch(GATEWAY, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: SYSTEM },
        {
          role: "user",
          content: `Fiche entreprise (source de vérité) :\n${JSON.stringify(input.org ?? {}, null, 1)}\n\nFacture à mettre au propre :\n${input.baseText}\n\nConsigne complémentaire : ${input.instruction?.trim() || "aucune"}`,
        },
      ],
    }),
  });

  if (res.status === 429) throw new Error("Trop de demandes d'un coup, réessayez dans un instant.");
  if (res.status === 402) throw new Error("Crédits IA épuisés.");
  if (!res.ok) throw new Error(`Erreur IA (${res.status})`);
  const json = (await res.json()) as any;
  const text = String(json?.choices?.[0]?.message?.content ?? "").trim();
  if (!text) throw new Error("Génération vide, réessayez.");
  return text;
}
