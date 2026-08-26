/** Import de logo : JPEG, PNG ou PDF — 2 Mo max, redimensionné à 300 × 300 px max. */

export const LOGO_ACCEPT = ".png,.jpg,.jpeg,.pdf,image/png,image/jpeg,application/pdf";
export const LOGO_MAX_BYTES = 2 * 1024 * 1024;
export const LOGO_MAX_SIDE = 300;

const drawToDataUrl = (source: CanvasImageSource, w: number, h: number) => {
  const ratio = Math.min(LOGO_MAX_SIDE / w, LOGO_MAX_SIDE / h, 1);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(w * ratio));
  canvas.height = Math.max(1, Math.round(h * ratio));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Traitement de l'image impossible.");
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/png");
};

const fromImage = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      try {
        resolve(drawToDataUrl(img, img.naturalWidth, img.naturalHeight));
      } catch (e) {
        reject(e as Error);
      } finally {
        URL.revokeObjectURL(url);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Image illisible."));
    };
    img.src = url;
  });

const fromPdf = async (file: File) => {
  const pdfjs: any = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = (
    await import("pdfjs-dist/build/pdf.worker.min.mjs?url")
  ).default;
  const doc = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
  const page = await doc.getPage(1);
  const viewport = page.getViewport({ scale: 1 });
  const scale = Math.min(LOGO_MAX_SIDE / viewport.width, LOGO_MAX_SIDE / viewport.height, 4);
  const scaled = page.getViewport({ scale });
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(scaled.width);
  canvas.height = Math.round(scaled.height);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Traitement du PDF impossible.");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({ canvas, canvasContext: ctx, viewport: scaled }).promise;
  return canvas.toDataURL("image/png");
};

/** Valide et convertit le fichier en image PNG de 300 × 300 px maximum (data URL). */
export async function prepareLogo(file: File): Promise<string> {
  const isPdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name);
  const isImage = /^image\/(png|jpe?g)$/.test(file.type) || /\.(png|jpe?g)$/i.test(file.name);
  if (!isPdf && !isImage) throw new Error("Formats acceptés : JPEG, PNG ou PDF.");
  if (file.size > LOGO_MAX_BYTES) throw new Error("Fichier trop lourd : 2 Mo maximum.");
  return isPdf ? fromPdf(file) : fromImage(file);
}
