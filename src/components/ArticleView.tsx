import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  accentVars,
  formatDate,
  type Article,
} from "../data/articles";
import { highlightMarkdownSource, renderCached } from "../lib/markdown";
import Reveal from "./Reveal";
import TocRail, { useReadingProgress, useScrollSpy } from "./TocRail";
import {
  IconArrowRight,
  IconBack,
  IconClock,
  IconHash,
  IconTag,
  IconTrash,
  IconWords,
} from "./icons";

export default function ArticleView({
  article,
  entries,
  isCustom,
  onOpen,
  onBack,
  onEdit,
  onDelete,
}: {
  article: Article;
  entries: Article[];
  isCustom: boolean;
  onOpen: (slug: string) => void;
  onBack: () => void;
  onEdit: (slug: string) => void;
  onDelete: (slug: string) => void;
}) {
  const doc = useMemo(() => renderCached(article.slug, article.markdown), [article]);
  const av = accentVars[article.accent];

  const [mode, setMode] = useState<"read" | "source">("read");
  const [confirmDel, setConfirmDel] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const progress = useReadingProgress();
  const activeId = useScrollSpy(mode === "read" ? doc.toc.map((t) => t.id) : []);

  /* reset mode when switching articles */
  useEffect(() => {
    setMode("read");
    setConfirmDel(false);
  }, [article.slug]);

  /* copy-button delegation over the injected HTML */
  const onContentClick = useCallback((e: React.MouseEvent) => {
    const btn = (e.target as HTMLElement).closest?.("[data-copy]") as HTMLButtonElement | null;
    if (!btn) return;
    const pre = btn.closest("figure")?.querySelector("pre");
    const text = pre?.innerText ?? "";
    navigator.clipboard?.writeText(text).then(() => {
      const prev = btn.textContent;
      btn.classList.add("copied");
      btn.textContent = "copied ✓";
      window.setTimeout(() => {
        btn.classList.remove("copied");
        btn.textContent = prev;
      }, 1600);
    });
  }, []);

  const sourceHtml = useMemo(
    () => (mode === "source" ? highlightMarkdownSource(article.markdown) : ""),
    [mode, article]
  );

  const idx = entries.findIndex((a) => a.slug === article.slug);
  const newer = idx > 0 ? entries[idx - 1] : null;
  const older = idx < entries.length - 1 ? entries[idx + 1] : null;

  return (
    <div className="pb-[clamp(3rem,6vw,5rem)]">
      <div className="progress-bar" style={{ transform: `scaleX(${progress})` }} />

      {/* breadcrumb bar */}
      <div className="pt-6 flex flex-wrap items-center justify-between gap-3">
        <button
          onClick={onBack}
          className="group inline-flex items-center gap-2 font-mono text-xs text-faint hover:text-accent-deep transition-colors"
        >
          <IconBack size={15} className="transition-transform duration-300 group-hover:-translate-x-1" />
          ~/library
        </button>
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="font-mono text-xs text-faint truncate">
            <span className="text-faint/60">{isCustom ? "yours ·" : "entry"}</span>{" "}
            <span className="text-accent-deep">{article.slug}.md</span>
          </span>
          {isCustom && (
            <span className="flex items-center gap-1.5 shrink-0">
              <button className="tbtn" onClick={() => onEdit(article.slug)}>
                edit
              </button>
              <button
                className={`tbtn ${confirmDel ? "danger" : ""}`}
                onClick={() => {
                  if (confirmDel) onDelete(article.slug);
                  else {
                    setConfirmDel(true);
                    window.setTimeout(() => setConfirmDel(false), 2600);
                  }
                }}
              >
                {confirmDel ? "sure?" : <IconTrash size={13} />}
              </button>
            </span>
          )}
        </div>
      </div>

      {/* header */}
      <header className="mt-8 max-w-[46rem]">
        <Reveal>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="font-mono text-[10px] tracking-[0.18em] uppercase px-2 py-1 rounded"
              style={{ background: av.soft, color: av.c }}
            >
              {article.role}
            </span>
            <span className="flex items-center gap-1.5 font-mono text-[11px] text-faint">
              <IconTag size={12} />
              {article.tags.map((t) => `#${t}`).join("  ")}
            </span>
          </div>
          <h1 className="mt-4 font-display font-bold tracking-[-0.025em] leading-[1.04] text-[clamp(1.9rem,1.3rem+3vw,3.4rem)]">
            {article.title}
          </h1>
          <p className="mt-4 font-body italic text-[clamp(1.05rem,1rem+0.3vw,1.2rem)] leading-relaxed text-soft">
            {article.description}
          </p>
        </Reveal>

        <Reveal delay={90}>
          <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 font-mono text-xs text-faint border-y border-line py-3">
            <span className="text-ink/85 font-semibold">
              {article.author || "anonymous"}
              <span className="text-faint font-normal"> · {article.role}</span>
            </span>
            <time className="tabular-nums">{formatDate(article.date)}</time>
            <span className="inline-flex items-center gap-1.5">
              <IconClock size={13} /> {doc.readingTime} min read
            </span>
            <span className="inline-flex items-center gap-1.5">
              <IconWords size={13} /> {doc.words.toLocaleString("en-US")} words
            </span>
            <span className="inline-flex items-center gap-1.5">
              <IconHash size={13} /> {doc.codeLines} lines of code
            </span>
          </div>

          {/* rendered / source toggle */}
          <div className="mt-5 inline-flex border border-line rounded-lg p-1 bg-surface">
            {(["read", "source"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`px-3.5 py-1.5 rounded-md font-mono text-[11px] tracking-wide transition-all duration-200 ${
                  mode === m
                    ? "bg-ink text-paper dark:bg-accent dark:text-paper shadow-sm"
                    : "text-faint hover:text-ink"
                }`}
              >
                {m === "read" ? "rendered html" : "markdown source"}
              </button>
            ))}
          </div>
        </Reveal>
      </header>

      {/* body: content + toc */}
      <div className="mt-8 grid lg:grid-cols-[minmax(0,1fr)_15.5rem] gap-[clamp(1.5rem,3.5vw,3.5rem)] items-start">
        <div className="min-w-0 max-w-[46rem]">
          {mode === "read" ? (
            <div
              ref={contentRef}
              className="prose-kb"
              onClick={onContentClick}
              dangerouslySetInnerHTML={{ __html: doc.html }}
            />
          ) : (
            <figure className="codeblock my-0!" onClick={onContentClick}>
              <figcaption>
                <span className="dots"><i></i><i></i><i></i></span>
                <span className="file-label">{article.slug}.md — raw source, {article.markdown.length.toLocaleString("en-US")} chars</span>
                <button type="button" className="copy-btn" data-copy>copy</button>
              </figcaption>
              <pre>
                <code
                  className="language-markdown"
                  dangerouslySetInnerHTML={{ __html: sourceHtml }}
                />
              </pre>
            </figure>
          )}

          {/* filed under + pager */}
          {mode === "read" && (
            <Reveal className="mt-14">
              <div className="flex flex-wrap items-center gap-2 border-t border-line pt-6">
                <span className="font-mono text-[10px] tracking-[0.18em] uppercase text-faint mr-1">
                  filed under
                </span>
                {article.tags.map((t) => (
                  <span key={t} className="chip cursor-default">{t}</span>
                ))}
              </div>

              <nav className="mt-8 grid sm:grid-cols-2 gap-3">
                {newer ? (
                  <PagerCard label="newer entry" a={newer} align="left" onOpen={onOpen} />
                ) : (
                  <span />
                )}
                {older && <PagerCard label="older entry" a={older} align="right" onOpen={onOpen} />}
              </nav>
            </Reveal>
          )}
        </div>

        {mode === "read" && (
          <TocRail
            toc={doc.toc}
            activeId={activeId}
            progress={progress}
            meta={`${doc.tokens} tokens · ${doc.codeLines} loc`}
          />
        )}
      </div>
    </div>
  );
}

function PagerCard({
  label,
  a,
  align,
  onOpen,
}: {
  label: string;
  a: { slug: string; title: string; date: string };
  align: "left" | "right";
  onOpen: (slug: string) => void;
}) {
  return (
    <button
      onClick={() => onOpen(a.slug)}
      className={`group border border-line rounded-xl bg-surface/70 px-5 py-4 text-left transition-all duration-300 hover:border-accent/60 hover:-translate-y-0.5 ${
        align === "right" ? "sm:text-right sm:justify-self-end sm:w-full" : ""
      }`}
    >
      <span className={`font-mono text-[10px] tracking-[0.18em] uppercase text-faint flex items-center gap-1.5 ${align === "right" ? "sm:justify-end" : ""}`}>
        {align === "left" && <IconBack size={12} className="transition-transform duration-300 group-hover:-translate-x-1" />}
        {label}
        {align === "right" && <IconArrowRight size={12} className="transition-transform duration-300 group-hover:translate-x-1" />}
      </span>
      <span className="mt-1.5 block font-display font-semibold leading-snug text-[0.98rem]">
        {a.title}
      </span>
      <span className="mt-1 block font-mono text-[10px] text-faint tabular-nums">
        {formatDate(a.date)}
      </span>
    </button>
  );
}
