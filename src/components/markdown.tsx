import React from "react";

/** Rendu minimal et sûr d'un contenu Markdown d'article (titres, listes, tableaux, images, liens, gras). */

function inline(text: string, keyPrefix: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const re = /(\[([^\]]+)\]\(([^)\s]+)\))|(\*\*([^*]+)\*\*)|(`([^`]+)`)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    if (m[1]) {
      const href = m[3];
      nodes.push(
        <a
          key={`${keyPrefix}-${i}`}
          href={href}
          className="text-primary underline underline-offset-2"
          {...(href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}
        >
          {m[2]}
        </a>,
      );
    } else if (m[4]) {
      nodes.push(
        <strong key={`${keyPrefix}-${i}`} className="font-semibold text-foreground">
          {m[5]}
        </strong>,
      );
    } else {
      nodes.push(
        <code key={`${keyPrefix}-${i}`} className="rounded bg-muted px-1.5 py-0.5 text-[0.9em]">
          {m[7]}
        </code>,
      );
    }
    last = m.index + m[0].length;
    i++;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

const isTableRow = (l: string) => l.trim().startsWith("|") && l.includes("|", 1);
const cells = (l: string) =>
  l
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((c) => c.trim());

export function Markdown({ content }: { content: string }) {
  const lines = content.split("\n");
  const out: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const t = line.trim();

    if (!t) {
      i++;
      continue;
    }

    // Image seule
    const img = t.match(/^!\[([^\]]*)\]\(([^)\s]+)\)$/);
    if (img) {
      out.push(
        <figure key={i} className="my-10">
          <img src={img[2]} alt={img[1]} loading="lazy" className="w-full rounded-2xl border border-border" />
          {img[1] && <figcaption className="mt-2 text-center text-sm text-muted-foreground">{img[1]}</figcaption>}
        </figure>,
      );
      i++;
      continue;
    }

    // Titres
    const h = t.match(/^(#{2,4})\s+(.*)$/);
    if (h) {
      const level = h[1].length;
      const cls =
        level === 2
          ? "mt-12 text-2xl font-bold md:text-3xl"
          : level === 3
            ? "mt-8 text-xl font-semibold md:text-2xl"
            : "mt-6 text-lg font-semibold";
      out.push(
        React.createElement(`h${level}`, { key: i, className: cls }, inline(h[2], `h${i}`)),
      );
      i++;
      continue;
    }

    if (/^(---|\*\*\*)$/.test(t)) {
      out.push(<hr key={i} className="my-10 border-border" />);
      i++;
      continue;
    }

    if (t.startsWith("> ")) {
      const buf: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith("> ")) buf.push(lines[i].trim().slice(2)), i++;
      out.push(
        <blockquote key={i} className="my-6 border-l-4 border-primary pl-4 text-lg italic text-muted-foreground">
          {inline(buf.join(" "), `q${i}`)}
        </blockquote>,
      );
      continue;
    }

    // Tableau
    if (isTableRow(t) && i + 1 < lines.length && /^\|[\s:|-]+\|?$/.test(lines[i + 1].trim())) {
      const header = cells(t);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && isTableRow(lines[i])) rows.push(cells(lines[i])), i++;
      out.push(
        <div key={`t${i}`} className="my-8 overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr>
                {header.map((c, k) => (
                  <th key={k} className="border-b border-border pb-3 pr-4 font-semibold">
                    {inline(c, `th${k}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, ri) => (
                <tr key={ri} className="align-top">
                  {r.map((c, ci) => (
                    <td key={ci} className="border-b border-border py-3 pr-4 text-muted-foreground">
                      {inline(c, `td${ri}-${ci}`)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      continue;
    }

    // Listes
    const bullet = /^([*-]|\d+\.)\s+/;
    if (bullet.test(t)) {
      const ordered = /^\d+\./.test(t);
      const items: string[] = [];
      while (i < lines.length && bullet.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(bullet, ""));
        i++;
      }
      const cls = "my-5 space-y-2 pl-6 text-muted-foreground " + (ordered ? "list-decimal" : "list-disc");
      out.push(
        ordered ? (
          <ol key={`l${i}`} className={cls}>
            {items.map((it, k) => (
              <li key={k}>{inline(it, `li${k}`)}</li>
            ))}
          </ol>
        ) : (
          <ul key={`l${i}`} className={cls}>
            {items.map((it, k) => (
              <li key={k}>{inline(it, `li${k}`)}</li>
            ))}
          </ul>
        ),
      );
      continue;
    }

    // Paragraphe
    const buf: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^(#{2,4})\s/.test(lines[i].trim()) &&
      !bullet.test(lines[i].trim()) &&
      !isTableRow(lines[i]) &&
      !lines[i].trim().startsWith("![")
    ) {
      buf.push(lines[i].trim());
      i++;
    }
    out.push(
      <p key={`p${i}`} className="my-4 leading-relaxed text-muted-foreground">
        {inline(buf.join(" "), `p${i}`)}
      </p>,
    );
  }

  return <div className="text-base md:text-[1.0625rem]">{out}</div>;
}
