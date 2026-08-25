import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, CheckCircle2, Loader2, Plus, RefreshCw, Send, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { AppShell } from "@/components/app-shell";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { askEric, runTask } from "@/lib/eric.functions";
import { AGENTS, LEAD_AGENT, agentByKey } from "@/lib/agents";
import { examplesFor } from "@/lib/agent-suggestions";
import { useDeleteAllRows, useDeleteRow, useOrgId, useRows } from "@/lib/db";
import { CreditActionButton } from "@/components/credit-action";
import { GenerationActions } from "@/components/generation-actions";
import { newIdempotencyKey } from "@/lib/credits";
import { useAgentSuggestions } from "@/lib/custom-suggestions";
import { AiProgress } from "@/components/ui/states";
import { cn } from "@/lib/utils";

/** États de génération lisibles plutôt qu'un simple « Loading… ». */
const ERIC_STEPS = [
  "Lecture de la mémoire de l'entreprise",
  "Identification des agents concernés",
  "Distribution des tâches",
  "Rédaction de la réponse",
];

function EricProgress() {
  const labels = ERIC_STEPS;
  const [step, setStep] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setStep((s) => Math.min(s + 1, ERIC_STEPS.length - 1)), 1600);
    return () => clearInterval(t);
  }, []);
  return (
    <Card className="animate-rise p-5">
      <p className="text-h3">Éric travaille sur votre demande</p>
      <AiProgress
        className="mt-3"
        steps={labels.map((label, i) => ({
          label,
          status: i < step ? "done" : i === step ? "active" : "pending",
        }))}
      />
    </Card>
  );
}

const ericSearchSchema = z.object({
  agent: z.string().optional().catch(undefined),
});

