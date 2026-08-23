import { useState } from "react";
import { Check, Copy, Download, FileImage, FileText, Loader2, Mail, Paperclip } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  copyInvoiceAsAttachment,
  invoiceDocxBlob,
  invoiceImageBlob,
  invoicePdfBlob,
  saveBlob,
  slugName,
} from "@/lib/invoices";

/** Barre d'actions d'une facture : télécharger (PDF, Word, JPEG), envoyer, copier en pièce jointe. */
export function InvoiceActions({
  title,
  text,
  defaultEmail,
  className,
}: {
  title: string;
  text: string;
  defaultEmail?: string;
  className?: string;
}) {
  const [busy, setBusy] = useState<null | "pdf" | "docx" | "jpeg" | "copy">(null);
  const [copied, setCopied] = useState(false);
  const [email, setEmail] = useState(defaultEmail ?? "");

  const run = async (kind: "pdf" | "docx" | "jpeg", fn: () => Promise<Blob>, ext: string) => {
    setBusy(kind);
    try {
      saveBlob(await fn(), `${slugName(title)}.${ext}`);
      toast.success(`Facture téléchargée (${ext.toUpperCase()}).`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Téléchargement impossible.");
    }
    setBusy(null);
  };

  const copyAttachment = async () => {
    setBusy("copy");
    try {
      const mode = await copyInvoiceAsAttachment(title, text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
      toast.success(
        mode === "image"
          ? "Facture copiée en pièce jointe : collez-la dans un email ou une conversation."
          : "Presse-papiers image indisponible : le texte de la facture a été copié.",
      );
    } catch {
      toast.error("Copie impossible.");
    }
    setBusy(null);
  };

  const sendEmail = () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Entrez une adresse email valide.");
      return;
    }
    const body =
      text.length > 1800
        ? `${text.slice(0, 1800)}\n\n[…] Facture complète en pièce jointe.`
        : text;
    window.location.href = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`;
    toast.success(`Email préparé pour ${email}. Ajoutez la facture téléchargée en pièce jointe.`);
  };

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className ?? ""}`}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1.5" disabled={busy !== null}>
            {busy && busy !== "copy" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Download className="size-4" />
            )}{" "}
            Télécharger
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem
            className="gap-2"
            onSelect={() => void run("pdf", () => invoicePdfBlob(title, text), "pdf")}
          >
            <FileText className="size-4" /> PDF (.pdf)
          </DropdownMenuItem>
          <DropdownMenuItem
            className="gap-2"
            onSelect={() => void run("docx", () => invoiceDocxBlob(title, text), "docx")}
          >
            <FileText className="size-4" /> Word (.docx)
          </DropdownMenuItem>
          <DropdownMenuItem
            className="gap-2"
            onSelect={() =>
              void run("jpeg", () => invoiceImageBlob(title, text, "image/jpeg"), "jpg")
            }
          >
            <FileImage className="size-4" /> Image (.jpg)
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1.5">
            <Mail className="size-4" /> Envoyer par email
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-80 space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="inv-email" className="text-xs text-muted-foreground">
              Adresse du destinataire
            </Label>
            <Input
              id="inv-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="client@exemple.fr"
            />
          </div>
          <Button size="sm" className="w-full gap-1.5" onClick={sendEmail}>
            <Mail className="size-4" /> Préparer l'email
          </Button>
        </PopoverContent>
      </Popover>

      <Button
        variant="outline"
        size="sm"
        className="gap-1.5"
        onClick={() => void copyAttachment()}
        disabled={busy !== null}
      >
        {busy === "copy" ? (
          <Loader2 className="size-4 animate-spin" />
        ) : copied ? (
          <Check className="size-4" />
        ) : (
          <Paperclip className="size-4" />
        )}{" "}
        Copier en pièce jointe
      </Button>

      <Button
        variant="ghost"
        size="sm"
        className="gap-1.5"
        onClick={() => {
          navigator.clipboard
            .writeText(text)
            .then(() => toast.success("Texte de la facture copié."))
            .catch(() => toast.error("Copie impossible."));
        }}
      >
        <Copy className="size-4" /> Copier le texte
      </Button>
    </div>
  );
}
