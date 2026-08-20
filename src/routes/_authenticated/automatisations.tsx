import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { agentByKey } from "@/lib/agents";
import { AUTOMATIONS } from "@/lib/automations";
import { runAutomations } from "@/lib/automations.functions";
import { useOrgId } from "@/lib/db";

export const Route = createFileRoute("/_authenticated/automatisations")({
  head: () => ({
    meta: [
      { title: "Automatisations — Kobyde" },
      { name: "description", content: "Laissez vos agents IA travailler tout seuls : relances, résumés et alertes." },
      { property: "og:title", content: "Automatisations — Kobyde" },
      { property: "og:description", content: "Vos tâches répétitives, faites toutes seules." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Automations,
});

type Rule = { rule_key: string; is_active: boolean; last_run_at: string | null };

function Automations() {
  const orgId = useOrgId();
  const qc = useQueryClient();
  const run = useServerFn(runAutomations);

  const { data: rules } = useQuery<Rule[]>({
    queryKey: ["automation-rules", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("automation_rules" as never)
        .select("rule_key,is_active,last_run_at")
        .eq("org_id", orgId!);
      if (error) throw error;
      return (data ?? []) as unknown as Rule[];
    },
  });

  const byKey = new Map((rules ?? []).map((r) => [r.rule_key, r]));

  const toggle = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: boolean }) => {
      const { error } = await supabase
        .from("automation_rules" as never)
        .upsert({ org_id: orgId!, rule_key: key, is_active: value } as never, { onConflict: "org_id,rule_key" });
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["automation-rules", orgId] });
      toast.success(v.value ? "Automatisation activée" : "Automatisation désactivée");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Enregistrement impossible"),
  });

  const execute = useMutation({
    mutationFn: async () => run({ data: { orgId: orgId! } }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["notifications", orgId] });
      qc.invalidateQueries({ queryKey: ["automation-rules", orgId] });
      toast.success(
        res.created > 0
          ? `${res.created} alerte(s) créée(s) par vos agents.`
          : "Rien de nouveau à signaler : tout est à jour.",
      );
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Exécution impossible"),
  });

  const activeCount = (rules ?? []).filter((r) => r.is_active).length;

  return (
    <AppShell
      title="Automatisations"
      subtitle="Cochez ce que vos agents doivent faire tout seuls."
      action={
        <Button onClick={() => execute.mutate()} disabled={!orgId || execute.isPending || activeCount === 0}>
          {execute.isPending ? "Vérification…" : "Lancer maintenant"}
        </Button>
      }
    >
      <p className="mb-4 text-sm text-muted-foreground">
        {activeCount === 0
          ? "Aucune automatisation active. Activez-en une pour que vos agents surveillent votre activité."
          : `${activeCount} automatisation(s) active(s). Aucune action n'est envoyée sans votre validation.`}
      </p>

      <div className="grid gap-3 lg:grid-cols-2">
        {AUTOMATIONS.map((r) => {
          const a = agentByKey(r.agent);
          const row = byKey.get(r.key);
          return (
            <article key={r.key} className="surface p-5">
              <div className="flex items-center gap-4">
                <span className={`grid size-11 shrink-0 place-items-center rounded-xl text-xl ring-2 ${a.ring}`}>
                  {a.emoji}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{r.title}</p>
                  <p className="text-xs text-muted-foreground">par {a.name} · {a.role}</p>
                </div>
                <Switch
                  checked={!!row?.is_active}
                  onCheckedChange={(v) => toggle.mutate({ key: r.key, value: v })}
                  aria-label={r.title}
                />
              </div>
              <dl className="mt-4 grid gap-1 border-t border-border pt-3 text-sm">
                <div className="flex gap-2">
                  <dt className="w-24 shrink-0 text-muted-foreground">Quand</dt>
                  <dd>{r.trigger}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="w-24 shrink-0 text-muted-foreground">Si</dt>
                  <dd>{r.condition}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="w-24 shrink-0 text-muted-foreground">Alors</dt>
                  <dd>{r.action}</dd>
                </div>
              </dl>
              {row?.last_run_at && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Dernière vérification : {new Date(row.last_run_at).toLocaleString("fr-FR")}
                </p>
              )}
            </article>
          );
        })}
      </div>
    </AppShell>
  );
}
