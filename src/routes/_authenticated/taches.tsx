import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { CheckCircle2, Loader2, Send, X } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { useOrgId, useRows, useUpdateRow, useDeleteRow, useDeleteAllRows } from "@/lib/db";
import { AGENTS, agentByKey } from "@/lib/agents";
import { runTask } from "@/lib/eric.functions";

export const Route = createFileRoute("/_authenticated/taches")({
  head: () => ({
    meta: [
      { title: "Tâches — Kobyde" },
      {
        name: "description",
        content:
          "Vos tâches à faire et terminées : envoyez-les à Éric pour qu'il les exécute, ou marquez-les faites.",
      },
      { property: "og:title", content: "Tâches — Kobyde" },
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

const DONE = new Set(["done", "termine", "terminee"]);

const PERIODS = [
  { key: "aujourdhui", label: "Aujourd'hui" },
  { key: "hier", label: "Hier" },
  { key: "semaine", label: "Cette semaine" },
  { key: "tout", label: "Tout" },
] as const;

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function inPeriod(at: string, period: string) {
  if (period === "tout") return true;
  const d = new Date(at);
  const today = startOfDay(new Date());
  if (period === "aujourdhui") return d >= today;
  if (period === "hier") {
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    return d >= yesterday && d < today;
  }
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);
  return d >= weekAgo;
}

function TasksPage() {
  const orgId = useOrgId();
  const { data: tasks, isLoading, refetch } = useRows<AgentTask>("agent_tasks", {
    order: "created_at",
    limit: 200,
  });
  const { data: agents } = useRows<{ id: string; key: string }>("agents");
  const updateTask = useUpdateRow("agent_tasks");
  const deleteTask = useDeleteRow("agent_tasks");
  const deleteAllTasks = useDeleteAllRows("agent_tasks");
  const execute = useServerFn(runTask);

  const [tab, setTab] = useState<"encours" | "terminees">("encours");
  const [period, setPeriod] = useState<string>("semaine");
  const [running, setRunning] = useState<string | null>(null);

  const keyById = useMemo(() => new Map((agents ?? []).map((a) => [a.id, a.key])), [agents]);

  const scoped = (tasks ?? []).filter((t) => inPeriod(t.created_at, period));
  const pending = scoped.filter((t) => !DONE.has(t.status));
  const finished = scoped.filter((t) => DONE.has(t.status));
  const list = tab === "encours" ? pending : finished;

  async function sendToEric(t: AgentTask) {
    if (!orgId) return;
    setRunning(t.id);
    try {
      await execute({
        data: {
          taskId: t.id,
          orgId,
          idempotencyKey: `task-${t.id}-${Date.now()}`.slice(0, 64),
        },
      });
      toast.success("Éric a exécuté la tâche.");
      await refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Échec de l'exécution");
    } finally {
      setRunning(null);
    }
  }

  async function markDone(t: AgentTask) {
    await updateTask.mutateAsync({ id: t.id, values: { status: "done" } });
    toast.success("Tâche marquée comme terminée.");
  }

  return (
    <AppShell
      title="Tâches"
      subtitle="Vos tâches à faire, exécutables par vos agents en un clic."
    >
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {(
          [
            { key: "encours", label: `Tâches en cours (${pending.length})` },
            { key: "terminees", label: `Tâches terminées (${finished.length})` },
          ] as const
        ).map((s) => (
          <button
            key={s.key}
            onClick={() => setTab(s.key)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              tab === s.key
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-secondary"
            }`}
          >
            {s.label}
          </button>
        ))}
        <span className="mx-1 hidden h-5 w-px bg-border sm:block" />
        {PERIODS.map((p) => (
          <button
            key={p.key}
            onClick={() => setPeriod(p.key)}
            className={`rounded-full px-3 py-1.5 text-sm transition-colors ${
              period === p.key ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-secondary/60"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Chargement…</p>}

      {!isLoading && list.length === 0 && (
        <div className="surface p-8 text-center">
          <p className="font-medium">Aucune tâche sur cette période.</p>
          <p className="text-sm text-muted-foreground">
            Demandez quelque chose à Éric : il distribuera le travail aux {AGENTS.length - 1} autres agents.
          </p>
        </div>
      )}

      <ul className="space-y-2">
        {list.map((t) => {
          const agent = agentByKey(keyById.get(t.agent_id ?? "") ?? "directeur");
          const done = DONE.has(t.status);
          return (
            <li key={t.id} className="surface flex flex-wrap items-start gap-3 p-4">
              <span
                className="mt-2 size-2 shrink-0 rounded-full bg-primary"
                aria-hidden
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className={`font-medium ${done ? "text-muted-foreground line-through" : ""}`}>
                    {t.title}
                  </p>
                  <span className="text-[11px] text-muted-foreground">
                    {agent.emoji} {agent.name} · {new Date(t.created_at).toLocaleString("fr-FR")}
                  </span>
                </div>
                {t.detail && <p className="mt-1 text-sm text-muted-foreground">{t.detail}</p>}
                {t.result && (
                  <p className="mt-2 whitespace-pre-wrap rounded-lg bg-muted/60 p-3 text-sm">{t.result}</p>
                )}
              </div>
              {!done && (
                <div className="flex shrink-0 flex-wrap gap-2">
                  <Button size="sm" className="gap-1.5" disabled={running === t.id} onClick={() => sendToEric(t)}>
                    {running === t.id ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Send className="size-4" />
                    )}
                    Envoyer à l'agent
                  </Button>
                  <Button size="sm" variant="outline" className="gap-1.5" onClick={() => markDone(t)}>
                    <CheckCircle2 className="size-4" />
                    Terminée
                  </Button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </AppShell>
  );
}
