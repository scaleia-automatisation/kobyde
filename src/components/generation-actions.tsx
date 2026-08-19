import { useEffect, useState } from "react";
import { Check, Copy, Download, FileText, Loader2, Mail, Pencil, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

/** Nom de fichier propre à partir d'un titre libre. */
function slug(s: string) {
  return (
    s
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .toLowerCase()
      .slice(0, 60) || "document"
  );
}

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export type GenerationActionsProps = {
  /** Titre du livrable (utilisé pour le fichier, le PDF et l'objet de l'email). */
  title: string;
  /** Contenu texte complet du livrable. */
  text: string;
  /** Appelé quand l'utilisateur enregistre une modification manuelle. */
  onEdit?: (text: string) => void;
  /** Relance la génération (même action, même coût en crédits). */
  onRegenerate?: () => void;
  regenerating?: boolean;
  /** Bouton « Régénérer » personnalisé (ex. CreditActionButton) rendu à la place du bouton par défaut. */
  regenerateSlot?: React.ReactNode;
  className?: string;
};

/** Barre d'actions commune à toutes les générations : copier, modifier, régénérer, télécharger, envoyer par email. */
export function GenerationActions({
  title,
  text,
  onEdit,
  onRegenerate,
  regenerating,
  regenerateSlot,
  className,
}: GenerationActionsProps) {

  const [draft, setDraft] = useState(text);
  const [editOpen, setEditOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState<null | "docx" | "pdf">(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => setDraft(text), [text]);

  const copy = () => {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
        toast.success("Contenu copié.");
      })
      .catch(() => toast.error("Copie impossible."));
  };

  const downloadDocx = async () => {
    setBusy("docx");
    try {
      const { Document, Packer, Paragraph, TextRun, HeadingLevel } = await import("docx");
      const paragraphs = [
        new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: title, bold: true })] }),
        ...text.split("\n").map(
          (line) =>
            new Paragraph({
              spacing: { after: 120 },
              children: [new TextRun({ text: line, font: "Arial", size: 22 })],
            }),
        ),
      ];
      const doc = new Document({
        styles: { default: { document: { run: { font: "Arial", size: 22 } } } },
        sections: [
          {
            properties: {
              page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } },
            },
            children: paragraphs,
          },
        ],
      });
      saveBlob(await Packer.toBlob(doc), `${slug(title)}.docx`);
      toast.success("Document Word téléchargé.");
    } catch {
      toast.error("Téléchargement Word impossible.");
    } finally {
      setBusy(null);
    }
  };

  const downloadPdf = async () => {
    setBusy("pdf");
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({ unit: "pt", format: "a4" });
      const margin = 48;
      const width = doc.internal.pageSize.getWidth() - margin * 2;
      const height = doc.internal.pageSize.getHeight();
      let y = margin;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      for (const line of doc.splitTextToSize(title, width)) {
        doc.text(line, margin, y);
        y += 22;
      }
      y += 8;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      for (const raw of text.split("\n")) {
        const lines = raw.trim() ? doc.splitTextToSize(raw, width) : [""];
        for (const line of lines) {
          if (y > height - margin) {
            doc.addPage();
            y = margin;
          }
          doc.text(line, margin, y);
          y += 16;
        }
      }
      saveBlob(doc.output("blob"), `${slug(title)}.pdf`);
      toast.success("PDF téléchargé.");
    } catch {
      toast.error("Téléchargement PDF impossible.");
    } finally {
      setBusy(null);
    }
  };

  const sendEmail = () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Entrez une adresse email valide.");
      return;
    }
    const body = text.length > 1800 ? `${text.slice(0, 1800)}\n\n[…] Contenu complet en pièce jointe à ajouter.` : text;
    window.location.href = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`;
    toast.success(`Email préparé pour ${email}.`);
  };

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className ?? ""}`}>
      <Button variant="outline" size="sm" className="gap-1.5" onClick={copy}>
        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} Copier
      </Button>

      {onEdit && (
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setEditOpen(true)}>
          <Pencil className="h-4 w-4" /> Modifier
        </Button>
      )}

      {onRegenerate && (
        <Button variant="outline" size="sm" className="gap-1.5" onClick={onRegenerate} disabled={regenerating}>
          {regenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Régénérer
        </Button>
      )}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1.5" disabled={busy !== null}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Télécharger
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => void downloadDocx()} className="gap-2">
            <FileText className="h-4 w-4" /> Word (.docx)
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => void downloadPdf()} className="gap-2">
            <FileText className="h-4 w-4" /> PDF (.pdf)
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1.5">
            <Mail className="h-4 w-4" /> Envoyer par email
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-80 space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="gen-email" className="text-xs text-muted-foreground">
              Adresse du destinataire
            </Label>
            <Input
              id="gen-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="destinataire@exemple.fr"
            />
          </div>
          <Button size="sm" className="w-full gap-1.5" onClick={sendEmail}>
            <Mail className="h-4 w-4" /> Envoyer
          </Button>
        </PopoverContent>
      </Popover>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Modifier « {title} »</DialogTitle>
          </DialogHeader>
          <Textarea rows={18} value={draft} onChange={(e) => setDraft(e.target.value)} className="font-mono text-xs" />
          <DialogFooter>
            <Button variant="ghost" onClick={() => { setDraft(text); setEditOpen(false); }}>
              Annuler
            </Button>
            <Button
              onClick={() => {
                onEdit?.(draft);
                setEditOpen(false);
                toast.success("Modifications enregistrées.");
              }}
            >
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
