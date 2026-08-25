import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ArrowRight, Send } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { AGENTS, LEAD_AGENT, agentByKey, type AgentMeta } from "@/lib/agents";
import { suggestionsFor } from "@/lib/agent-suggestions";
import { useAgentSuggestions } from "@/lib/custom-suggestions";

import { useOrgId, useRows } from "@/lib/db";
import { askAgent } from "@/lib/eric.functions";
import { CreditActionButton } from "@/components/credit-action";
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
      {
        name: "description",
        content: "Vos 10 agents IA : statut, tâches en cours, crédits consommés et discussion directe.",
      },
      { property: "og:title", content: "Mon équipe IA — Kobyde" },
      { property: "og:description", content: "Vos 10 agents IA spécialisés, coordonnés par Éric." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TeamPage,
});

type AgentRow = { id: string; key: string; credits_used: number };
type TaskRow = {
  id: string;
  title: string;
  status: string;
  agent_id: string | null;
  created_at: string;
  result?: string | null;
};

type Status = "Disponible" | "En train de travailler" | "En attente" | "Terminé";

const STATUS_STYLE: Record<Status, string> = {
  Disponible: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  "En train de travailler": "bg-sky-50 text-sky-700 ring-sky-200",
  "En attente": "bg-amber-50 text-amber-800 ring-amber-200",
  Terminé: "bg-muted text-muted-foreground ring-border",
};

function computeStatus(tasks: TaskRow[], busy: boolean): Status {
  if (busy || tasks.some((t) => t.status === "in_progress" || t.status === "en_cours"))
    return "En train de travailler";
  if (tasks.some((t) => t.status === "todo" || t.status === "en_attente")) return "En attente";
  if (tasks.some((t) => t.status === "done")) return "Terminé";
  return "Disponible";
}

