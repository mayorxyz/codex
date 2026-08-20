import { Marked } from "marked";
import Prism from "prismjs";
import "prismjs/components/prism-typescript";
import "prismjs/components/prism-bash";
import "prismjs/components/prism-json";
import "prismjs/components/prism-css";
import "prismjs/components/prism-diff";
import "prismjs/components/prism-markdown";

/* ------------------------------------------------------------------ */
/* language aliases                                                    */
/* ------------------------------------------------------------------ */

const ALIASES: Record<string, string> = {
  ts: "typescript",
  tsx: "typescript",
  js: "javascript",
  node: "javascript",
  jsx: "javascript",
  sh: "bash",
  shell: "bash",
  zsh: "bash",
  console: "bash",
  md: "markdown",
  yml: "json",
};

function resolveLang(lang: string | undefined): string {
  const l = (lang || "text").trim().toLowerCase();
  const resolved = ALIASES[l] ?? l;
  if (Prism.languages[resolved]) return resolved;
  return "text";
}

/* ------------------------------------------------------------------ */
/* small string helpers                                                */
/* ------------------------------------------------------------------ */

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function stripTags(html: string): string {
  return html.replace(/<[^>]*>/g, "");
}

function stripInline(md: string): string {
  return md
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .trim();
}

export function slugify(s: string): string {
  return (
    s
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "") || "section"
  );
}

/* ------------------------------------------------------------------ */
/* the pipeline                                                        */
/* ------------------------------------------------------------------ */

export interface TocItem {
  id: string;
  text: string;
  depth: number;
}

export interface RenderResult {
  html: string;
  toc: TocItem[];
  words: number;
  codeLines: number;
  tokens: number;
  readingTime: number; // minutes
}

const marked = new Marked({ gfm: true, breaks: false, async: false });

/** reset per document — keeps renderer slugs in lockstep with the ToC */
let slugger: Map<string, number>;

marked.use({
  renderer: {
    heading(this: any, token: any) {
      const depth: number = token.depth;
      const text: string = this.parser.parseInline(token.tokens);
      if (depth === 2 || depth === 3) {
        const base = slugify(stripInline(token.text));
        const n = slugger.get(base) ?? 0;
        slugger.set(base, n + 1);
        const id = n === 0 ? base : `${base}-${n}`;
        return `<h${depth} id="${id}"><a class="heading-anchor" href="#${id}" aria-hidden="true">#</a>${text}</h${depth}>\n`;
      }
      return `<h${depth}>${text}</h${depth}>\n`;
    },

    code(this: any, token: any) {
      const raw: string = token.text ?? "";
      const info: string = (token.lang || "").trim();
      const [langPart, ...metaParts] = info.split(/\s+/);
      const resolved = resolveLang(langPart);

      let file = "";
      const titleMatch = metaParts.join(" ").match(/title="([^"]+)"/);
      if (titleMatch) file = titleMatch[1];

      const grammar = Prism.languages[resolved];
      const body = grammar
        ? Prism.highlight(raw, grammar, resolved)
        : escapeHtml(raw);

      const label = file || (resolved === "text" ? "plaintext" : resolved);

      return (
        `<figure class="codeblock" data-lang="${escapeHtml(resolved)}">` +
        `<figcaption>` +
        `<span class="dots"><i></i><i></i><i></i></span>` +
        `<span class="file-label">${escapeHtml(label)}</span>` +
        `<button type="button" class="copy-btn" data-copy>copy</button>` +
        `</figcaption>` +
        `<pre><code class="language-${escapeHtml(resolved)}">${body}\n</code></pre>` +
        `</figure>\n`
      );
    },

    link(this: any, token: any) {
      const href: string = token.href || "#";
      const text: string = this.parser.parseInline(token.tokens);
      const external = /^https?:\/\//.test(href);
      const cls = external ? ' class="ext"' : "";
      const attrs = external ? ' target="_blank" rel="noopener noreferrer"' : "";
      return `<a href="${escapeHtml(href)}"${cls}${attrs}>${text}</a>`;
    },
  },
});

