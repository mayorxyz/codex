# codex

Codex is a responsive, client-side technical knowledge base for browsing, searching, writing, importing, and previewing Markdown entries.

## Project Overview

- Browse built-in and user-authored articles with tag filtering and full-text search.
- Compile Markdown into highlighted HTML with headings, a table of contents, reading-time stats, and copyable code blocks.
- Create or import entries locally; user data stays in the browser and can be exported as JSON.

**Stack:** React 18, TypeScript, Vite, Tailwind CSS 4, Marked, Prism, Framer Motion, and Lucide React.

## Prerequisites and Installation

Requirements:

- Node.js 18+ and npm
- Windows, macOS, or Linux
- About 250 MB for dependencies and build output
- No Python, database, API credentials, or external service is required

```bash
npm install
npm run dev
```

The development server listens on `http://localhost:3000`. Vite is configured with `host: 0.0.0.0` and `strictPort: true`; stop another process using port 3000 if startup fails.

## Project Structure

```text
.
├── index.html              # HTML entry point and root element
├── package.json            # Scripts and dependencies
├── vite.config.js          # Vite, React, Tailwind, and dev-server settings
├── tsconfig.json           # Strict TypeScript configuration
└── src/
		├── main.tsx            # React bootstrap and CSS import
		├── App.tsx             # Hash routing, theme, state, and view composition
		├── index.css           # Design tokens, responsive layout, and Markdown styles
		├── data/articles.ts    # Built-in articles, metadata, and derived article helpers
		├── lib/markdown.ts     # Markdown parsing, Prism highlighting, ToC, and stats
		├── lib/store.ts        # localStorage persistence, slugs, and JSON backups
		└── components/
				├── ArticleView.tsx # Read/source article view and article actions
				├── Composer.tsx    # Create/edit/import Markdown entries
				├── Guide.tsx       # In-app usage documentation
				├── Library.tsx     # Search, tag filtering, and article cards
				├── Masthead.tsx    # Library hero and entry summary
				├── Playground.tsx  # Live Markdown editor and compiler stats
				├── Reveal.tsx      # Scroll/reveal animation wrapper
				├── TocRail.tsx     # Reading progress and active heading tracking
				└── icons.tsx       # Small reusable SVG icon components
```

## Architecture and Data Flow

```text
Built-in articles --------------------┐
																			v
Imported Markdown -> Composer -> App state -> Library / ArticleView
																			|             |
																			v             v
															localStorage       renderCached()
																											 |
																			Marked lexer -> ToC + stats
																											 |
																									 Prism -> HTML
```

`App` owns the route, theme, search state, and user entries. Navigation uses the URL hash, so routes are deep-linkable without a server router. Article content is rendered by `renderMarkdown` in `src/lib/markdown.ts`; the same function powers the composer preview and playground.

### Routes

| Hash route | View |
| --- | --- |
| `#/` | Library |
| `#/article/:slug` | Article reader |
| `#/composer` | New-entry composer |
| `#/composer/:slug` | Edit user entry |
| `#/playground` | Live Markdown playground |
| `#/guide` | In-app guide |

## Module and Function Reference

### `src/App.tsx`

- `toHash(route)` serializes a route to a hash URL.
- `readRoute()` parses the current hash, defaulting to the library.
- `App()` merges built-in articles with local entries, routes views, toggles dark mode, handles keyboard shortcuts, and persists mutations.
- Side effects: updates `window.location.hash`, `document.documentElement`, `localStorage`, scroll position, and transient toast messages.

### `src/data/articles.ts`

- `Article` is the content contract: `slug`, title metadata, tags, accent, and raw `markdown`.
- `articles` is the built-in corpus; edit this array to add or change bundled content.
- `enrich(article)` produces display metadata such as rendered stats and plain search text.
- `plainBody`, `allTags`, `formatDate`, and `accentVars` support library rendering.

### `src/lib/markdown.ts`

