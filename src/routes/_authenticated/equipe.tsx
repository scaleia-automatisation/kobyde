import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Send } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { AGENTS, LEAD_AGENT, agentByKey, type AgentMeta } from "@/lib/agents";
import { useCreateRow, useRows } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/equipe")({
  head: () => ({
    meta: [
      { title: "Mon équipe IA — Kobyde" },
      { name: "description", content: "Vos 10 agents IA : leur métier, leurs tâches et leur historique." },
      { property: "og:title", content: "Mon équipe IA — Kobyde" },
      { property: "og:description", content: "Vos 10 agents IA spécialisés." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TeamPage,
});

type AgentRow = { id: string; key: string; credits_used: number };
type TaskRow = { id: string; title: string; status: string; agent_id: string | null; created_at: string };

function AgentCard({
  agent,
  agents,
  tasks,
  onSelect,
}: {
  agent: AgentMeta;
  agents: AgentRow[] | undefined;
  tasks: TaskRow[] | undefined;
  onSelect: (key: string) => void;
}) {
  const row = (agents ?? []).find((r) => r.key === agent.key);
  const count = (tasks ?? []).filter((t) => t.agent_id === row?.id).length;
  return (
    <article
      className={`surface flex flex-col p-5 transition-shadow hover:shadow-lift ${agent.primary ? "ring-2 ring-primary/30" : ""}`}
    >
      <div className="flex items-start gap-3">
        <span className={`grid size-12 shrink-0 place-items-center rounded-2xl text-xl ring-4 ${agent.ring}`}>
          {agent.emoji}
        </span>
        <div className="min-w-0">
          <h2 className="text-base leading-tight">{agent.name}</h2>
          <p className="text-xs font-medium text-muted-foreground">{agent.role}</p>
          <span className={`mt-1.5 inline-block rounded-full px-2 py-0.5 text-[11px] ${agent.chip}`}>
            {agent.mission}
          </span>
        </div>
      </div>
      <p className="mt-3 line-clamp-3 text-xs text-muted-foreground">{agent.description}</p>
      <ul className="mt-3 flex flex-1 flex-wrap gap-1">
        {agent.skills.slice(0, 4).map((s) => (
          <li key={s} className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
            {s}
          </li>
        ))}
      </ul>
      <div className="mt-3 flex items-center justify-between text-[10px] text-muted-foreground">
        <span>
          {count} tâche{count > 1 ? "s" : ""}
        </span>
        <span>{row?.credits_used ?? 0} crédits utilisés</span>
      </div>
      <Button className="mt-3 w-full" variant="secondary" size="sm" onClick={() => onSelect(agent.key)}>
        Lui confier une tâche
      </Button>
    </article>
  );
}

function TeamPage() {
  const { data: agents } = useRows<AgentRow>("agents", { order: "created_at" });
  const { data: tasks } = useRows<TaskRow>("agent_tasks");
  const createTask = useCreateRow("agent_tasks");
  const [selected, setSelected] = useState<string | null>(null);

  const meta = selected ? agentByKey(selected) : null;
  const agentRow = (agents ?? []).find((a) => a.key === selected);
  const agentTasks = (tasks ?? []).filter((t) => t.agent_id === agentRow?.id);

  const askAgent = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const title = String(fd.get("title") ?? "").trim();
    if (!title) return;
    createTask.mutate(
      { title, agent_id: agentRow?.id ?? null, status: "en_cours", priority: "normal" },
      {
        onSuccess: () => {
          toast.success(`${meta?.name} s'en occupe`);
          setSelected(null);
        },
        onError: (err) => toast.error(err.message),
      },
    );
  };

  return (
    <AppShell
      title="Mon équipe IA"
      subtitle="Éric pilote l'équipe. Parlez-lui en priorité, il distribue aux bons agents."
    >
      {/* Éric — Orchestrateur au sommet */}
      <section className="relative mb-10">
        <div className="relative mx-auto max-w-3xl">
          <article className="surface relative overflow-hidden p-8 text-center">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-aurora-1 via-aurora-2 to-aurora-3" />
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/[0.06] via-transparent to-amber-500/[0.04]" />
            <div className="relative">
              <span
                className={`mx-auto grid size-20 place-items-center rounded-3xl text-4xl ring-4 ${LEAD_AGENT.ring}`}
              >
                {LEAD_AGENT.emoji}
              </span>
              <h2 className="mt-5 text-2xl font-bold">{LEAD_AGENT.name}</h2>
              <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
                <Badge>{LEAD_AGENT.role}</Badge>
                <Badge variant="secondary">Point d'entrée</Badge>
              </div>
              <p className="mx-auto mt-4 max-w-xl text-sm text-muted-foreground">{LEAD_AGENT.description}</p>
              <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
                Exemples : « Trouve-moi des prospects pour mon offre de création de site. » ou « J'ai eu une réunion
                avec un client, prépare la suite. »
              </p>
              <Button className="mt-5" onClick={() => setSelected(LEAD_AGENT.key)}>
                Parler à {LEAD_AGENT.name}
              </Button>
            </div>
          </article>
        </div>

        {/* Connecteur Éric → équipe */}
        <div className="pointer-events-none absolute left-1/2 top-full hidden h-10 w-0 -translate-x-1/2 border-l-2 border-dashed border-border lg:block" />
      </section>

      {/* Rangée 1 : 5 agents */}
      <section className="mb-10">
        <h3 className="mb-4 text-center text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Première ligne — Support & croissance
        </h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {AGENTS.slice(5).map((a) => (
            <AgentCard key={a.key} agent={a} agents={agents} tasks={tasks} onSelect={setSelected} />
          ))}
        </div>
      </section>

      {/* Rangée 2 : 4 agents restants */}
      <section className="mb-6">
        <h3 className="mb-4 text-center text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Seconde ligne — Revenus & relation client
        </h3>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {AGENTS.slice(1, 5).map((a) => (
            <AgentCard key={a.key} agent={a} agents={agents} tasks={tasks} onSelect={setSelected} />
          ))}
        </div>
      </section>


      <section className="surface mt-6 p-6">
        <h2 className="text-lg">Historique des tâches</h2>
        <ul className="mt-4 space-y-2">
          {(tasks ?? []).length === 0 && (
            <li className="text-sm text-muted-foreground">Aucune tâche confiée pour l'instant.</li>
          )}
          {(tasks ?? []).slice(0, 12).map((t) => {
            const row = (agents ?? []).find((a) => a.id === t.agent_id);
            const m = row ? agentByKey(row.key) : null;
            return (
              <li key={t.id} className="flex items-center gap-3 rounded-xl border border-border p-3">
                <span className={`grid size-8 place-items-center rounded-lg text-base ring-2 ${m?.ring ?? ""}`}>
                  {m?.emoji ?? "🤖"}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm">{t.title}</span>
                <Badge variant="secondary">{t.status}</Badge>
              </li>
            );
          })}
        </ul>
      </section>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {meta?.emoji} Confier une tâche à {meta?.name}
            </DialogTitle>
            <DialogDescription>
              Écrivez simplement, comme à un collègue. Exemple : « Trouve 10 restaurants à Lyon à contacter ».
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={askAgent} className="space-y-4">
            <Textarea name="title" rows={4} placeholder="Que doit faire cet agent ?" required />
            <DialogFooter>
              <Button type="submit" className="gap-2" disabled={createTask.isPending}>
                <Send className="size-4" /> Envoyer la tâche
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
