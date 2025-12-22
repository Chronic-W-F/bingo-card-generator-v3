// lib/bingo.ts

export type BingoCell = string;
export type BingoGrid = BingoCell[][];
export type BingoCard = { id: string; grid: BingoGrid };

export type BingoPack = {
  packTitle: string;
  sponsorName: string;
  bannerUrl?: string;
  logoUrl?: string;
  cards: BingoCard[];
};

export function normalizeLines(input: unknown): string[] {
  const text = String(input ?? "");
  // Handles \n, \r\n, old Mac \r, plus mobile unicode line separators
  const normalized = text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\u2028|\u2029|\u0085/g, "\n");

  return normalized
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(arr: T[], rnd = Math.random): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function makeCardId(): string {
  // short-ish readable id
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 8; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out.slice(0, 4) + "-" + out.slice(4);
}

export function generateGrid(items: string[], rnd = Math.random): BingoGrid {
  if (items.length < 24) throw new Error("Need at least 24 items.");

  const picked = shuffle(items, rnd).slice(0, 24);

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

export function createBingoPackUnique(opts: {
  items: string[];
  qty: number;
  seed?: number;
  maxAttempts?: number;
}): { cards: { id: string; grid: BingoGrid }[]; uniqueCount: number } {
  const qty = Math.max(1, Math.min(500, Math.floor(opts.qty)));
  const attempts = Math.max(1000, opts.maxAttempts ?? 20000);

  const rnd = opts.seed != null ? mulberry32(opts.seed) : Math.random;

  const seen = new Set<string>();
  const cards: { id: string; grid: BingoGrid }[] = [];

  let tries = 0;
  while (cards.length < qty && tries < attempts) {
    tries++;
    const grid = generateGrid(opts.items, rnd);
    const sig = grid.flat().join("|"); // includes FREE in the center
    if (seen.has(sig)) continue;
    seen.add(sig);
    cards.push({ id: makeCardId(), grid });
  }

  return { cards, uniqueCount: cards.length };
}
