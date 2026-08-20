import {
  plainSearchText,
  renderCached,
  type TocItem,
} from "../lib/markdown";

export type Accent = "teal" | "amber" | "sky";

export interface Article {
  slug: string;
  title: string;
  description: string;
  date: string; // ISO
  author: string;
  role: string;
  tags: string[];
  accent: Accent;
  markdown: string;
}

export const articles: Article[] = [
  {
    slug: "markdown-to-dom-in-40ms",
    title: "From .md to DOM: Anatomy of a 40 ms Build",
    description:
      "Every page on this site starts life as a plain Markdown file. Here is the pipeline that turns it into highlighted, table-of-contents-aware HTML — and the budget each stage gets.",
    date: "2026-02-18",
    author: "Mara Ostrowski",
    role: "Tooling",
    tags: ["markdown", "tooling", "ssg"],
    accent: "sky",
    markdown: `
Content teams argue about editors. They should be arguing about the pipeline: the chain of small, replaceable stages between a \`.md\` file and the pixels a reader sees. Ours has six stages, and the whole trip takes about forty milliseconds.

## Six stages, one budget

The build is boring on purpose. Each stage reads a plain format and emits a plain format, so any stage can be swapped without touching the others.

| Stage | Reads | Emits | Budget |
| --- | --- | --- | --- |
| 1. Frontmatter | \`.md\` | metadata JSON | 0.4 ms |
| 2. Lexer | body text | token stream | 6.1 ms |
| 3. Renderer | tokens | HTML string | 9.8 ms |
| 4. Highlighter | code spans | Prism HTML | 14.2 ms |
| 5. ToC index | heading tokens | anchor map | 0.9 ms |
| 6. Hydrate | HTML | DOM | ~9 ms |

Measured on an M1 with \`hyperfine\`, cold cache, five articles:

\`\`\`bash
$ hyperfine --warmup 2 'node build.js'
Benchmark 1: node build.js
  Time (mean ± σ):      41.3 ms ±   2.1 ms    [User: 34.8 ms, System: 5.9 ms]
  Range (min … max):    38.6 ms …  47.0 ms    63 runs
\`\`\`

## Frontmatter is the contract

Metadata lives at the top of the source file, so the file system *is* the database. Nothing else to sync, nothing to migrate:

\`\`\`json
{
  "slug": "backpressure-streams",
  "title": "Backpressure: Teaching Streams to Push Back",
  "date": "2026-01-12",
  "tags": ["node", "streams", "performance"],
  "author": "Priya Raman"
}
\`\`\`

One rule keeps it honest: if a field is not in the frontmatter, it does not exist. No defaults invented downstream, no spooky enrichment.

## The lexer is the load-bearing wall

Everything after stage two is a pure function of the token stream. That single property buys us the table of contents, the reading-time estimate, and the word count for free — they are all just folds over the same tokens the renderer uses:

\`\`\`ts
import { Marked } from "marked";

const marked = new Marked();

marked.use({
  renderer: {
    heading({ tokens, depth }) {
      const text = this.parser.parseInline(tokens);
      const id = slugify(stripTags(text));
      return \`<h\${depth} id="\${id}">\${text}</h\${depth}>\`;
    },
  },
});

export const toHtml = (md: string) => marked.parse(md);
\`\`\`

Because headings emit their own \`id\`, the ToC is not a second parse — it is the *same* parse, observed from another angle.

## Cache what never changes

A document's rendered HTML only changes when its bytes change, so the cache key is a hash of the source. In practice that means the second build of the day renders nothing at all:

\`\`\`bash
$ node build.js
5 sources → 0 changed → 38 µs total (cache hits: 5)
\`\`\`

> A cache is a promise that the past will keep. Hashes are how you keep it.

The pipeline is deliberately small enough to hold in one head: **six stages, one token stream, zero daemons**. When a stage gets slow, you will know its name, its budget, and exactly where to look.
`,
  },
  {
    slug: "branded-types",
    title: "Branded Types: Make Illegal States Uncompilable",
    description:
      "Two strings walk into a function. One is a user ID, the other an order ID. TypeScript waves them both through — unless you brand them.",
    date: "2026-02-03",
    author: "Jonas Feld",
    role: "Type Systems",
    tags: ["typescript", "types", "api-design"],
    accent: "amber",
    markdown: `
The nastiest bugs are not type errors. They type-check beautifully, ship on a Tuesday, and page you on Saturday. Most of them share one shape: **two values of the same type that must never be swapped**.

## A bug the compiler should have caught

\`\`\`ts
function transfer(from: string, to: string, amount: number) {
  // move money between two account ids
}

transfer(accountId, orderId, 49.99); // compiles. ships. pages you at 3 a.m.
\`\`\`

Every argument is a \`string\`. Every argument is wrong. The compiler did its job — we just never told it what the job was.

## The brand

A *branded type* is a primitive carrying a phantom tag. The tag exists only at compile time; at runtime a \`UserId\` is still a plain string with zero overhead:

\`\`\`ts
declare const brand: unique symbol;

type Brand<T, B extends string> = T & { readonly [brand]: B };

type UserId = Brand<string, "UserId">;
type OrderId = Brand<string, "OrderId">;
type Cents = Brand<number, "Cents">;

function transfer(from: UserId, to: UserId, amount: Cents): Promise<void>;

transfer(accountId, orderId, 49.99);
//          ~~~~~~~~~  Argument of type 'OrderId' is not
//                     assignable to parameter of type 'UserId'.
\`\`\`

The illegal state did not become unlikely. It became *uncompilable*.

## Constructors are the only door

A brand is only as strong as its narrowest entry point. Raw strings cross the boundary exactly once — at the edge, where validation lives:

\`\`\`ts
const UserId = {
  parse(raw: string): UserId | null {
    return /^usr_[a-z0-9]{12}$/.test(raw) ? (raw as UserId) : null;
  },
};

function handleRequest(rawUserId: string) {
  const userId = UserId.parse(rawUserId);
  if (!userId) return { status: 422 };
  return transfer(userId, currentUser.id, toCents(4999));
}
\`\`\`

Two habits keep the door from leaking:

- **Cast once, at the edge.** The \`as UserId\` cast appears in exactly one place per brand. If you find a second one, that is the bug report.
- **Brand your units too.** \`Cents\` versus \`Dollars\` versus \`number\` has ended more fintech incidents than any linter.

### When brands pay rent

Brands are cheap, but they are not free — every brand is a small API decision. They earn their keep when a value:

1. Crosses a trust boundary (HTTP input, queue messages, CSV imports).
2. Has invariants narrower than its primitive (\`NonEmptyString\`, \`Cents\`).
3. Is easy to confuse with a sibling (\`UserId\` / \`OrgId\` / \`OrderId\`).

> If a wrong value would merely look odd, an enum or a comment is enough. If a wrong value would move money, brand it.

## The migration nobody notices

Because brands erase at runtime, adoption is incremental: brand one constructor, fix the red squiggles outward, repeat. No \`any\` escape hatches, no big-bang rewrite — just a ratchet that only turns one way. See the [TypeScript handbook on nominal patterns](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html) for the primitives underneath, and start with the value that scares you most.
`,
  },
  {
    slug: "backpressure-streams",
    title: "Backpressure: Teaching Streams to Push Back",
    description:
      "A 1.9 GB log file, 41 MB of RAM, and the two-word protocol that makes the difference. How Node streams negotiate speed — and what happens when they can't.",
    date: "2026-01-12",
    author: "Priya Raman",
    role: "Systems",
    tags: ["node", "streams", "performance"],
    accent: "teal",
    markdown: `
Every pipeline has a fast end and a slow end. Between them sits a buffer, and the entire discipline of streaming is the discipline of *what happens when that buffer fills up*. The answer, in Node, is backpressure — and most code quietly ignores it until the OOM killer does not.

## The firehose problem

The naive version reads the whole file into memory. For a 1.9 GB access log, that is exactly as bad as it sounds:

\`\`\`js
const fs = require("node:fs");
const zlib = require("node:zlib");

// read the entire file into one buffer
const buf = fs.readFileSync("access.log"); // RSS: ~1.9 GB
fs.writeFileSync("access.log.gz", zlib.gzipSync(buf));
\`\`\`

The streaming version never holds more than a few chunks at once:

\`\`\`js
const source = fs.createReadStream("access.log", {
  highWaterMark: 64 * 1024,
});

source.pipe(zlib.createGzip()).pipe(fs.createWriteStream("access.log.gz"));
// peak RSS: ~41 MB — same output, 46x less memory
\`\`\`

## highWaterMark is a budget, not a size

The \`highWaterMark\` is the most misunderstood option in the standard library. It is not "the buffer size". It is *how many bytes a stream may buffer before it starts saying no*:

- A readable pauses \`read()\` calls once it has buffered \`highWaterMark\` bytes.
- A writable returns \`false\` from \`write()\` once its queue crosses the mark.
- \`pipe()\` wires those two signals together for you — which is why you should almost never hand-roll the loop.

> A buffer is a loan against the future. Backpressure is the repayment schedule.

### Reading the signals

When you must hand-roll it — say, into a socket with custom framing — the protocol is two events and one return value:

\`\`\`js
function writeAll(reader, writer) {
  reader.on("data", (chunk) => {
    if (!writer.write(chunk)) {
      reader.pause(); // queue full → stop producing
    }
  });

  writer.on("drain", () => reader.resume()); // queue drained → go again
  reader.on("end", () => writer.end());
}
\`\`\`

Miss the \`false\`, skip the \`pause()\`, and Node will happily queue every chunk in memory. The stream "works" right up until it doesn't.

## Numbers from the bench

Same log file, same machine, \`/usr/bin/time -l\`:

\`\`\`bash
$ /usr/bin/time -l node naive.js
  1932.4 MB  peak resident set size
  23.1 s     wall time

$ /usr/bin/time -l node streaming.js
    41.7 MB  peak resident set size
  25.8 s     wall time
\`\`\`

You trade 12% wall time for 2% of the memory. On a 512 MB container, that is the difference between "slow" and "killed".

## Rules of thumb

1. Default to \`pipe()\` or \`pipeline()\` — the latter also forwards errors and destroys streams on failure.
2. Tune \`highWaterMark\` *after* profiling, never before. Most workloads never touch it.
3. If RSS climbs linearly with input size, something is ignoring a \`false\` somewhere. Find it with \`--max-old-space-size\` set deliberately low.

The mental model is one sentence: **the slow consumer sets the pace, and everyone upstream finds out through a return value**. Everything else is plumbing. The [Node streams guide](https://nodejs.org/api/stream.html) is the reference; this article is the apology for ignoring it.
`,
  },
  {
    slug: "git-archaeology",
    title: "Git Archaeology: Read History Like a Debugger",
    description:
      "The regression shipped three weeks ago and nobody remembers why. pickaxe, bisect, blame, and the reflog — four trowels for digging through time.",
    date: "2025-12-09",
    author: "Mara Ostrowski",
    role: "Workflow",
    tags: ["git", "workflow", "debugging"],
    accent: "amber",
    markdown: `
A repository is a database with a clock in it. Every decision anyone made — including the bad ones — is still there, queryable, indexed by time. The problem is not missing information. It is that most people only know one query: \`git log\`.

## Start with the crime scene

Before bisecting anything, ask the file itself what happened to it. \`--follow\` survives renames; \`-S\` finds the commit where a string *appeared or disappeared*, which is usually the commit you actually want:

\`\`\`bash
# who touched the billing code, newest first?
git log --oneline --follow -- src/billing/invoice.ts

# when did this function enter (or leave) the codebase?
git log -S "retryWithBackoff" --oneline -- src/billing/

# which commits changed the *number* of matches? (the pickaxe)
git log -S "MAX_RETRIES" --pickaxe-regex --stat
\`\`\`

The pickaxe (\`-S\`) is the single most underused flag in Git. It answers "when did this line change?" without reading every diff since 2019.

## Bisect: divide and conquer

A regression with a known-good release is a search problem, and binary search beats scrolling:

\`\`\`bash
git bisect start
git bisect bad HEAD
git bisect good v2.4.0
# Bisecting: 11 revisions left to test after this (roughly 4 steps)

# test, then mark:
git bisect good   # or: git bisect bad
# ...four rounds later...
# a41f9c2 is the first bad commit
\`\`\`

Eleven suspect commits collapse to four test rounds. And if the test is scriptable, remove yourself from the loop entirely:

\`\`\`bash
git bisect run npm test -- --grep "invoice totals"
\`\`\`

## Blame is a question, not an accusation

\`blame\` answers "which commit last touched these lines?" — which is a pointer to a *decision*, with its rationale one \`git show\` away:

\`\`\`bash
git blame -L 42,58 -- src/billing/invoice.ts
git show a41f9c2 --stat      # the decision, with its message
\`\`\`

Pair it with \`--ignore-rev\` for the formatter commits that drowned the real signal, and add it to \`.git-blame-ignore-revs\` so the whole team shares the filter.

### The reflog safety net

Even your *own* mistakes are recoverable. The reflog records every position \`HEAD\` has held — including the commit you just orphaned with a bad rebase:

\`\`\`bash
git reflog
# f22c1ab HEAD@{0}: rebase (finish): returning to refs/heads/main
# 9d31aa8 HEAD@{4}: commit: feat: prorate refunds correctly  ← there it is

git checkout -b rescue-mission HEAD@{4}
\`\`\`

Nothing in Git is lost for at least 90 days. Panic is optional.

## Habits of the fluent

- Write commit messages as if a stranger will bisect to them at 3 a.m. — a stranger will, and it will be you.
- Tag releases. \`git bisect\` without a known-good anchor is just guessing with extra steps.
- Keep the pickaxe one keystroke away: alias \`pick = "log -S --oneline"\`.

> History is not a record of what happened. It is a record of what people *believed* at each step — and beliefs are debuggable.
`,
  },
  {
    slug: "design-tokens-compiler-target",
    title: "Design Tokens Are a Compiler Target",
    description:
      "Stop copy-pasting hex values into platform code. Treat tokens as source, run them through a compiler, and let CSS custom properties be the emitted IR.",
    date: "2025-11-20",
    author: "Jonas Feld",
    role: "Design Systems",
    tags: ["css", "design-systems", "tooling"],
    accent: "teal",
    markdown: `
A design system that lives in Figma and is *re-typed* into code is not a system. It is a transcription exercise with a merge conflict problem. The fix is to change what the source of truth is: tokens go in one file, everything else is generated.

## Tokens are source code

The token file is the single place a decision is allowed to exist. It is plain data — versioned, diffable, reviewable like any other source:

\`\`\`json
{
  "color": {
    "accent":  { "value": "#0b7a5c", "type": "color" },
    "surface": { "value": "#f7f9f5", "type": "color" },
    "ink":     { "value": "#141d18", "type": "color" }
  },
  "space": {
    "sm": { "value": "0.5rem",  "type": "dimension" },
    "md": { "value": "1rem",    "type": "dimension" },
    "lg": { "value": "1.75rem", "type": "dimension" }
  },
  "radius": {
    "card": { "value": "{space.md} * 0.375", "type": "calc" }
  }
}
\`\`\`

Note the reference in \`radius.card\`: tokens can *derive* from tokens. That is where the compiler starts earning its keep.

## Compile, don't copy

The compiler reads the schema and emits platform code. For the web, the output is custom properties — the IR of the design system:

\`\`\`css
/* generated — do not edit */
:root {
  --color-accent: #0b7a5c;
  --color-surface: #f7f9f5;
  --color-ink: #141d18;
  --space-sm: 0.5rem;
  --space-md: 1rem;
  --space-lg: 1.75rem;
  --radius-card: calc(var(--space-md) * 0.375);
}

.dark {
  --color-accent: #43d6a3;
  --color-ink: #e4efe7;
}
\`\`\`

Component code only ever consumes \`var(--…)\`. A designer changes one JSON value; the diff propagates to every surface that references it.

### One source, every platform

The same token file feeds whatever the platform speaks, because the *meaning* lives in the schema, not the syntax:

- **Web** → CSS custom properties, as above.
- **iOS** → a generated \`Colors.xcassets\` catalog.
- **Android** → \`colors.xml\` resources.
- **Docs** → a living styleguide rendered from the same values.

When the palette shifts, the review is a diff of *intent*, not a hunt through four codebases:

\`\`\`diff
  "color": {
-   "accent": { "value": "#12a583", "type": "color" },
+   "accent": { "value": "#0b7a5c", "type": "color" }
  }
\`\`\`

## What breaks without the compiler

Teams that skip this step do not avoid the work — they distribute it, uncoordinated, across every engineer:

1. **Drift.** The Figma green and the CSS green quietly become two greens.
2. **Zombie values.** A hex literal in a forgotten component survives three redesigns.
3. **Unshippable theme changes.** Dark mode becomes an archaeology project instead of a \`.dark\` block.

> Copy-paste is a build system with no rebuild step, no cache, and no error messages.

The mental shift is small and total: stop asking "where should this color go?" and start asking "which target should the compiler emit?" Once values flow one way, from source to artifact, the design system stops being a document and becomes a *toolchain*.
`,
  },
];

/* ---------- derived helpers ---------- */

export interface EntryCard extends Article {
  toc: TocItem[];
  readingTime: number;
  codeLines: number;
  words: number;
}

/** run an article through the pipeline and attach the extracted stats */
export function enrich(a: Article): EntryCard {
  const r = renderCached(a.slug, a.markdown);
  return {
    ...a,
    toc: r.toc,
    readingTime: r.readingTime,
    codeLines: r.codeLines,
    words: r.words,
  };
}

export function plainBody(md: string): string {
  return plainSearchText(md);
}

export const sortedArticles = [...articles].sort(
  (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
);

export function allTags(list: Article[] = articles): { tag: string; count: number }[] {
  const map = new Map<string, number>();
  for (const a of list)
    for (const t of a.tags) map.set(t, (map.get(t) ?? 0) + 1);
  return [...map.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}

export function formatDate(iso: string): string {
  return new Date(iso + "T12:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export const accentVars: Record<Accent, { c: string; soft: string }> = {
  teal: { c: "var(--accent)", soft: "var(--accent-soft)" },
  amber: { c: "var(--warm)", soft: "var(--warm-soft)" },
  sky: { c: "var(--cool)", soft: "var(--cool-soft)" },
};
