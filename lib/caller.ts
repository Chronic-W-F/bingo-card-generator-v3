// lib/caller.ts
// Caller logic: build a deck from a pool, then draw in chunks with no repeats.

export type CallerState = {
  deck: string[];   // randomized deck for this game (length = deckSize)
  called: string[]; // everything called so far (in order)
  round: number;    // how many draws have happened
};

export type DrawResult = {
  state: CallerState;
  drawn: string[];  // what was drawn this round
  done: boolean;    // true when deck is exhausted AFTER this draw
};

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Build a randomized deck of size deckSize from the pool (no duplicates).
 * pool should already be trimmed/unique by the caller UI if desired.
 */
export function buildDeck(pool: string[], deckSize: number): CallerState {
  const cleanPool = pool.map((s) => s.trim()).filter(Boolean);

  if (deckSize < 1) throw new Error("deckSize must be >= 1");
  if (deckSize > cleanPool.length) {
    throw new Error(`Deck size (${deckSize}) larger than pool (${cleanPool.length})`);
  }

  const deck = shuffle(cleanPool).slice(0, deckSize);

  return {
    deck,
    called: [],
    round: 0,
  };
}

/**
 * Draw the next drawSize items from the deck without repeats.
 * Uses called.length as the pointer into the deck.
 */
export function drawNext(state: CallerState, drawSize: number): DrawResult {
  const size = Math.max(1, Math.floor(drawSize || 1));

  const start = state.called.length;
  const end = Math.min(state.deck.length, start + size);
  const drawn = state.deck.slice(start, end);

  // If nothing left to draw
  if (drawn.length === 0) {
    return { state, drawn: [], done: true };
  }

  const nextState: CallerState = {
    ...state,
    called: [...state.called, ...drawn],
    round: state.round + 1,
  };

  const done = nextState.called.length >= nextState.deck.length;

  return { state: nextState, drawn, done };
}
