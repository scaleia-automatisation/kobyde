/** Factures — modèle, calculs et rendu du document (Audrey, agent Gestion). */

/* eslint-disable @typescript-eslint/no-explicit-any */

export type InvoiceItem = {
  description: string;
  quantity: number;
  unit_price: number;
};

export type InvoiceDraft = {
  number: string;
  label: string;
  client_id: string | null;
  due_date: string | null;
  vat_rate: number;
  items: InvoiceItem[];
  notes: string;
};

export const emptyItem = (): InvoiceItem => ({ description: "", quantity: 1, unit_price: 0 });

export function totals(items: InvoiceItem[], vatRate: number) {
  const ht = items.reduce(
    (s, i) => s + (Number(i.quantity) || 0) * (Number(i.unit_price) || 0),
    0,
  );
  const tva = (ht * (Number(vatRate) || 0)) / 100;
  return { ht, tva, ttc: ht + tva };
}

export function nextInvoiceNumber(existing: { number?: string | null }[]) {
  const year = new Date().getFullYear();
  const n =
    existing.filter((i) => (i.number ?? "").includes(String(year))).length + 1;
  return `FAC-${year}-${String(n).padStart(4, "0")}`;
}

const money = (n: number, currency = "EUR") =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency }).format(Number(n) || 0);

const frDay = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString("fr-FR") : "—";

/** Construit le texte complet de la facture à partir des données réelles de l'entreprise. */
export function buildInvoiceText(opts: {
  draft: InvoiceDraft;
  org: any;
  client: any | null;
  issuedAt?: string;
}) {
  const { draft, org, client } = opts;
  const currency = org?.currency || "EUR";
  const t = totals(draft.items, draft.vat_rate);
  const lines: string[] = [];

  lines.push(`FACTURE ${draft.number}`);
  lines.push("");
  lines.push("ÉMETTEUR");
  if (org?.name) lines.push(org.name);
  if (org?.company_type) lines.push(org.company_type);
  if (org?.address) lines.push([org.address, org.city, org.country].filter(Boolean).join(", "));
  if (org?.siret) lines.push(`SIRET : ${org.siret}`);
  if (org?.email) lines.push(`Email : ${org.email}`);
  if (org?.phone) lines.push(`Téléphone : ${org.phone}`);
  if (org?.website) lines.push(`Site : ${org.website}`);
  lines.push("");
  lines.push("CLIENT");
  if (client) {
    lines.push(client.company_name || client.full_name || "—");
    if (client.company_name && client.full_name) lines.push(`À l'attention de ${client.full_name}`);
    if (client.address || client.city)
      lines.push([client.address, client.city, client.country].filter(Boolean).join(", "));
    if (client.email) lines.push(client.email);
    if (client.phone) lines.push(client.phone);
  } else {
    lines.push("—");
  }
  lines.push("");
  lines.push(`Objet : ${draft.label || "Prestation"}`);
  lines.push(`Date d'émission : ${frDay(opts.issuedAt ?? new Date().toISOString())}`);
  lines.push(`Échéance : ${frDay(draft.due_date)}`);
  lines.push("");
  lines.push("DÉTAIL");
  draft.items.forEach((i, idx) => {
    const total = (Number(i.quantity) || 0) * (Number(i.unit_price) || 0);
    lines.push(
      `${idx + 1}. ${i.description || "Prestation"} — ${i.quantity} × ${money(i.unit_price, currency)} = ${money(total, currency)}`,
    );
  });
  lines.push("");
  lines.push(`Total HT : ${money(t.ht, currency)}`);
  lines.push(`TVA (${draft.vat_rate} %) : ${money(t.tva, currency)}`);
  lines.push(`TOTAL TTC : ${money(t.ttc, currency)}`);
  lines.push("");
  if (draft.notes.trim()) {
    lines.push("CONDITIONS");
    draft.notes
      .split("\n")
      .filter((l) => l.trim())
      .forEach((l) => lines.push(l.trim()));
    lines.push("");
  }
  if (org?.terms_text) {
    lines.push(String(org.terms_text));
    lines.push("");
  }
  lines.push("Merci de votre confiance.");
  return lines.join("\n");
}

