import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, CheckCircle2, Plus } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useChildRows, useOrgId, useRow, eur2, frDate } from "@/lib/db";

/* eslint-disable @typescript-eslint/no-explicit-any */

export const Route = createFileRoute("/_authenticated/projets/$id")({
  head: () => ({
    meta: [
      { title: "Détail du projet — Kobyde" },
      {
        name: "description",
        content: "Étapes, tâches, avancement et livraison d'un projet client, suivis par Chloé.",
      },
      { property: "og:title", content: "Détail du projet — Kobyde" },
      { property: "og:description", content: "Pilotez l'exécution jusqu'à la livraison." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ProjectDetail,
});

function ProjectDetail() {
  const { id } = Route.useParams();
  const orgId = useOrgId();
  const { data: project, refetch } = useRow<any>("projects", id);
  const { data: steps, refetch: refetchSteps } = useChildRows<any>("project_steps", "project_id", id, {
    order: "position",
    ascending: true,
  });
  const { data: tasks, refetch: refetchTasks } = useChildRows<any>("tasks", "project_id", id);

  const done = (tasks ?? []).filter((t: any) => t.status === "termine").length;
  const progress = (tasks ?? []).length ? Math.round((done / (tasks ?? []).length) * 100) : Number(project?.progress ?? 0);

  const addStep = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!orgId) return;
    const fd = new FormData(e.currentTarget);
    const { error } = await supabase.from("project_steps").insert({
      org_id: orgId,
      project_id: id,
      name: String(fd.get("name") ?? "").trim(),
      status: "a_faire",
      position: (steps?.length ?? 0) + 1,
      due_date: String(fd.get("due_date") ?? "") || null,
    });
    if (error) return toast.error(error.message);
    e.currentTarget.reset();
    await refetchSteps();
  };

  const addTask = async (e: React.FormEvent<HTMLFormElement>, stepId: string) => {
    e.preventDefault();
    if (!orgId) return;
    const fd = new FormData(e.currentTarget);
    const { error } = await supabase.from("tasks").insert({
      org_id: orgId,
      project_id: id,
      step_id: stepId,
      title: String(fd.get("title") ?? "").trim(),
      status: "a_faire",
      priority: "normale",
      assignee_name: String(fd.get("assignee") ?? "").trim() || null,
      due_date: String(fd.get("due_date") ?? "") || null,
    });
    if (error) return toast.error(error.message);
    e.currentTarget.reset();
    await refetchTasks();
  };

  const toggleTask = async (task: any) => {
    const status = task.status === "termine" ? "a_faire" : "termine";
    await supabase.from("tasks").update({ status }).eq("id", task.id);
    await refetchTasks();
    const total = (tasks ?? []).length || 1;
    const doneNow = (tasks ?? []).filter((t: any) =>
      t.id === task.id ? status === "termine" : t.status === "termine",
    ).length;
    await supabase
      .from("projects")
      .update({ progress: Math.round((doneNow / total) * 100) })
      .eq("id", id);
    await refetch();
  };

  const finish = async () => {
    await supabase
      .from("projects")
      .update({ status: "termine", progress: 100, completed_at: new Date().toISOString() })
      .eq("id", id);
    await refetch();
    toast.success("Projet livré et finalisé 🎉");
  };

  if (!project) {
    return (
      <AppShell title="Projet" subtitle="Chargement…">
        <div className="surface p-10 text-center text-muted-foreground">Chargement du projet…</div>
      </AppShell>
    );
  }

  return (
    <AppShell
      title={project.name}
      subtitle={`${project.status} · budget ${eur2(project.budget)} · ${progress} % réalisé`}
      action={
        <Button variant="ghost" className="gap-2" asChild>
          <Link to="/projets">
            <ArrowLeft className="size-4" /> Tous les projets
          </Link>
        </Button>
      }
    >
      <section className="surface p-4">
        <div className="h-3 overflow-hidden rounded-full bg-muted">
          <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
          <span>
            {done} tâche{done > 1 ? "s" : ""} terminée{done > 1 ? "s" : ""} sur {(tasks ?? []).length}
          </span>
          <span>
            Du {frDate(project.start_date)} au {frDate(project.end_date)}
          </span>
        </div>
        {project.status !== "termine" && (
          <Button className="mt-4 gap-2" onClick={finish}>
            <CheckCircle2 className="size-4" /> Marquer le projet livré
          </Button>
        )}
      </section>

      <section className="mt-4 space-y-4">
        {(steps ?? []).map((step: any) => {
          const stepTasks = (tasks ?? []).filter((t: any) => t.step_id === step.id);
          return (
            <div key={step.id} className="surface p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-display text-lg">{step.name}</h2>
                <div className="flex items-center gap-2">
                  <Badge variant={step.status === "termine" ? "default" : "outline"}>{step.status}</Badge>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={async () => {
                      await supabase
                        .from("project_steps")
                        .update({ status: step.status === "termine" ? "en_cours" : "termine" })
                        .eq("id", step.id);
                      await refetchSteps();
                    }}
                  >
                    {step.status === "termine" ? "Rouvrir" : "Terminer l'étape"}
                  </Button>
                </div>
              </div>

              <ul className="mt-3 space-y-2">
                {stepTasks.map((t: any) => (
                  <li
                    key={t.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-muted/50 px-3 py-2 text-sm"
                  >
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        className="size-4"
                        checked={t.status === "termine"}
                        onChange={() => toggleTask(t)}
                      />
                      <span className={t.status === "termine" ? "line-through opacity-60" : ""}>{t.title}</span>
                    </label>
                    <span className="text-xs text-muted-foreground">
                      {t.assignee_name ?? "Non assignée"} · {frDate(t.due_date)}
                    </span>
                  </li>
                ))}
              </ul>

              <form
                className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_160px_150px_auto] sm:items-end"
                onSubmit={(e) => addTask(e, step.id)}
              >
                <div className="space-y-1.5">
                  <Label htmlFor={`t-${step.id}`} className="text-xs">
                    Nouvelle tâche
                  </Label>
                  <Input id={`t-${step.id}`} name="title" required placeholder="Rédiger la page d'accueil" />
                </div>
                <Input name="assignee" aria-label="Responsable" placeholder="Responsable" />
                <Input name="due_date" type="date" aria-label="Échéance de la tâche" />
                <Button type="submit" size="sm" className="gap-2">
                  <Plus className="size-4" /> Ajouter
                </Button>
              </form>
            </div>
          );
        })}
      </section>

      <form onSubmit={addStep} className="surface mt-4 grid gap-2 p-4 sm:grid-cols-[minmax(0,1fr)_180px_auto] sm:items-end">
        <div className="space-y-1.5">
          <Label htmlFor="step_name">Nouvelle étape</Label>
          <Input id="step_name" name="name" required placeholder="Recette client" />
        </div>
        <Input name="due_date" type="date" aria-label="Échéance de l'étape" />
        <Button type="submit" className="gap-2">
          <Plus className="size-4" /> Ajouter l'étape
        </Button>
      </form>
    </AppShell>
  );
}
