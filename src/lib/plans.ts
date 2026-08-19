import { useEffect, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrgId, useProfile } from "@/lib/db";

export type PlanKey = "gratuit" | "starter" | "business" | "pro";

export type Plan = {
  key: PlanKey;
  name: string;
  price: number;
  credits: number;
  tagline: string;
  highlight?: boolean;
  features: string[];
};

/** Les 4 formules mensuelles, renouvelées chaque mois. Les crédits non utilisés sont reportés. */
export const PLANS: Plan[] = [
  {
    key: "gratuit",
    name: "Gratuit",
    price: 0,
    credits: 10,
    tagline: "Pour découvrir le SaaS.",
    features: [
      "Les 10 agents IA",
      "Dashboard",
      "Mémoire entreprise",
      "Crédits mensuels limités",
      "Fonctions principales",
      "Catalogue limité",
      "Quelques recherches",
      "Quelques générations",
      "CRM basique",
    ],
  },
  {
    key: "starter",
    name: "Starter",
    price: 49,
    credits: 100,
    tagline: "Offre principale : 10 agents IA au service de votre entreprise.",
    highlight: true,
    features: [
      "Les 10 agents IA",
      "Crédits mensuels généreux",
      "CRM complet",
      "Prospection",
      "Devis",
      "Paiements",
      "Projets",
      "Emails",
      "Marketing",
      "RH",
      "Analytics",
      "Veille et e-réputation",
      "Automatisations",
      "Espace client",
    ],
  },
  {
    key: "business",
    name: "Business",
    price: 79,
    credits: 200,
    tagline: "Tout Starter, en plus puissant.",
    features: [
      "Tout le plan Starter",
      "Davantage de crédits",
      "Davantage d'utilisateurs",
      "Automatisations avancées",
      "Analytics avancés",
      "Séquences email",
      "Veille programmée",
      "Génération de contenu avancée",
      "Fonctionnalités RH avancées",
      "Plus de stockage",
      "Davantage de connexions",
    ],
  },
  {
    key: "pro",
    name: "Pro",
    price: 149,
    credits: 300,
    tagline: "Tout Business, pour les équipes qui accélèrent.",
    features: [
      "Tout le plan Business",
      "Crédits élevés",
      "Équipe plus importante",
      "Analytics avancés",
      "Automatisations avancées",
      "Traitements prioritaires",
      "Accès API",
      "Fonctionnalités avancées",
      "Reporting",
      "Gestion multi-utilisateurs",
    ],
  },
];

export const planByKey = (key?: string | null): Plan =>
  PLANS.find((p) => p.key === key) ?? PLANS[0]!;

export type OrgPlanInfo = {
  plan: Plan;
  credits: number;
  creditsTotal: number;
  creditsUsed: number;
  renewsAt: Date | null;
};

/** Formule courante de l'entreprise + consommation de crédits, visible à tout moment. */
export function usePlan(): OrgPlanInfo {
  const { data: profile } = useProfile();
  const org = profile?.organizations as
    | {
        plan?: string;
        credits?: number;
        credits_total?: number;
        plan_renews_at?: string;
      }
    | null;
  const credits = org?.credits ?? 0;
  const creditsTotal = org?.credits_total ?? 0;
  return {
    plan: planByKey(org?.plan),
    credits,
    creditsTotal,
    creditsUsed: Math.max(0, creditsTotal - credits),
    renewsAt: org?.plan_renews_at ? new Date(org.plan_renews_at) : null,
  };
}

/* eslint-disable @typescript-eslint/no-explicit-any */

/** Applique le renouvellement mensuel (avec report des crédits non utilisés) une fois par session. */
export function useMonthlyRenewal() {
  const orgId = useOrgId();
  const qc = useQueryClient();
  const done = useRef<string | null>(null);

  useEffect(() => {
    if (!orgId || done.current === orgId) return;
    done.current = orgId;
    (supabase as any)
      .rpc("apply_monthly_renewal", { _org: orgId })
      .then(({ error }: { error: unknown }) => {
        if (!error) qc.invalidateQueries({ queryKey: ["profile"] });
      });
  }, [orgId, qc]);
}

export function useChangePlan() {
  const orgId = useOrgId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (plan: PlanKey) => {
      const { data, error } = await (supabase as any).rpc("change_plan", {
        _org: orgId,
        _plan: plan,
      });
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profile"] });
      qc.invalidateQueries({ queryKey: ["credit-history"] });
    },
  });
}