function StatusPill({ status }: { status: Status }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium ring-1 ${STATUS_STYLE[status]}`}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {status}
    </span>
  );
}

function AgentCard({
  agent,
  agents,
  tasks,
  busy,
  onSelect,
}: {
  agent: AgentMeta;
  agents: AgentRow[] | undefined;
  tasks: TaskRow[] | undefined;
  busy: boolean;
  onSelect: (key: string) => void;
}) {
  const row = (agents ?? []).find((r) => r.key === agent.key);
  const mine = (tasks ?? []).filter((t) => t.agent_id === row?.id);
  const running = mine.filter(
    (t) => t.status === "in_progress" || t.status === "en_cours" || t.status === "todo",
  ).length;
  const status = computeStatus(mine, busy);

  return (
    <article
      className={`surface flex flex-col p-5 transition-shadow hover:shadow-lift ${agent.primary ? "ring-2 ring-primary/30" : ""}`}
    >
      <div className="flex items-start gap-3">
        <span className={`grid size-12 shrink-0 place-items-center rounded-2xl text-xl ring-4 ${agent.ring}`}>
          {agent.emoji}
        </span>
        <div className="min-w-0">
          <h3 className="text-base font-semibold leading-tight">{agent.name}</h3>
          <p className="text-xs font-medium text-muted-foreground">{agent.role}</p>
          <div className="mt-1.5">
            <StatusPill status={status} />
          </div>
        </div>
      </div>
      <p className="mt-3 line-clamp-2 text-xs text-muted-foreground">{agent.description}</p>
      <ul className="mt-3 flex flex-1 flex-wrap gap-1">
        {agent.skills.slice(0, 3).map((s) => (
          <li key={s} className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
            {s}
          </li>
        ))}
      </ul>
      <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
        <span>
          {running} tâche{running > 1 ? "s" : ""} en cours
        </span>
        <span>{row?.credits_used ?? 0} crédits</span>
      </div>
      <Button className="mt-3 w-full" variant="secondary" size="sm" onClick={() => onSelect(agent.key)}>
        Parler à l'agent
      </Button>
    </article>
  );
}

function TeamPage() {
  const orgId = useOrgId();
  const { data: agents } = useRows<AgentRow>("agents", { order: "created_at" });
  const { data: tasks } = useRows<TaskRow>("agent_tasks");
  const [selected, setSelected] = useState<string | null>(null);
  const [answer, setAnswer] = useState<string | null>(null);
  const [promptText, setPromptText] = useState("");
  const qc = useQueryClient();
  const call = useServerFn(askAgent);

  const meta = selected ? agentByKey(selected) : null;
  const suggestions = useAgentSuggestions(meta?.key ?? "");
  const allSuggestions = meta ? suggestions.all : [];


  const talk = useMutation({
    mutationFn: async (vars: { agentKey: string; prompt: string; key: string }) =>
      call({
        data: {
          orgId: orgId!,
          agentKey: vars.agentKey,
          prompt: vars.prompt,
          idempotencyKey: vars.key,
        },
      }),
    onSuccess: (res) => {
      setAnswer(res.result);
      toast.success(`Action terminée — ${res.credits_used ?? 0} crédit(s) consommé(s)`);
      qc.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message || "L'agent n'a pas pu répondre."),
  });

  const submit = (idempotencyKey: string) => {
    const prompt = promptText.trim();
    if (!prompt || !selected) return;
    if (!orgId) {
      toast.error("Organisation introuvable.");
      return;
    }
    setAnswer(null);
    talk.mutate({ agentKey: selected, prompt, key: idempotencyKey });
  };

  const busyKey = talk.isPending ? selected : null;

  return (
    <AppShell
      title="Mon équipe IA"
      subtitle="Niveau 1 : parlez à Éric. Niveau 2 : parlez directement à un agent si vous savez ce que vous voulez."
    >
      {/* Niveau 1 — Éric */}
      <section className="relative mb-10">
        <div className="relative mx-auto max-w-3xl">
          <p className="mb-3 text-center text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Niveau 1 — Prioritaire
          </p>
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
                <StatusPill
                  status={computeStatus(
                    (tasks ?? []).filter(
                      (t) => t.agent_id === (agents ?? []).find((a) => a.key === "directeur")?.id,
                    ),
                    false,
                  )}
                />
              </div>
              <p className="mx-auto mt-4 max-w-xl text-sm text-muted-foreground">{LEAD_AGENT.description}</p>
              <Button className="mt-5 gap-2" asChild>
                <Link to="/eric" search={{ agent: undefined }}>
                  Parler à {LEAD_AGENT.name} <ArrowRight className="size-4" />
                </Link>
              </Button>
            </div>
          </article>
        </div>
        <div className="pointer-events-none absolute left-1/2 top-full hidden h-10 w-0 -translate-x-1/2 border-l-2 border-dashed border-border lg:block" />
      </section>

      {/* Niveau 2 — les 9 agents */}
      <section className="mb-6">
        <p className="mb-1 text-center text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Niveau 2 — Parler directement à un agent
        </p>
        <p className="mb-5 text-center text-sm text-muted-foreground">
          Vous pouvez contourner Éric quand vous savez exactement ce que vous voulez.
        </p>

        <div className="mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {AGENTS.slice(5).map((a) => (
            <AgentCard
              key={a.key}
              agent={a}
              agents={agents}
              tasks={tasks}
              busy={busyKey === a.key}
              onSelect={setSelected}
            />
          ))}
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {AGENTS.slice(1, 5).map((a) => (
            <AgentCard
              key={a.key}
              agent={a}
              agents={agents}
              tasks={tasks}
              busy={busyKey === a.key}
              onSelect={setSelected}
            />
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

      <Dialog
        open={!!selected}
        onOpenChange={(o) => {
          if (!o) {
            setSelected(null);
            setAnswer(null);
            setPromptText("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {meta?.emoji} Parler à {meta?.name} — {meta?.role}
            </DialogTitle>
            <DialogDescription>
              Écrivez simplement, comme à un collègue. Il utilise la mémoire centrale de votre entreprise.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {meta && allSuggestions.length > 0 && (
              <div>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <p className="text-xs font-medium text-muted-foreground">
                    Suggestions — ce que {meta.name} fait en priorité
                  </p>
                  <button
                    type="button"
                    onClick={() => suggestions.removeAll()}
                    className="text-xs font-medium text-muted-foreground transition hover:text-destructive"
                  >
                    Tout supprimer
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {allSuggestions.map((s) => (
                    <span key={s} className="agent-suggestion-chip inline-flex items-center gap-1.5">
                      <button type="button" onClick={() => setPromptText(s)} className="text-left">
                        {s}
                      </button>
                      <button
                        type="button"
                        aria-label="Supprimer la suggestion"
                        onClick={() => suggestions.remove(s)}
                        className="opacity-60 transition hover:opacity-100"
                      >
                        <X className="size-3.5" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}
            <Textarea
              value={promptText}
              onChange={(e) => setPromptText(e.target.value)}
              rows={4}
              placeholder="Que doit faire cet agent ?"
            />

            <DialogFooter>
              <CreditActionButton
                actionKey="agent.direct_message"
                pending={talk.isPending}
                disabled={!promptText.trim()}
                buttonClassName="gap-2"
                onConfirm={(key) => submit(key)}
              >
                <Send className="size-4" />
                Envoyer
              </CreditActionButton>
            </DialogFooter>
          </div>
          {talk.isPending && (
            <p className="text-sm text-muted-foreground">{meta?.name} travaille sur votre demande...</p>
          )}
          {answer && (
            <div className="max-h-64 overflow-auto whitespace-pre-wrap rounded-xl bg-muted/60 p-3 text-sm leading-relaxed">
              {answer}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
