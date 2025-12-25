// lib/pool.ts
export const POOL_STORAGE_KEY = "grower-bingo:pool:v1";

export function normalizePoolText(text: string): string {
  const lines = text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  // de-dupe (case-insensitive) while preserving order
  const seen = new Set<string>();
  const out: string[] = [];
  for (const line of lines) {
    const k = line.toLowerCase();
    if (!seen.has(k)) {
      seen.add(k);
      out.push(line);
    }
  }
  return out.join("\n");
}

export function countPoolItems(text: string): number {
  const normalized = normalizePoolText(text);
  if (!normalized) return 0;
  return normalized.split("\n").filter(Boolean).length;
}

export function poolTextToArray(text: string): string[] {
  const normalized = normalizePoolText(text);
  if (!normalized) return [];
  return normalized.split("\n").filter(Boolean);
}
