import React, { useMemo } from "react";
import { renderCached } from "../lib/markdown";
import Reveal from "./Reveal";
import TocRail, { useReadingProgress, useScrollSpy } from "./TocRail";
import { IconArrowRight } from "./icons";

const GUIDE_SLUG = "guide";

const GUIDE_MD = `
Everything in the codex follows one rule: **Markdown in, structured HTML out.** This guide covers the three ways content gets here — browsing, writing, and importing — and where your words actually live.

## The library

The front page is the compiled index. Every card shows the metadata the pipeline extracted from source: tags, date, reading time, and an entry number.

- Type in the search box — or press <kbd>/</kbd> from anywhere — to grep every entry's body, title, and tags.
- Click a tag chip to filter; click it again to release the filter.
- The newest entry always leads, full width. Your own entries sort in by date like any other.

## Writing an entry

Hit **+ new entry** in the header (or from the library). The composer is split in two:

| Side | Purpose |
| --- | --- |
| Left | Metadata fields + a Markdown editor with an insert toolbar (H2, bold, code, fences, tables) |
| Right | A **live preview** — the real pipeline recompiles on every keystroke and reports tokens, headings, read time, and render cost in milliseconds |

Rules the pipeline enforces:

1. A title is required — it becomes the file name, e.g. \`cache-invalidation-notes.md\`.
2. Slugs are generated and deduplicated automatically; you never type one.
3. Tags are lowercased, deduped, and capped at eight.
4. Empty tags default to \`#notes\` so the index stays connected.

Pressing **save** runs the same six-stage pipeline every built-in entry uses: frontmatter → lexer → renderer → Prism highlighter → ToC index → DOM. Your entry appears in the library immediately, with a **yours** mark.

## Importing .md files

Drag files onto the dropzone, or click it to browse. Two behaviors, on purpose:

- **One file** loads into the form so you can review and tweak before saving.
- **Several files** each become an entry directly — fastest for a batch of notes.

Files may carry a frontmatter block. Every field is optional and forgiving:

\`\`\`json title="notes-from-the-incident.md"
---
title: Cache invalidation, revisited
description: What the outage taught us about TTLs.
date: 2026-03-01
tags: caching, postmortem
author: you
role: Postmortems
accent: amber
---

## The incident

…body starts here…
\`\`\`

No frontmatter? No problem — the title is taken from the first \`# heading\` (and removed from the body), or from the file name as a last resort.

## Markdown we support

| Syntax | Result |
| --- | --- |
| \`## H2\` / \`### H3\` | Headings — indexed into the table of contents |
| \\\`inline code\\\` | Mono inline, accent tinted |
| \`\`\` fences with a language | Prism-highlighted block with a copy button |
| Fence info \`title="x.ts"\` | A filename label in the block's chrome |
| \`> quote\` | Pull-quote with an accent rule |
| \`| tables |\` | Bordered, striped tables |
| \`[links](https://…)\` | Underline-on-hover; external links open in a new tab |
| \`<kbd>/</kbd>\` | Keyboard-key styling, as used in this very guide |

One honest limitation: images render but are not styled or cached — this is a text-first knowledge base by design.

## Where your entries live

Your entries are stored in **this browser's localStorage** — no account, no server, nothing leaves the machine. That makes them:

- Instant to save and private by default.
- Bound to this browser profile. Clearing site data clears them.
- Easy to rescue: the **export backup** button in the composer downloads everything as JSON.

Built-in entries are part of the application itself and can't be deleted; yours can, with a two-click confirm (nothing is ever deleted on the first click).

## Shortcuts

- <kbd>/</kbd> — jump to the library search from anywhere
- <kbd>d</kbd> — toggle dark mode
- <kbd>#</kbd> — a heading anchor: scroll an entry's ToC into view
- click a ToC line — smooth-scroll to that heading

## The pipeline, in one paragraph

Source text is lexed into tokens once. The renderer walks the tokens to emit HTML — headings get stable IDs and hover anchors, code fences are handed to Prism with their language and filename metadata, external links are tagged for new tabs. The same token stream is folded into the table of contents, the word count, the code-line count, and the reading-time estimate, so every number on a page agrees with the page itself. The composer preview and this guide are rendered by the exact same code path.
`;

export default function Guide({ onOpen }: { onOpen: (slug: string) => void }) {
  const doc = useMemo(() => renderCached(GUIDE_SLUG, GUIDE_MD), []);
  const progress = useReadingProgress();
  const activeId = useScrollSpy(doc.toc.map((t) => t.id));

  const onContentClick = (e: React.MouseEvent) => {
    const btn = (e.target as HTMLElement).closest?.("[data-copy]") as HTMLButtonElement | null;
    if (!btn) return;
    const pre = btn.closest("figure")?.querySelector("pre");
    navigator.clipboard?.writeText(pre?.innerText ?? "").then(() => {
      const prev = btn.textContent;
      btn.textContent = "copied ✓";
      window.setTimeout(() => (btn.textContent = prev), 1600);
    });
  };

  return (
    <div className="pb-[clamp(3rem,6vw,5rem)]">
      <div className="progress-bar" style={{ transform: `scaleX(${progress})` }} />

      <header className="pt-[clamp(2rem,5vw,3.5rem)] max-w-[46rem]">
        <Reveal>
          <p className="font-mono text-[11px] tracking-[0.22em] uppercase text-accent-deep flex items-center gap-2.5">
            <span className="inline-block w-8 h-px bg-accent" />
            Documentation · entry 00
          </p>
          <h1 className="mt-4 font-display font-bold tracking-[-0.025em] leading-[1.02] text-[clamp(2rem,1.4rem+3vw,3.4rem)]">
            How to use the codex.
          </h1>
          <p className="mt-4 font-body italic text-[clamp(1.05rem,1rem+0.3vw,1.2rem)] leading-relaxed text-soft">
            Browse it, write into it, feed it Markdown files. This page is compiled by the
            same pipeline it describes — dogfooding, in production.
          </p>
        </Reveal>
      </header>

      <div className="mt-8 grid lg:grid-cols-[minmax(0,1fr)_15.5rem] gap-[clamp(1.5rem,3.5vw,3.5rem)] items-start">
        <div className="min-w-0 max-w-[46rem]">
          <Reveal>
            <div
              className="prose-kb"
              onClick={onContentClick}
              dangerouslySetInnerHTML={{ __html: doc.html }}
            />
          </Reveal>

          <Reveal className="mt-12">
            <div className="border border-line rounded-xl bg-surface/80 px-5 py-5 flex flex-wrap items-center gap-4">
              <div className="min-w-0 flex-1">
                <p className="font-display font-semibold">Enough theory.</p>
                <p className="font-mono text-[11px] text-faint mt-1">
                  The pipeline article shows the numbers behind this page.
                </p>
              </div>
              <button
                onClick={() => onOpen("markdown-to-dom-in-40ms")}
                className="btn-primary"
              >
                read the pipeline article <IconArrowRight size={14} />
              </button>
            </div>
          </Reveal>
        </div>

        <TocRail
          toc={doc.toc}
          activeId={activeId}
          progress={progress}
          meta={`${doc.tokens} tokens · ${doc.readingTime} min read`}
          title="Guide contents"
        />
      </div>
    </div>
  );
}
