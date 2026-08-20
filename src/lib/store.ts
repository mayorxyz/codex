import type { Article } from "../data/articles";
import { slugify } from "./markdown";

const KEY = "codex.user-entries.v1";

export function loadUserEntries(): Article[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (a) => a && typeof a.slug === "string" && typeof a.markdown === "string"
    );
  } catch {
    return [];
  }
}

export function saveUserEntries(entries: Article[]): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(entries));
    return true;
  } catch {
    return false;
  }
}

export function nextId(): string {
  try {
    if (typeof crypto !== "undefined" && crypto.randomUUID)
      return crypto.randomUUID().slice(0, 8);
  } catch {
    /* fall through */
  }
  return Math.random().toString(36).slice(2, 10);
}

export function uniqueSlug(base: string, taken: Set<string>): string {
  const root = slugify(base) || `entry-${nextId()}`;
  let slug = root;
  let i = 2;
  while (taken.has(slug)) slug = `${root}-${i++}`;
  return slug;
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/** download the user's entries as a JSON backup file */
export function downloadBackup(entries: Article[]) {
  const blob = new Blob([JSON.stringify(entries, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `codex-backup-${todayISO()}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 4000);
}
