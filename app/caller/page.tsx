"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { DEFAULT_POOL_TEXT } from "@/lib/defaultItems";
import { POOL_STORAGE_KEY, countPoolItems, normalizePoolText, poolTextToArray } from "@/lib/pool";

type CallerState = {
  started: boolean;
  deck: string[];   // fixed shuffled deck for this game
  called: string[]; // what has been called so far
  round: number;
};

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function CallerPage() {
  const defaultText = useMemo(() => DEFAULT_POOL_TEXT, []);

  const [poolText, setPoolText] = useState<string>(defaultText);
  const [deckSize, setDeckSize] = useState<number>(50);
  const [drawSize, setDrawSize] = useState<number>(10);

  const [state, setState] = useState<CallerState>({
    started: false,
    deck: [],
    called: [],
    round: 0,
  });

  const [latestDraw, setLatestDraw] = useState<string[]>([]);
  const poolCount = useMemo(() => countPoolItems(poolText), [poolText]);
  const poolArr = useMemo(() => poolTextToArray(poolText), [poolText]);

  const deckTooBig = deckSize > poolArr.length;

  // Load shared pool on mount
  useEffect(() => {
    try {
      const shared = localStorage.getItem(POOL_STORAGE_KEY);
      if (shared && shared.trim()) {
        setPoolText(shared);
      } else {
        localStorage.setItem(POOL_STORAGE_KEY, defaultText);
        setPoolText(defaultText);
      }
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist shared pool whenever edited (normalized)
  useEffect(() => {
    try {
      localStorage.setItem(POOL_STORAGE_KEY, normalizePoolText(poolText));
    } catch {
      // ignore
    }
  }, [poolText]);

  function loadDefaults() {
    setPoolText(defaultText);
    try {
      localStorage.setItem(POOL_STORAGE_KEY, defaultText);
    } catch {}
  }

  function reloadSharedPool() {
    try {
      const shared = localStorage.getItem(POOL_STORAGE_KEY);
      if (shared && shared.trim()) setPoolText(shared);
    } catch {
      // ignore
    }
  }

  function clearPool() {
    setPoolText("");
    try {
      localStorage.removeItem(POOL_STORAGE_KEY);
    } catch {}
  }

  function startGame() {
    if (poolArr.length === 0) return;

    const size = Math.max(1, Math.min(poolArr.length, Number(deckSize) || 1));
    const deck = shuffle(poolArr).slice(0, size);

    setState({
      started: true,
      deck,
      called: [],
      round: 0,
    });
    setLatestDraw([]);
  }

  function resetGame() {
    setState({ started: false, deck: [], called: [], round: 0 });
    setLatestDraw([]);
  }

  function nextDraw() {
    if (!state.started) return;

    const remaining = state.deck.filter((x) => !state.called.includes(x));
    if (remaining.length === 0) {
      setLatestDraw([]);
      return;
    }

    const n = Math.max(1, Math.min(remaining.length, Number(drawSize) || 1));
    const draw = remaining.slice(0, n);

    setState((prev) => ({
      ...prev,
      called: [...prev.called, ...draw],
      round: prev.round + 1,
    }));

    setLatestDraw(draw);
  }

  const calledCount = state.started ? state.called.length : 0;
  const remainingCount = state.started ? Math.max(0, state.deck.length - state.called.length) : 0;

  return (
    <main className="mx-auto max-w-3xl p-4 md:p-8">
      {/* HEADER */}
      <div className="mb-6 rounded-lg border p-4 space-y-3">
        <h1 className="text-3xl font-bold">Grower Bingo — Caller</h1>

        <div className="flex flex-wrap gap-2">
          <Link href="/">
            <button className="rounded-lg border px-4 py-2 font-bold bg-black text-white">
              ← Back to Generator
            </button>
          </Link>

          <button
            onClick={reloadSharedPool}
            className="rounded-lg border px-4 py-2 font-bold"
          >
            Reload shared pool
          </button>
        </div>

        <p className="text-sm opacity-80">
          Draw items in rounds (10 at a time, or whatever you choose). No repeats until the deck is exhausted.
        </p>
      </div>

      {deckTooBig ? (
        <div className="mb-4 rounded-lg border border-red-300 bg-red-50 p-3 text-sm">
          Deck size ({deckSize}) is larger than your pool ({poolArr.length}). Reduce deck size or add more topics.
        </div>
      ) : null}

      {/* POOL EDITOR */}
      <div className="rounded-lg border p-4 space-y-3">
        <div className="font-bold">
          Topic Pool (one per line) — Current: {poolCount}
        </div>

        <div className="flex flex-wrap gap-2">
          <button onClick={loadDefaults} className="rounded border px-3 py-2">
            Load defaults
          </button>
          <button onClick={reloadSharedPool} className="rounded border px-3 py-2">
            Reload shared pool
          </button>
          <button onClick={clearPool} className="rounded border px-3 py-2">
            Clear pool
          </button>
        </div>

        <textarea
          value={poolText}
          onChange={(e) => setPoolText(e.target.value)}
          rows={10}
          className="w-full rounded border p-2 font-mono"
        />
      </div>

      {/* SETTINGS */}
      <div className="mt-6 rounded-lg border p-4 space-y-4">
        <div>
          <div className="font-semibold">Deck size</div>
          <input
            value={deckSize}
            onChange={(e) => setDeckSize(Number(e.target.value))}
            inputMode="numeric"
            className="mt-1 w-40 rounded border p-2"
          />
          <div className="text-sm opacity-70">Must be ≤ pool count.</div>
        </div>

        <div>
          <div className="font-semibold">Draw size</div>
          <input
            value={drawSize}
            onChange={(e) => setDrawSize(Number(e.target.value))}
            inputMode="numeric"
            className="mt-1 w-40 rounded border p-2"
          />
          <div className="text-sm opacity-70">
            How many to call each time you press “Next draw”.
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          <button
            onClick={startGame}
            disabled={deckTooBig || poolArr.length === 0}
            className="rounded border px-4 py-2"
          >
            Start Game
          </button>
          <button onClick={resetGame} className="rounded border px-4 py-2">
            Reset
          </button>
          <button
            onClick={nextDraw}
            disabled={!state.started}
            className="rounded border px-4 py-2"
          >
            Next draw
          </button>
        </div>

        <div className="space-y-1">
          <div className="font-bold">Round: {state.round}</div>
          <div className="font-bold">Called: {calledCount} / {state.deck.length || deckSize}</div>
          <div className="font-bold">Remaining: {remainingCount}</div>
        </div>
      </div>

      {/* LATEST DRAW */}
      <div className="mt-6 rounded-lg border p-4">
        <div className="font-bold mb-2">Latest draw</div>
        {latestDraw.length === 0 ? (
          <div className="opacity-70 text-sm">No draw yet.</div>
        ) : (
          <ul className="list-disc pl-5">
            {latestDraw.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        )}
      </div>

      {/* CALLED LIST */}
      <div className="mt-6 rounded-lg border p-4">
        <div className="font-bold mb-2">All called so far</div>
        {state.called.length === 0 ? (
          <div className="opacity-70 text-sm">Nothing called yet.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-sm">
            {state.called.map((x, i) => (
              <div key={`${x}-${i}`} className="rounded border px-2 py-1">
                {i + 1}. {x}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