export const Route = createFileRoute("/_authenticated/eric")({
  component: EricPage,
  validateSearch: (search) => ericSearchSchema.parse(search),
  head: () => ({
    meta: [
      { title: "Éric, votre directeur IA — Kobyde" },
      {
        name: "description",
        content:
          "Dites à Éric ce dont vous avez besoin : il consulte la mémoire de votre entreprise et distribue les tâches à vos 9 agents IA.",
      },
      { property: "og:title", content: "Éric, votre directeur IA — Kobyde" },
      {
        property: "og:description",
        content: "L'orchestrateur central qui coordonne vos 9 agents IA spécialisés.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});




type Plan = Awaited<ReturnType<typeof askEric>>;

function EricPage() {
  const search = useSearch({ from: "/_authenticated/eric" });
  const selectedAgent = agentByKey(search.agent ?? "directeur");
  const isLead = selectedAgent.key === LEAD_AGENT.key;
  const orgId = useOrgId();
  const [prompt, setPrompt] = useState("");
  const [plan, setPlan] = useState<Plan | null>(null);
  const [spent, setSpent] = useState(0);
  const [lastPrompt, setLastPrompt] = useState("");
  const [answerEdit, setAnswerEdit] = useState<string | null>(null);
  const [taskEdits, setTaskEdits] = useState<Record<string, string>>({});
  const [results, setResults] = useState<
    Record<string, { status: "running" | "done" | "error"; result?: string }>
  >({});
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const qc = useQueryClient();
  const call = useServerFn(askEric);
  const execTask = useServerFn(runTask);
  const { data: conversations } = useRows("conversations", { limit: 5 });
  const suggestions = useAgentSuggestions(selectedAgent.key);
  const examples = examplesFor(selectedAgent.key);
  const deleteConversation = useDeleteRow("conversations");
  const deleteAllConversations = useDeleteAllRows("conversations");


  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const mutation = useMutation({
    mutationFn: async (vars: { text: string; key: string }) =>
      call({ data: { prompt: vars.text, orgId: orgId!, idempotencyKey: vars.key } }),
    onSuccess: (data) => {
      setPlan(data);
      setResults({});
      setAnswerEdit(null);
      setTaskEdits({});
      setSpent(data.credits_used ?? 0);
      setPrompt("");
      inputRef.current?.focus();
      qc.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message || "Éric n'a pas pu traiter la demande."),
  });

  const runOne = async (taskId: string, key: string) => {
    setResults((r) => ({ ...r, [taskId]: { status: "running" } }));
    try {
      const res = await execTask({ data: { taskId, orgId: orgId!, idempotencyKey: key } });
      setResults((r) => ({ ...r, [taskId]: { status: "done", result: res.result } }));
      setSpent((s) => s + (res.credits_used ?? 0));
      toast.success(`Action terminée — ${res.credits_used ?? 0} crédit(s) consommé(s)`);
    } catch (e) {
      setResults((r) => ({
        ...r,
        [taskId]: { status: "error", result: e instanceof Error ? e.message : "Échec" },
      }));
      toast.error("Échec de la tâche — aucun crédit consommé (remboursé automatiquement).");
    } finally {
      qc.invalidateQueries();
    }
  };

  const send = (text: string, key: string) => {
    const value = text.trim();
    if (!value) return;
    if (!orgId) {
      toast.error("Organisation introuvable.");
      return;
    }
    setLastPrompt(value);
    mutation.mutate({ text: value, key });
  };

  return (
    <AppShell
      title={`${selectedAgent.name} — ${selectedAgent.role}`}
      subtitle={
        isLead
          ? "L'orchestrateur central de votre équipe"
          : `Parlez à ${selectedAgent.name}, votre agent ${selectedAgent.role.toLowerCase()}`
      }
    >
      <div className="mx-auto w-full max-w-3xl space-y-8">
        <div className="text-center">
          <div
            className={cn(
              "mx-auto mb-4 grid size-14 place-items-center rounded-2xl text-3xl ring-1",
              selectedAgent.ring.replace("text-", "bg-").replace("ring-", "ring-"),
            )}
          >
            {selectedAgent.emoji}
          </div>
          <h2 className="font-display text-3xl font-bold tracking-tight lg:text-4xl">
            Que voulez-vous faire ?
          </h2>
          <p className="mt-2 text-muted-foreground">
            {isLead
              ? "Éric comprend votre demande, consulte la mémoire de l'entreprise et confie le travail aux bons agents."
              : selectedAgent.description}
          </p>
        </div>

        <Card className="p-3 shadow-lg">
          <Textarea
            ref={inputRef}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) send(prompt, newIdempotencyKey());
            }}
            placeholder="Écrivez simplement ce dont vous avez besoin..."
            rows={3}
            className="resize-none border-0 text-base shadow-none focus-visible:ring-0"
          />
          <div className="flex items-center justify-between gap-3 px-1 pt-2">
            <span className="text-xs text-muted-foreground">Ctrl + Entrée pour envoyer</span>
            <CreditActionButton
              actionKey="eric.analyze_request"
              pending={mutation.isPending}
              disabled={!prompt.trim()}
              buttonClassName="gap-2"
              onConfirm={(key) => send(prompt, key)}
            >
              <Send className="size-4" />
              Envoyer
            </CreditActionButton>
          </div>
        </Card>


        {mutation.isPending && <EricProgress />}

        {plan && !mutation.isPending && (
          <div className="space-y-4">
            <Card className="space-y-4 p-5">
              <div className="flex items-start gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-amber-100 text-lg">
                  {LEAD_AGENT.emoji}
                </span>
                <div className="space-y-3">
                  <p className="whitespace-pre-wrap text-[15px] leading-relaxed">
                    {answerEdit ?? plan.reponse}
                  </p>
                  <GenerationActions
                    title="Réponse d'Éric"
                    text={answerEdit ?? plan.reponse}
                    onEdit={setAnswerEdit}
                    regenerateSlot={
                      <CreditActionButton
                        actionKey="eric.analyze_request"
                        className="inline-block"
                        buttonClassName="gap-1.5"
                        variant="outline"
                        size="sm"
                        pending={mutation.isPending}
                        onConfirm={(key) => send(lastPrompt, key)}
                      >
                        <RefreshCw className="h-4 w-4" /> Régénérer
                      </CreditActionButton>
                    }
                  />

                  {plan.memoire.length > 0 && (
                    <div className="rounded-xl bg-muted/60 p-3">
                      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Mémoire centrale consultée
                      </p>
                      <ul className="list-disc space-y-1 pl-4 text-sm text-muted-foreground">
                        {plan.memoire.map((m, i) => (
                          <li key={i}>{m}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </Card>

            {plan.taches.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Tâches distribuées
                  </p>
                  <Badge variant="secondary">{spent} crédit(s) consommé(s)</Badge>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {plan.taches.map((t, i) => {
                    const meta = agentByKey(t.agent_key);
                    const state = t.id ? results[t.id] : undefined;
                    return (
                      <Card key={i} className="space-y-2 p-4">
                        <div className="flex items-center gap-2">
                          <span
                            className={`grid size-8 place-items-center rounded-lg ${meta.ring}`}
                          >
                            {meta.emoji}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold">{t.agent_name}</p>
                            <p className="truncate text-xs text-muted-foreground">{t.agent_role}</p>
                          </div>
                          <Badge variant="secondary" className="ml-auto capitalize">
                            {t.priority}
                          </Badge>
                        </div>
                        <p className="text-sm font-medium">{t.title}</p>
                        <p className="text-sm text-muted-foreground">{t.detail}</p>
                        <div className="flex items-center gap-2 pt-1 text-xs">
                          {state?.status === "running" && (
                            <>
                              <Loader2 className="size-3.5 animate-spin text-primary" />
                              <span className="text-muted-foreground">En cours...</span>
                            </>
                          )}
                          {state?.status === "done" && (
                            <>
                              <CheckCircle2 className="size-3.5 text-emerald-600" />
                              <span className="text-muted-foreground">Terminé</span>
                            </>
                          )}
                          {state?.status === "error" && (
                            <span className="text-destructive">Bloqué</span>
                          )}
                          {!state && <span className="text-muted-foreground">En attente</span>}
                        </div>
                        {t.id && !state && (
                          <CreditActionButton
                            actionKey="eric.task_run"
                            size="sm"
                            variant="secondary"
                            buttonClassName="gap-2"
                            onConfirm={(key) => runOne(t.id!, key)}
                          >
                            Lancer la tâche
                          </CreditActionButton>
                        )}
                        {state?.result && (
                          <>
                            <div className="rounded-xl bg-muted/60 p-3 text-sm leading-relaxed whitespace-pre-wrap">
                              {taskEdits[t.id ?? ""] ?? state.result}
                            </div>
                            {state.status === "done" && (
                              <GenerationActions
                                title={t.title}
                                text={taskEdits[t.id ?? ""] ?? state.result}
                                onEdit={(text) =>
                                  setTaskEdits((e) => ({ ...e, [t.id ?? ""]: text }))
                                }
                                regenerateSlot={
                                  t.id ? (
                                    <CreditActionButton
                                      actionKey="eric.task_run"
                                      className="inline-block"
                                      buttonClassName="gap-1.5"
                                      variant="outline"
                                      size="sm"
                                      onConfirm={(key) => runOne(t.id!, key)}
                                    >
                                      <RefreshCw className="h-4 w-4" /> Régénérer
                                    </CreditActionButton>
                                  ) : undefined
                                }
                              />
                            )}
                          </>
                        )}
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}

            {plan.prochaine_action && (
              <Card className="flex items-start gap-3 border-primary/30 bg-accent/30 p-4">
                <Sparkles className="mt-0.5 size-4 shrink-0 text-primary" />
                <div className="space-y-2">
                  <p className="text-sm font-semibold">Action suivante proposée</p>
                  <p className="text-sm text-muted-foreground">{plan.prochaine_action}</p>
                  <CreditActionButton
                    actionKey="eric.analyze_request"
                    size="sm"
                    variant="secondary"
                    buttonClassName="gap-2"
                    onConfirm={(key) => send(plan.prochaine_action, key)}
                  >
                    Lancer <ArrowRight className="size-4" />
                  </CreditActionButton>
                </div>
              </Card>
            )}
          </div>
        )}


        {suggestions.all.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Suggestions pour {selectedAgent.name}
              </p>
              <button
                type="button"
                onClick={() => {
                  suggestions.removeAll();
                  toast.success("Suggestions supprimées.");
                }}
                className="text-xs font-medium text-muted-foreground transition hover:text-destructive"
              >
                Tout supprimer
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {suggestions.all.map((s) => (
                <span key={s} className="agent-suggestion-chip inline-flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setPrompt(s);
                      inputRef.current?.focus();
                    }}
                    className="text-left"
                  >
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

        {(conversations ?? []).length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Demandes récentes
              </p>
              <button
                type="button"
                disabled={deleteAllConversations.isPending}
                onClick={() =>
                  deleteAllConversations.mutate(undefined, {
                    onSuccess: () => toast.success("Demandes récentes supprimées."),
                    onError: () => toast.error("Suppression impossible."),
                  })
                }
                className="text-xs font-medium text-muted-foreground transition hover:text-destructive disabled:opacity-50"
              >
                Tout supprimer
              </button>
            </div>
            <div className="space-y-2">
              {(conversations ?? []).map((c: { id: string; title: string }) => (
                <div
                  key={c.id}
                  className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5"
                >
                  <button
                    onClick={() => {
                      setPrompt(c.title);
                      inputRef.current?.focus();
                    }}
                    className="flex-1 text-left text-sm"
                  >
                    {c.title}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const ok = suggestions.add(c.title);
                      toast[ok ? "success" : "info"](
                        ok
                          ? `Ajouté aux suggestions de ${selectedAgent.name}`
                          : "Cette demande est déjà proposée en suggestion.",
                      );
                    }}
                    className="shrink-0 rounded-full border border-border px-3 py-1.5 text-xs font-medium transition hover:bg-accent/40"
                  >
                    <Plus className="mr-1 inline size-3.5" />
                    Suggérer à l'agent
                  </button>
                  <button
                    type="button"
                    aria-label="Supprimer cette demande"
                    onClick={() =>
                      deleteConversation.mutate(c.id, {
                        onError: () => toast.error("Suppression impossible."),
                      })
                    }
                    className="shrink-0 text-muted-foreground transition hover:text-destructive"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </AppShell>
  );
}
