// lib/bingo.ts

export type BingoGrid = string[][];
export type BingoCard = {
  id: string;
  grid: BingoGrid;
};

export const BINGO_ITEMS: string[] = [
  "Solo Cup",
  "pH Pen",
  "LED Light",
  "Fan",
  "Germinated Seed",
  "Nutrients Fed",
  "Topped Plant",
  "Cal-Mag Deficiency",
  "Sticky Trichomes",
  "Training Wires (LST)",
  "Runoff Check",
  "pH Issues",
  "New Growth",
  "Watered Today",
  "Flush Time",
  "Leaf Tucking",
  "Bud Sites Showing",
  "Pistils Showing",
  "Recharge Microbes",
  "EC / PPM Check",
  "Tent Zip Open",
  "Harvest Ready",
  "Leaf Color Change",
  "Root Zone Moist",
  "Canopy Evened",
  "Lollipop Pruning",
  "FIM Cut",
  "Supercropping",
  "Trellis Net Installed",
  "Support Stakes Added",
  "Side Branch Explosion",
  "Node Spacing Tight",
  "Stem Thickening",
  "Fan Leaves Removed",
  "Recovery Day",
  "Flower Stretch",
  "Pre-Flower Confirmed",
  "Frost Starting",
  "Terpene Smell Increase",
  "Bud Swelling",
  "Cola Formation",
  "Trichomes Cloudy",
  "Trichomes Amber",
  "Calyx Stacking",
  "Fade Beginning",
  "VPD Dialed In",
  "Humidity Spike",
  "Heat Stress Signs",
  "Cold Night Temps",
  "Leaf Temp Check",
  "Canopy Temp Check",
  "Lights On Cycle",
  "Lights Off Cycle",
  "Exhaust Fan Adjusted",
  "Airflow Improved",
  "Reservoir Change",
  "Top Off Water",
  "Plain Water Feed",
  "EC Rising",
  "EC Dropping",
  "Nutrient Burn",
  "Nutrient Lockout",
  "Deficiency Spotted",
  "Foliar Feed",
  "Root Check",
  "IPM Spray Day",
  "Sticky Traps Checked",
  "Fungus Gnats",
  "Spider Mites",
  "Powdery Mildew Watch",
  "Bud Rot Watch",
  "Neem Oil Smell",
  "Beneficial Insects",
  "Leaf Damage Found",
  "Pest-Free Check",
  "Harvest Day",
  "Wet Trim",
  "Dry Trim",
  "Hanging Dry",
  "Dry Room Check",
  "Jar Time",
  "Burp Jars",
  "Cure Check",
  "Smoke Test",
  "Sticky Scissors",
  "Growmie Advice",
  "New Genetics",
  "Seed Pop",
  "Clone Day",
  "Transplant Day",
  "Pray for Yield",
  "Send Pics",
  "Grow Journal Updated",
  "Lights Upgrade",
  "Tent Cleaned",
  "Yield Surprise",
  "Terp Bomb",
  "Bag Appeal",
  "Personal Best",
  "Winner Winner",
];

// ------------------------
// Internal helpers
// ------------------------

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function makeGrid(items: string[], centerLabel: string): BingoGrid {
  const grid: string[][] = [];
  let idx = 0;

  for (let r = 0; r < 5; r++) {
    const row: string[] = [];
    for (let c = 0; c < 5; c++) {
      if (r === 2 && c === 2) {
        row.push(centerLabel);
      } else {
        row.push(items[idx++]);
      }
    }
    grid.push(row);
  }
  return grid;
}

function gridKey(grid: BingoGrid): string {
  return grid.flat().join("|");
}

// ------------------------
// Exported generator
// ------------------------

export function createBingoPack(
  pool: string[],
  qty: number,
  centerLabel: string
): BingoCard[] {
  const seen = new Set<string>();
  const cards: BingoCard[] = [];

  while (cards.length < qty) {
    const shuffled = shuffle(pool);
    const pick = shuffled.slice(0, 24);
    const grid = makeGrid(pick, centerLabel);
    const key = gridKey(grid);

    if (!seen.has(key)) {
      seen.add(key);
      cards.push({
        id: crypto.randomUUID(),
        grid,
      });
    }
  }

  return cards;
}
