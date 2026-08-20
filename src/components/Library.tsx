import { useMemo, useState } from "react";
import {
  accentVars,
  allTags,
  articles,
  formatDate,
  sortedArticles,
} from "../data/articles";
import { plainSearchText, renderCached } from "../lib/markdown";
import Masthead from "./Masthead";
import Reveal from "./Reveal";
import {
  IconArrowRight,
  IconClock,
  IconDoc,
  IconSearch,
  IconTag,
  IconWords,
  IconX,
} from "./icons";

export default function Library({ onOpen }: { onOpen: (slug: string) => void }) {
  const [query, setQuery] = useState("");
  const [tag, setTag] = useState<string | null>(null);

  const tags = useMemo(() => allTags(), []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sortedArticles.filter((a) => {
      if (tag && !a.tags.includes(tag)) return false;
      if (!q) return true;
      const hay = `${a.title} ${a.description} ${a.tags.join(" ")} ${a.author} ${plainSearchText(a.markdown)}`;
      return hay.includes(q);
    });
  }, [query, tag]);

  const filtering = query.trim() !== "" || tag !== null;
  const lead = !filtering ? filtered[0] : null;
  const rest = lead ? filtered.slice(1) : filtered;

  return (
    <>
      <Masthead />

      {/* ------- the index ------- */}
      <section className="pb-[clamp(3rem,7vw,5.5rem)]">
        <Reveal className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="font-display font-bold tracking-[-0.02em] text-[clamp(1.6rem,1.2rem+1.6vw,2.4rem)]">
              The index
            </h2>
            <p className="mt-1 font-mono text-xs text-faint">
              <span className="text-accent-deep tabular-nums">
                {String(filtered.length).padStart(2, "0")}
              </span>{" "}
              / {String(articles.length).padStart(2, "0")} entries · sorted by recency
            </p>
          </div>

          {/* search */}
          <div className="relative w-full sm:w-[22rem]">
            <IconSearch size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-faint pointer-events-none" />
            <input
              id="kb-search"
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="grep the corpus…"
              autoComplete="off"
              className="w-full h-11 pl-10 pr-16 rounded-lg border border-line bg-raised font-mono text-sm text-ink placeholder:text-faint/70 outline-none transition-all duration-200 focus:border-accent focus:ring-2 focus:ring-accent-soft hover:border-faint/60"
            />
            {query ? (
              <button
                onClick={() => setQuery("")}
                aria-label="Clear search"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-faint hover:text-ink transition-colors"
              >
                <IconX size={15} />
              </button>
            ) : (
              <span className="kbd absolute right-3 top-1/2 -translate-y-1/2">/</span>
            )}
          </div>
        </Reveal>

        {/* tag rail */}
        <Reveal delay={70} className="mt-5 flex flex-wrap items-center gap-2">
          <IconTag size={14} className="text-faint" />
          <button
            onClick={() => setTag(null)}
            className={`chip ${tag === null ? "chip-on" : ""}`}
          >
            all
          </button>
          {tags.map((t) => (
            <button
              key={t.tag}
              onClick={() => setTag(tag === t.tag ? null : t.tag)}
              className={`chip ${tag === t.tag ? "chip-on" : ""}`}
            >
              {t.tag}
              <span className="opacity-55 tabular-nums ml-1">{t.count}</span>
            </button>
          ))}
        </Reveal>

        {/* lead entry */}
        {lead && (
          <Reveal delay={100} className="mt-8">
            <LeadCard slug={lead.slug} onOpen={onOpen} />
          </Reveal>
        )}

        {/* grid */}
        {rest.length > 0 ? (
          <div className="mt-6 grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(min(100%,20.5rem),1fr))]">
            {rest.map((a, i) => (
              <Reveal key={a.slug} delay={(i % 3) * 80}>
                <EntryCard slug={a.slug} onOpen={onOpen} index={i + (lead ? 2 : 1)} />
              </Reveal>
            ))}
          </div>
        ) : (
          !lead && (
            <div className="mt-10 border border-dashed border-line rounded-xl px-6 py-14 text-center">
              <p className="font-mono text-sm text-faint">
                $ codex search "{query || tag}" → <span className="text-warm">0 results</span>
              </p>
              <button
                onClick={() => {
                  setQuery("");
                  setTag(null);
                }}
                className="mt-4 font-mono text-xs text-accent-deep underline underline-offset-4 hover:text-accent transition-colors"
              >
                reset filters
              </button>
            </div>
          )
        )}
      </section>
    </>
  );
}

/* ------------------------------------------------------------------ */

function useEntry(slug: string) {
  const article = articles.find((a) => a.slug === slug)!;
  const doc = useMemo(() => renderCached(article.slug, article.markdown), [article]);
  return { article, doc };
}

function Meta({ slug, className = "" }: { slug: string; className?: string }) {
  const { article, doc } = useEntry(slug);
  return (
    <span className={`inline-flex items-center gap-3 font-mono text-[11px] text-faint ${className}`}>
      <time className="tabular-nums">{formatDate(article.date)}</time>
      <span className="inline-flex items-center gap-1">
        <IconClock size={12} /> {doc.readingTime} min
      </span>
      <span className="inline-flex items-center gap-1">
        <IconWords size={12} /> {doc.words.toLocaleString("en-US")}
      </span>
    </span>
  );
}