- `renderMarkdown(md)` returns `{ html, toc, words, codeLines, tokens, readingTime }`.
- Headings at depth 2 and 3 receive stable IDs and ToC entries.
- Fenced code is highlighted with Prism; supported aliases include `ts`, `tsx`, `js`, `jsx`, `sh`, `md`, and `yml`.
- External links receive `target="_blank"` and `rel="noopener noreferrer"`.
- `renderCached(key, md)` memoizes rendered documents by key. Use a content-aware key if a key can refer to changing source.
- `parseFrontmatter(raw)` parses the tolerant YAML subset used by imports.

### `src/lib/store.ts`

- Storage key: `codex.user-entries.v1`.
- `loadUserEntries()` reads and minimally validates local entries.
- `saveUserEntries(entries)` writes JSON and returns `false` when browser storage is unavailable or full.
- `uniqueSlug(base, taken)` creates a slug and appends `-2`, `-3`, and so on for collisions.
- `downloadBackup(entries)` downloads `codex-backup-YYYY-MM-DD.json`.

### UI components

`Library` filters by query, title, description, tags, and body. `ArticleView` renders read/source modes and user-entry edit/delete actions. `Composer` validates title/body, limits tags to eight, previews live, and supports `.md`, `.markdown`, `.mdown`, and text-file imports. `Playground` recompiles after a short debounce and exposes compiler statistics. `Guide` is rendered through the same Markdown pipeline.

## Configuration and Environment Variables

There are no application environment variables. No `.env` file is needed, and no secrets should be added.

Configuration locations:

- `vite.config.js`: dev host, port, HMR port, and plugins.
- `tsconfig.json`: TypeScript target, strictness, module resolution, and included source.
- `src/index.css`: visual tokens and component styling.
- Browser localStorage: user entries and the `codex-theme` preference.

## Running, Building, and Testing

```bash
npm run dev       # start Vite development server
npm run typecheck # run strict TypeScript validation
npm run build     # create the production bundle in dist/
```

Successful builds end with Vite output showing generated files in `dist/`. There is currently no automated test suite or coverage requirement. Validate UI changes manually in the dev server, including desktop/mobile layout, hash routes, imports, search, dark mode, and local persistence.

## Common Modifications

### Add or change bundled articles

Edit the `articles` array in `src/data/articles.ts`:

```ts
{
	slug: "cache-notes",
	title: "Cache Notes",
	description: "A short description for the library card.",
	date: "2026-08-21",
	author: "Your Name",
	role: "Systems",
	tags: ["cache", "performance"],
	accent: "teal",
	markdown: "## Contents\n\nWrite Markdown here."
}
```

Keep slugs unique. Built-in entries cannot be deleted in the UI.

### Change API endpoints or base URLs

There is no API client or base URL. Add a service module and environment-backed configuration only if a backend is introduced; do not place credentials in source or committed `.env` files.

### Adjust limits, timeouts, or thresholds

- Toast lifetime: the `2800` ms timeout in `src/App.tsx`.
- Playground debounce: the `110` ms timer in `src/components/Playground.tsx`.
- Toast/copy feedback timers: local `setTimeout` calls in `App.tsx`, `ArticleView.tsx`, and `Guide.tsx`.
- Reading speed: `220` words/minute plus `2.2` seconds per code line in `renderMarkdown`.
- Import tags: `.slice(0, 8)` in `Composer.tsx`.

Change the constant in the owning module, then run `npm run typecheck` and test the affected interaction.

### Change validation or frontmatter

Update `parseFrontmatter` in `src/lib/markdown.ts` for imported fields. Update `Composer.save()` for editor validation. The current required fields are a non-empty title and Markdown body; invalid dates fall back to today, and empty tags become `notes`.

### Change database schemas

There is no database schema. The persisted shape is the `Article` interface and the JSON value under `codex.user-entries.v1`. If persistence changes, add migration/version handling before changing that key or shape.

### Customize UI and styling

Edit `src/index.css` for colors, typography, breakpoints, and Markdown output. Edit the relevant component for structure and behavior. Preserve the `Article` contract and run the typecheck after changing props.

