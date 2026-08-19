/* eslint-disable @typescript-eslint/no-explicit-any */

/** Transforme n'importe quel résultat d'agent (texte, liste, objet) en texte lisible et exportable. */
export function toReadableText(value: any, depth = 0): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);

  const pad = "  ".repeat(depth);

  if (Array.isArray(value)) {
    return value
      .map((item) => {
        const t = toReadableText(item, depth + 1).trim();
        return t.includes("\n") ? `${pad}-\n${t}` : `${pad}- ${t}`;
      })
      .filter(Boolean)
      .join("\n");
  }

  return Object.entries(value)
    .filter(([, v]) => v !== null && v !== undefined && v !== "" && !(Array.isArray(v) && v.length === 0))
    .map(([k, v]) => {
      const label = k.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());
      const t = toReadableText(v, depth + 1).trim();
      return t.includes("\n") ? `${pad}${label} :\n${t}` : `${pad}${label} : ${t}`;
    })
    .join("\n\n");
}
