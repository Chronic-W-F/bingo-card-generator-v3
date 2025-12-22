// lib/bingo.ts
// Core bingo logic ONLY — no UI, no PDF, no API code here.

export type BingoCell = {
  text: string;
};

export type BingoGrid = BingoCell[][];

export type BingoCard = {
  id: string;
  grid: BingoGrid;
};

export type BingoPack = {
  cards: BingoCard[];
};

/**
 * Fisher–Yates shuffle
 */
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Create a single 5×5 bingo grid
 * - 24 random items
 * - center is FREE
 */
function createGrid(items: string[]): BingoGrid {
  const shuffled = shuffle(items).slice(0, 24);

  const grid: BingoGrid = [];
  let idx = 0;

  for (let r = 0; r < 5; r++) {
    const row: BingoCell[] = [];
    for (let c = 0; c < 5; c++) {
      if (r === 2 && c === 2) {
        row.push({ text: "FREE" });
      } else {
        row.push({ text: shuffled[idx++] });
      }
    }
    grid.push(row);
  }

  return grid;
}

/**
 * Stable string key for a grid (used to guarantee uniqueness)
 */
function gridKey(grid: BingoGrid): string {
  return grid
    .flat()
    .map((c) => c.text)
    .join("|");
}

/**
 * Create a pack of UNIQUE bingo cards.
 * Throws a clear error if uniqueness is impossible.
 */
export function createBingoPack(
  items: string[],
  quantity: number
): BingoPack {
  if (items.length < 24) {
    throw new Error("At least 24 unique items are required.");
  }

  const cards: BingoCard[] = [];
  const seen = new Set<string>();

  let attempts = 0;
  const MAX_ATTEMPTS = quantity * 50;

  while (cards.length < quantity) {
    if (attempts > MAX_ATTEMPTS) {
      throw new Error(
        `Unable to generate ${quantity} unique cards with ${items.length} items. Increase the item pool.`
      );
    }

    const grid = createGrid(items);
    const key = gridKey(grid);

    if (!seen.has(key)) {
      seen.add(key);
      cards.push({
        id: crypto.randomUUID(),
        grid,
      });
    }

    attempts++;
  }

  return { cards };
}
