"use client";

import { useMemo, useState } from "react";
import { BINGO_ITEMS } from "@/lib/bingo";
import {
  buildDeck,
  drawNext,
  type CallerState,
  type DrawResult,
} from "@/lib/caller";

function toLines(text: string): string[] {
  return text
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

export default function CallerPage() {
  // Auto-load same items used by the Bingo Card generator
  const [poolText, setPoolText] = useState<string>(BINGO_ITEMS.join("\n"));
  const [deckSize, setDeckSize] = useState<number>(50);
  const [drawSize, setDrawSize] = useState<number>(10);

  const [state, setState] = useState<CallerState | null>(null);
  const [lastDraw, setLastDraw] = useState<DrawResult | null>(null);

  const poolLines = useMemo(() => toLines(poolText), [poolText]);

  function startGame() {
    if (poolLines.length < 1) {
      alert("Paste at least one topic");
      return;
    }

    const safeDeckSize = Math.max(
      1,
      Math.min(Number.isFinite(deckSize) ? deckSize : 1, poolLines.length)
    );

    const safeDrawSize = Math.max(
      1,
      Math.min(Number.isFinite(drawSize) ? drawSize : 1, safeDeckSize)
    );

    const deck = buildDeck(poolLines, safeDeckSize);

    const newState: CallerState = {
      pool: poolLines,
      deckSize: safeDeckSize,
      drawSize: safeDrawSize,
      deck,
      called: [],
      remaining: deck.slice(),
      round: 0,
    };

    setState(newState);
    setLastDraw(null);
  }

  function nextDraw() {
    if (!state) return;

    // If nothing left, do nothing
    if (state.remaining.length === 0) {
      alert("Deck exhausted — game over.");
      return;
    }

    const result = drawNext(state);
    setState(result.state);
    setLastDraw(result);
  }

  function resetGame() {
    setState(null);
    setLastDraw(null);
  }

  function resetToDefaults() {
    setPoolText(BINGO_ITEMS.join("\n"));
  }

  function clearPool() {
    setPoolText("");
  }

  return (
    <main className="min-h-screen p-6">
      <div className="mx-auto max-w-3xl space-y-6">
        <h1 className="text-3xl font-bold">Grower Bingo — Caller</h1>

        <div className="rounded-lg border p-4 space-y-3">
          <label className="block text-sm font-medium">
            Topic Pool (one per line)
          </label>

          <textarea
            className="w-full rounded border p-2 font-mono text-sm"
            rows={6}
            value={poolText}
            onChange={(e) => setPoolText(e.target.value)}
            placeholder="Paste topics here..."
          />

          <div className="flex flex-wrap gap-2">
            <button
              className="rounded border px-3 py-2 text-sm"
              onClick={resetToDefaults}
              type="button"
            >
              Load defaults
            </button>
            <button
              className="rounded border px-3 py-2 text-sm"
              onClick={clearPool}
              type="button"
            >
              Clear
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="block text-sm font-medium">Deck size</label>
              <input
                className="w-full rounded border p-2"
                type="number"
                min={1}
                max={poolLines.length || 9999}
                value={deckSize}
                onChange={(e) => setDeckSize(Number(e.target.value))}
              />
              <p className="text-xs opacity-70">
                How many items to pull from the pool for this game.
              </p>
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium">Draw size</label>
              <input
                className="w-full rounded border p-2"
                type="number"
                min={1}
                max={deckSize}
                value={drawSize}
                onChange={(e) => setDrawSize(Number(e.target.value))}
              />
              <p className="text-xs opacity-70">
                How many to call each time you press “Next draw”.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              className="rounded bg-black px-4 py-2 text-white"
              onClick={startGame}
              type="button"
            >
              Start Game
            </button>

            <button
              className="rounded border px-4 py-2"
              onClick={resetGame}
              type="button"
              disabled={!state}
            >
              Reset
            </button>

            <button
              className="rounded bg-black px-4 py-2 text-white"
              onClick={nextDraw}
              type="button"
              disabled={!state}
            >
              Next draw
            </button>
          </div>
        </div>

        {state && (
          <div className="rounded-lg border p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-sm">
                <span className="font-medium">Round:</span> {state.round}
              </div>
              <div className="text-sm">
                <span className="font-medium">Called:</span> {state.called.length}{" "}
                / {state.deckSize}
              </div>
              <div className="text-sm">
                <span className="font-medium">Remaining:</span>{" "}
                {state.remaining.length}
              </div>
            </div>

            {lastDraw && (
              <div className="space-y-2">
                <h2 className="text-lg font-semibold">
                  Latest draw (Round {lastDraw.state.round})
                </h2>

                <ol className="list-decimal pl-6">
                  {lastDraw.drawn.map((x) => (
                    <li key={x} className="py-0.5">
                      {x}
                    </li>
                  ))}
                </ol>

                <button
                  className="rounded border px-3 py-2 text-sm"
                  type="button"
                  onClick={() => {
                    const text =
                      `🎱 Grower Bingo Calls — Round ${lastDraw.state.round}\n\n` +
                      lastDraw.drawn.map((x) => `• ${x}`).join("\n");
                    navigator.clipboard.writeText(text);
                    alert("Copied calls to clipboard.");
                  }}
                >
                  Copy latest draw
                </button>
              </div>
            )}

            {!lastDraw && (
              <p className="text-sm opacity-80">
                Game started. Press <span className="font-medium">Next draw</span>{" "}
                to call items.
              </p>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
