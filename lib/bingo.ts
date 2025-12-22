// lib/bingo.ts
export type BingoGrid = string[][];
export type BingoCard = { id: string; grid: BingoGrid };

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(arr: T[], rand = Math.random) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function makeCardId(): string {
  // short-ish, human readable
  const part = Math.random().toString(36).slice(2, 6).toUpperCase();
  const part2 = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${part}-${part2}`;
}

export function generateGrid(items: string[], rand = Math.random): BingoGrid {
  if (items.length < 24) throw new Error("Need at least 24 items.");
  const picked = shuffle(items, rand).slice(0, 24);

  const grid: BingoGrid = [];
  let k = 0;
  for (let r = 0; r < 5; r++) {
    const row: string[] = [];
    for (let c = 0; c < 5; c++) {
      if (r === 2 && c === 2) row.push("FREE");
      else row.push(picked[k++]);
    }
    grid.push(row);
  }
  return grid;
}

function gridKey(grid: BingoGrid): string {
  // stable fingerprint for uniqueness
  return grid.flat().join("|");
}

export function createBingoPackUnique(
  items: string[],
  quantity: number,
  seed?: number
): { cards: BingoCard[] } {
  if (quantity < 1 || quantity > 500) throw new Error("Quantity must be between 1 and 500.");
  if (items.length < 24) throw new Error("Need at least 24 items.");

  const rand = seed != null ? mulberry32(seed) : Math.random;

  const cards: BingoCard[] = [];
  const seen = new Set<string>();

  // safeguard to avoid infinite loops if item pool is too small for requested uniqueness
  const maxAttempts = Math.max(2000, quantity * 200);

  let attempts = 0;
  while (cards.length < quantity) {
    attempts++;
    if (attempts > maxAttempts) {
      throw new Error(
        `Could not generate ${quantity} unique cards with the current item pool. Add more items or lower quantity.`
      );
    }

    const grid = generateGrid(items, rand);
    const key = gridKey(grid);
    if (seen.has(key)) continue;

    seen.add(key);
    cards.push({ id: makeCardId(), grid });
  }

  return { cards };
}
