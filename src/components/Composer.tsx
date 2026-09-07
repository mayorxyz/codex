import React, { useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Accent, Article } from "../data/articles";
import {
  parseFrontmatter,
  renderMarkdown,
  slugify,
} from "../lib/markdown";
import { downloadBackup, todayISO, uniqueSlug } from "../lib/store";
import { IconTrash, IconUpload } from "./icons";

const ACCENTS: { id: Accent; label: string; color: string }[] = [
  { id: "teal", label: "teal", color: "var(--accent)" },
  { id: "amber", label: "amber", color: "var(--warm)" },
  { id: "sky", label: "sky", color: "var(--cool)" },
];

const SNIPPETS: { label: string; before: string; after: string }[] = [
  { label: "H2", before: "\n## ", after: "\n" },
  { label: "H3", before: "\n### ", after: "\n" },
  { label: "bold", before: "**", after: "**" },
  { label: "code", before: "`", after: "`" },
  { label: "quote", before: "\n> ", after: "\n" },
  { label: "list", before: "\n- ", after: "\n" },
  {
    label: "fence",
    before: "\n```ts title=\"example.ts\"\n",
    after: "\n```\n",
  },
  {
    label: "table",
    before: "\n| a | b |\n| --- | --- |\n| ",
    after: " | value |\n",
  },
];

export interface ComposerProps {
  allSlugs: Set<string>;
  userEntries: Article[];
  editing: Article | null;
  onSave: (entry: Article, isNew: boolean, quiet?: boolean) => void;
  onDelete: (slug: string) => void;
  onEdit: (slug: string) => void;
  onOpen: (slug: string) => void;
  onToast: (msg: string) => void;
  onCancel: () => void;
}