export function renderMarkdown(md: string): RenderResult {
  /* stage 1 — lex */
  const lexed = marked.lexer(md);

  /* stage 2 — ToC index (depth 2–3, same slugger the renderer uses) */
  slugger = new Map();
  const toc: TocItem[] = [];
  for (const t of lexed as any[]) {
    if (t.type === "heading" && (t.depth === 2 || t.depth === 3)) {
      const base = slugify(stripInline(t.text));
      const n = slugger.get(base) ?? 0;
      slugger.set(base, n + 1);
      toc.push({ id: n === 0 ? base : `${base}-${n}`, text: stripInline(t.text), depth: t.depth });
    }
  }

  /* stage 3 — stats from the raw source */
  let codeLines = 0;
  const prose = md.replace(/```[\s\S]*?```/g, (block) => {
    codeLines += block.split("\n").length - 2;
    return " ";
  });
  const words = (prose.replace(/[`*_>#|[\]()!-]/g, " ").match(/\S+/g) ?? []).length;
  const seconds = (words / 220) * 60 + codeLines * 2.2;
  const readingTime = Math.max(1, Math.round(seconds / 60));

  /* stage 4 — render (slugger already consumed by ToC; re-seed identically) */
  slugger = new Map();
  const html = marked.parse(md) as string;

  return { html, toc, words, codeLines, tokens: lexed.length, readingTime };
}

/** raw source view: markdown highlighted as markdown */
export function highlightMarkdownSource(md: string): string {
  const grammar = Prism.languages["markdown"];
  return grammar ? Prism.highlight(md.trim(), grammar, "markdown") : escapeHtml(md);
}

export function plainSearchText(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/[`*_>#|[\]()!]/g, " ")
    .toLowerCase();
}

/* memoize per document */
const cache = new Map<string, RenderResult>();
export function renderCached(key: string, md: string): RenderResult {
  let r = cache.get(key);
  if (!r) {
    r = renderMarkdown(md);
    cache.set(key, r);
  }
  return r;
}

/* ------------------------------------------------------------------ */
/* frontmatter — for imported files                                    */
/* ------------------------------------------------------------------ */

export interface ParsedFile {
  meta: {
    title?: string;
    description?: string;
    date?: string;
    author?: string;
    role?: string;
    accent?: "teal" | "amber" | "sky";
    tags: string[];
  };
  body: string;
}

/** Tolerant YAML-subset frontmatter parser: `--- … ---` block at top of file. */
export function parseFrontmatter(raw: string): ParsedFile {
  const meta: ParsedFile["meta"] = { tags: [] };
  let body = raw.replace(/^\uFEFF/, "");

  const m = body.match(/^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*\r?\n?/);
  if (m) {
    const lines = m[1].split(/\r?\n/);
    let listKey: string | null = null;
    for (const line of lines) {
      const list = line.match(/^\s+-\s+(.*)$/);
      if (list && listKey) {
        if (listKey === "tags") meta.tags.push(cleanVal(list[1]));
        continue;
      }
      listKey = null;
      const kv = line.match(/^([A-Za-z][\w-]*)\s*:\s*(.*)$/);
      if (!kv) continue;
      const key = kv[1].toLowerCase();
      const val = cleanVal(kv[2]);
      if (key === "tags") {
        const bracket = kv[2].match(/^\[(.*)\]$/);
        const src = bracket ? bracket[1] : kv[2];
        if (src.trim()) meta.tags = src.split(",").map(cleanVal).filter(Boolean);
        else listKey = "tags";
      } else if (key === "accent" && /^(teal|amber|sky)$/i.test(val)) {
        meta.accent = val.toLowerCase() as ParsedFile["meta"]["accent"];
      } else if (key in meta) {
        (meta as Record<string, unknown>)[key] = val;
      }
    }
    body = body.slice(m[0].length);
  } else {
    /* no frontmatter — title from first heading or first non-empty line */
    const heading = body.match(/^#\s+(.+)$/m);
    const firstLine = body.match(/^[ \t]*([^\s#].*)$/m);
    meta.title = heading?.[1] ?? firstLine?.[1];
    if (heading) body = body.replace(heading[0], "").replace(/^\s+/, "");
  }

  meta.tags = meta.tags
    .map((t) => t.replace(/^#/, "").toLowerCase())
    .filter(Boolean)
    .slice(0, 8);
  if (meta.date && !/^\d{4}-\d{2}-\d{2}$/.test(meta.date)) meta.date = undefined;
  return { meta, body: body.trim() };
}

function cleanVal(s: string): string {
  return s.trim().replace(/^["']|["']$/g, "");
}
