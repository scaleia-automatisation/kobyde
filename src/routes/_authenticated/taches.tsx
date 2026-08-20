import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { useRows } from "@/lib/db";
import { AGENTS, agentByKey } from "@/lib/agents";

export const Route = createFileRoute("/_authenticated/taches")({
  head: () => ({
    meta: [
      { title: "Tâches des agents — Kobyde" },
      { name: "description", content: "Suivez ce que chaque agent IA est en train de faire pour votre entreprise." },
      { property: "og:title", content: "Tâches des agents — Kobyde" },
      { property: "og:description", content: "Le travail de votre équipe IA, en temps réel." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TasksPage,
});

type AgentTask = {
  id: string;
  agent_id: string | null;
  title: string;
  detail: string | null;
  status: string;
  priority: string;
  result: string | null;
  credits_used: number;
  created_at: string;
};

const STATUS: Record<string, { label: string; tone: string }> = {
  todo: { label: "En attente", tone: "bg-slate-100 text-slate-700" },
  in_progress: { label: "En cours", tone: "bg-amber-100 text-amber-900" },
  done: { label: "Terminée", tone: "bg-emerald-100 text-emerald-900" },
  failed: { label: "Échouée", tone: "bg-rose-100 text-rose-900" },
};

const FILTERS = ["tout", "todo", "in_progress", "done", "failed"] as const;

function TasksPage() {
  const { data: tasks, isLoading } = useRows<AgentTask>("agent_tasks", { order: "created_at", limit: 200 });
  const { data: agents } = useRows<{ id: string; key: string }>("agents");
  const [filter, setFilter] = useState("tout");

  const keyById = useMemo(
    () => new Map((agents ?? []).map((a) => [a.id, a.key])),
    [agents],
  );

  const list = (tasks ?? []).filter((t) => filter === "tout" || t.status === filter);
  const counts = (tasks ?? []).reduce<Record<string, number>>((acc, t) => {
    acc[t.status] = (acc[t.status] ?? 0) + 1;
    return acc;
  }, {});
  const credits = (tasks ?? []).reduce((s, t) => s + (t.credits_used ?? 0), 0);

  return (
    <AppShell title="Tâches des agents" subtitle="Ce que votre équipe IA a fait, fait et va faire.">
      <div className="mb-5 grid gap-3 sm:grid-cols-4">
        {[
          { label: "Total", value: tasks?.length ?? 0 },
          { label: "En cours", value: counts["in_progress"] ?? 0 },
          { label: "Terminées", value: counts["done"] ?? 0 },
          { label: "Crédits utilisés", value: credits },
        ].map((s) => (
          <div key={s.label} className="surface p-4">
            <p className="text-sm text-muted-foreground">{s.label}</p>
            <p className="text-2xl font-bold">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`rounded-full px-3 py-1.5 text-sm ${
              filter === s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            }`}
          >
            {s === "tout" ? "Toutes" : STATUS[s]!.label}
          </button>
        ))}
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Chargement…</p>}
      {!isLoading && list.length === 0 && (
        <div className="surface p-8 text-center">
          <p className="font-medium">Aucune tâche pour l'instant.</p>
          <p className="text-sm text-muted-foreground">
            Demandez quelque chose à Éric : il distribuera le travail aux {AGENTS.length - 1} autres agents.
          </p>
        </div>
      )}

      <div className="space-y-2">
        {list.map((t) => {
          const agent = agentByKey(keyById.get(t.agent_id ?? "") ?? "directeur");
          const st = STATUS[t.status] ?? STATUS["todo"]!;
          return (
            <article key={t.id} className="surface flex items-start gap-4 p-4">
              <span className={`grid size-10 shrink-0 place-items-center rounded-xl text-lg ring-2 ${agent.ring}`}>
                {agent.emoji}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">{t.title}</p>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${st.tone}`}>{st.label}</span>
                  <span className="text-[11px] text-muted-foreground">
                    {agent.name} · {t.credits_used} crédit(s)
                  </span>
                </div>
                {t.detail && <p className="mt-1 text-sm text-muted-foreground">{t.detail}</p>}
                {t.result && (
                  <p className="mt-2 whitespace-pre-wrap rounded-lg bg-muted/60 p-3 text-sm">{t.result}</p>
                )}
                <p className="mt-1 text-xs text-muted-foreground">
                  {new Date(t.created_at).toLocaleString("fr-FR")}
                </p>
              </div>
            </article>
          );
        })}
      </div>
    </AppShell>
  );
}
