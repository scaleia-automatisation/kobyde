import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Inbox, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
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
import { Badge } from "@/components/ui/badge";
import { EmptyState, LoadingState } from "@/components/ui/states";
import { useCreateRow, useDeleteRow, useRows, euros } from "@/lib/db";

export type FieldDef = {
  name: string;
  label: string;
  type?: "text" | "number" | "email" | "date" | "textarea" | "money" | "select";
  required?: boolean;
  placeholder?: string;
  defaultValue?: string;
  inList?: boolean;
  /** Choix proposés pour un champ « select » (une option « personnalisé » est ajoutée). */
  options?: string[];
};

export type ModuleConfig = {
  table: string;
  title: string;
  subtitle: string;
  emptyText: string;
  addLabel: string;
  fields: FieldDef[];
  badgeField?: string;
  /** Route de la fiche détaillée, ex. "/clients/$id". */
  detailTo?: string;
  detailLabel?: string;
};

/* eslint-disable @typescript-eslint/no-explicit-any */
export function ModulePage({ config }: { config: ModuleConfig }) {
  const { data: rows, isLoading } = useRows(config.table);
  const create = useCreateRow(config.table);
  const remove = useDeleteRow(config.table);
  const [open, setOpen] = useState(false);
  const listFields = config.fields.filter((f) => f.inList !== false).slice(0, 4);

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const values: Record<string, unknown> = {};
    for (const f of config.fields) {
      const raw = String(fd.get(f.name) ?? "").trim();
      if (raw === "") continue;
      values[f.name] = f.type === "number" || f.type === "money" ? Number(raw) : raw;
    }
    create.mutate(values, {
      onSuccess: () => {
        toast.success("Ajouté avec succès");
        setOpen(false);
      },
      onError: (err: any) => toast.error(err.message ?? "Une erreur est survenue"),
    });
  };

  const format = (f: FieldDef, value: any) => {
    if (value === null || value === undefined || value === "") return "—";
    if (f.type === "money") return euros(value);
    return String(value);
  };

  return (
    <AppShell
      title={config.title}
      subtitle={config.subtitle}
      action={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="size-4" />
              <span className="hidden sm:inline">{config.addLabel}</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{config.addLabel}</DialogTitle>
              <DialogDescription>
                Remplissez seulement ce que vous savez. Le reste peut attendre.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={submit} className="space-y-4">
              {config.fields.map((f) => (
                <div key={f.name} className="space-y-1.5">
                  <Label htmlFor={f.name}>{f.label}</Label>
                  {f.type === "textarea" ? (
                    <Textarea id={f.name} name={f.name} placeholder={f.placeholder} rows={3} />
                  ) : (
                    <Input
                      id={f.name}
                      name={f.name}
                      required={f.required}
                      defaultValue={f.defaultValue}
                      placeholder={f.placeholder}
                      type={f.type === "money" ? "number" : (f.type ?? "text")}
                      step={f.type === "money" ? "0.01" : undefined}
                    />
                  )}
                </div>
              ))}
              <DialogFooter>
                <Button type="submit" loading={create.isPending} loadingText="Enregistrement…">
                  Enregistrer
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      }
    >
      {isLoading ? (
        <LoadingState rows={4} />
      ) : (rows ?? []).length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="Rien ici pour l'instant"
          description={config.emptyText}
          action={
            <Button className="gap-2" onClick={() => setOpen(true)}>
              <Plus className="size-4" /> {config.addLabel}
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
                {listFields.map((f, i) => (
                  <div key={f.name} className="min-w-0">
                    <p className="text-label">{f.label}</p>
                    <p
                      className={
                        i === 0 ? "truncate font-medium" : "truncate text-sm text-muted-foreground"
                      }
                    >
                      {format(f, row[f.name])}
                    </p>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2">
                {config.badgeField && row[config.badgeField] && (
                  <Badge variant="secondary">{String(row[config.badgeField])}</Badge>
                )}
                {config.detailTo && (
                  <Button variant="outline" size="sm" asChild>
                    <Link to={config.detailTo} params={{ id: row.id }}>
                      {config.detailLabel ?? "Ouvrir"}
                    </Link>
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Supprimer"
                  onClick={() =>
                    remove.mutate(row.id, { onSuccess: () => toast.success("Supprimé") })
                  }
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
