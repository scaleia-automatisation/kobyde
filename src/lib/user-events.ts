import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

/* eslint-disable @typescript-eslint/no-explicit-any */

/** Étapes du parcours utilisateur suivies pour le Super Admin. */
export const USER_EVENT_LABELS: Record<string, string> = {
  signup: "Inscription",
  login: "Connexion",
  onboarding_completed: "Onboarding terminé",
  first_action: "Première action",
  first_agent_used: "Premier agent utilisé",
  first_generation: "Première génération",
  first_prospect: "Premier prospect",
  first_quote: "Premier devis",
  first_payment: "Premier paiement",
  returning_user: "Retour utilisateur",
  subscription_started: "Abonnement",
  subscription_canceled: "Résiliation",
  plan_renewal: "Renouvellement",
  visit: "Visite",
};

const localKey = (userId: string, name: string) => `kobyde_ue_${userId}_${name}`;

/** Enregistre un évènement de parcours (une seule fois par utilisateur pour les étapes "première fois"). */
export async function trackUserEvent(
  name: string,
  payload: Record<string, unknown> = {},
  opts: { once?: boolean } = {},
) {
  try {
    const { data } = await supabase.auth.getUser();
    const user = data.user;
    if (!user) return;
    const once = opts.once ?? name.startsWith("first_") || name === "signup" || name === "onboarding_completed";

    if (once) {
      if (typeof window !== "undefined" && window.localStorage.getItem(localKey(user.id, name))) return;
      const { data: existing } = await (supabase.from("user_events") as any)
        .select("id")
        .eq("user_id", user.id)
        .eq("name", name)
        .limit(1)
        .maybeSingle();
      if (existing) {
        if (typeof window !== "undefined") window.localStorage.setItem(localKey(user.id, name), "1");
        return;
      }
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("current_org_id")
      .eq("user_id", user.id)
      .maybeSingle();

    await (supabase.from("user_events") as any).insert({
      user_id: user.id,
      org_id: (profile as any)?.current_org_id ?? null,
      name,
      payload,
    });
    if (once && typeof window !== "undefined") window.localStorage.setItem(localKey(user.id, name), "1");
  } catch {
    /* le suivi ne doit jamais bloquer l'application */
  }
}

/** Journalise la session courante (connexion + retour utilisateur) une fois par onglet. */
export function useSessionTracking() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.sessionStorage.getItem("kobyde_session_tracked")) return;
    window.sessionStorage.setItem("kobyde_session_tracked", "1");
    void trackUserEvent("login", {}, { once: false });
    void trackUserEvent("returning_user", {}, { once: false });
  }, []);
}
