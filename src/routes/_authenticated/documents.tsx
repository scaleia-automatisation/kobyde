import { useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Copy, Download, FileText, Mail, Sparkles, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useDeleteRow, useOrgId, useRows, frDate } from "@/lib/db";
import {
  DOC_ACCEPT,
  DOC_KINDS,
  DOC_NAME_SUGGESTIONS,
  DOC_QUESTION_SUGGESTIONS,
  humanSize,
} from "@/lib/documents";
import { askDocument, documentDownloadUrl, saveDocument } from "@/lib/documents.functions";

/* eslint-disable @typescript-eslint/no-explicit-any */

export const Route = createFileRoute("/_authenticated/documents")({
  head: () => ({
    meta: [
      { title: "Documents — Kobyde" },
      {
        name: "description",
        content:
          "Classez vos contrats, devis et pièces importantes, puis interrogez vos documents pour en extraire les données.",
      },
      { property: "og:title", content: "Documents — Kobyde" },
      { property: "og:description", content: "Vos documents, analysés et interrogeables." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DocumentsPage,
});

const readFile = (file: File) =>
  new Promise<{ name: string; mime: string; base64: string }>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      resolve({
        name: file.name,
        mime: file.type || "",
        base64: String(reader.result ?? "").split(",").pop() ?? "",
      });
    reader.onerror = () => reject(new Error("Lecture du fichier impossible."));
    reader.readAsDataURL(file);
  });

function DocumentsPage() {
  const orgId = useOrgId();
  const qc = useQueryClient();
  const { data: rows, isLoading } = useRows<any>("documents");
  const remove = useDeleteRow("documents");

  const [addOpen, setAddOpen] = useState(false);
  const [askOpen, setAskOpen] = useState(false);

  const [name, setName] = useState("");
  const [kind, setKind] = useState(DOC_KINDS[0]!);
  const [file, setFile] = useState<File | null>(null);
  const [link, setLink] = useState("");
  const pick = useRef<HTMLInputElement>(null);

  const [question, setQuestion] = useState(DOC_QUESTION_SUGGESTIONS[0]!);
  const [askFile, setAskFile] = useState<File | null>(null);
  const [askDocId, setAskDocId] = useState<string>("");
  const [answer, setAnswer] = useState<string | null>(null);
  const askPick = useRef<HTMLInputElement>(null);

  const saveFn = useServerFn(saveDocument);
  const askFn = useServerFn(askDocument);
  const urlFn = useServerFn(documentDownloadUrl);

  const list = rows ?? [];

  const save = useMutation({
    mutationFn: async () => {
      if (!orgId) throw new Error("Organisation introuvable.");
      if (!name.trim()) throw new Error("Donnez un nom au document.");
      const payload = file ? await readFile(file) : null;
      return saveFn({
        data: {
          orgId,
          name: name.trim(),
          kind,
          fileUrl: !file && link.trim() ? link.trim() : null,
          file: payload,
        },
      });
    },
    onSuccess: () => {
      toast.success("Document enregistré");
      setAddOpen(false);
      setName("");
      setFile(null);
      setLink("");
      qc.invalidateQueries({ queryKey: ["rows", "documents", orgId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const ask = useMutation({
    mutationFn: async () => {
      if (!orgId) throw new Error("Organisation introuvable.");
      if (!askFile && !askDocId) throw new Error("Choisissez un document à analyser.");
      const payload = askFile ? await readFile(askFile) : null;
      return askFn({
        data: { orgId, question: question.trim(), documentId: payload ? null : askDocId, file: payload },
      });
    },
    onSuccess: (res: any) => setAnswer(res.answer),
    onError: (e: Error) => toast.error(e.message),
  });

  const download = async (id: string) => {
    try {
      const res: any = await urlFn({ data: { orgId: orgId!, documentId: id } });
      window.open(res.url, "_blank", "noopener");
    } catch (e: any) {
      toast.error(e?.message ?? "Téléchargement impossible.");
    }
  };

  const exportCsv = () => {
    if (!list.length) {
      toast.error("Aucun document à exporter.");
      return;
    }
    const head = ["Nom", "Type", "Taille (Ko)", "Ajouté le"];
    const lines = list.map((d: any) =>
      [d.name, d.kind ?? "", d.size_kb ?? "", d.created_at].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(";"),
    );
    const blob = new Blob(["\uFEFF" + [head.join(";"), ...lines].join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "documents-kobyde.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyAnswer = async () => {
    if (!answer) return;
    await navigator.clipboard.writeText(answer);
    toast.success("Réponse copiée");
  };

  const mailAnswer = () => {
    if (!answer) return;
    window.location.href = `mailto:?subject=${encodeURIComponent("Extraction de document — Kobyde")}&body=${encodeURIComponent(answer)}`;
  };

  return (
    <AppShell
      title="Documents"
      subtitle="Contrats, devis signés et pièces importantes — classés, exportables et interrogeables."
    >
      <section className="surface p-6 sm:p-8">
        <h2 className="font-display text-2xl">Que voulez-vous faire ?</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" className="agent-suggestion-chip" onClick={() => setAddOpen(true)}>
            <Upload className="mr-1.5 inline size-4" /> Ajouter un document (PDF, Word, image, Excel, CSV…)
          </button>
          <button
            type="button"
            className="agent-suggestion-chip"
            onClick={() => {
              setAnswer(null);
              setAskOpen(true);
            }}
          >
            <Sparkles className="mr-1.5 inline size-4" /> Poser une question / extraire des données
          </button>
          <button type="button" className="agent-suggestion-chip" onClick={exportCsv}>
            <Download className="mr-1.5 inline size-4" /> Exporter la liste (CSV / Excel)
          </button>
        </div>
      </section>

      <div className="mt-6 grid gap-3">
        {isLoading && <div className="surface p-10 text-center text-muted-foreground">Chargement…</div>}
        {!isLoading && list.length === 0 && (
          <div className="surface p-12 text-center">
            <FileText className="mx-auto size-8 text-muted-foreground" />
            <p className="font-display mt-3 text-xl">Aucun document</p>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              Ajoutez un fichier et posez-lui vos questions : Kobyde en extrait les données utiles.
            </p>
          </div>
        )}
        {list.map((d: any) => (
          <article key={d.id} className="surface flex flex-wrap items-center gap-3 p-4">
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{d.name}</p>
              <p className="text-xs text-muted-foreground">
                {humanSize(d.size_kb)} · ajouté le {frDate(d.created_at)}
              </p>
            </div>
            {d.kind && <Badge variant="secondary">{d.kind}</Badge>}
            {d.file_url && (
              <>
                <Button variant="outline" size="sm" onClick={() => download(d.id)}>
                  <Download className="mr-1.5 size-4" /> Ouvrir
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setAskDocId(d.id);
                    setAskFile(null);
                    setAnswer(null);
                    setAskOpen(true);
                  }}
                >
                  <Sparkles className="mr-1.5 size-4" /> Interroger
                </Button>
              </>
            )}
            <Button
              variant="ghost"
              size="icon"
              aria-label="Supprimer le document"
              onClick={() => remove.mutate(d.id, { onSuccess: () => toast.success("Document supprimé") })}
            >
              <X className="size-4 text-muted-foreground" />
            </Button>
          </article>
        ))}
      </div>

      {/* Ajout */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Ajouter un document</DialogTitle>
            <DialogDescription>Choisissez une proposition ou saisissez votre propre nom.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="doc-name">Nom du document</Label>
              <Input
                id="doc-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Contrat Dupont signé"
              />
              <div className="flex flex-wrap gap-2 pt-1">
                {DOC_NAME_SUGGESTIONS.map((s) => (
                  <button key={s} type="button" className="agent-suggestion-chip" onClick={() => setName(s)}>
                    {s}
                  </button>
                ))}
                <button
                  type="button"
                  className="agent-suggestion-chip"
                  onClick={() => {
                    setName("");
                    document.getElementById("doc-name")?.focus();
                  }}
                >
                  Personnalisé — je saisis le nom
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="doc-kind">Type</Label>
              <select
                id="doc-kind"
                value={kind}
                onChange={(e) => setKind(e.target.value)}
                className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
              >
                {DOC_KINDS.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label>Fichier (PDF, Word, JPEG, Excel, CSV…)</Label>
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => pick.current?.click()}>
                  <Upload className="mr-1.5 size-4" /> Choisir un fichier
                </Button>
                <span className="truncate text-sm text-muted-foreground">
                  {file ? file.name : "Aucun fichier"}
                </span>
              </div>
              <input
                ref={pick}
                type="file"
                accept={DOC_ACCEPT}
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="doc-link">…ou un lien externe</Label>
              <Input
                id="doc-link"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                placeholder="https://…"
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => save.mutate()} loading={save.isPending} loadingText="Enregistrement…">
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Questions sur un document */}
      <Dialog open={askOpen} onOpenChange={setAskOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Interroger un document</DialogTitle>
            <DialogDescription>
              Choisissez un document déjà enregistré ou envoyez-en un nouveau, puis posez votre question.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="ask-doc">Document enregistré</Label>
              <select
                id="ask-doc"
                value={askDocId}
                onChange={(e) => {
                  setAskDocId(e.target.value);
                  setAskFile(null);
                }}
                className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
              >
                <option value="">— Aucun —</option>
                {list
                  .filter((d: any) => d.file_url && !/^https?:\/\//i.test(d.file_url))
                  .map((d: any) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label>…ou un nouveau fichier</Label>
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => askPick.current?.click()}>
                  <Upload className="mr-1.5 size-4" /> Choisir
                </Button>
                <span className="truncate text-sm text-muted-foreground">
                  {askFile ? askFile.name : "Aucun fichier"}
                </span>
              </div>
              <input
                ref={askPick}
                type="file"
                accept={DOC_ACCEPT}
                className="hidden"
                onChange={(e) => {
                  setAskFile(e.target.files?.[0] ?? null);
                  setAskDocId("");
                }}
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {DOC_QUESTION_SUGGESTIONS.map((s) => (
                <button key={s} type="button" className="agent-suggestion-chip" onClick={() => setQuestion(s)}>
                  {s}
                </button>
              ))}
            </div>
            <Textarea rows={3} value={question} onChange={(e) => setQuestion(e.target.value)} />

            {answer && (
              <div className="space-y-2">
                <div className="max-h-64 overflow-auto whitespace-pre-wrap rounded-xl bg-muted/60 p-3 text-sm leading-relaxed">
                  {answer}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={copyAnswer}>
                    <Copy className="mr-1.5 size-4" /> Copier la réponse
                  </Button>
                  <Button variant="outline" size="sm" onClick={mailAnswer}>
                    <Mail className="mr-1.5 size-4" /> Envoyer par email
                  </Button>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => ask.mutate()} loading={ask.isPending} loadingText="Analyse…">
              Analyser le document
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
