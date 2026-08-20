import { useEffect, useMemo, useRef, useState } from "react";
import {
  accentVars,
  allTags,
  formatDate,
  plainBody,
  type EntryCard,
} from "../data/articles";
import Reveal from "./Reveal";
import {
  IconArrowRight,
  IconArrowUpRight,
  IconClock,
  IconDoc,
  IconHash,
  IconSearch,
  IconTag,
  IconTrash,
  IconX,
} from "./icons";

export default function Library({
  entries,
  activeTag,
  setActiveTag,
  query,
  setQuery,
  onOpen,
  onCompose,
  userSlugs,
  onDelete,
}: {
  entries: EntryCard[];
  activeTag: string | null;
  setActiveTag: (t: string | null) => void;
  query: string;
  setQuery: (q: string) => void;
  onOpen: (slug: string) => void;
  onCompose: () => void;
  userSlugs: Set<string>;
  onDelete: (slug: string) => void;
}) {
  const tags = useMemo(() => allTags(entries), [entries]);
  const [confirmSlug, setConfirmSlug] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  /* "/" shortcut focuses this from anywhere (App switches view first) */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "/") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const results = useMemo(
    () =>
      entries.filter((a) => {
        if (activeTag && !a.tags.includes(activeTag)) return false;
        if (!query.trim()) return true;
        const q = query.toLowerCase();
        return (
          a.title.toLowerCase().includes(q) ||
          a.description.toLowerCase().includes(q) ||
          a.tags.some((t) => t.includes(q)) ||
          plainBody(a.markdown).includes(q)
        );
      }),
    [entries, activeTag, query]
  );

  const lead = query.trim() || activeTag ? null : results[0];
  const rest = lead ? results.slice(1) : results;

  return (
    <section className="pt-[clamp(1.8rem,4vw,3rem)]">
      {/* section head */}
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p className="font-mono text-[11px] tracking-[0.22em] uppercase text-accent-deep flex items-center gap-2.5">
            <span className="inline-block w-8 h-px bg-accent" />
            The library
          </p>
          <h2 className="mt-2 font-display font-bold tracking-[-0.02em] text-[clamp(1.6rem,1.2rem+2vw,2.4rem)]">
            Entries, compiled fresh.
          </h2>
        </div>
        <button className="btn-primary" onClick={onCompose}>
          + new entry
        </button>
      </div>

      {/* controls */}
      <div className="mt-6 flex flex-col md:flex-row md:items-center gap-3">
        <div className="relative md:w-[22rem] w-full">
          <IconSearch
            size={15}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-faint pointer-events-none"
          />
          <input
            ref={searchRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="grep the knowledge base…"
            className="w-full bg-surface border border-line rounded-lg pl-9.5 pr-16 py-2.5 text-sm outline-none transition-colors duration-200 focus:border-accent placeholder:text-faint/70"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
            {query ? (
              <button
                onClick={() => setQuery("")}
                className="text-faint hover:text-ink transition-colors pointer-events-auto"
                aria-label="clear search"
              >
                <IconX size={13} />
              </button>
            ) : (
              <kbd>/</kbd>
            )}
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {tags.map(({ tag, count }) => (
            <button
              key={tag}
              onClick={() => setActiveTag(activeTag === tag ? null : tag)}
              className={`chip ${activeTag === tag ? "chip-on" : ""}`}
            >
              {tag}
              <span className="opacity-60 tabular-nums">{count}</span>
            </button>
          ))}
        </div>
      </div>

      {/* results meta */}
      <p className="mt-5 font-mono text-[11px] text-faint tabular-nums">
        {results.length} {results.length === 1 ? "entry" : "entries"}
        {activeTag && (
          <>
            {" "}tagged <span className="text-accent-deep">#{activeTag}</span>
          </>
        )}
        {query.trim() && (
          <>
            {" "}matching <span className="text-accent-deep">“{query.trim()}”</span>
          </>
        )}
        <span className="opacity-60"> · sorted newest first</span>
      </p>

      {/* lead entry */}
      {lead && (
        <Reveal className="mt-6">
          <article
            className="group relative cursor-pointer border border-line rounded-xl bg-surface/80 overflow-hidden transition-all duration-300 hover:border-accent/70 hover:shadow-[0_18px_50px_-24px_rgba(10,20,14,0.35)] hover:-translate-y-0.5"
            onClick={() => onOpen(lead.slug)}
          >
            <div
              className="absolute inset-y-0 left-0 w-[3px]"
              style={{ background: accentVars[lead.accent].c }}
            />
            <div className="grid md:grid-cols-[1.5fr_1fr] gap-6 p-[clamp(1.25rem,3vw,2.25rem)] pl-[clamp(1.5rem,3vw,2.5rem)]">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-faint">
                    entry 01 · latest
                  </span>
                  <span
                    className="font-mono text-[10px] tracking-[0.18em] uppercase px-1.5 py-0.5 rounded"
                    style={{
                      background: accentVars[lead.accent].soft,
                      color: accentVars[lead.accent].c,
                    }}
                  >
                    {lead.role}
                  </span>
                  {userSlugs.has(lead.slug) && <span className="chip chip-mine">yours</span>}
                </div>
                <h3 className="mt-3 font-display font-bold tracking-[-0.02em] leading-[1.08] text-[clamp(1.4rem,1.1rem+1.6vw,2.1rem)]">
                  <span className="underline-grow">{lead.title}</span>
                </h3>
                <p className="mt-3 text-soft leading-relaxed text-[0.98rem] max-w-[36rem]">
                  {lead.description}
                </p>
                <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 font-mono text-[11px] text-faint">
                  <span className="text-ink/80">{lead.author}</span>
                  <time>{formatDate(lead.date)}</time>
                  <span className="inline-flex items-center gap-1">
                    <IconClock size={12} /> {lead.readingTime} min
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <IconHash size={12} /> {lead.codeLines} loc
                  </span>
                </div>
              </div>
              <div className="hidden md:flex flex-col justify-between gap-4 border-l border-line pl-6">
                <div>
                  <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-faint mb-2.5">
                    indexed as
                  </p>
                  <ul className="space-y-1.5">
                    {lead.toc.slice(0, 5).map((t) => (
                      <li
                        key={t.id}
                        className={`font-mono text-[11px] text-soft/90 truncate ${
                          t.depth === 3 ? "pl-4" : ""
                        }`}
                      >
                        <span className="text-accent-deep mr-1.5 select-none">
                          {t.depth === 3 ? "·" : "§"}
                        </span>
                        {t.text}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {lead.tags.map((t) => (
                    <span key={t} className="chip">
                      {t}
                    </span>
                  ))}
                </div>
                <span className="inline-flex items-center gap-1.5 font-mono text-xs text-accent-deep group-hover:gap-3 transition-all duration-300">
                  open entry <IconArrowRight size={14} />
                </span>
              </div>
            </div>
            {userSlugs.has(lead.slug) && (
              <DeleteBtn
                slug={lead.slug}
                confirm={confirmSlug}
                setConfirm={setConfirmSlug}
                onDelete={onDelete}
                className="top-4 right-4"
              />
            )}
          </article>
        </Reveal>
      )}

      {/* grid */}
      {rest.length > 0 ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3 [grid-template-columns:repeat(auto-fill,minmax(min(17.5rem,100%),1fr))]">
          {rest.map((a, i) => {
            const av = accentVars[a.accent];
            return (
              <Reveal key={a.slug} delay={Math.min(i, 5) * 60}>
                <article
                  className="group relative h-full cursor-pointer border border-line rounded-xl bg-surface/80 p-5 transition-all duration-300 hover:border-accent/70 hover:-translate-y-1 hover:shadow-[0_16px_44px_-22px_rgba(10,20,14,0.35)] flex flex-col"
                  onClick={() => onOpen(a.slug)}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-mono text-[10px] tracking-[0.18em] uppercase text-faint">
                      № {String(entries.indexOf(a) + 1).padStart(2, "0")} ·{" "}
                      <time>{formatDate(a.date)}</time>
                    </span>
                    <IconArrowUpRight
                      size={15}
                      className="text-faint opacity-0 -translate-x-1 translate-y-1 group-hover:opacity-100 group-hover:translate-x-0 group-hover:translate-y-0 transition-all duration-300"
                    />
                  </div>
                  <h3 className="mt-3 font-display font-semibold leading-snug text-[1.12rem]">
                    <span className="underline-grow">{a.title}</span>
                  </h3>
                  <p className="mt-2 text-[0.875rem] leading-relaxed text-soft line-clamp-3">
                    {a.description}
                  </p>
                  <div className="mt-auto pt-4 flex items-center justify-between gap-2 border-t border-line/70 mt-4">
                    <div className="flex flex-wrap gap-1.5 min-w-0">
                      {a.tags.slice(0, 3).map((t) => (
                        <span key={t} className="chip">
                          {t}
                        </span>
                      ))}
                      {userSlugs.has(a.slug) && <span className="chip chip-mine">yours</span>}
                    </div>
                    <span
                      className="inline-flex items-center gap-1 font-mono text-[11px] text-faint whitespace-nowrap"
                      style={{ color: av.c }}
                    >
                      <IconClock size={12} /> {a.readingTime} min
                    </span>
                  </div>
                  {userSlugs.has(a.slug) && (
                    <DeleteBtn
                      slug={a.slug}
                      confirm={confirmSlug}
                      setConfirm={setConfirmSlug}
                      onDelete={onDelete}
                      className="top-3.5 right-3.5"
                    />
                  )}
                </article>
              </Reveal>
            );
          })}
        </div>
      ) : (
        !lead && (
          <div className="mt-10 border border-dashed border-line rounded-xl py-14 text-center">
            <IconDoc size={28} className="mx-auto text-faint" />
            <p className="mt-3 font-mono text-sm text-faint">
              nothing in the index matches that
            </p>
            <button
              className="mt-4 font-mono text-xs text-accent-deep hover:text-accent transition-colors"
              onClick={() => {
                setQuery("");
                setActiveTag(null);
              }}
            >
              clear filters ↺
            </button>
          </div>
        )
      )}

      {results.length === 0 && userSlugs.size === 0 && (
        <p className="mt-4 font-mono text-[11px] text-faint text-center">
          tip: press <kbd>+</kbd>… actually, click <span className="text-accent-deep">+ new entry</span> to start your own shelf
        </p>
      )}
    </section>
  );
}

function DeleteBtn({
  slug,
  confirm,
  setConfirm,
  onDelete,
  className,
}: {
  slug: string;
  confirm: string | null;
  setConfirm: (s: string | null) => void;
  onDelete: (slug: string) => void;
  className: string;
}) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const t = window.setTimeout(() => setArmed(false), 2600);
    return () => window.clearTimeout(t);
  }, [armed]);

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        if (armed) {
          onDelete(slug);
          setArmed(false);
        } else setArmed(true);
      }}
      title={armed ? "click again to delete" : "delete entry"}
      className={`absolute ${className} z-10 inline-flex items-center gap-1.5 rounded-md border px-2 py-1 font-mono text-[10px] transition-all duration-200 ${
        armed
          ? "border-danger/60 bg-danger/10 text-danger"
          : "border-line bg-surface text-faint hover:text-danger hover:border-danger/50"
      } ${confirm ? "" : ""}`}
    >
      {armed ? "sure?" : <IconTrash size={12} />}
    </button>
  );
}
