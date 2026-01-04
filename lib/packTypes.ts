// lib/packTypes.ts

export type BingoCard = {
  id: string;
  grid: string[][];
};

export type CardsPack = {
  packId: string; // requestKey
  createdAt: number;
  title?: string;
  sponsorName?: string;
  cards: BingoCard[];
};

export type DrawDay = {
  day: number;
  calls: string[];
};

export function normalizeLabel(s: string) {
  return (s || "").trim();
}

export function requiredLabelsForCard(card: BingoCard, centerLabel: string) {
  const labels: string[] = [];
  for (let r = 0; r < card.grid.length; r++) {
    for (let c = 0; c < card.grid[r].length; c++) {
      const v = normalizeLabel(card.grid[r][c]);
      if (!v) continue;
      if (v === centerLabel) continue; // FREE center
      labels.push(v);
    }
  }
  return labels;
}

export function computeCompletionDay(args: {
  requiredLabels: string[];
  drawDays: DrawDay[];
}) {
  const required = new Set(args.requiredLabels.map(normalizeLabel));
  const called = new Set<string>();

  for (const day of args.drawDays) {
    for (const raw of day.calls) {
      called.add(normalizeLabel(raw));
    }

    let complete = true;
    for (const need of required) {
      if (!called.has(need)) {
        complete = false;
        break;
      }
    }

    if (complete) return day.day;
  }

  return null; // never completed
}

export function computeExpectedWinners(args: {
  pack: CardsPack;
  drawDays: DrawDay[];
  centerLabel: string;
}) {
  const rows = args.pack.cards.map((card) => {
    const required = requiredLabelsForCard(card, args.centerLabel);
    const completionDay = computeCompletionDay({
      requiredLabels: required,
      drawDays: args.drawDays,
    });

    return {
      cardId: card.id,
      completionDay, // number | null
      requiredCount: required.length,
    };
  });

  // Sort by earliest completion day, then cardId
  rows.sort((a, b) => {
    const ad = a.completionDay ?? Number.POSITIVE_INFINITY;
    const bd = b.completionDay ?? Number.POSITIVE_INFINITY;
    if (ad !== bd) return ad - bd;
    return a.cardId.localeCompare(b.cardId);
  });

  return rows;
}
