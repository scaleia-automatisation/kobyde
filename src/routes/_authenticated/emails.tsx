import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  Ban,
  Archive,
  Clock,
  Inbox,
  Mail,
  Pencil,
  Plus,
  Send,
  Sparkles,
  Trash2,
  Workflow,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CreditActionButton } from "@/components/credit-action";
import { useCreateRow, useDeleteRow, useOrgId, useRows, useUpdateRow } from "@/lib/db";
import {
  DEFAULT_SEQUENCE_STEPS,
  EMAIL_PRIORITIES,
  EMAIL_ROUTING,
  SEQUENCE_CONDITIONS,
  STEP_KIND_LABEL,
  conditionLabel,
  dayLabel,
  priorityMeta,
  routingMeta,
  statusLabel,
  type SequenceStep,
} from "@/lib/emails";
import { analyzeEmail, writeSequence } from "@/lib/emails.functions";

export const Route = createFileRoute("/_authenticated/emails")({
  component: EmailsPage,
  head: () => ({
    meta: [
      { title: "Emails et séquences — Kobyde" },
      {
        name: "description",
        content:
          "Clara trie, priorise et route vos emails vers le bon agent, prépare les réponses et construit vos séquences de relance.",
      },
      { property: "og:title", content: "Emails et séquences — Kobyde" },
      {
        property: "og:description",
        content: "Analyse, routage et relances email — aucun envoi sans votre validation.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

/* eslint-disable @typescript-eslint/no-explicit-any */

function EmailsPage() {
  return (
    <AppShell
      title="Emails — Clara Relances"
      subtitle="Clara analyse, priorise et route chaque email vers le bon agent, puis prépare la réponse. Aucun email n'est envoyé sans votre validation explicite."
    >
      <div className="space-y-6">
        <div className="flex flex-wrap gap-2">
          {EMAIL_ROUTING.filter((r) => r.category !== "autre").map((r) => (
            <span
              key={r.category}
              className="rounded-full border bg-card px-3 py-1 text-xs text-muted-foreground"
            >
              {r.label} → <span className="font-semibold text-foreground">{r.agentName}</span>
            </span>
          ))}
        </div>

        <Tabs defaultValue="inbox">
          <TabsList>
            <TabsTrigger value="inbox" className="gap-2">
              <Inbox className="size-4" /> Nouveaux emails
            </TabsTrigger>
            <TabsTrigger value="sequences" className="gap-2">
              <Workflow className="size-4" /> Séquences email
            </TabsTrigger>
          </TabsList>
          <TabsContent value="inbox" className="mt-6">
            <Inboxsection />
          </TabsContent>
          <TabsContent value="sequences" className="mt-6">
            <SequencesSection />
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}

/* ------------------------------- Boîte de réception ------------------------------- */

function Inboxsection() {
  const orgId = useOrgId();
  const qc = useQueryClient();
  const { data: emails = [], isLoading } = useRows<any>("emails", { order: "received_at" });
  const create = useCreateRow("emails");
  const update = useUpdateRow("emails");
  const remove = useDeleteRow("emails");
  const analyze = useServerFn(analyzeEmail);

  const [filter, setFilter] = useState<string>("tous");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ from_name: "", from_email: "", subject: "", body: "" });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["rows", "emails", orgId] });

  const analyzeMut = useMutation({
    mutationFn: async (v: { emailId: string; idempotencyKey: string }) =>
      analyze({ data: { orgId: orgId!, emailId: v.emailId, idempotencyKey: v.idempotencyKey } }),
    onSuccess: () => {
      toast.success("Email analysé et routé vers le bon agent.");
      invalidate();
    },
    onError: (e: any) => toast.error(e?.message ?? "Échec de l'analyse."),
  });

  const list = useMemo(() => {
    const rows = emails.filter((e) => (e.direction ?? "entrant") === "entrant");
    const filtered = filter === "tous" ? rows : rows.filter((e) => (e.priority ?? "normal") === filter);
    return [...filtered].sort(
      (a, b) => priorityMeta(a.priority).rank - priorityMeta(b.priority).rank,
    );
  }, [emails, filter]);

  const addEmail = async () => {
    if (!form.subject.trim()) {
      toast.error("L'objet est obligatoire.");
      return;
    }
    await create.mutateAsync({
      direction: "entrant",
      from_name: form.from_name || null,
      from_email: form.from_email || null,
      subject: form.subject,
      body: form.body || null,
      status: "nouveau",
      priority: "normal",
      received_at: new Date().toISOString(),
    });
    setForm({ from_name: "", from_email: "", subject: "", body: "" });
    setOpen(false);
    toast.success("Email ajouté à la boîte de réception.");
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-[190px]">
            <SelectValue placeholder="Toutes les priorités" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="tous">Toutes les priorités</SelectItem>
            {EMAIL_PRIORITIES.map((p) => (
              <SelectItem key={p.key} value={p.key}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="ml-auto">
          <Button onClick={() => setOpen((o) => !o)} className="gap-2">
            <Plus className="size-4" /> Nouvel email
          </Button>
        </div>
      </div>

      {open && (
        <Card className="space-y-3 p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Expéditeur</Label>
              <Input
                value={form.from_name}
                onChange={(e) => setForm({ ...form, from_name: e.target.value })}
                placeholder="Marie Dupont"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Email de l'expéditeur</Label>
              <Input
                type="email"
                value={form.from_email}
                onChange={(e) => setForm({ ...form, from_email: e.target.value })}
                placeholder="marie@exemple.fr"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Objet</Label>
            <Input
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
              placeholder="Demande de devis pour un site vitrine"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Contenu</Label>
            <Textarea
              rows={5}
              value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
              placeholder="Collez ici le contenu de l'email reçu."
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button onClick={() => void addEmail()} disabled={create.isPending}>
              Ajouter
            </Button>
          </div>
        </Card>
      )}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Chargement…</p>
      ) : list.length === 0 ? (
        <Card className="p-10 text-center">
          <Mail className="mx-auto mb-3 size-8 text-muted-foreground" />
          <p className="font-medium">Aucun email pour le moment</p>
          <p className="text-sm text-muted-foreground">
            Ajoutez un email reçu : Clara l'analyse, le priorise et le confie au bon agent.
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {list.map((email) => (
            <EmailCard
              key={email.id}
              email={email}
              onAnalyze={(idem) => analyzeMut.mutateAsync({ emailId: email.id, idempotencyKey: idem })}
              onUpdate={(values) => update.mutateAsync({ id: email.id, values })}
              onDelete={() => remove.mutateAsync(email.id)}
              busy={analyzeMut.isPending || update.isPending}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function EmailCard({
  email,
  onAnalyze,
  onUpdate,
  onDelete,
  busy,
}: {
  email: any;
  onAnalyze: (idempotencyKey: string) => Promise<unknown>;
  onUpdate: (values: Record<string, unknown>) => Promise<unknown>;
  onDelete: () => Promise<unknown>;
  busy: boolean;
}) {
  const p = priorityMeta(email.priority);
  const route = routingMeta(email.category);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({
    subject: email.draft_subject ?? "",
    body: email.draft_body ?? "",
  });
  const [later, setLater] = useState("");

  const analyzed = !!email.summary;
  const finalStatus = ["envoye", "rejete", "classe"].includes(email.status);

  const save = async () => {
    await onUpdate({ draft_subject: draft.subject, draft_body: draft.body });
    setEditing(false);
    toast.success("Brouillon modifié.");
  };

  return (
    <Card className="space-y-4 p-5">
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${p.chip}`}>
              {p.label}
            </span>
            <Badge variant="secondary">{statusLabel(email.status)}</Badge>
            {analyzed && (
              <Badge variant="outline">
                {route.label} → {route.agentName}
              </Badge>
            )}
          </div>
          <h3 className="mt-2 truncate text-base font-semibold">{email.subject}</h3>
          <p className="text-sm text-muted-foreground">
            De {email.from_name || email.from_email || "expéditeur inconnu"}
            {email.from_email && email.from_name ? ` <${email.from_email}>` : ""} ·{" "}
            {new Date(email.received_at ?? email.created_at).toLocaleString("fr-FR")}
          </p>
        </div>
        <Button variant="ghost" size="sm" className="gap-1" onClick={() => void onDelete()}>
          <Trash2 className="size-4" /> Supprimer
        </Button>
      </div>

      {email.body && (
        <p className="whitespace-pre-wrap rounded-xl bg-muted/50 p-3 text-sm text-muted-foreground">
          {String(email.body).slice(0, 600)}
        </p>
      )}

      {analyzed ? (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">Résumé</p>
              <p className="text-sm">{email.summary}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">Action recommandée</p>
              <p className="text-sm">{email.suggested_action}</p>
            </div>
          </div>

          <div className="rounded-xl border p-3">
            <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
              Réponse préparée par {route.agentName} — à valider
            </p>
            {editing ? (
              <div className="space-y-2">
                <Input value={draft.subject} onChange={(e) => setDraft({ ...draft, subject: e.target.value })} />
                <Textarea rows={8} value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} />
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
                    Annuler
                  </Button>
                  <Button size="sm" onClick={() => void save()}>
                    Enregistrer
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <p className="text-sm font-medium">{email.draft_subject}</p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{email.draft_body}</p>
                <GenerationActions
                  className="mt-3"
                  title={email.draft_subject || "Réponse email"}
                  text={`${email.draft_subject ?? ""}\n\n${email.draft_body ?? ""}`}
                  onEdit={(t) => {
                    const [first, ...rest] = t.split("\n\n");
                    void onUpdate({ draft_subject: first, draft_body: rest.join("\n\n") });
                  }}
                />
              </>
            )}

          </div>

          {email.status === "planifie" && email.scheduled_at && (
            <p className="text-sm text-muted-foreground">
              Envoi programmé le {new Date(email.scheduled_at).toLocaleString("fr-FR")}.
            </p>
          )}

          {!finalStatus && !editing && (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                className="gap-2"
                disabled={busy}
                onClick={() =>
                  void onUpdate({ status: "envoye", sent_at: new Date().toISOString() }).then(() =>
                    toast.success("Validé : l'email a été envoyé."),
                  )
                }
              >
                <Send className="size-4" /> Valider et envoyer
              </Button>
              <Button size="sm" variant="outline" className="gap-2" onClick={() => setEditing(true)}>
                <Pencil className="size-4" /> Modifier
              </Button>
              <div className="flex items-center gap-1">
                <Input
                  type="datetime-local"
                  className="h-9 w-[200px]"
                  value={later}
                  onChange={(e) => setLater(e.target.value)}
                />
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-2"
                  disabled={!later}
                  onClick={() =>
                    void onUpdate({
                      status: "planifie",
                      scheduled_at: new Date(later).toISOString(),
                    }).then(() => toast.success("Envoi programmé."))
                  }
                >
                  <Clock className="size-4" /> Envoyer plus tard
                </Button>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="gap-2"
                onClick={() => void onUpdate({ status: "rejete" }).then(() => toast("Réponse rejetée."))}
              >
                <Ban className="size-4" /> Rejeter
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="gap-2"
                onClick={() => void onUpdate({ status: "classe" }).then(() => toast("Email classé."))}
              >
                <Archive className="size-4" /> Ignorer / Classer
              </Button>
            </div>
          )}
        </div>
      ) : (
        <CreditActionButton
          actionKey="email.analyze"
          onConfirm={(idem) => onAnalyze(idem)}
          pending={busy}
          className="max-w-xs"
          buttonClassName="w-full gap-2"
        >
          <Sparkles className="size-4" /> Analyser et router
        </CreditActionButton>
      )}
    </Card>
  );
}

/* --------------------------------- Séquences --------------------------------- */

function SequencesSection() {
  const orgId = useOrgId();
  const qc = useQueryClient();
  const { data: sequences = [] } = useRows<any>("email_sequences");
  const create = useCreateRow("email_sequences");
  const update = useUpdateRow("email_sequences");
  const remove = useDeleteRow("email_sequences");
  const write = useServerFn(writeSequence);

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [objective, setObjective] = useState("");
  const [audience, setAudience] = useState("");
  const [steps, setSteps] = useState<SequenceStep[]>(DEFAULT_SEQUENCE_STEPS);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["rows", "email_sequences", orgId] });

  const writeMut = useMutation({
    mutationFn: async (v: { sequenceId: string; idempotencyKey: string }) =>
      write({ data: { orgId: orgId!, sequenceId: v.sequenceId, idempotencyKey: v.idempotencyKey } }),
    onSuccess: () => {
      toast.success("Séquence rédigée par Clara.");
      invalidate();
    },
    onError: (e: any) => toast.error(e?.message ?? "Échec de la rédaction."),
  });

  const setStep = (i: number, patch: Partial<SequenceStep>) =>
    setSteps((s) => s.map((st, idx) => (idx === i ? { ...st, ...patch } : st)));

  const save = async () => {
    if (!name.trim()) {
      toast.error("Donnez un nom à la séquence.");
      return;
    }
    await create.mutateAsync({ name, objective, audience, steps: steps as any, status: "brouillon" });
    setName("");
    setObjective("");
    setAudience("");
    setSteps(DEFAULT_SEQUENCE_STEPS);
    setOpen(false);
    toast.success("Séquence créée.");
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Exemple type : J0 → email, J+3 → relance, J+7 → relance, J+14 → dernière relance.
        </p>
        <Button className="gap-2" onClick={() => setOpen((o) => !o)}>
          <Plus className="size-4" /> Créer une séquence
        </Button>
      </div>

      {open && (
        <Card className="space-y-4 p-5">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Nom</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Relance devis" />
            </div>
            <div className="space-y-1.5">
              <Label>Objectif</Label>
              <Input
                value={objective}
                onChange={(e) => setObjective(e.target.value)}
                placeholder="Obtenir une réponse sur le devis envoyé"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Audience</Label>
              <Input
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
                placeholder="Prospects ayant reçu un devis"
              />
            </div>
          </div>

          <div className="space-y-3">
            {steps.map((step, i) => (
              <div key={i} className="grid gap-2 rounded-xl border p-3 sm:grid-cols-[1fr_110px_1fr_auto]">
                <Select value={step.kind} onValueChange={(v) => setStep(i, { kind: v as SequenceStep["kind"] })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(STEP_KIND_LABEL).map(([k, label]) => (
                      <SelectItem key={k} value={k}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  min={0}
                  value={step.day}
                  onChange={(e) => setStep(i, { day: Number(e.target.value) })}
                  aria-label="Délai en jours"
                />
                <Select value={step.condition} onValueChange={(v) => setStep(i, { condition: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SEQUENCE_CONDITIONS.map((c) => (
                      <SelectItem key={c.key} value={c.key}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSteps((s) => s.filter((_, idx) => idx !== i))}
                  disabled={steps.length <= 1}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() =>
                setSteps((s) => [
                  ...s,
                  {
                    kind: "relance",
                    day: (s[s.length - 1]?.day ?? 0) + 7,
                    condition: "sans_reponse",
                    subject: "",
                    body: "",
                  },
                ])
              }
            >
              <Plus className="size-4" /> Ajouter une étape
            </Button>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button onClick={() => void save()} disabled={create.isPending}>
              Enregistrer la séquence
            </Button>
          </div>
        </Card>
      )}

      {sequences.length === 0 ? (
        <Card className="p-10 text-center">
          <Workflow className="mx-auto mb-3 size-8 text-muted-foreground" />
          <p className="font-medium">Aucune séquence</p>
          <p className="text-sm text-muted-foreground">Créez votre première séquence de relance.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {sequences.map((seq: any) => (
            <Card key={seq.id} className="space-y-4 p-5">
              <div className="flex flex-wrap items-center gap-3">
                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-semibold">{seq.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {seq.objective || "Sans objectif précisé"} · {seq.audience || "Audience non précisée"}
                  </p>
                </div>
                <Badge variant="secondary">{seq.status === "prete" ? "Prête" : "Brouillon"}</Badge>
                <Button variant="ghost" size="sm" onClick={() => void remove.mutateAsync(seq.id)}>
                  <Trash2 className="size-4" />
                </Button>
              </div>

              <ol className="space-y-2">
                {((seq.steps ?? []) as SequenceStep[]).map((s, i) => (
                  <li key={i} className="rounded-xl border p-3">
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <Badge>{dayLabel(s.day)}</Badge>
                      <span className="font-medium">{STEP_KIND_LABEL[s.kind]}</span>
                      <span className="text-muted-foreground">· {conditionLabel(s.condition)}</span>
                    </div>
                    {s.subject && <p className="mt-2 text-sm font-medium">{s.subject}</p>}
                    {s.body && (
                      <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{s.body}</p>
                    )}
                  </li>
                ))}
              </ol>

              <div className="flex flex-wrap items-center gap-3">
                <CreditActionButton
                  actionKey={((seq.steps ?? []) as SequenceStep[]).length > 3 ? "email.sequence_full" : "email.sequence_simple"}
                  onConfirm={(idem) => writeMut.mutateAsync({ sequenceId: seq.id, idempotencyKey: idem })}
                  pending={writeMut.isPending}
                  className="max-w-xs"
                >
                  <Sparkles className="size-4" /> Rédiger les emails
                </CreditActionButton>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    void update
                      .mutateAsync({ id: seq.id, values: { status: seq.status === "active" ? "prete" : "active" } })
                      .then(() => toast.success("Statut mis à jour."))
                  }
                >
                  {seq.status === "active" ? "Mettre en pause" : "Activer"}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
