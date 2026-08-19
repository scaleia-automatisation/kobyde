import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Send } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { AGENTS, agentByKey } from "@/lib/agents";
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
      subtitle="10 agents spécialisés. Cliquez sur un agent pour lui confier une tâche."
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {AGENTS.map((a) => {
          const row = (agents ?? []).find((r) => r.key === a.key);
          const count = (tasks ?? []).filter((t) => t.agent_id === row?.id).length;
          return (
            <article key={a.key} className="surface flex flex-col p-6 transition-shadow hover:shadow-lift">
              <div className="flex items-start gap-4">
                <span className={`grid size-14 shrink-0 place-items-center rounded-2xl text-2xl ring-4 ${a.ring}`}>
                  {a.emoji}
                </span>
                <div className="min-w-0">
                  <h2 className="text-lg leading-tight">{a.name}</h2>
                  <p className="text-sm font-medium text-muted-foreground">{a.role}</p>
                  <span className={`mt-2 inline-block rounded-full px-2.5 py-0.5 text-xs ${a.chip}`}>
                    {a.mission}
                  </span>
                </div>
              </div>
              <p className="mt-4 flex-1 text-sm text-muted-foreground">{a.description}</p>
              <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                <span>{count} tâche{count > 1 ? "s" : ""}</span>
                <span>{row?.credits_used ?? 0} crédits utilisés</span>
              </div>
              <Button className="mt-4 w-full" variant="secondary" onClick={() => setSelected(a.key)}>
                Lui confier une tâche
              </Button>
            </article>
          );
        })}
      </div>

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
