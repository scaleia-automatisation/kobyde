import { useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { FileSpreadsheet, Image as ImageIcon, Loader2, Mail, Upload } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useOrgId } from "@/lib/db";
import { parseProspectImport } from "@/lib/prospect-import.functions";
import { extractEmails, hasIdentifier, type ImportedProspect } from "@/lib/prospect-import";

const FIELDS = [
  "full_name",
  "company_name",
  "email",
  "phone",
  "city",
  "website",
  "facebook",
  "instagram",
  "tiktok",
  "youtube",
  "linkedin",
  "notes",
] as const;

function clean(p: ImportedProspect) {
  const row: Record<string, string> = {};
  for (const f of FIELDS) {
    const v = String((p as Record<string, unknown>)[f] ?? "").trim();
    if (v && v.toLowerCase() !== "non trouvé") row[f] = v;
  }
  return row;
}

export function ProspectImportDialog() {
  const orgId = useOrgId();
  const qc = useQueryClient();
  const parse = useServerFn(parseProspectImport);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [emailList, setEmailList] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLInputElement>(null);

  const insert = async (rows: Record<string, string>[], channel: string) => {
    const valid = rows.filter((r) => hasIdentifier(r));
    const skipped = rows.length - valid.length;
    if (valid.length === 0) {
      toast.error("Aucun prospect avec un email, un téléphone ou un identifiant de profil.");
      return;
    }
    const payload = valid.map((r) => ({
      ...r,
      full_name: r.full_name || r.company_name || r.email || r.phone || "Sans nom",
      acquisition_channel: r.acquisition_channel || channel,
      source: "Import",
      org_id: orgId,
    }));
    const { error } = await (supabase.from("prospects") as any).insert(payload);
    if (error) throw new Error(error.message);
    qc.invalidateQueries({ queryKey: ["rows", "prospects", orgId] });
    toast.success(
      `${valid.length} prospect(s) importé(s)${skipped ? ` · ${skipped} ignoré(s) sans moyen de contact` : ""}.`,
    );
    setOpen(false);
  };

  const run = async (label: string, fn: () => Promise<void>) => {
    setBusy(label);
    try {
      await fn();
    } catch (e) {
      toast.error((e as Error).message || "Import impossible.");
    } finally {
      setBusy(null);
    }
  };

  const onFile = (file: File) =>
    run("file", async () => {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const sheet = wb.Sheets[wb.SheetNames[0]!]!;
      const csv = XLSX.utils.sheet_to_csv(sheet).slice(0, 40000);
      if (csv.trim().length < 5) throw new Error("Le fichier semble vide.");
      const { prospects } = await parse({ data: { orgId: orgId!, text: csv } });
      await insert(prospects.map(clean), "Import fichier");
    });

  const onImage = (file: File) =>
    run("image", async () => {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error("Lecture du fichier impossible."));
        reader.readAsDataURL(file);
      });
      const { prospects } = await parse({ data: { orgId: orgId!, imageDataUrl: dataUrl } });
      await insert(prospects.map(clean), "Import capture");
    });

  const onEmails = () =>
    run("emails", async () => {
      const emails = extractEmails(emailList);
      if (emails.length === 0) throw new Error("Aucune adresse email détectée.");
      await insert(
        emails.map((email) => ({ email, full_name: email.split("@")[0]! })),
        "Liste d'emails",
      );
      setEmailList("");
    });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Upload className="size-4" />
          <span className="hidden sm:inline">Importer une liste</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importer des prospects</DialogTitle>
          <DialogDescription>
            Fichier Excel/CSV, capture d'écran ou simple liste d'emails. Seuls les prospects avec un
            email, un téléphone ou un identifiant de profil sont enregistrés.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <FileSpreadsheet className="size-4" /> Fichier Excel ou CSV
            </Label>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.xlsx,.xls,text/csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (f) void onFile(f);
              }}
            />
            <Button
              variant="secondary"
              className="w-full gap-2"
              disabled={!!busy || !orgId}
              onClick={() => fileRef.current?.click()}
            >
              {busy === "file" ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
              Choisir un fichier
            </Button>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <ImageIcon className="size-4" /> Capture d'écran
            </Label>
            <input
              ref={imageRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (f) void onImage(f);
              }}
            />
            <Button
              variant="secondary"
              className="w-full gap-2"
              disabled={!!busy || !orgId}
              onClick={() => imageRef.current?.click()}
            >
              {busy === "image" ? <Loader2 className="size-4 animate-spin" /> : <ImageIcon className="size-4" />}
              Analyser une capture
            </Button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email-list" className="flex items-center gap-2">
              <Mail className="size-4" /> Liste d'emails
            </Label>
            <Textarea
              id="email-list"
              rows={4}
              value={emailList}
              onChange={(e) => setEmailList(e.target.value)}
              placeholder="marie@exemple.fr, paul@exemple.fr…"
            />
            <Button
              className="w-full gap-2"
              disabled={!!busy || !orgId || emailList.trim() === ""}
              onClick={() => void onEmails()}
            >
              {busy === "emails" ? <Loader2 className="size-4 animate-spin" /> : <Mail className="size-4" />}
              Importer les emails
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
