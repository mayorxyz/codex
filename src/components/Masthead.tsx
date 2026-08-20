import { useEffect, useRef, useState } from "react";
import { articles, allTags, sortedArticles } from "../data/articles";
import { renderCached } from "../lib/markdown";

/* ---------------- typed terminal ---------------- */

const SCRIPT = [
  { cmd: "codex search --tag streams", out: "1 entry · 7 min read · Priya Raman" },
  { cmd: "codex open backpressure-streams.md", out: "41 tokens → HTML in 0.9 ms · ToC: 5 headings" },
  { cmd: "codex build --all", out: "5 sources · 5 unchanged → cache hits · 38 µs" },
  { cmd: "codex toc --depth 3", out: "21 headings indexed · scrollspy armed" },
];

function Terminal() {
  const [line, setLine] = useState(0);
  const [chars, setChars] = useState(0);
  const [phase, setPhase] = useState<"typing" | "output" | "wait">("typing");
  const timer = useRef<number | undefined>(undefined);

  const current = SCRIPT[line % SCRIPT.length];

  useEffect(() => {
    if (phase === "typing") {
      if (chars < current.cmd.length) {
        timer.current = window.setTimeout(
          () => setChars((c) => c + 1),
          26 + Math.random() * 46
        );
      } else {
        timer.current = window.setTimeout(() => setPhase("output"), 420);
      }
    } else if (phase === "output") {
      timer.current = window.setTimeout(() => setPhase("wait"), 1600);
    } else {
      timer.current = window.setTimeout(() => {
        setLine((l) => l + 1);
        setChars(0);
        setPhase("typing");
      }, 700);
    }
    return () => window.clearTimeout(timer.current);
  }, [phase, chars, current]);

  return (
    <div className="rounded-xl border border-code-line bg-code shadow-[0_24px_60px_-24px_rgba(4,12,8,0.6)] overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-code-line bg-code-2">
        <span className="flex gap-1.5">
          <i className="w-2.5 h-2.5 rounded-full bg-[#e5674f]" />
          <i className="w-2.5 h-2.5 rounded-full bg-[#e0a63f]" />
          <i className="w-2.5 h-2.5 rounded-full bg-[#4fc08a]" />
        </span>
        <span className="ml-2 font-mono text-[11px] text-code-faint tracking-wide">
          codex — zsh · 80×24
        </span>
      </div>
      <div className="px-4 py-4 font-mono text-[13px] leading-relaxed text-code-ink min-h-[7.5rem]">
        <div className="flex gap-2.5 items-baseline">
          <span className="text-accent select-none">❯</span>
          <span className="whitespace-pre-wrap break-all">
            {current.cmd.slice(0, chars)}
            {phase === "typing" && <span className="caret" />}
          </span>
        </div>
        {phase !== "typing" && (
          <div className="mt-1.5 pl-[1.35rem] text-code-faint animate-[fadein_0.3s_ease]">
            {current.out}
          </div>
        )}
        <div className="mt-3 flex gap-2.5 items-baseline opacity-70">
          <span className="text-accent select-none">❯</span>
          {phase === "wait" && <span className="caret" />}
        </div>
      </div>
    </div>
  );
}

/* ---------------- pipeline ticker ---------------- */

const STAGES = [
  ".md source",
  "frontmatter",
  "marked lexer",
  "token stream",
  "prism highlight",
  "semantic HTML",
  "ToC + scrollspy",
  "edge cache",
  "DOM",
];

function Ticker() {
  const row = (key: string) => (
    <div key={key} className="flex items-center shrink-0">
      {STAGES.map((s, i) => (
        <span key={s + i} className="flex items-center">
          <span className="font-mono text-[11px] tracking-[0.14em] uppercase text-faint px-5 py-2.5 whitespace-nowrap">
            {s}
          </span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M4 12h15M13.5 6l6 6-6 6" />
          </svg>
        </span>
      ))}
    </div>
  );
  return (
    <div className="ticker border-y border-line bg-surface/70">
      <div className="ticker-track">
        {row("a")}
        {row("b")}
      </div>
    </div>
  );
}

