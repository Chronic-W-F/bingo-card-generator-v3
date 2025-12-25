"use client";

import { useState } from "react";
import {
  CallerState,
  normalizeLines,
  startCallerGame,
  drawNext,
} from "@/lib/caller";

export default function CallerPage() {
  const [poolText, setPoolText] = useState("");
  const [deckSize, setDeckSize] = useState(50);
  const [drawSize, setDrawSize] = useState(10);
  const [state, setState] = useState<CallerState | null>(null);
  const [lastDraw, setLastDraw] = useState<string[]>([]);

  function handleStart() {
    const pool = normalizeLines(poolText);
    if (pool.length === 0) {
      alert("Paste at least one topic");
      return;
    }

    const game = startCallerGame({
      sourcePool: pool,
      deckSize,
      drawSize,
    });

    setState(game);
    setLastDraw([]);
  }

  function handleDraw() {
    if (!state) return;
    const { nextState, draw } = drawNext(state);
    setState(nextState);
    setLastDraw(draw);
  }

  return (
    <main className="p-6 max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Grower Bingo — Caller</h1>

      {!state && (
        <section className="space-y-4">
          <div>
            <label className="font-semibold block mb-1">
              Topic Pool (one per line)
            </label>
            <textarea
              className="w-full border rounded p-2 h-40"
              placeholder="Paste topics here…"
              value={poolText}
              onChange={(e) => setPoolText(e.target.value)}
            />
          </div>

          <div className="flex gap-4">
            <div>
              <label className="block text-sm">Deck size</label>
              <input
                type="number"
                className="border rounded p-1 w-24"
                value={deckSize}
                onChange={(e) => setDeckSize(Number(e.target.value))}
              />
            </div>

            <div>
              <label className="block text-sm">Draw size</label>
              <input
                type="number"
                className="border rounded p-1 w-24"
                value={drawSize}
                onChange={(e) => setDrawSize(Number(e.target.value))}
              />
            </div>
          </div>

          <button
            className="px-4 py-2 bg-green-600 text-white rounded"
            onClick={handleStart}
          >
            Start Game
          </button>
        </section>
      )}

      {state && (
        <section className="space-y-4">
          <div className="flex gap-4 items-center">
            <button
              className="px-4 py-2 bg-blue-600 text-white rounded"
              onClick={handleDraw}
              disabled={state.remaining.length === 0}
            >
              Draw Next ({state.drawSize})
            </button>

            <span className="text-sm">
              Remaining: {state.remaining.length} / {state.deck.length}
            </span>
          </div>

          {lastDraw.length > 0 && (
            <div>
              <h2 className="font-semibold">Last Draw</h2>
              <ul className="list-disc ml-6">
                {lastDraw.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <h2 className="font-semibold">Called So Far</h2>
            <ul className="list-disc ml-6 text-sm">
              {state.called.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </section>
      )}
    </main>
  );
}
