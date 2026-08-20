import { useEffect, useState, type MouseEvent } from "react";
import type { TocItem } from "../lib/markdown";
import { IconChevron, IconToc } from "./icons";

/* ---------- hooks ---------- */

export function useReadingProgress(): number {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const onScroll = () => {
      const h = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(h > 0 ? Math.min(1, window.scrollY / h) : 0);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return progress;
}

export function useScrollSpy(ids: string[]): string {
  const [activeId, setActiveId] = useState("");
  useEffect(() => {
    const els = ids
      .map((id) => document.getElementById(id))
      .filter(Boolean) as HTMLElement[];
    if (!els.length) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActiveId(e.target.id);
      },
      { rootMargin: "-12% 0px -72% 0px", threshold: 0 }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [ids.join("|")]);
  return activeId;
}

/* ---------- component ---------- */

export default function TocRail({
  toc,
  activeId,
  progress,
  meta,
  title = "On this page",
}: {
  toc: TocItem[];
  activeId: string;
  progress: number;
  meta?: string;
  title?: string;
}) {
  const handleLinkClick = (
    e: MouseEvent<HTMLAnchorElement>,
    id: string,
    isMobile = false
  ) => {
    // 1. Prevent the router from hijacking the #hash link and navigating away
    e.preventDefault(); 
    
    const el = document.getElementById(id);
    if (el) {
      // 2. Manually smooth scroll to the target section
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      
      // 3. Update the URL hash so users can copy/share the link
      window.history.pushState(null, "", `#${id}`);
    }
    
    // 4. Close the mobile dropdown if it was triggered from the mobile TOC
    if (isMobile) {
      const details = document.querySelector(
        "details.toc-mobile"
      ) as HTMLDetailsElement;
      if (details) details.removeAttribute("open");
    }
  };

  return (
    <>
      {/* mobile */}
      <details className="toc-mobile lg:hidden mb-6 border border-line rounded-xl bg-surface/80 px-4 py-3">
        <summary className="flex items-center justify-between font-mono text-xs text-soft">
          <span className="inline-flex items-center gap-2">
            <IconToc size={14} className="text-accent-deep" />
            {title} · {toc.length} headings
          </span>
          <IconChevron size={15} className="chev text-faint" />
        </summary>
        <nav className="mt-3 pb-1 space-y-1">
          {toc.map((t) => (
            <a
              key={t.id}
              href={`#${t.id}`}
              onClick={(e) => handleLinkClick(e, t.id, true)}
              className={`toc-link ${t.depth === 3 ? "depth-3" : ""} ${
                activeId === t.id ? "active" : ""
              }`}
            >
              {t.text}
            </a>
          ))}
        </nav>
      </details>

      {/* desktop */}
      <aside className="hidden lg:block sticky top-24">
        <div className="border-l border-line">
          <p className="pl-4 -ml-px mb-3 font-mono text-[10px] tracking-[0.2em] uppercase text-faint flex items-center gap-2">
            <IconToc size={13} className="text-accent-deep" />
            {title}
          </p>
          <nav className="-ml-px space-y-0.5">
            {toc.map((t) => (
              <a
                key={t.id}
                href={`#${t.id}`}
                onClick={(e) => handleLinkClick(e, t.id, false)}
                className={`toc-link ${t.depth === 3 ? "depth-3" : ""} ${
                  activeId === t.id ? "active" : ""
                }`}
              >
                {t.text}
              </a>
            ))}
          </nav>
        </div>
        <div className="mt-6 pl-4 font-mono text-[10px] text-faint space-y-1.5">
          <p>
            reading{" "}
            <span className="text-accent-deep tabular-nums">
              {Math.round(progress * 100)}%
            </span>
          </p>
          {meta && <p>{meta}</p>}
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="mt-2 inline-flex items-center gap-1.5 text-accent-deep hover:text-accent transition-colors"
          >
            ↑ back to top
          </button>
        </div>
      </aside>
    </>
  );
}