export function slugName(s: string) {
  return (
    s
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .toLowerCase()
      .slice(0, 60) || "facture"
  );
}

export function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/* ---------- Rendus ---------- */

export async function invoicePdfBlob(title: string, text: string): Promise<Blob> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const margin = 48;
  const width = doc.internal.pageSize.getWidth() - margin * 2;
  const height = doc.internal.pageSize.getHeight();
  let y = margin;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(title, margin, y);
  y += 26;

  doc.setFontSize(11);
  for (const raw of text.split("\n").slice(1)) {
    const heading = /^[A-ZÉÈÀÇ' ]{3,}$/.test(raw.trim()) || /^TOTAL TTC/.test(raw.trim());
    doc.setFont("helvetica", heading ? "bold" : "normal");
    const chunks = raw.trim() ? doc.splitTextToSize(raw, width) : [""];
    for (const line of chunks) {
      if (y > height - margin) {
        doc.addPage();
        y = margin;
      }
      doc.text(line, margin, y);
      y += 16;
    }
  }
  return doc.output("blob") as Blob;
}

export async function invoiceDocxBlob(title: string, text: string): Promise<Blob> {
  const { Document, Packer, Paragraph, TextRun, HeadingLevel } = await import("docx");
  const paragraphs = [
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      children: [new TextRun({ text: title, bold: true })],
    }),
    ...text
      .split("\n")
      .slice(1)
      .map((line) => {
        const heading = /^[A-ZÉÈÀÇ' ]{3,}$/.test(line.trim()) || /^TOTAL TTC/.test(line.trim());
        return new Paragraph({
          spacing: { after: 100 },
          children: [new TextRun({ text: line, font: "Arial", size: 22, bold: heading })],
        });
      }),
  ];
  const doc = new Document({
    styles: { default: { document: { run: { font: "Arial", size: 22 } } } },
    sections: [
      {
        properties: {
          page: {
            size: { width: 12240, height: 15840 },
            margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
          },
        },
        children: paragraphs,
      },
    ],
  });
  return await Packer.toBlob(doc);
}

/** Rendu image (canvas) : utilisé pour le JPEG et la copie en pièce jointe. */
export async function invoiceImageBlob(
  title: string,
  text: string,
  type: "image/jpeg" | "image/png" = "image/jpeg",
): Promise<Blob> {
  const scale = 2;
  const W = 794;
  const margin = 56;
  const lineH = 22;
  const body = text.split("\n").slice(1);
  const H = Math.max(1123, margin * 2 + 60 + body.length * lineH);

  const canvas = document.createElement("canvas");
  canvas.width = W * scale;
  canvas.height = H * scale;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Rendu image indisponible.");
  ctx.scale(scale, scale);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#0b1220";

  let y = margin;
  ctx.font = "bold 24px Helvetica, Arial, sans-serif";
  ctx.fillText(title, margin, y);
  y += 20;
  ctx.strokeStyle = "#e2e8f0";
  ctx.beginPath();
  ctx.moveTo(margin, y);
  ctx.lineTo(W - margin, y);
  ctx.stroke();
  y += 28;

  for (const raw of body) {
    const heading = /^[A-ZÉÈÀÇ' ]{3,}$/.test(raw.trim()) || /^TOTAL TTC/.test(raw.trim());
    ctx.font = `${heading ? "bold " : ""}14px Helvetica, Arial, sans-serif`;
    ctx.fillStyle = heading ? "#0b1220" : "#243044";
    ctx.fillText(raw, margin, y);
    y += lineH;
  }

  return await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Rendu image impossible."))),
      type,
      0.94,
    ),
  );
}

/** Copie la facture dans le presse-papiers sous forme de pièce jointe (image) collable partout. */
export async function copyInvoiceAsAttachment(title: string, text: string) {
  const png = await invoiceImageBlob(title, text, "image/png");
  const anyWindow = window as any;
  if (typeof anyWindow.ClipboardItem === "function" && navigator.clipboard?.write) {
    await navigator.clipboard.write([new anyWindow.ClipboardItem({ "image/png": png })]);
    return "image" as const;
  }
  await navigator.clipboard.writeText(text);
  return "texte" as const;
}
