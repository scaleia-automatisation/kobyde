/** Choix de l'API adaptée par agent : qualité, coût, pertinence, zéro appel inutile. Serveur uniquement. */

import { resolveConnector, type Capability } from "./connector-routing.server";

/** Capacités externes potentiellement utiles à chaque agent, par ordre de pertinence. */
export const AGENT_CAPABILITIES: Record<string, Capability[]> = {
  directeur: ["text_generation"],
  commercial: ["prospect_search", "maps_search", "web_search", "send_user_email"],
  devis: ["text_generation"],
  clients: ["send_user_email", "text_generation"],
  relances: ["send_user_email", "send_transactional_email", "send_sms"],
  marketing: [
    "text_generation",
    "image_generation",
    "publish_facebook",
    "publish_instagram",
    "publish_linkedin",
    "publish_tiktok",
  ],
  rh: ["web_search", "send_transactional_email"],
  gestion: ["payment", "send_transactional_email"],
  analyse: ["web_search", "text_generation"],
  projets: ["automation", "text_generation"],
};

export type ToolAvailability = {
  capability: Capability;
  connector: string | null;
  available: boolean;
  reason?: string;
};

/**
 * Établit la liste des outils réellement mobilisables pour un agent :
 * clés API centralisées (Super Admin) + comptes OAuth de l'utilisateur.
 */
export async function resolveAgentTools(
  agentKey: string,
  ctx: { userId?: string | null },
): Promise<ToolAvailability[]> {
  const caps = AGENT_CAPABILITIES[agentKey] ?? ["text_generation"];
  const out: ToolAvailability[] = [];
  for (const capability of caps) {
    const r = await resolveConnector(capability, ctx);
    out.push(
      r.ok
        ? { capability, connector: r.connector, available: true }
        : {
            capability,
            connector: null,
            available: false,
            reason: (r.checked ?? []).map((c) => `${c.connector} : ${c.reason}`).join(" ; ") || "aucun connecteur",
          },
    );
  }
  return out;
}

/** Instructions injectées dans le prompt de l'agent : priorité mémoire, coût maîtrisé, appels utiles seulement. */
export function toolPolicyPrompt(tools: ToolAvailability[]): string {
  const ready = tools.filter((t) => t.available);
  const missing = tools.filter((t) => !t.available);
  return `Outils externes disponibles pour toi (clés API centralisées par l'administrateur) :
${ready.length ? ready.map((t) => `- ${t.capability} → ${t.connector}`).join("\n") : "- aucun outil externe disponible"}
${missing.length ? `Outils indisponibles :\n${missing.map((t) => `- ${t.capability} (${t.reason})`).join("\n")}` : ""}

Règles d'utilisation des API :
1. Utilise D'ABORD la mémoire centrale de l'entreprise : si l'information y est déjà, aucun appel externe.
2. N'appelle une API que si elle est indispensable à la demande : pas d'appel inutile, pas de vérification redondante.
3. À qualité équivalente, choisis l'option la moins coûteuse ; privilégie la pertinence métier au volume de données.
4. Si un outil nécessite le compte de l'utilisateur et qu'il n'est pas connecté, écris exactement : « Cette action nécessite votre compte <Plateforme>. Connectez-le ici : /mes-connexions » puis indique que la tâche reprendra automatiquement après la connexion. Fais le maximum avec la mémoire existante en attendant.`;
}
