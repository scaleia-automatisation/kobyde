import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Inbox, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState, LoadingState } from "@/components/ui/states";
import { ProspectImportDialog } from "@/components/prospect-import-dialog";
import { useCreateRow, useDeleteRow, useRows } from "@/lib/db";
import { ACQUISITION_CHANNELS, hasIdentifier } from "@/lib/prospect-import";

export const Route = createFileRoute("/_authenticated/prospects")({
  head: () => ({
    meta: [
      { title: "Prospects — Kobyde" },
      { name: "description", content: "Suivez les personnes et entreprises qui pourraient devenir vos clients." },
      { property: "og:title", content: "Prospects — Kobyde" },
      { property: "og:description", content: "Vos futurs clients, au même endroit." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ProspectsPage,
});

const TEXT_FIELDS = [
  { name: "full_name", label: "Nom de la personne", placeholder: "Marie Dupont" },
  { name: "company_name", label: "Entreprise", placeholder: "Dupont & Fils" },
  { name: "email", label: "Email", type: "email", placeholder: "marie@exemple.fr" },
  { name: "phone", label: "Téléphone", placeholder: "06 12 34 56 78" },
  { name: "city", label: "Ville", placeholder: "Paris" },
  { name: "facebook", label: "Profil Facebook", placeholder: "@page ou URL" },
  { name: "instagram", label: "Profil Instagram", placeholder: "@compte" },
  { name: "tiktok", label: "Profil TikTok", placeholder: "@compte" },
  { name: "youtube", label: "Chaîne YouTube", placeholder: "@chaine ou URL" },
  { name: "linkedin", label: "Profil LinkedIn", placeholder: "URL du profil" },
] as const;

/* eslint-disable @typescript-eslint/no-explicit-any */
function ProspectsPage() {
  const { data: rows, isLoading } = useRows("prospects");
  const create = useCreateRow("prospects");
  const remove = useDeleteRow("prospects");
  const [open, setOpen] = useState(false);
  const [channel, setChannel] = useState<string>("Formulaire");

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const values: Record<string, unknown> = { acquisition_channel: channel };
    for (const f of TEXT_FIELDS) {
      const raw = String(fd.get(f.name) ?? "").trim();
      if (raw) values[f.name] = raw;
    }
    const notes = String(fd.get("notes") ?? "").trim();
    if (notes) values["notes"] = notes;

    if (!hasIdentifier(values)) {
      toast.error(
        "Indiquez au moins un moyen de contact : téléphone, email ou identifiant Facebook, Instagram, TikTok, YouTube ou LinkedIn.",
      );
      return;
    }
    if (!values["full_name"]) values["full_name"] = values["company_name"] ?? values["email"] ?? values["phone"];

    create.mutate(values, {
      onSuccess: () => {
        toast.success("Prospect ajouté");
        setOpen(false);
      },
      onError: (err: any) => toast.error(err.message ?? "Une erreur est survenue"),
    });
  };

  return (
    <AppShell
      title="Prospects"
      subtitle="Les personnes qui pourraient devenir vos clients."
      action={
        <div className="flex items-center gap-2">
          <ProspectImportDialog />
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="size-4" />
                <span className="hidden sm:inline">Ajouter un prospect</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Ajouter un prospect</DialogTitle>
                <DialogDescription>
                  Au moins un moyen de contact est requis : téléphone, email ou identifiant de profil
                  Facebook, Instagram, TikTok, YouTube ou LinkedIn.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={submit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Canal d'acquisition</Label>
                  <Select value={channel} onValueChange={setChannel}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent className="max-h-72">
                      {ACQUISITION_CHANNELS.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {TEXT_FIELDS.map((f) => (
                  <div key={f.name} className="space-y-1.5">
                    <Label htmlFor={f.name}>{f.label}</Label>
                    <Input
                      id={f.name}
                      name={f.name}
                      type={"type" in f ? f.type : "text"}
                      placeholder={f.placeholder}
                    />
                  </div>
                ))}
                <div className="space-y-1.5">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea id="notes" name="notes" rows={3} />
                </div>
                <DialogFooter>
                  <Button type="submit" loading={create.isPending} loadingText="Enregistrement…">
                    Enregistrer
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      }
    >
      {isLoading ? (
        <LoadingState rows={4} />
      ) : (rows ?? []).length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="Rien ici pour l'instant"
          description="Ajoutez votre premier prospect ou importez une liste depuis un fichier, une capture d'écran ou une liste d'emails."
          action={
            <Button className="gap-2" onClick={() => setOpen(true)}>
              <Plus className="size-4" /> Ajouter un prospect
            </Button>
          }
        />
      ) : (
        <div className="grid gap-3 stagger-children">
          {(rows ?? []).map((row: any) => (
            <article
              key={row.id}
              className="surface interactive flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="grid flex-1 gap-x-8 gap-y-2 sm:grid-cols-4">
                <div className="min-w-0">
                  <p className="text-label">Nom</p>
                  <p className="truncate font-medium">{row.full_name || "—"}</p>
                </div>
                <div className="min-w-0">
                  <p className="text-label">Entreprise</p>
                  <p className="truncate text-sm text-muted-foreground">{row.company_name || "—"}</p>
                </div>
                <div className="min-w-0">
                  <p className="text-label">Contact</p>
                  <p className="truncate text-sm text-muted-foreground">
                    {row.email || row.phone || row.linkedin || row.instagram || row.facebook ||
                      row.tiktok || row.youtube || "—"}
                  </p>
                </div>
                <div className="min-w-0">
                  <p className="text-label">Canal</p>
                  <p className="truncate text-sm text-muted-foreground">
                    {row.acquisition_channel || row.source || "—"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {row.status && <Badge variant="secondary">{String(row.status)}</Badge>}
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Supprimer"
                  onClick={() => remove.mutate(row.id, { onSuccess: () => toast.success("Supprimé") })}
                >
                  <Trash2 className="size-4 text-muted-foreground" />
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}
    </AppShell>
  );
}