### Add a feature or route

Add the route union, hash serialization/parsing, navigation entry, and render branch in `src/App.tsx`; create the view under `src/components/`. Keep shared parsing/storage logic in `src/lib/` rather than duplicating it in a component.

## Import Format

Imports accept optional frontmatter:

```md
---
title: Cache invalidation, revisited
description: What the outage taught us about TTLs.
date: 2026-08-21
tags: caching, postmortem
author: You
role: Postmortems
accent: amber
---

## The incident

Body content starts here.
```

Without frontmatter, the first `# heading` supplies the title; otherwise the filename is used. A single file opens for review, while multiple files are imported directly as new entries.

## Troubleshooting

| Problem | Resolution |
| --- | --- |
| `npm run dev` cannot bind | Free port 3000; `strictPort` intentionally prevents fallback ports. |
| TypeScript errors after a change | Run `npm run typecheck`; inspect the reported component prop or `Article` field. |
| Entries disappeared | Check the same browser profile and origin; clearing site data removes local entries. Restore a JSON export through the composer. |
| Storage warning | Export a backup, remove unused entries, or use a browser profile with available localStorage. |
| Copy button does nothing | Serve the app over the dev server and allow clipboard access; direct restricted file contexts may block the Clipboard API. |
| Styles look stale | Restart Vite, then hard-refresh the page. Confirm the edit is in `src/index.css` or the owning component. |

For debugging, use browser DevTools Console and Application/Storage panels. There is no server log stream because the app is client-only.

## Deployment

1. Run `npm ci` in CI or `npm install` locally.
2. Run `npm run typecheck`.
3. Run `npm run build`.
4. Publish `dist/` to any static host.
5. Configure the host to serve `index.html` for direct requests; navigation itself uses hash routes.

Rollback is a static-asset rollback: redeploy the previous `dist/` artifact. User entries are browser-local and are not migrated by deployment. There is no production database, backend monitoring, or CI/CD configuration in this repository.

## Testing and Contribution

No test framework or CI workflow is currently configured. For changes:

- Run `npm run typecheck` and `npm run build`.
- Manually exercise the affected route and both light/dark themes.
- Test imports, local persistence, and responsive behavior when relevant.

Use TypeScript strict mode, existing component patterns, descriptive names, and focused commits. Keep branches task-specific and include the behavior checked in the pull request description. There is no enforced commit-message format or review automation.

## Design Decisions

- **Vite:** fast development server and straightforward static production builds.
- **React + TypeScript:** component composition with compile-time contracts.
- **Marked + Prism:** small, familiar Markdown and syntax-highlighting pipeline.
- **Hash routing:** deep links work on static hosts without rewrite rules.
- **localStorage:** zero-backend private persistence for personal entries.
- **One render pipeline:** library, article pages, guide, composer preview, and playground share Markdown behavior.

## API and Public Functions

There are no HTTP endpoints. The main internal public functions are documented above: `renderMarkdown`, `renderCached`, `parseFrontmatter`, `loadUserEntries`, `saveUserEntries`, `uniqueSlug`, `downloadBackup`, `enrich`, `plainBody`, `allTags`, and `formatDate`.

## Glossary

- **ToC:** table of contents generated from H2/H3 headings.
- **Prism:** syntax-highlighting library used for fenced code.
- **Slug:** URL/file-safe identifier derived from an entry title.
- **Frontmatter:** optional metadata block between opening and closing `---` lines.
- **HMR:** hot module replacement used by Vite during development.

## Additional Resources

- [React documentation](https://react.dev/)
- [Vite documentation](https://vite.dev/)
- [Marked documentation](https://marked.js.org/)
- [Prism documentation](https://prismjs.com/)
- [TypeScript handbook](https://www.typescriptlang.org/docs/handbook/)

Project support is handled through the repository's issue and pull-request workflow.

## Changelog

### Unreleased

- Initial README documenting the current client-side architecture and workflows.
- No migration guide or backward-compatibility changes are currently required.
