// /lib/bingo.ts

export type BingoCell = string | null; // null = center FREE cell
export type BingoGrid = BingoCell[]; // 25 cells (5x5)

function shuffle<T>(arr: T[]) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function makeCardId() {
  // short, human-ish, unique enough for roster tracking
  return (
    Math.random().toString(36).slice(2, 6).toUpperCase() +
    "-" +
    Math.random().toString(36).slice(2, 6).toUpperCase()
  );
}

/**
 * generateGrid(items)
 * - Takes a pool of strings
 * - Randomly picks 24 unique items
 * - Inserts null at center (index 12) as the FREE center square
 */
export function generateGrid(items: string[]): BingoGrid {
  const cleaned = items.map((x) => x.trim()).filter(Boolean);

  // must have at least 24 unique-ish lines
  const unique = Array.from(new Set(cleaned.map((s) => s.replace(/\s+/g, " ").trim())));
  if (unique.length < 24) {
    throw new Error(`Need at least 24 unique items. You have ${unique.length}.`);
  }

  const picked24 = shuffle(unique).slice(0, 24);
  const grid: BingoGrid = [];

  // Fill 25 slots, center (12) is null
  let p = 0;
  for (let i = 0; i < 25; i++) {
    if (i === 12) {
      grid.push(null);
    } else {
      grid.push(picked24[p++] ?? "");
    }
  }

  return grid;
}
