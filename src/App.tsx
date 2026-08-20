import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { articles, enrich, type Article } from "./data/articles";
import { loadUserEntries, saveUserEntries } from "./lib/store";
import ArticleView from "./components/ArticleView";
import Composer from "./components/Composer";
import Guide from "./components/Guide";
import Library from "./components/Library";
import Masthead from "./components/Masthead";
import Playground from "./components/Playground";
import {
  IconBook,
  IconBrackets,
  IconMoon,
  IconPlay,
  IconSun,
} from "./components/icons";

/* ---------------- routing ---------------- */

type Route =
  | { view: "library" }
  | { view: "article"; slug: string }
  | { view: "playground" }
  | { view: "composer"; slug?: string }
  | { view: "guide" };

function toHash(r: Route): string {
  switch (r.view) {
    case "library":
      return "#/";
    case "article":
      return `#/article/${r.slug}`;
    case "playground":
      return "#/playground";
    case "composer":
      return r.slug ? `#/composer/${r.slug}` : "#/composer";
    case "guide":
      return "#/guide";
  }
}

function readRoute(): Route {
  const h = window.location.hash.replace(/^#\/?/, "");
  if (!h) return { view: "library" };
  const [view, param] = h.split("/");
  if (view === "article" && param) return { view: "article", slug: decodeURIComponent(param) };
  if (view === "playground") return { view: "playground" };
  if (view === "composer") return { view: "composer", slug: param ? decodeURIComponent(param) : undefined };
  if (view === "guide") return { view: "guide" };
  return { view: "library" };
}

/* ---------------- app ---------------- */

export default function App() {
  const [route, setRoute] = useState<Route>(readRoute);
  const [theme, setTheme] = useState<"light" | "dark">(() =>
    document.documentElement.classList.contains("dark") ? "dark" : "light"
  );
  const [userEntries, setUserEntries] = useState<Article[]>(loadUserEntries);
  const [query, setQuery] = useState("");
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [toast, setToast] = useState<{ id: number; msg: string } | null>(null);

  /* navigation (hash-backed, deep-linkable) */
  const navigate = useCallback((r: Route) => {
    const h = toHash(r);
    if (window.location.hash !== h) window.location.hash = h;
    else window.scrollTo({ top: 0 });
  }, []);

  useEffect(() => {
    const onHash = () => {
      setRoute(readRoute());
      window.scrollTo({ top: 0 });
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  /* theme */
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    try {
      localStorage.setItem("codex-theme", theme);
    } catch {
      /* private mode */
    }
  }, [theme]);

  /* keyboard: "d" toggles theme, "/" jumps to the index */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest("input, textarea, select, [contenteditable]")) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "d") {
        e.preventDefault();
        setTheme((prev) => (prev === "dark" ? "light" : "dark"));
      } else if (e.key === "/") {
        e.preventDefault();
        navigate({ view: "library" });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navigate]);

  /* toasts */
  const say = useCallback((msg: string) => setToast({ id: Date.now(), msg }), []);
  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 2800);
    return () => window.clearTimeout(t);
  }, [toast]);

  /* merged corpus: built-ins + yours, newest first */
  const merged = useMemo(
    () =>
      [...userEntries, ...articles].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      ),
    [userEntries]
  );
  const cards = useMemo(() => merged.map(enrich), [merged]);
  const userSlugs = useMemo(() => new Set(userEntries.map((e) => e.slug)), [userEntries]);
  const allSlugs = useMemo(() => new Set(merged.map((e) => e.slug)), [merged]);

  /* ---------------- mutations ---------------- */

  /* latest value ref — bulk imports call save() across awaits, where a
     captured state snapshot would drop earlier files */
  const userRef = useRef(userEntries);
  useEffect(() => {
    userRef.current = userEntries;
  }, [userEntries]);

  const persist = useCallback(
    (next: Article[]) => {
      setUserEntries(next);
      if (!saveUserEntries(next)) say("⚠ browser storage is full — entry kept in memory only");
    },
    [say]
  );

  const saveEntry = useCallback(
    (entry: Article, isNew: boolean, quiet?: boolean) => {
      const prev = userRef.current;
      const next = isNew
        ? [...prev, entry]
        : prev.map((e) => (e.slug === entry.slug ? entry : e));
      persist(next);
      if (!quiet) {
        say(
          isNew
            ? `✓ compiled & filed as ${entry.slug}.md`
            : `✓ ${entry.slug}.md recompiled`
        );
        navigate({ view: "article", slug: entry.slug });
      }
    },
    [persist, say, navigate]
  );

  const deleteEntry = useCallback(
    (slug: string) => {
      persist(userRef.current.filter((e) => e.slug !== slug));
      say(`removed ${slug}.md from your shelf`);
      if (route.view === "article" && route.slug === slug) navigate({ view: "library" });
      if (route.view === "composer" && route.slug === slug) navigate({ view: "composer" });
    },
    [persist, say, route, navigate]
  );

  const open = useCallback((slug: string) => navigate({ view: "article", slug }), [navigate]);
  const compose = useCallback(() => navigate({ view: "composer" }), [navigate]);
  const edit = useCallback((slug: string) => navigate({ view: "composer", slug }), [navigate]);

  /* ---------------- views ---------------- */

  const currentArticle =
    route.view === "article" ? merged.find((a) => a.slug === route.slug) : undefined;
  const editingEntry =
    route.view === "composer" && route.slug
      ? userEntries.find((e) => e.slug === route.slug) ?? null
      : null;

  return (
    <div className="min-h-screen relative">
      <div className="ambient" aria-hidden="true" />

      {/* ---------------- header ---------------- */}
      <header className="sticky top-0 z-40 border-b border-line/80 bg-paper/85 backdrop-blur-md">
        <div className="mx-auto max-w-[82rem] px-[clamp(1.1rem,4.5vw,3.25rem)]">
          <div className="flex items-center justify-between h-14 sm:h-16">
            <button
              onClick={() => navigate({ view: "library" })}
              className="group flex items-center gap-2 sm:gap-2.5 min-h-[44px]"
              aria-label="codex home"
            >
              <span className="w-8 h-8 rounded-lg bg-ink text-paper dark:bg-accent dark:text-paper grid place-items-center transition-transform duration-300 group-hover:rotate-[-6deg] group-hover:scale-105">
                <IconBrackets size={17} />
              </span>
              <span className="font-display font-bold text-base sm:text-lg tracking-tight">
                codex<span className="text-accent">.</span>
              </span>
              <span className="hidden sm:inline font-mono text-[10px] text-faint tracking-[0.16em] uppercase mt-0.5">
                knowledge base
              </span>
            </button>

            <nav className="flex items-center gap-1 sm:gap-2">
              {(
                [
                  { view: "library", label: "library" },
                  { view: "playground", label: "playground", icon: <IconPlay size={13} /> },
                  { view: "guide", label: "guide", icon: <IconBook size={13} /> },
                ] as {
                  view: "library" | "playground" | "guide";
                  label: string;
                  icon?: React.ReactNode;
                }[]
              ).map((item) => {
                const active = route.view === item.view || (item.view === "library" && (route.view === "article" || route.view === "composer"));
                return (
                  <button
                    key={item.view}
                    onClick={() => navigate({ view: item.view } as Route)}
                    className={`relative hidden sm:inline-flex items-center gap-1.5 font-mono text-xs px-3 py-1.5 rounded-md transition-colors duration-200 min-h-[44px] ${
                      active ? "text-accent-deep" : "text-faint hover:text-ink"
                    }`}
                  >
                    {item.icon}
                    {item.label}
                    {active && (
                      <span className="absolute -bottom-[13px] left-3 right-3 h-[2px] bg-accent rounded-full" />
                    )}
                  </button>
                );
              })}

              <button onClick={compose} className="btn-primary py-2! sm:py-2! min-h-[44px] ml-1 sm:ml-2 px-3 sm:px-4">
                <span className="text-[14px] leading-none">+</span>
                <span className="hidden sm:inline">new entry</span>
              </button>

              <button
                onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
                className="theme-toggle relative w-11 h-11 sm:w-9 sm:h-9 grid place-items-center rounded-lg border border-line text-soft hover:text-accent-deep hover:border-accent/60 transition-colors duration-200"
                aria-label="toggle dark mode"
                title="toggle dark mode (d)"
              >
                <span className="sun absolute"><IconSun size={16} /></span>
                <span className="moon absolute"><IconMoon size={16} /></span>
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* ---------------- content ---------------- */}
      <main className="mx-auto max-w-[82rem] px-[clamp(1.1rem,4.5vw,3.25rem)]">
        {route.view === "library" && (
          <>
            <Masthead entries={cards} />
            <Library
              entries={cards}
              activeTag={activeTag}
              setActiveTag={setActiveTag}
              query={query}
              setQuery={setQuery}
              onOpen={open}
              onCompose={compose}
              userSlugs={userSlugs}
              onDelete={deleteEntry}
            />
          </>
        )}

        {route.view === "article" &&
          (currentArticle ? (
            <ArticleView
              key={currentArticle.slug}
              article={currentArticle}
              entries={merged}
              isCustom={userSlugs.has(currentArticle.slug)}
              onOpen={open}
              onBack={() => navigate({ view: "library" })}
              onEdit={edit}
              onDelete={deleteEntry}
            />
          ) : (
            <Missing onBack={() => navigate({ view: "library" })} />
          ))}

        {route.view === "playground" && <Playground />}

        {route.view === "composer" && (
          <Composer
            key={route.slug ?? "new"}
            allSlugs={allSlugs}
            userEntries={userEntries}
            editing={editingEntry}
            onSave={saveEntry}
            onDelete={deleteEntry}
            onEdit={edit}
            onOpen={open}
            onToast={say}
            onCancel={() => navigate({ view: "library" })}
          />
        )}

        {route.view === "guide" && <Guide onOpen={open} />}
      </main>

     {/* ---------------- colophon ---------------- */}
      <footer className="mt-[clamp(3rem,7vw,5.5rem)] border-t border-line">
        <div className="mx-auto max-w-[82rem] px-[clamp(1.1rem,4.5vw,3.25rem)] py-10">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-8">
            <div className="max-w-sm">
              <p className="font-display font-bold text-lg">
                codex<span className="text-accent">.</span>
              </p>
              <p className="mt-2 font-mono text-[11px] leading-relaxed text-faint">
                markdown in → highlighted, indexed html out. your entries live in this
                browser's storage —{" "}
                <button
                  onClick={() => navigate({ view: "guide" })}
                  className="text-accent-deep hover:text-accent transition-colors underline decoration-accent/40 underline-offset-2"
                >
                  read the guide
                </button>{" "}
                for the full contract.
              </p>
            </div>
            <div className="flex gap-14 font-mono text-xs">
              <div className="space-y-2.5">
                <p className="text-[10px] tracking-[0.2em] uppercase text-faint">index</p>
                <button onClick={() => navigate({ view: "library" })} className="block text-soft hover:text-accent-deep transition-colors">library</button>
                <button onClick={() => navigate({ view: "playground" })} className="block text-soft hover:text-accent-deep transition-colors">playground</button>
                <button onClick={() => navigate({ view: "guide" })} className="block text-soft hover:text-accent-deep transition-colors">guide</button>
              </div>
              <div className="space-y-2.5">
                <p className="text-[10px] tracking-[0.2em] uppercase text-faint">contribute</p>
                <button onClick={compose} className="block text-soft hover:text-accent-deep transition-colors">write an entry</button>
                <button onClick={compose} className="block text-soft hover:text-accent-deep transition-colors">import .md files</button>
                <button
                  onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
                  className="block text-soft hover:text-accent-deep transition-colors"
                >
                  toggle theme <span className="text-faint">(d)</span>
                </button>
              </div>
            </div>
          </div>
          <div className="mt-8 pt-5 border-t border-line/70 flex flex-wrap items-center justify-between gap-3 font-mono text-[10px] text-faint">
            <span>
              © 2026 codex · {cards.length} entries ·{" "}
              {userSlugs.size > 0 ? `${userSlugs.size} yours` : "nothing yours yet — fix that"}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <i className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
              pipeline: healthy
            </span>
          </div>
        </div>
      </footer>

      {/* ---------------- toast ---------------- */}
      {toast && (
        <div key={toast.id} className="toast" role="status">
          {toast.msg}
        </div>
      )}
    </div>
  );
}

function Missing({ onBack }: { onBack: () => void }) {
  return (
    <div className="py-24 text-center">
      <p className="font-mono text-sm text-faint">404 — that entry isn't in the index</p>
      <button className="btn-primary mt-6 mx-auto" onClick={onBack}>
        back to the library
      </button>
    </div>
  );
}
