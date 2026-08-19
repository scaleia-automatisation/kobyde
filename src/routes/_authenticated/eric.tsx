import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, Loader2, Send, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { askEric } from "@/lib/eric.functions";
import { AGENTS, LEAD_AGENT, agentByKey } from "@/lib/agents";
import { useOrgId, useRows } from "@/lib/db";

export const Route = createFileRoute("/_authenticated/eric")({
  component: EricPage,
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

const EXAMPLES = [
  "Trouve-moi 50 prospects pour mon offre de création de site.",
  "Analyse mes concurrents.",
  "Prépare un devis pour Jean.",
  "Quels sont mes clients à relancer ?",
  "Je veux recruter un commercial.",
];

type Plan = Awaited<ReturnType<typeof askEric>>;

function EricPage() {
  const orgId = useOrgId();
  const [prompt, setPrompt] = useState("");
  const [plan, setPlan] = useState<Plan | null>(null);
  const [results, setResults] = useState<
    Record<string, { status: "running" | "done" | "error"; result?: string }>
  >({});
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const qc = useQueryClient();
  const call = useServerFn(askEric);
  const execTask = useServerFn(runTask);
  const { data: conversations } = useRows("conversations", { limit: 5 });

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const mutation = useMutation({
    mutationFn: async (text: string) => call({ data: { prompt: text, orgId: orgId! } }),
    onSuccess: async (data) => {
      setPlan(data);
      setResults({});
      setPrompt("");
      inputRef.current?.focus();

      // Éric suit la progression et récupère les résultats de chaque agent.
      for (const t of data.taches) {
        if (!t.id) continue;
        setResults((r) => ({ ...r, [t.id!]: { status: "running" } }));
        try {
          const res = await execTask({ data: { taskId: t.id, orgId: orgId! } });
          setResults((r) => ({ ...r, [t.id!]: { status: "done", result: res.result } }));
        } catch (e) {
          setResults((r) => ({
            ...r,
            [t.id!]: { status: "error", result: e instanceof Error ? e.message : "Échec" },
          }));
        }
      }
      qc.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message || "Éric n'a pas pu traiter la demande."),
  });

  const send = (text: string) => {
    const value = text.trim();
    if (!value) return;
    if (!orgId) {
      toast.error("Organisation introuvable.");
      return;
    }
    mutation.mutate(value);
  };

  return (
    <AppShell title="Éric — Directeur IA" subtitle="L'orchestrateur central de votre équipe">
      <div className="mx-auto w-full max-w-3xl space-y-8">
        <div className="text-center">
          <div className="mx-auto mb-4 grid size-14 place-items-center rounded-2xl bg-amber-100 text-3xl ring-1 ring-amber-200">
            {LEAD_AGENT.emoji}
          </div>
          <h2 className="font-display text-3xl font-bold tracking-tight lg:text-4xl">
            Que voulez-vous faire ?
          </h2>
          <p className="mt-2 text-muted-foreground">
            Éric comprend votre demande, consulte la mémoire de l'entreprise et confie le travail aux bons
            agents.
          </p>
        </div>

        <Card className="p-3 shadow-lg">
          <Textarea
            ref={inputRef}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) send(prompt);
            }}
            placeholder="Écrivez simplement ce dont vous avez besoin..."
            rows={3}
            className="resize-none border-0 text-base shadow-none focus-visible:ring-0"
          />
          <div className="flex items-center justify-between gap-3 px-1 pt-2">
            <span className="text-xs text-muted-foreground">Ctrl + Entrée pour envoyer</span>
            <Button onClick={() => send(prompt)} disabled={mutation.isPending || !prompt.trim()}>
              {mutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
              Envoyer
            </Button>
          </div>
        </Card>

        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Exemples</p>
          <div className="flex flex-wrap gap-2">
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                onClick={() => {
                  setPrompt(ex);
                  send(ex);
                }}
                disabled={mutation.isPending}
                className="rounded-full border border-border bg-card px-3.5 py-2 text-left text-sm text-foreground/80 transition hover:border-primary/40 hover:bg-accent/40 disabled:opacity-50"
              >
                « {ex} »
              </button>
            ))}
          </div>
        </div>

        {mutation.isPending && (
          <Card className="flex items-center gap-3 p-5 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Éric analyse votre demande et mobilise l'équipe...
          </Card>
        )}

        {plan && !mutation.isPending && (
          <div className="space-y-4">
            <Card className="space-y-4 p-5">
              <div className="flex items-start gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-amber-100 text-lg">
                  {LEAD_AGENT.emoji}
                </span>
                <div className="space-y-3">
                  <p className="whitespace-pre-wrap text-[15px] leading-relaxed">{plan.reponse}</p>
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
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Tâches distribuées
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {plan.taches.map((t, i) => {
                    const meta = agentByKey(t.agent_key);
                    return (
                      <Card key={i} className="space-y-2 p-4">
                        <div className="flex items-center gap-2">
                          <span className={`grid size-8 place-items-center rounded-lg ${meta.ring}`}>
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
                  <Button size="sm" variant="secondary" onClick={() => send(plan.prochaine_action)}>
                    Lancer <ArrowRight className="size-4" />
                  </Button>
                </div>
              </Card>
            )}
          </div>
        )}

        <div className="space-y-3 border-t border-border pt-6">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Interconnexion de l'équipe
          </p>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            {AGENTS.filter((a) => !a.primary).map((a) => (
              <span
                key={a.key}
                className={`rounded-full px-3 py-1.5 text-xs font-medium ring-1 ${a.ring}`}
                title={a.description}
              >
                {a.emoji} {a.name} · {a.role}
              </span>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Tous les agents partagent la même mémoire centrale : prospects, clients, devis, factures,
            projets et historique des tâches.
          </p>
        </div>

        {(conversations ?? []).length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Demandes récentes
            </p>
            <div className="space-y-2">
              {(conversations ?? []).map((c: { id: string; title: string }) => (
                <button
                  key={c.id}
                  onClick={() => send(c.title)}
                  className="w-full rounded-xl border border-border bg-card px-4 py-2.5 text-left text-sm hover:bg-accent/40"
                >
                  {c.title}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
