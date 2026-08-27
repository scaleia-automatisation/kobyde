import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Mail, MessageCircle, Phone, Plus, Send, Trash2, UserRound } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { useCreateRow, useDeleteRow, useRows, useUpdateRow } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/equipe-physique")({
  head: () => ({
    meta: [
      { title: "Mon équipe physique — Kobyde" },
      {
        name: "description",
        content:
          "Gérez vos employés : fiche complète, missions, poste et contact direct par email, SMS, téléphone ou WhatsApp.",
      },
      { property: "og:title", content: "Mon équipe physique — Kobyde" },
      {
        property: "og:description",
        content: "Vos employés réels, leurs missions et tous leurs canaux de contact au même endroit.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PhysicalTeamPage,
});

type Employee = {
  id: string;
  first_name: string;
  last_name: string;
  photo_url: string | null;
  role_title: string | null;
  missions: string | null;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  address: string | null;
  notes: string | null;
  status: string;
  notify_email: boolean;
  notify_sms: boolean;
  notify_whatsapp: boolean;
};

const EMPTY = {
  first_name: "",
  last_name: "",
  photo_url: "",
  role_title: "",
  missions: "",
  email: "",
  phone: "",
  whatsapp: "",
  address: "",
  notes: "",
  status: "actif",
  notify_email: true,
  notify_sms: false,
  notify_whatsapp: false,
};

const digits = (v: string) => v.replace(/[^\d+]/g, "");

/** Sépare un numéro stocké en indicatif + reste du numéro. */
const splitPhone = (value: string): { code: string; rest: string } => {
  const v = (value ?? "").trim();
  const match = [...DIAL_CODES]
    .map((c) => c.value)
    .sort((a, b) => b.length - a.length)
    .find((c) => v.startsWith(c));
  if (!match) return { code: "+33", rest: v };
  return { code: match, rest: v.slice(match.length).trim() };
};

function PhoneField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const { code, rest } = splitPhone(value);
  return (
    <div>
      <Label>{label}</Label>
      <div className="flex gap-2">
        <Select value={code} onValueChange={(c) => onChange(rest ? `${c} ${rest}` : c)}>
          <SelectTrigger className="w-[120px] shrink-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="max-h-64">
            {DIAL_CODES.map((c) => (
              <SelectItem key={c.value} value={c.value}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          inputMode="tel"
          placeholder="6 12 34 56 78"
          value={rest}
          onChange={(ev) => {
            const r = ev.target.value;
            onChange(r.trim() ? `${code} ${r}` : "");
          }}
        />
      </div>
    </div>
  );
}

function PhysicalTeamPage() {
  const { data: employees, isLoading } = useRows<Employee>("employees");
  const create = useCreateRow("employees");
  const update = useUpdateRow("employees");
  const remove = useDeleteRow("employees");

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [form, setForm] = useState({ ...EMPTY });
  const [notifying, setNotifying] = useState<Employee | null>(null);
  const [message, setMessage] = useState("");

  const set = (k: keyof typeof EMPTY, v: string | boolean) =>
    setForm((f) => ({ ...f, [k]: v }));

  const openNew = () => {
    setEditing(null);
    setForm({ ...EMPTY });
    setOpen(true);
  };

  const openEdit = (e: Employee) => {
    setEditing(e);
    setForm({
      first_name: e.first_name ?? "",
      last_name: e.last_name ?? "",
      photo_url: e.photo_url ?? "",
      role_title: e.role_title ?? "",
      missions: e.missions ?? "",
      email: e.email ?? "",
      phone: e.phone ?? "",
      whatsapp: e.whatsapp ?? "",
      address: e.address ?? "",
      notes: e.notes ?? "",
      status: e.status ?? "actif",
      notify_email: e.notify_email,
      notify_sms: e.notify_sms,
      notify_whatsapp: e.notify_whatsapp,
    });
    setOpen(true);
  };

  const onPhoto = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Photo trop lourde (max 2 Mo)");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => set("photo_url", String(reader.result));
    reader.readAsDataURL(file);
  };

  const save = async () => {
    if (!form.first_name.trim() && !form.last_name.trim()) {
      toast.error("Renseignez au moins un nom");
      return;
    }
    const values = { ...form, photo_url: form.photo_url || null };
    try {
      if (editing) await update.mutateAsync({ id: editing.id, values });
      else await create.mutateAsync(values);
      toast.success(editing ? "Employé mis à jour" : "Employé ajouté");
      setOpen(false);
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const sendNotification = (channel: "email" | "sms" | "whatsapp"): void => {
    const e = notifying;
    if (!e) return;
    const text = message.trim() || "Bonjour, message de l'équipe.";
    if (channel === "email") {
      if (!e.email) {
        toast.error("Aucun email renseigné");
        return;
      }
      window.open(
        `mailto:${e.email}?subject=${encodeURIComponent("Message de votre équipe")}&body=${encodeURIComponent(text)}`,
      );
    } else if (channel === "sms") {
      if (!e.phone) {
        toast.error("Aucun téléphone renseigné");
        return;
      }
      window.open(`sms:${digits(e.phone)}?&body=${encodeURIComponent(text)}`);
    } else {
      const num = digits(e.whatsapp || e.phone || "").replace(/\D/g, "");
      if (!num) {
        toast.error("Aucun numéro WhatsApp renseigné");
        return;
      }
      window.open(`https://wa.me/${num}?text=${encodeURIComponent(text)}`, "_blank");
    }
  };

  const list = employees ?? [];

  return (
    <AppShell
      title="Mon équipe physique"
      subtitle="Vos employés réels : fiches, missions et contact direct"
      action={
        <Button onClick={openNew} className="gap-2">
          <Plus className="size-4" /> Ajouter un employé
        </Button>
      }
    >
      {isLoading ? (
        <p className="text-caption">Chargement…</p>
      ) : list.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center">
          <UserRound className="mx-auto mb-3 size-8 text-muted-foreground" />
          <p className="font-medium">Aucun employé pour l'instant</p>
          <p className="mt-1 text-caption">
            Ajoutez vos collaborateurs pour les contacter et les notifier en un clic.
          </p>
          <Button onClick={openNew} className="mt-4 gap-2">
            <Plus className="size-4" /> Ajouter un employé
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((e) => (
            <article key={e.id} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
              <div className="flex items-start gap-3">
                {e.photo_url ? (
                  <img
                    src={e.photo_url}
                    alt={`${e.first_name} ${e.last_name}`}
                    className="size-14 shrink-0 rounded-full object-cover"
                  />
                ) : (
                  <span className="grid size-14 shrink-0 place-items-center rounded-full bg-muted text-lg font-semibold">
                    {(e.first_name?.[0] ?? "") + (e.last_name?.[0] ?? "")}
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">
                    {e.first_name} {e.last_name}
                  </p>
                  <p className="truncate text-caption">{e.role_title || "Poste non renseigné"}</p>
                  <Badge variant="secondary" className="mt-1">
                    {e.status}
                  </Badge>
                </div>
                <button
                  aria-label="Supprimer"
                  onClick={() => {
                    if (confirm("Supprimer cet employé ?")) remove.mutate(e.id);
                  }}
                  className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>

              {e.missions && (
                <p className="mt-3 line-clamp-3 text-sm text-muted-foreground">{e.missions}</p>
              )}

              <dl className="mt-3 space-y-1 text-[13px] text-muted-foreground">
                {e.email && <dd className="truncate">✉️ {e.email}</dd>}
                {e.phone && <dd className="truncate">📞 {e.phone}</dd>}
                {e.whatsapp && <dd className="truncate">💬 {e.whatsapp}</dd>}
                {e.address && <dd className="truncate">📍 {e.address}</dd>}
              </dl>

              <div className="mt-3 flex flex-wrap gap-1.5">
                {e.email && (
                  <Button asChild size="sm" variant="outline" className="gap-1.5">
                    <a href={`mailto:${e.email}`}>
                      <Mail className="size-3.5" /> Email
                    </a>
                  </Button>
                )}
                {e.phone && (
                  <Button asChild size="sm" variant="outline" className="gap-1.5">
                    <a href={`tel:${digits(e.phone)}`}>
                      <Phone className="size-3.5" /> Appeler
                    </a>
                  </Button>
                )}
                {(e.whatsapp || e.phone) && (
                  <Button asChild size="sm" variant="outline" className="gap-1.5">
                    <a
                      href={`https://wa.me/${digits(e.whatsapp || e.phone || "").replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <MessageCircle className="size-3.5" /> WhatsApp
                    </a>
                  </Button>
                )}
              </div>

              <div className="mt-3 flex gap-1.5">
                <Button
                  size="sm"
                  className="flex-1 gap-1.5"
                  onClick={() => {
                    setNotifying(e);
                    setMessage("");
                  }}
                >
                  <Send className="size-3.5" /> Notifier
                </Button>
                <Button size="sm" variant="outline" onClick={() => openEdit(e)}>
                  Modifier
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Modifier l'employé" : "Ajouter un employé"}</DialogTitle>
            <DialogDescription>
              Fiche complète : identité, poste, missions et canaux de contact.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Prénom</Label>
                <Input
                  value={form.first_name}
                  onChange={(ev) => set("first_name", ev.target.value)}
                />
              </div>
              <div>
                <Label>Nom</Label>
                <Input value={form.last_name} onChange={(ev) => set("last_name", ev.target.value)} />
              </div>
            </div>

            <div>
              <Label>Photo</Label>
              <p className="mb-1 text-caption">JPEG ou PNG, 2 Mo maximum.</p>
              <div className="flex items-center gap-3">
                {form.photo_url && (
                  <img src={form.photo_url} alt="" className="size-12 rounded-full object-cover" />
                )}
                <Input
                  type="file"
                  accept="image/png,image/jpeg"
                  onChange={(ev) => onPhoto(ev.target.files?.[0])}
                />
                {form.photo_url && (
                  <Button variant="ghost" size="sm" onClick={() => set("photo_url", "")}>
                    Retirer
                  </Button>
                )}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Poste</Label>
                <Input
                  value={form.role_title}
                  onChange={(ev) => set("role_title", ev.target.value)}
                />
              </div>
              <div>
                <Label>Statut</Label>
                <Input value={form.status} onChange={(ev) => set("status", ev.target.value)} />
              </div>
            </div>

            <div>
              <Label>Missions</Label>
              <Textarea
                rows={3}
                value={form.missions}
                onChange={(ev) => set("missions", ev.target.value)}
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(ev) => set("email", ev.target.value)}
                />
              </div>
              <div>
                <Label>Téléphone</Label>
                <Input value={form.phone} onChange={(ev) => set("phone", ev.target.value)} />
              </div>
              <div>
                <Label>WhatsApp</Label>
                <Input value={form.whatsapp} onChange={(ev) => set("whatsapp", ev.target.value)} />
              </div>
              <div>
                <Label>Adresse</Label>
                <Input value={form.address} onChange={(ev) => set("address", ev.target.value)} />
              </div>
            </div>

            <div>
              <Label>Notes</Label>
              <Textarea
                rows={2}
                value={form.notes}
                onChange={(ev) => set("notes", ev.target.value)}
              />
            </div>

            <div>
              <Label>Canaux de notification</Label>
              <div className="mt-2 flex flex-wrap gap-4 text-sm">
                {(
                  [
                    ["notify_email", "Email"],
                    ["notify_sms", "SMS"],
                    ["notify_whatsapp", "WhatsApp"],
                  ] as const
                ).map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2">
                    <Checkbox
                      checked={form[key]}
                      onCheckedChange={(v) => set(key, Boolean(v))}
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button onClick={save} disabled={create.isPending || update.isPending}>
              {editing ? "Enregistrer" : "Ajouter"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!notifying} onOpenChange={(v) => !v && setNotifying(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              Notifier {notifying?.first_name} {notifying?.last_name}
            </DialogTitle>
            <DialogDescription>Choisissez le canal d'envoi de votre message.</DialogDescription>
          </DialogHeader>
          <Textarea
            rows={4}
            placeholder="Votre message…"
            value={message}
            onChange={(ev) => setMessage(ev.target.value)}
          />
          <DialogFooter className="flex-wrap gap-2 sm:justify-start">
            <Button
              variant="outline"
              className="gap-1.5"
              disabled={!notifying?.email}
              onClick={() => sendNotification("email")}
            >
              <Mail className="size-4" /> Email
            </Button>
            <Button
              variant="outline"
              className="gap-1.5"
              disabled={!notifying?.phone}
              onClick={() => sendNotification("sms")}
            >
              <Phone className="size-4" /> SMS
            </Button>
            <Button
              variant="outline"
              className="gap-1.5"
              disabled={!notifying?.whatsapp && !notifying?.phone}
              onClick={() => sendNotification("whatsapp")}
            >
              <MessageCircle className="size-4" /> WhatsApp
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