export default function Composer({
  allSlugs,
  userEntries,
  editing,
  onSave,
  onDelete,
  onEdit,
  onOpen,
  onToast,
  onCancel,
}: ComposerProps) {
  const [title, setTitle] = useState(editing?.title ?? "");
  const [description, setDescription] = useState(editing?.description ?? "");
  const [author, setAuthor] = useState(editing?.author ?? "");
  const [role, setRole] = useState(editing?.role ?? "Field Notes");
  const [tagsInput, setTagsInput] = useState(editing?.tags.join(", ") ?? "");
  const [accent, setAccent] = useState<Accent>(editing?.accent ?? "teal");
  const [date, setDate] = useState(editing?.date ?? todayISO());
  const [markdown, setMarkdown] = useState(editing?.markdown ?? STARTER);
  const [errors, setErrors] = useState<{ title?: string; body?: string }>({});
  const [tab, setTab] = useState<"write" | "preview">("write");
  const [dragOver, setDragOver] = useState(false);
  const [confirmSlug, setConfirmSlug] = useState<string | null>(null);

  const taRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const tags = useMemo(
    () =>
      tagsInput
        .split(",")
        .map((t) => t.trim().replace(/^#/, "").toLowerCase())
        .filter(Boolean)
        .slice(0, 8),
    [tagsInput]
  );

  const preview = useMemo(() => {
    const t0 = performance.now();
    const doc = markdown.trim() ? renderMarkdown(markdown) : null;
    const ms = performance.now() - t0;
    return { doc, ms };
  }, [markdown]);

  const slugPreview = editing
    ? editing.slug
    : slugify(title) || "untitled-entry";

  function insert(before: string, after: string) {
    const ta = taRef.current;
    if (!ta) return;
    const { selectionStart: s, selectionEnd: e, value } = ta;
    const sel = value.slice(s, e) || "text";
    const next = value.slice(0, s) + before + sel + after + value.slice(e);
    setMarkdown(next);
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(s + before.length, s + before.length + sel.length);
    });
  }

  async function importFiles(list: FileList | File[]) {
    const files = [...list].filter(
      (f) =>
        /\.(md|markdown|mdown|txt)$/i.test(f.name) || f.type.startsWith("text/")
    );
    if (!files.length) {
      onToast("no .md files in that drop");
      return;
    }
    if (files.length === 1) {
      const parsed = parseFrontmatter(await files[0].text());
      const base = files[0].name.replace(/\.[^.]+$/, "");
      setTitle(parsed.meta.title ?? base);
      setDescription(parsed.meta.description ?? "");
      setAuthor(parsed.meta.author ?? "");
      setRole(parsed.meta.role ?? "Field Notes");
      setAccent(parsed.meta.accent ?? "teal");
      setDate(parsed.meta.date ?? todayISO());
      if (parsed.meta.tags.length) setTagsInput(parsed.meta.tags.join(", "));
      setMarkdown(parsed.body || STARTER);
      setErrors({});
      setTab("write");
      onToast(`imported ${files[0].name} — review & save`);
    } else {
      const taken = new Set(allSlugs);
      let made = 0;
      for (const f of files) {
        const parsed = parseFrontmatter(await f.text());
        if (!parsed.body) continue;
        const base = f.name.replace(/\.[^.]+$/, "");
        const entry: Article = {
          slug: uniqueSlug(parsed.meta.title ?? base, taken),
          title: parsed.meta.title ?? base,
          description: parsed.meta.description ?? "",
          date: parsed.meta.date ?? todayISO(),
          author: parsed.meta.author ?? "",
          role: parsed.meta.role ?? "Imported",
          tags: parsed.meta.tags,
          accent: parsed.meta.accent ?? "teal",
          markdown: parsed.body,
        };
        taken.add(entry.slug);
        onSave(entry, true, true);
        made++;
      }
      onToast(`imported ${made} files → ${made} new entries`);
    }
  }

  function save() {
    const errs: typeof errors = {};
    if (!title.trim()) errs.title = "every entry needs a title";
    if (!markdown.trim()) errs.body = "the body is empty — nothing to compile";
    setErrors(errs);
    if (Object.keys(errs).length) {
      onToast("fix the highlighted fields");
      return;
    }
    const entry: Article = {
      slug: editing ? editing.slug : uniqueSlug(title, allSlugs),
      title: title.trim(),
      description: description.trim(),
      date: /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : todayISO(),
      author: author.trim(),
      role: role.trim() || "Field Notes",
      tags: tags.length ? tags : ["notes"],
      accent,
      markdown,
    };
    onSave(entry, !editing);
  }

  return (
    <div className="w-full max-w-full overflow-x-hidden min-w-0 pb-[clamp(3rem,6vw,5rem)]">
      {/* Top Header Controls */}
      <div className="pt-6 flex flex-wrap items-center justify-between gap-3 min-w-0">
        <button
          onClick={onCancel}
          className="group inline-flex items-center gap-2 font-mono text-xs text-faint hover:text-accent-deep transition-colors min-h-[44px] shrink-0"
        >
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="transition-transform duration-300 group-hover:-translate-x-1 shrink-0"
          >
            <path d="M19 12H5M11 18l-6-6 6-6" />
          </svg>
          <span className="truncate">~/library</span>
        </button>
        <span className="hidden sm:inline font-mono text-xs text-faint truncate max-w-xs md:max-w-md">
          {editing ? (
            <>
              editing <span className="text-accent-deep">{editing.slug}.md</span>
            </>
          ) : (
            <>
              new entry →{" "}
              <span className="text-accent-deep">{slugPreview}.md</span>
            </>
          )}
        </span>
      </div>

      <header className="mt-6 max-w-[44rem] min-w-0">
        <h1 className="font-display font-bold tracking-[-0.02em] leading-tight text-[clamp(1.7rem,1.2rem+2.2vw,2.6rem)] break-words">
          {editing ? "Revise the record." : "Add to the codex."}
        </h1>
        <p className="mt-2 text-soft font-body italic text-[1.02rem] break-words">
          {editing
            ? "Changes recompile the moment you save — same pipeline, fresh output."
            : "Write Markdown, drop in a file, or paste notes. The pipeline does the rest."}
        </p>
      </header>

      {/* Mobile Tab Switcher */}
      <div className="mt-6 lg:hidden flex border border-line rounded-lg p-1 bg-surface w-full min-w-0">
        {(["write", "preview"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 min-h-[44px] px-4 py-2.5 rounded-md font-mono text-xs transition-all flex items-center justify-center ${
              tab === t
                ? "bg-ink text-paper dark:bg-accent dark:text-paper font-semibold shadow-sm"
                : "text-faint hover:text-ink"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-[clamp(1rem,2.5vw,2rem)] items-start min-w-0">
        {/* ---------------- Form + Editor ---------------- */}
        <div
          className={`space-y-5 min-w-0 w-full ${
            tab === "preview" ? "hidden lg:block" : "block"
          }`}
        >
          {/* Dropzone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              importFiles(e.dataTransfer.files);
            }}
            onClick={() => fileRef.current?.click()}
            className={`dropzone cursor-pointer w-full min-w-0 p-4 border-2 border-dashed rounded-xl transition-colors flex items-center gap-3.5 ${
              dragOver ? "over border-accent bg-accent/5" : "border-line hover:border-accent-deep/40"
            }`}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && fileRef.current?.click()}
          >
            <IconUpload size={20} className="shrink-0 text-faint" />
            <div className="text-left min-w-0 flex-1">
              <p className="font-mono text-xs text-ink/85 truncate">
                {dragOver ? "release to import" : "drop .md files here, or tap to browse"}
              </p>
              <p className="font-mono text-[10px] text-faint mt-0.5 truncate">
                frontmatter parsed automatically
              </p>
            </div>
            <input
              ref={fileRef}
              type="file"
              multiple
              accept=".md,.markdown,.mdown,.txt,text/markdown,text/plain"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.length) importFiles(e.target.files);
                e.target.value = "";
              }}
            />
          </div>

          {/* Metadata Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 min-w-0">
            <Field label="title" required error={errors.title} className="min-w-0">
              <input
                className="field text-base w-full min-w-0 rounded-lg border border-line bg-surface px-3 py-2 text-ink placeholder:text-faint focus:outline-none focus:ring-2 focus:ring-accent/50"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="What you learned, in one line"
                maxLength={120}
              />
            </Field>
            <Field label="date" className="min-w-0">
              <input
                className="field text-base w-full min-w-0 rounded-lg border border-line bg-surface px-3 py-2 text-ink placeholder:text-faint focus:outline-none focus:ring-2 focus:ring-accent/50"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </Field>
            <Field label="author" className="min-w-0">
              <input
                className="field text-base w-full min-w-0 rounded-lg border border-line bg-surface px-3 py-2 text-ink placeholder:text-faint focus:outline-none focus:ring-2 focus:ring-accent/50"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="you"
              />
            </Field>
            <Field label="role / section" className="min-w-0">
              <input
                className="field text-base w-full min-w-0 rounded-lg border border-line bg-surface px-3 py-2 text-ink placeholder:text-faint focus:outline-none focus:ring-2 focus:ring-accent/50"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="e.g. Systems, Tooling"
              />
            </Field>
            <Field label="tags (comma separated)" className="sm:col-span-2 min-w-0">
              <input
                className="field text-base w-full min-w-0 rounded-lg border border-line bg-surface px-3 py-2 text-ink placeholder:text-faint focus:outline-none focus:ring-2 focus:ring-accent/50"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="streams, debugging, postmortem"
              />
              {tags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5 min-w-0">
                  {tags.map((t) => (
                    <span key={t} className="chip font-mono text-[11px] px-2 py-0.5 rounded bg-surface border border-line text-soft truncate max-w-[150px]">
                      #{t}
                    </span>
                  ))}
                </div>
              )}
            </Field>
            <Field label="description (shown on the card)" className="sm:col-span-2 min-w-0">
              <textarea
                className="field resize-y text-base w-full min-w-0 rounded-lg border border-line bg-surface px-3 py-2 text-ink placeholder:text-faint focus:outline-none focus:ring-2 focus:ring-accent/50"
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="One or two sentences a future reader will thank you for."
              />
            </Field>
            <Field label="accent" className="min-w-0">
              <div className="flex items-center gap-2 pt-1">
                {ACCENTS.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => setAccent(a.id)}
                    className={`swatch min-w-[40px] min-h-[40px] w-10 h-10 rounded-full border-2 transition-transform ${
                      accent === a.id ? "border-ink scale-110 shadow-sm" : "border-transparent opacity-80 hover:opacity-100"
                    }`}
                    style={{ background: a.color }}
                    title={a.label}
                    aria-label={a.label}
                  />
                ))}
              </div>
            </Field>
          </div>

          {/* Editor Container */}
          <div className="min-w-0 w-full">
            <div className="flex items-center justify-between mb-2 min-w-0">
              <span className="font-mono text-[10px] tracking-[0.18em] uppercase text-faint truncate">
                body · markdown
              </span>
            </div>
            {/* Horizontal Scrolling Toolbar */}
            <div className="w-full max-w-full overflow-x-auto min-w-0 pb-2 -mb-2 scrollbar-none">
              <div className="flex items-center gap-1.5 min-w-max">
                {SNIPPETS.map((s) => (
                  <button
                    key={s.label}
                    type="button"
                    onClick={() => insert(s.before, s.after)}
                    className="tbtn min-h-[40px] px-3 font-mono text-xs rounded border border-line bg-surface hover:bg-surface/80 text-ink shrink-0 flex items-center justify-center transition-colors"
                    title={`insert ${s.label}`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
            <textarea
              ref={taRef}
              className={`editor text-base min-h-[300px] mt-3 w-full min-w-0 rounded-xl border border-line bg-surface p-4 text-ink font-mono focus:outline-none focus:ring-2 focus:ring-accent/50 ${
                errors.body ? "invalid border-danger ring-1 ring-danger" : ""
              }`}
              value={markdown}
              onChange={(e) => setMarkdown(e.target.value)}
              spellCheck={false}
              placeholder={"## Start with a heading\n\nTell the story. Add a ```fence, a table, a > quote…"}
            />
            {errors.body && (
              <p className="mt-1.5 font-mono text-[11px] text-danger">{errors.body}</p>
            )}
          </div>

          {/* Action Buttons Row */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 min-w-0 pt-2">
            <button
              type="button"
              className="btn-primary min-h-[44px] py-3 sm:py-2 px-5 rounded-lg bg-ink text-paper dark:bg-accent dark:text-paper font-medium text-sm hover:opacity-90 transition-opacity text-center shrink-0"
              onClick={save}
            >
              {editing ? "save changes → recompile" : "save entry → compile"}
            </button>
            <button
              type="button"
              className="btn-ghost min-h-[44px] py-3 sm:py-2 px-4 rounded-lg border border-line text-soft hover:text-ink text-sm text-center transition-colors shrink-0"
              onClick={onCancel}
            >
              discard
            </button>
            <span className="font-mono text-[11px] text-faint sm:ml-auto tabular-nums text-center sm:text-right truncate min-w-0 py-1">
              {markdown.length.toLocaleString("en-US")} chars · will ship as{" "}
              <span className="text-accent-deep break-all">{slugPreview}.md</span>
            </span>
          </div>
        </div>

        {/* ---------------- Live Preview ---------------- */}
        <div
          className={`min-w-0 w-full ${
            tab === "write" ? "hidden lg:block" : "block"
          }`}
        >
          <div className="lg:sticky lg:top-24 border border-line rounded-xl bg-surface/80 overflow-hidden w-full max-w-full min-w-0 shadow-sm">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-4 py-2.5 border-b border-line bg-surface font-mono text-[10px] tracking-wide text-faint min-w-0">
              <span className="inline-flex items-center gap-1.5 text-accent-deep font-semibold shrink-0">
                <i className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                live
              </span>
              {preview.doc && (
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 min-w-0 truncate">
                  <span className="tabular-nums shrink-0">{preview.doc.tokens} tokens</span>
                  <span className="tabular-nums shrink-0">{preview.doc.toc.length} headings</span>
                  <span className="tabular-nums shrink-0">{preview.doc.readingTime} min</span>
                  <span className="hidden sm:inline tabular-nums text-accent-deep shrink-0">
                    {preview.ms < 0.1 ? "<0.1" : preview.ms.toFixed(1)} ms
                  </span>
                </div>
              )}
            </div>
            {preview.doc ? (
              <div className="preview-scroll max-h-[calc(100vh-12rem)] overflow-y-auto p-4 sm:p-6 w-full max-w-full overflow-x-auto min-w-0">
                <article className="prose-kb prose-preview w-full max-w-full min-w-0 break-words">
                  <h1 className="mb-2! text-xl sm:text-2xl font-bold font-display break-words">
                    {title || "Untitled entry"}
                  </h1>
                  {description && (
                    <p className="font-body italic !text-soft text-sm sm:text-base mb-4 break-words">
                      {description}
                    </p>
                  )}
                  <div
                    className="w-full max-w-full overflow-x-auto min-w-0"
                    dangerouslySetInnerHTML={{ __html: preview.doc.html }}
                  />
                </article>
              </div>
            ) : (
              <div className="preview-scroll grid place-items-center min-h-[200px] p-6 text-center">
                <p className="font-mono text-xs text-faint">
                  write something — output appears here
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ---------------- Your Drafts ---------------- */}
      {userEntries.length > 0 && (
        <section className="mt-[clamp(2.5rem,5vw,4rem)] border-t border-line pt-8 w-full max-w-full min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 min-w-0">
            <h2 className="font-display font-semibold text-lg min-w-0 truncate">
              Your drafts{" "}
              <span className="font-mono text-xs text-faint font-normal">
                · {userEntries.length} stored
              </span>
            </h2>
            <button
              className="btn-ghost self-start sm:self-auto min-h-[44px] px-3.5 py-2 rounded-lg border border-line text-xs font-mono text-soft hover:text-ink transition-colors shrink-0"
              onClick={() => {
                downloadBackup(userEntries);
                onToast("backup downloaded as JSON");
              }}
            >
              ⤓ export backup
            </button>
          </div>
          <ul className="mt-4 divide-y divide-line border border-line rounded-xl bg-surface/70 overflow-hidden w-full max-w-full min-w-0">
            {userEntries.map((e) => (
              <li
                key={e.slug}
                className="flex items-center gap-3 px-3.5 sm:px-4 py-3.5 hover:bg-surface transition-colors min-w-0 w-full"
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{
                    background:
                      e.accent === "amber"
                        ? "var(--warm)"
                        : e.accent === "sky"
                        ? "var(--cool)"
                        : "var(--accent)",
                  }}
                />
                <button
                  onClick={() => onOpen(e.slug)}
                  className="min-w-0 text-left group flex-1 truncate"
                >
                  <span className="block font-display font-semibold text-[0.95rem] truncate group-hover:text-accent-deep transition-colors">
                    {e.title}
                  </span>
                  <span className="block font-mono text-[10px] text-faint truncate">
                    {e.slug}.md · {e.date}
                    <span className="hidden sm:inline">
                      {" "}
                      · {e.tags.map((t) => `#${t}`).join(" ")}
                    </span>
                  </span>
                </button>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    className="tbtn min-w-[40px] min-h-[40px] px-2.5 font-mono text-xs rounded border border-line hover:border-accent/40 flex items-center justify-center transition-colors"
                    title="edit"
                    onClick={() => {
                      window.scrollTo({ top: 0, behavior: "smooth" });
                      onEdit(e.slug);
                    }}
                  >
                    edit
                  </button>
                  <button
                    className={`tbtn min-w-[40px] min-h-[40px] px-2.5 font-mono text-xs rounded border transition-colors flex items-center justify-center ${
                      confirmSlug === e.slug
                        ? "danger border-danger bg-danger/10 text-danger font-semibold"
                        : "border-line hover:border-danger/40 text-faint hover:text-danger"
                    }`}
                    title="delete"
                    onClick={() => {
                      if (confirmSlug === e.slug) {
                        onDelete(e.slug);
                        setConfirmSlug(null);
                      } else {
                        setConfirmSlug(e.slug);
                        window.setTimeout(
                          () => setConfirmSlug((s) => (s === e.slug ? null : s)),
                          2600
                        );
                      }
                    }}
                  >
                    {confirmSlug === e.slug ? "sure?" : <IconTrash size="{13}"/>}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Field({
  label,
  required,
  error,
  className,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={`block w-full min-w-0 ${className ?? ""}`}>
      <span className="font-mono text-[10px] tracking-[0.18em] uppercase text-faint block truncate">
        {label}
        {required && <span className="text-accent-deep"> *</span>}
      </span>
      <span className="mt-1.5 block w-full min-w-0">{children}</span>
      {error && (
        <span className="mt-1 block font-mono text-[11px] text-danger">{error}</span>
      )}
    </label>
  );
}

const STARTER = `## The situation

Set the scene in two or three sentences. What broke, what shipped, what surprised you?

## What happened

- First thing
- Second thing
- The thing nobody expected

\`\`\`bash
$ the command you actually ran
output worth keeping
\`\`\`

## What you'd tell a teammate

> One quotable takeaway. If a future reader remembers one line, make it this one.

### Loose ends

1. Follow-up to file
2. Question still open
`;