/* ---------------- masthead ---------------- */

export default function Masthead() {
  const stats = useRef<{ words: number; minutes: number } | null>(null);
  if (!stats.current) {
    let words = 0;
    let minutes = 0;
    for (const a of articles) {
      const r = renderCached(a.slug, a.markdown);
      words += r.words;
      minutes += r.readingTime;
    }
    stats.current = { words, minutes };
  }

  const newest = sortedArticles[0].date;
  const tagCount = allTags().length;

  return (
    <section className="pt-[clamp(2.2rem,6vw,4.5rem)] pb-[clamp(2rem,5vw,3.5rem)]">
      <div className="grid lg:grid-cols-[1.15fr_0.85fr] gap-[clamp(1.5rem,4vw,3.5rem)] items-center">
        <div>
          <p className="font-mono text-[11px] sm:text-xs tracking-[0.22em] uppercase text-accent-deep flex items-center gap-2.5">
            <span className="inline-block w-8 h-px bg-accent" />
            Engineering knowledge base · vol. 02
          </p>
          <h1 className="mt-5 font-display font-bold tracking-[-0.03em] leading-[0.98] text-[clamp(2.6rem,6.5vw,5.2rem)]">
            Field notes,
            <br />
            <span className="font-body italic font-medium text-[0.92em] text-soft">
              compiled
            </span>{" "}
            <span className="relative inline-block">
              from source.
              <svg
                className="absolute -bottom-[0.12em] left-0 w-full"
                height="10"
                viewBox="0 0 300 10"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                <path
                  d="M2 7.5 C 60 2.5, 150 2.5, 298 6.5"
                  fill="none"
                  stroke="var(--accent)"
                  strokeWidth="3"
                  strokeLinecap="round"
                  opacity="0.7"
                />
              </svg>
            </span>
          </h1>
          <p className="mt-6 max-w-[34rem] text-[clamp(1rem,0.95rem+0.3vw,1.15rem)] leading-relaxed text-soft">
            Every article on this site is a plain{" "}
            <code className="font-mono text-[0.85em] text-accent-deep">.md</code> file that
            travels a six-stage pipeline — lexed, highlighted, indexed — before it reaches
            you. Nothing here is a database row.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-x-4 gap-y-2 font-mono text-xs text-faint">
            <span className="text-ink/80">$ codex --status</span>
            <span className="inline-flex items-center gap-1.5">
              <i className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
              pipeline healthy
            </span>
            <span>last build {formatShort(newest)}</span>
          </div>
        </div>

        <div className="lg:justify-self-end w-full max-w-[32rem]">
          <Terminal />
        </div>
      </div>

      {/* stats strip */}
      <dl className="mt-[clamp(2.2rem,5vw,3.6rem)] grid grid-cols-2 md:grid-cols-4 border border-line rounded-xl bg-surface/80 overflow-hidden">
        {[
          { label: "entries", value: String(articles.length).padStart(2, "0") },
          { label: "tags indexed", value: String(tagCount).padStart(2, "0") },
          { label: "words in corpus", value: stats.current.words.toLocaleString("en-US") },
          { label: "min of reading", value: `~${stats.current.minutes}` },
        ].map((s, i) => (
          <div
            key={s.label}
            className={`px-5 py-4 ${i > 0 ? "border-l border-line" : ""} ${i >= 2 ? "border-t md:border-t-0 border-line" : ""} ${i === 2 ? "border-l-0 md:border-l" : ""}`}
          >
            <dt className="font-mono text-[10px] tracking-[0.18em] uppercase text-faint">
              {s.label}
            </dt>
            <dd className="mt-1 font-display font-semibold text-[clamp(1.5rem,1.2rem+1.2vw,2.1rem)] leading-none tabular-nums">
              {s.value}
            </dd>
          </div>
        ))}
      </dl>

      <div className="mt-[clamp(2rem,5vw,3.2rem)] -mx-[clamp(1.1rem,4.5vw,3.25rem)]">
        <Ticker />
      </div>
    </section>
  );
}

function formatShort(iso: string): string {
  return new Date(iso + "T12:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}
