import React, { useEffect, useMemo, useRef, useState } from "react";
import { articles } from "../data/articles";
import { renderMarkdown, type RenderResult } from "../lib/markdown";
import Reveal from "./Reveal";
import { IconDoc, IconPipeline, IconPlay } from "./icons";

const SAMPLE = `# Draft entry

Write **Markdown** on the left — the pipeline re-renders on every keystroke.

## What the pipeline does

1. Lexes this text into a token stream
2. Assigns an \`id\` to every heading for the table of contents
3. Estimates reading time from words and code lines
4. Highlights code with Prism

> Everything on this site — including this sentence's container — is produced by the same six stages.

## Try a code fence

\`\`\`ts
export function greet(name: string): string {
  return "hello, " + name; // highlighted by prism-typescript
}
\`\`\`

## Or a table

| Stage | Budget |
| --- | --- |
| lex | 6.1 ms |
| render | 9.8 ms |
| highlight | 14.2 ms |

### Sub-headings work too

Depth-3 headings show indented in the table of contents. Delete this line and watch the stats bar update.
`;

export default function Playground() {
  const [text, setText] = useState(SAMPLE);
  const [source, setSource] = useState<string>("__sample");
  const [out, setOut] = useState<{ r: RenderResult; ms: number } | null>(null);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      const t0 = performance.now();
      const r = renderMarkdown(text);
      const ms = performance.now() - t0;
      setOut({ r, ms });
    }, 110);
    return () => window.clearTimeout(timer.current);
  }, [text]);

  const load = (key: string) => {
    setSource(key);
    if (key === "__sample") setText(SAMPLE);
    else {
      const a = articles.find((x) => x.slug === key);
      if (a) setText(a.markdown.trim() + "\n");
    }
  };

  const onPreviewClick = (e: React.MouseEvent) => {
    const btn = (e.target as HTMLElement).closest?.("[data-copy]") as HTMLButtonElement | null;
    if (!btn) return;
    const pre = btn.closest("figure")?.querySelector("pre");
    navigator.clipboard?.writeText(pre?.innerText ?? "").then(() => {
      const prev = btn.textContent;
      btn.classList.add("copied");
      btn.textContent = "copied ✓";
      setTimeout(() => {
        btn.classList.remove("copied");
        btn.textContent = prev;
      }, 1500);
    });
  };

  const stats = useMemo(
    () => [
      { k: "tokens", v: out ? String(out.r.tokens) : "—" },
      { k: "headings", v: out ? String(out.r.toc.length) : "—" },
      { k: "words", v: out ? out.r.words.toLocaleString("en-US") : "—" },
      { k: "read time", v: out ? `${out.r.readingTime} min` : "—" },
      { k: "code lines", v: out ? String(out.r.codeLines) : "—" },
      { k: "render", v: out ? `${out.ms.toFixed(1)} ms` : "—" },
    ],
    [out]
  );

  return (
    <section className="pt-[clamp(2rem,5vw,3.5rem)] pb-[clamp(3rem,6vw,5rem)]">
      <Reveal>
        <p className="font-mono text-[11px] tracking-[0.22em] uppercase text-accent-deep flex items-center gap-2.5">
          <span className="inline-block w-8 h-px bg-accent" />
          Pipeline playground
        </p>
        <div className="mt-4 flex flex-wrap items-end justify-between gap-5">
          <h1 className="font-display font-bold tracking-[-0.025em] leading-[1.02] text-[clamp(1.9rem,1.3rem+3vw,3.2rem)] max-w-[30ch]">
            Type Markdown.
            <br />
            <span className="font-body italic font-medium text-soft text-[0.9em]">
              Watch it compile.
            </span>
          </h1>
          <p className="max-w-[30rem] text-soft leading-relaxed text-[0.98rem]">
            This editor drives the exact pipeline that builds every entry in the library —
            same lexer, same Prism highlighter, same reading-time math. Load an entry to
            see its source, or write your own.
          </p>
        </div>
      </Reveal>

      {/* controls + stats */}
      <Reveal delay={90}>
        <div className="mt-7 flex flex-wrap items-center gap-3 border border-line rounded-xl bg-surface/80 px-4 py-3">
          <label className="inline-flex items-center gap-2 font-mono text-[11px] text-faint">
            <IconDoc size={14} className="text-accent-deep" />
            source
            <select
              value={source}
              onChange={(e) => load(e.target.value)}
              className="bg-raised border border-line rounded-md px-2 py-1.5 font-mono text-[11px] text-ink outline-none focus:border-accent cursor-pointer"
            >
              <option value="__sample">blank-sample.md</option>
              {articles.map((a) => (
                <option key={a.slug} value={a.slug}>
                  {a.slug}.md
                </option>
              ))}
            </select>
          </label>

          <span className="hidden sm:block w-px h-6 bg-line" />

          <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5">
            {stats.map((s, i) => (
              <span key={s.k} className="font-mono text-[11px] text-faint">
                {s.k}{" "}
                <strong
                  className={`tabular-nums font-semibold ${i === stats.length - 1 ? "text-accent-deep" : "text-ink/85"}`}
                >
                  {s.v}
                </strong>
              </span>
            ))}
          </div>
        </div>
      </Reveal>

      {/* editor + preview */}
      <Reveal delay={150}>
        <div className="mt-5 grid lg:grid-cols-2 gap-4 items-stretch">
          <div className="flex flex-col border border-line rounded-xl overflow-hidden bg-surface/80">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-line bg-raised/70">
              <span className="font-mono text-[11px] text-faint">
                <span className="text-warm">●</span> input · markdown
              </span>
              <span className="font-mono text-[10px] text-faint tabular-nums">
                {text.length.toLocaleString("en-US")} chars
              </span>
            </div>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              spellCheck={false}
              aria-label="Markdown source editor"
              className="flex-1 w-full min-h-[26rem] lg:min-h-[34rem] resize-y bg-transparent px-4 py-3.5 font-mono text-[12.5px] leading-[1.7] text-ink outline-none placeholder:text-faint"
            />
          </div>

          <div className="flex flex-col border border-line rounded-xl overflow-hidden bg-surface/80">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-line bg-raised/70">
              <span className="font-mono text-[11px] text-faint">
                <span className="text-accent">●</span> output · html
              </span>
              <span className="font-mono text-[10px] text-faint inline-flex items-center gap-1.5">
                <IconPipeline size={13} className="text-accent-deep" />
                lex → render → highlight
              </span>
            </div>
            <div
              className="flex-1 overflow-y-auto px-5 py-4 min-h-[26rem] lg:min-h-[34rem] max-h-[44rem]"
              onClick={onPreviewClick}
            >
              {out ? (
                <div className="prose-kb" dangerouslySetInnerHTML={{ __html: out.r.html }} />
              ) : (
                <p className="font-mono text-xs text-faint">compiling…</p>
              )}
            </div>
          </div>
        </div>
      </Reveal>

      <Reveal delay={200}>
        <p className="mt-5 font-mono text-[11px] text-faint flex flex-wrap items-center gap-x-2 gap-y-1">
          <IconPlay size={13} className="text-accent-deep" />
          renders are debounced at 110 ms · heading ids, ToC order and Prism grammar are the
          same ones the library entries ship with.
        </p>
      </Reveal>
    </section>
  );
}