function TagRow({ tags, active }: { tags: string[]; active?: boolean }) {
  return (
    <span className="flex flex-wrap gap-1.5">
      {tags.map((t) => (
        <span
          key={t}
          className={`font-mono text-[10px] tracking-wide px-2 py-0.5 rounded-md border transition-colors ${
            active
              ? "border-accent/40 bg-accent-soft text-accent-deep"
              : "border-line text-faint"
          }`}
        >
          #{t}
        </span>
      ))}
    </span>
  );
}

function LeadCard({ slug, onOpen }: { slug: string; onOpen: (s: string) => void }) {
  const { article, doc } = useEntry(slug);
  const av = accentVars[article.accent];
  return (
    <article
      onClick={() => onOpen(slug)}
      onKeyDown={(e) => e.key === "Enter" && onOpen(slug)}
      tabIndex={0}
      className="group cursor-pointer grid md:grid-cols-[1.45fr_1fr] border border-line rounded-xl bg-surface/80 overflow-hidden transition-all duration-300 hover:border-accent/60 hover:shadow-[0_22px_50px_-28px_rgba(6,40,28,0.5)] hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-accent"
    >
      <div className="p-[clamp(1.2rem,3vw,2rem)] border-b md:border-b-0 md:border-r border-line">
        <div className="flex items-center gap-3 font-mono text-[10px] tracking-[0.2em] uppercase">
          <span className="px-2 py-0.5 rounded" style={{ background: av.soft, color: av.c }}>
            latest entry
          </span>
          <span className="text-faint">{article.role}</span>
        </div>
        <h3 className="mt-4 font-display font-bold tracking-[-0.02em] leading-[1.06] text-[clamp(1.5rem,1.15rem+1.6vw,2.35rem)]">
          <span className="link-underline">{article.title}</span>
        </h3>
        <p className="mt-3 text-soft leading-relaxed max-w-[46ch]">{article.description}</p>
        <div className="mt-5 flex items-center justify-between gap-4">
          <Meta slug={slug} />
          <span className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold text-accent-deep">
            open
            <IconArrowRight size={15} className="transition-transform duration-300 group-hover:translate-x-1.5" />
          </span>
        </div>
      </div>
      <div className="p-[clamp(1.2rem,3vw,2rem)] flex flex-col justify-between gap-6 bg-raised/60">
        <div>
          <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-faint">table of contents</p>
          <ul className="mt-3 space-y-1.5">
            {doc.toc.slice(0, 5).map((h) => (
              <li key={h.id} className="flex items-baseline gap-2 text-[13px] text-soft">
                <span className="font-mono text-[10px] text-accent-deep shrink-0">
                  {h.depth === 2 ? "§" : "··"}
                </span>
                <span className="truncate">{h.text}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="flex items-center justify-between gap-3">
          <TagRow tags={article.tags} />
          <span className="font-mono text-[10px] text-faint whitespace-nowrap">
            {doc.tokens} tokens
          </span>
        </div>
      </div>
    </article>
  );
}

function EntryCard({
  slug,
  onOpen,
  index,
}: {
  slug: string;
  onOpen: (s: string) => void;
  index: number;
}) {
  const { article } = useEntry(slug);
  const av = accentVars[article.accent];
  return (
    <article
      onClick={() => onOpen(slug)}
      onKeyDown={(e) => e.key === "Enter" && onOpen(slug)}
      tabIndex={0}
      className="group cursor-pointer h-full flex flex-col border border-line rounded-xl bg-surface/80 p-5 transition-all duration-300 hover:-translate-y-1 hover:border-transparent hover:shadow-[0_20px_44px_-26px_rgba(6,40,28,0.55)] focus-visible:outline-2 focus-visible:outline-accent relative overflow-hidden"
    >
      <span
        className="absolute left-0 top-0 bottom-0 w-[3px] origin-top scale-y-0 transition-transform duration-300 group-hover:scale-y-100"
        style={{ background: av.c }}
      />
      <div className="flex items-center justify-between font-mono text-[11px] text-faint">
        <span className="tabular-nums" style={{ color: av.c }}>
          {String(index).padStart(2, "0")}
        </span>
        <span className="flex items-center gap-1.5">
          <IconDoc size={13} />
          {article.role}
        </span>
      </div>
      <h3 className="mt-3 font-display font-semibold tracking-[-0.015em] leading-snug text-[1.18rem]">
        <span className="link-underline">{article.title}</span>
      </h3>
      <p className="mt-2 text-[0.92rem] text-soft leading-relaxed line-clamp-3">
        {article.description}
      </p>
      <div className="mt-auto pt-5 flex items-end justify-between gap-3">
        <div className="space-y-2.5">
          <TagRow tags={article.tags} />
          <Meta slug={slug} />
        </div>
        <IconArrowRight
          size={16}
          className="shrink-0 text-faint transition-all duration-300 group-hover:text-accent-deep group-hover:translate-x-1"
        />
      </div>
    </article>
  );
}
