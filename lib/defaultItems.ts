// lib/pool.ts
export const POOL_STORAGE_KEY = "grower-bingo:pool:v1";

export function normalizePoolText(text: string): string {
  // Normalize newlines + trim lines + remove empties + de-dupe (case-insensitive)
  const lines = text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const seen = new Set<string>();
  const out: string[] = [];
  for (const line of lines) {
    const key = line.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      out.push(line);
    }
  }

  return out.join("\n");
}

export function splitPool(text: string): string[] {
  return normalizePoolText(text)
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}

export function countPoolItems(text: string): number {
  return splitPool(text).length;
}
