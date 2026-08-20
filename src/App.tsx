import { useCallback, useEffect, useState } from "react";
import ArticleView from "./components/ArticleView";
import Library from "./components/Library";
import Playground from "./components/Playground";
import {
  IconBook,
  IconBrackets,
  IconMoon,
  IconPlay,
  IconSun,
} from "./components/icons";

type Route =
  | { view: "library" }
  | { view: "article"; slug: string }
  | { view: "playground" };

const PIPELINE = [
  ["01", "frontmatter parsed"],
  ["02", "marked lexer → tokens"],
  ["03", "renderer → semantic HTML"],
  ["04", "prism.js highlight"],
  ["05", "ToC + reading time"],
  ["06", "hydrate to DOM"],
] as const;

export default function App() {
  const [route, setRoute] = useState<Route>({ view: "library" });
  const [dark, setDark] = useState(() =>
    document.documentElement.classList.contains("dark")
  );

  /* theme */
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    try {
      localStorage.setItem("codex-theme", dark ? "dark" : "light");
    } catch {
      /* private mode */
    }
  }, [dark]);

  /* scroll to top on navigation */
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [route]);

  /* "/" focuses library search */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT") return;
      if (e.key === "/") {
        e.preventDefault();
        if (route.view !== "library") setRoute({ view: "library" });
        window.setTimeout(
          () => (document.getElementById("kb-search") as HTMLInputElement | null)?.focus(),
          90
        );
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [route.view]);

  const openArticle = useCallback((slug: string) => setRoute({ view: "article", slug }), []);

  return (
    <div className="min-h-screen flex flex-col">
      <div className="ambient" aria-hidden="true" />
      <div className="noise" aria-hidden="true" />

      {/* ---------------- header ---------------- */}
      <header className="sticky top-0 z-50 border-b border-line bg-paper/85 backdrop-blur-md">
        <div className="fluid-wrap h-14 flex items-center justify-between gap-4">
          <button
            onClick={() => setRoute({ view: "library" })}
            className="group flex items-center gap-2.5 font-mono font-semibold text-[15px] tracking-tight"
            aria-label="codex home"
          >
            <span className="grid place-items-center w-7 h-7 rounded-md bg-ink text-paper dark:bg-accent dark:text-paper transition-transform duration-300 group-hover:-rotate-6">
              <IconBrackets size={15} strokeWidth={2.2} />
            </span>
            <span className="text-soft">~/</span>codex
            <span className="caret" aria-hidden="true" />
          </button>

          <div className="flex items-center gap-1 sm:gap-2">
            <NavBtn
              active={route.view === "library" || route.view === "article"}
              onClick={() => setRoute({ view: "library" })}
              icon={<IconBook size={14} />}
              label="Library"
            />
            <NavBtn
              active={route.view === "playground"}
              onClick={() => setRoute({ view: "playground" })}
              icon={<IconPlay size={14} />}
              label="Playground"
            />

            <span className="w-px h-5 bg-line mx-1.5" />

            <button
              onClick={() => setDark((d) => !d)}
              aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
              className="theme-toggle relative grid place-items-center w-9 h-9 rounded-lg border border-line bg-surface text-soft hover:text-accent-deep hover:border-accent/50 transition-colors duration-200"
            >
              <span className="sun absolute"><IconSun size={16} /></span>
              <span className="moon absolute"><IconMoon size={16} /></span>
            </button>
          </div>
        </div>
      </header>

      {/* ---------------- main ---------------- */}
      <main className="flex-1">
        <div className="fluid-wrap">
          {route.view === "library" && <Library onOpen={openArticle} />}
          {route.view === "article" && (
            <ArticleView
              slug={route.slug}
              onOpen={openArticle}
              onBack={() => setRoute({ view: "library" })}
            />
          )}
          {route.view === "playground" && <Playground />}
        </div>
      </main>

      {/* ---------------- footer / colophon ---------------- */}
      <footer className="border-t border-line bg-surface/60 mt-4">
        <div className="fluid-wrap py-[clamp(2.2rem,5vw,3.5rem)] grid gap-10 md:grid-cols-[1.2fr_1fr_1fr]">
          <div>
            <p className="font-mono font-semibold text-[15px] flex items-center gap-2">
              <span className="grid place-items-center w-6 h-6 rounded-md bg-ink text-paper dark:bg-accent dark:text-paper">
                <IconBrackets size={13} strokeWidth={2.2} />
              </span>
              <span className="text-soft">~/</span>codex
            </p>
            <p className="mt-4 max-w-[36ch] text-[0.95rem] leading-relaxed text-soft">
              An engineering knowledge base where every page is a plain{" "}
              <code className="font-mono text-[0.85em] text-accent-deep">.md</code> file.
              No CMS, no database — just a compiler for notes.
            </p>
            <p className="mt-4 font-mono text-[11px] text-faint">
              last build · 5 sources · 0 changed · <span className="text-accent-deep">41 ms</span>
            </p>
          </div>

          <div>
            <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-faint">
              The pipeline
            </p>
            <ul className="mt-3.5 space-y-2">
              {PIPELINE.map(([n, label]) => (
                <li key={n} className="flex items-baseline gap-3 font-mono text-xs text-soft">
                  <span className="text-accent-deep tabular-nums">{n}</span>
                  {label}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-faint">
              Colophon
            </p>
            <ul className="mt-3.5 space-y-2 font-mono text-xs text-soft">
              <li>
                press <span className="kbd">/</span> anywhere to grep the index
              </li>
              <li>markdown → <span className="text-ink/85">marked</span> lexer</li>
              <li>syntax → <span className="text-ink/85">prism.js</span></li>
              <li>
                set in <span className="text-ink/85">Space Grotesk</span>,{" "}
                <span className="text-ink/85">Source Serif 4</span> &{" "}
                <span className="text-ink/85">JetBrains Mono</span>
              </li>
              <li>react + vite + tailwind, fluid from 320px up</li>
            </ul>
          </div>
        </div>
        <div className="border-t border-line">
          <div className="fluid-wrap py-4 flex flex-wrap items-center justify-between gap-2 font-mono text-[11px] text-faint">
            <span>© 2026 codex kb · written by humans, compiled by machines</span>
            <span>no cookies · no tracking · 100% static</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

function NavBtn({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`relative flex items-center gap-1.5 px-2.5 sm:px-3 h-9 rounded-lg font-mono text-[12.5px] transition-colors duration-200 ${
        active ? "text-accent-deep bg-accent-soft" : "text-faint hover:text-ink hover:bg-surface"
      }`}
    >
      {icon}
      {label}
      {active && (
        <span className="absolute left-2.5 right-2.5 -bottom-[13px] h-[2px] bg-accent rounded-full" />
      )}
    </button>
  );
}
