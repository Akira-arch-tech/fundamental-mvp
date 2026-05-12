/** 轻量 Markdown 子集渲染（政策正文：# / ## / ### / > / ---） */

import type { ReactNode } from "react";

function parseInline(text: string): ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold text-zinc-900">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
}

export function PoliciesMarkdown({ source }: { source: string }) {
  const blocks = source.split(/\n(?=^## )/m);
  const nodes: ReactNode[] = [];
  let key = 0;

  for (const block of blocks) {
    const lines = block.trimEnd().split("\n");
    const first = lines[0] ?? "";

    if (first.startsWith("# ") && !first.startsWith("##")) {
      nodes.push(
        <h1
          key={key++}
          className="mb-4 text-2xl font-bold tracking-tight text-zinc-900"
        >
          {parseInline(first.slice(2).trim())}
        </h1>,
      );
      let i = 1;
      while (i < lines.length && lines[i]!.startsWith(">")) {
        const q = lines[i]!.replace(/^>\s?/, "").trim();
        nodes.push(
          <blockquote
            key={key++}
            className="my-4 border-l-4 border-[#e85c22]/40 bg-orange-50/50 py-2 pl-4 pr-2 text-sm italic text-zinc-700"
          >
            {parseInline(q)}
          </blockquote>,
        );
        i++;
      }
      const body = lines.slice(i).join("\n").trim();
      if (body) {
        for (const para of body.split(/\n\n+/)) {
          if (para.trim() === "---") {
            nodes.push(<hr key={key++} className="my-8 border-zinc-200" />);
            continue;
          }
          if (para.startsWith("**") && para.includes("**", 2)) {
            nodes.push(
              <p key={key++} className="mb-2 text-xs text-zinc-500">
                {parseInline(para)}
              </p>,
            );
          } else {
            nodes.push(
              <p key={key++} className="mb-3 leading-relaxed text-zinc-700">
                {parseInline(para)}
              </p>,
            );
          }
        }
      }
      continue;
    }

    if (first.startsWith("## ")) {
      nodes.push(
        <h2 key={key++} className="mb-3 mt-10 text-lg font-semibold text-zinc-900">
          {parseInline(first.slice(3).trim())}
        </h2>,
      );
      const rest = lines.slice(1).join("\n").trim();
      if (!rest) continue;
      const chunks = rest.split(/\n\n+/);
      for (const chunk of chunks) {
        const t = chunk.trim();
        if (t === "---") {
          nodes.push(<hr key={key++} className="my-8 border-zinc-200" />);
          continue;
        }
        if (t.startsWith("### ")) {
          nodes.push(
            <h3 key={key++} className="mb-2 mt-6 text-base font-semibold text-zinc-800">
              {parseInline(t.slice(4).trim())}
            </h3>,
          );
          continue;
        }
        nodes.push(
          <p key={key++} className="mb-3 leading-relaxed text-zinc-700">
            {parseInline(t)}
          </p>,
        );
      }
    }
  }

  return <article className="max-w-none">{nodes}</article>;
}
