// lib/bingo.ts

export const BINGO_ITEMS: string[] = [
  // --- Core / Sponsor ---
  "Joe’s Grows",
  "Harvest Heroes",
  "Sponsor Shoutout",
  "Growmie Advice",
  "Send Pics",
  "Winner Winner",
  "New Genetics",
  "Seed Pop",
  "Pray for Yield",
  "Smoke Test",

  // --- Water / pH / EC ---
  "pH Check",
  "pH Down",
  "pH Up",
  "EC Check",
  "PPM Check",
  "Top Off",
  "Reservoir Change",
  "Water Temp Check",
  "Airstone Check",
  "Root Check",

  // --- Environment ---
  "VPD Check",
  "Leaf Temp Check",
  "Canopy Temp Check",
  "Humidity Spike",
  "Heat Stress",
  "Cold Snap",
  "Lights On",
  "Lights Off",
  "Fan Speed Adjust",
  "Exhaust Check",

  // --- Training / Canopy Work ---
  "Defoliation",
  "Lollipop",
  "Stretch Week",
  "Pre-Flower",
  "Training Day",
  "Topping",
  "FIM",
  "Supercrop",
  "Trellis Net",
  "Support Stakes",

  // --- Plant Health / Issues ---
  "Nute Burn",
  "Lockout",
  "Cal-Mag",
  "Yellowing Leaves",
  "Clawing Leaves",
  "Spots on Leaves",
  "Wilting",
  "Overwatered",
  "Underwatered",
  "Herm Watch",

  // --- Pests / IPM ---
  "IPM Spray",
  "Sticky Traps",
  "Fungus Gnats",
  "Spider Mites",
  "Thrips",
  "Aphids",
  "Neem Smell",
  "Powdery Mildew",
  "Bud Rot Watch",
  "Sanitize Tools",

  // --- Flower / Ripeness ---
  "Trichomes",
  "Amber Check",
  "Cloudy Check",
  "Funky Terps",
  "Frosty Buds",
  "Foxtails",
  "Late Flower Fade",
  "Flush Time",
  "Dry Back",
  "Calibrate Pen",

  // --- Harvest / Dry / Cure ---
  "Harvest Day",
  "Wet Trim",
  "Dry Trim",
  "Hang Dry",
  "Dry Room Check",
  "Trim Jail",
  "Sticky Scissors",
  "Jar Time",
  "Burp Jars",
  "Cure Check",

  // --- Extra fun / filler ---
  "Photo Update",
  "Time-Lapse",
  "Grow Shop Run",
  "Mix Nutrients",
  "Add Silica",
  "Add PK Booster",
  "Clean Res",
  "Change Filter",
  "Check Runoff",
  "Rotate Plants",
];

// ---------- Types ----------
export type BingoCard = {
  id: string;
  grid: string[][]; // 5x5, center fixed to "Joe’s Grows" by default
};

export type BingoPack = {
  cards: BingoCard[];
  itemsUsed: string[]; // pool used to build the pack (after shuffle/select)
};

// ---------- Helpers ----------
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function uniqByLower(arr: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const x of arr) {
    const k = x.trim().toLowerCase();
    if (!k) continue;
    if (!seen.has(k)) {
      seen.add(k);
      out.push(x.trim());
    }
  }
  return out;
}

function makeId(prefix = "CARD") {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}-${Date.now().toString(36)}`;
}

function makeGridFromItems(items24: string[], centerText: string): string[][] {
  // 24 items + center fixed
  const grid: string[][] = [
    ["", "", "", "", ""],
    ["", "", "", "", ""],
    ["", "", centerText, "", ""],
    ["", "", "", "", ""],
    ["", "", "", "", ""],
  ];

  let idx = 0;
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      if (r === 2 && c === 2) continue;
      grid[r][c] = items24[idx++];
    }
  }
  return grid;
}

function gridKey(grid: string[][]): string {
  // stringify with separators for uniqueness checks
  return grid.map((row) => row.join("|")).join("~");
}

// ---------- MAIN EXPORT ----------
export function createBingoPack(items: string[], qty: number): BingoPack {
  const clean = uniqByLower(items);
  if (clean.length < 24) {
    throw new Error("Need at least 24 unique items to generate bingo cards.");
  }

  const count = Math.max(1, Math.min(500, Math.floor(qty || 1)));
  const cards: BingoCard[] = [];

  // Try to avoid duplicate grids in a pack (best-effort)
  const seen = new Set<string>();
  const maxAttemptsPerCard = 200;

  for (let i = 0; i < count; i++) {
    let attempts = 0;
    while (attempts < maxAttemptsPerCard) {
      attempts++;
      const pick = shuffle(clean).slice(0, 24);
      const grid = makeGridFromItems(pick, "Joe’s Grows");
      const key = gridKey(grid);
      if (!seen.has(key)) {
        seen.add(key);
