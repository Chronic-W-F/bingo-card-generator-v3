export type CallerState = {
  gameId: string;
  createdAt: number;
  drawSize: number;
  deck: string[];      // locked deck (call order fixed per game)
  called: string[];    // called in order
  remaining: string[]; // not called yet
};

export function makeGameId(prefix = "CALLER") {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${prefix}-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function normalizeLines(text: string): string[] {
  const raw = text
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);

  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of raw) {
    const key = item.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

export function sampleWithoutReplacement<T>(arr: T[], n: number): T[] {
  if (n <= 0) return [];
  if (n >= arr.length) return shuffle(arr);
  const a = [...arr];
  for (let i = 0; i < n; i++) {
    const j = i + Math.floor(Math.random() * (a.length - i));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, n);
}

export function startCallerGame(opts: {
  sourcePool: string[];
  deckSize: number;
  drawSize: number;
  fixedDeck?: string[]; // if provided, use this exact deck instead of sampling
}): CallerState {
  const deckSize = Math.max(1, Math.floor(opts.deckSize));
  const drawSize = Math.max(1, Math.floor(opts.drawSize));

  const baseDeck =
    opts.fixedDeck?.length ? [...opts.fixedDeck] : sampleWithoutReplacement(opts.sourcePool, deckSize);

  // Randomize call order once per game:
  const deck = shuffle(baseDeck);

  return {
    gameId: makeGameId(),
    createdAt: Date.now(),
    drawSize,
    deck,
    called: [],
    remaining: [...deck],
  };
}

export function drawNext(state: CallerState): { nextState: CallerState; draw: string[] } {
  if (state.remaining.length === 0) return { nextState: state, draw: [] };

  const n = Math.min(state.drawSize, state.remaining.length);
  const draw = state.remaining.slice(0, n);
  const remaining = state.remaining.slice(n);
  const called = [...state.called, ...draw];

  return {
    nextState: { ...state, called, remaining },
    draw,
  };
}
