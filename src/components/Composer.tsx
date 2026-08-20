import React, { useMemo, useRef, useState } from "react";
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
    const files = [...list].filter((f) =>
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
    <div className="pb-[clamp(3rem,6vw,5rem)]">
      <div className="pt-6 flex flex-wrap items-center justify-between gap-3">
        <button
          onClick={onCancel}
          className="group inline-flex items-center gap-2 font-mono text-xs text-faint hover:text-accent-deep transition-colors min-h-[44px]"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-transform duration-300 group-hover:-translate-x-1">
            <path d="M19 12H5M11 18l-6-6 6-6" />
          </svg>
          ~/library
        </button>
        {/* Hidden on mobile to prevent awkward wrapping */}
        <span className="hidden sm:inline font-mono text-xs text-faint">
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

      <header className="mt-6 max-w-[44rem]">
        <h1 className="font-display font-bold tracking-[-0.02em] leading-tight text-[clamp(1.7rem,1.2rem+2.2vw,2.6rem)]">
          {editing ? "Revise the record." : "Add to the codex."}
        </h1>
        <p className="mt-2 text-soft font-body italic text-[1.02rem]">
          {editing
            ? "Changes recompile the moment you save — same pipeline, fresh output."
            : "Write Markdown, drop in a file, or paste notes. The pipeline does the rest."}
        </p>
      </header>

      {/* mobile tab switch - full width & larger touch targets */}
      <div className="mt-6 lg:hidden flex border border-line rounded-lg p-1 bg-surface">
        {(["write", "preview"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 px-4 py-3 rounded-md font-mono text-xs transition-all ${
              tab === t
                ? "bg-ink text-paper dark:bg-accent dark:text-paper"
                : "text-faint hover:text-ink"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="mt-4 grid lg:grid-cols-2 gap-[clamp(1rem,2.5vw,2rem)] items-start">
        {/* ---------------- form + editor ---------------- */}
        <div className={`space-y-5 ${tab === "preview" ? "hidden lg:block" : ""}`}>
          {/* dropzone */}
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
            className={`dropzone ${dragOver ? "over" : ""}`}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && fileRef.current?.click()}
          >
            <IconUpload size={20} className="shrink-0" />
            <div className="text-left">
              <p className="font-mono text-xs text-ink/85">
                {dragOver ? "release to import" : "drop .md files here, or tap to browse"}
              </p>
              <p className="font-mono text-[10px] text-faint mt-0.5">
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

          {/* metadata */}
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="title" required error={errors.title}>
              {/* text-base prevents iOS Safari from zooming on focus */}
              <input
                className="field text-base"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="What you learned, in one line"
                maxLength={120}
              />
            </Field>
            <Field label="date">
              <input
                className="field text-base"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </Field>
            <Field label="author">
              <input
                className="field text-base"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="you"
              />
            </Field>
            <Field label="role / section">
              <input
                className="field text-base"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="e.g. Systems, Tooling"
              />
            </Field>
            <Field label="tags (comma separated)" className="sm:col-span-2">
              <input
                className="field text-base"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="streams, debugging, postmortem"
              />
              {tags.length > 0 && (
                <span className="mt-2 flex flex-wrap gap-1.5">
                  {tags.map((t) => (
                    <span key={t} className="chip">
                      {t}
                    </span>
                  ))}
                </span>
              )}
            </Field>
            <Field label="description (shown on the card)" className="sm:col-span-2">
              <textarea
                className="field resize-y text-base"
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="One or two sentences a future reader will thank you for."
              />
            </Field>
            <Field label="accent">
              <div className="flex gap-2">
                {ACCENTS.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => setAccent(a.id)}
                    className={`swatch min-w-[40px] min-h-[40px] ${accent === a.id ? "on" : ""}`}
                    style={{ background: a.color }}
                    title={a.label}
                    aria-label={a.label}
                  />
                ))}
              </div>
            </Field>
          </div>

          {/* editor */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono text-[10px] tracking-[0.18em] uppercase text-faint">
                body · markdown
              </span>
            </div>
            {/* Horizontal scrolling snippet toolbar for mobile */}
            <div className="flex gap-1.5 overflow-x-auto pb-2 -mb-2 snap-x snap-mandatory">
              {SNIPPETS.map((s) => (
                <button
                  key={s.label}
                  onClick={() => insert(s.before, s.after)}
                  className="tbtn min-h-[40px] px-3 shrink-0 snap-start"
                  title={`insert ${s.label}`}
                >
                  {s.label}
                </button>
              ))}
            </div>
            <textarea
              ref={taRef}
              className={`editor text-base min-h-[300px] mt-3 ${errors.body ? "invalid" : ""}`}
              value={markdown}
              onChange={(e) => setMarkdown(e.target.value)}
              spellCheck={false}
              placeholder={"## Start with a heading\n\nTell the story. Add a ```fence, a table, a > quote…"}
            />
            {errors.body && (
              <p className="mt-1.5 font-mono text-[11px] text-danger">{errors.body}</p>
            )}
          </div>

          {/* Stacks vertically on mobile for easier tapping */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <button className="btn-primary py-3 sm:py-2" onClick={save}>
              {editing ? "save changes → recompile" : "save entry → compile"}
            </button>
            <button className="btn-ghost py-3 sm:py-2" onClick={onCancel}>
              discard
            </button>
            <span className="font-mono text-[11px] text-faint sm:ml-auto tabular-nums text-center sm:text-right">
              {markdown.length.toLocaleString("en-US")} chars · will ship as{" "}
              <span className="text-accent-deep break-all">{slugPreview}.md</span>
            </span>
          </div>
        </div>

        {/* ---------------- live preview ---------------- */}
        <div className={`${tab === "write" ? "hidden lg:block" : ""}`}>
          <div className="lg:sticky lg:top-24 border border-line rounded-xl bg-surface/80 overflow-hidden">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5 border-b border-line bg-surface font-mono text-[10px] tracking-wide text-faint">
              <span className="inline-flex items-center gap-1.5 text-accent-deep">
                <i className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                live
              </span>
              {preview.doc && (
                <>
                  <span className="tabular-nums">{preview.doc.tokens} tokens</span>
                  <span className="tabular-nums">{preview.doc.toc.length} headings</span>
                  <span className="tabular-nums">{preview.doc.readingTime} min</span>
                  {/* Hide render time on mobile to save space */}
                  <span className="hidden sm:inline tabular-nums text-accent-deep">
                    {preview.ms < 0.1 ? "<0.1" : preview.ms.toFixed(1)} ms
                  </span>
                </>
              )}
            </div>
            {preview.doc ? (
              <div className="preview-scroll">
                <article className="prose-kb prose-preview">
                  <h1 className="mb-2!">{title || "Untitled entry"}</h1>
                  {description && (
                    <p className="font-body italic !text-soft">{description}</p>
                  )}
                  <div dangerouslySetInnerHTML={{ __html: preview.doc.html }} />
                </article>
              </div>
            ) : (
              <div className="preview-scroll grid place-items-center min-h-[200px]">
                <p className="font-mono text-xs text-faint">
                  write something — output appears here
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ---------------- your drafts ---------------- */}
      {userEntries.length > 0 && (
        <section className="mt-[clamp(2.5rem,5vw,4rem)] border-t border-line pt-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display font-semibold text-lg">
              Your drafts{" "}
              <span className="font-mono text-xs text-faint font-normal">
                · {userEntries.length} stored
              </span>
            </h2>
            <button
              className="btn-ghost"
              onClick={() => {
                downloadBackup(userEntries);
                onToast("backup downloaded as JSON");
              }}
            >
              ⤓ export backup
            </button>
          </div>
          <ul className="mt-4 divide-y divide-line border border-line rounded-xl bg-surface/70 overflow-hidden">
            {userEntries.map((e) => (
              <li
                key={e.slug}
                className="flex items-center gap-3 px-4 py-4 hover:bg-surface transition-colors"
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
                  className="min-w-0 text-left group flex-1"
                >
                  <span className="block font-display font-semibold text-[0.95rem] truncate group-hover:text-accent-deep transition-colors">
                    {e.title}
                  </span>
                  <span className="block font-mono text-[10px] text-faint truncate">
                    {e.slug}.md · {e.date}
                    {/* Hide tags on mobile to prevent overflow */}
                    <span className="hidden sm:inline"> · {e.tags.map((t) => `#${t}`).join(" ")}</span>
                  </span>
                </button>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    className="tbtn min-w-[40px] min-h-[40px] flex items-center justify-center"
                    title="edit"
                    onClick={() => {
                      window.scrollTo({ top: 0 });
                      onEdit(e.slug);
                    }}
                  >
                    edit
                  </button>
                  <button
                    className={`tbtn min-w-[40px] min-h-[40px] flex items-center justify-center ${confirmSlug === e.slug ? "danger" : ""}`}
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
                    {confirmSlug === e.slug ? "sure?" : <IconTrash size={13} />}
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
    <label className={`block ${className ?? ""}`}>
      <span className="font-mono text-[10px] tracking-[0.18em] uppercase text-faint">
        {label}
        {required && <span className="text-accent-deep"> *</span>}
      </span>
      <span className="mt-1.5 block">{children}</span>
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