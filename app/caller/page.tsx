"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { DEFAULT_POOL_TEXT } from "@/lib/defaultItems";
import { POOL_STORAGE_KEY, countPoolItems, normalizePoolText, textToPool } from "@/lib/pool";
import { CallerState, startGame, nextDraw } from "@/lib/caller";

export default function CallerPage() {
  const [poolText, setPoolText] = useState<string>("");
  const [deckSize, setDeckSize] = useState<string>("50");
  const [drawSize, setDrawSize] = useState<string>("10");

  const [state, setState] = useState<CallerState>({ started: false, deck: [], called: [], round: 0 });
  const [latest, setLatest] = useState<string[]>([]);
  const [error, setError] = useState<string>("");

  // Load shared pool on mount
  useEffect(() => {
    try {
      const shared = localStorage.getItem(POOL_STORAGE_KEY);
      if (shared && shared.trim().length > 0) setPoolText(shared);
      else setPoolText(DEFAULT_POOL_TEXT);
    } catch {
      setPoolText(DEFAULT_POOL_TEXT);
    }
  }, []);

  // Persist shared pool whenever edited
  useEffect(() => {
    try {
      localStorage.setItem(POOL_STORAGE_KEY, normalizePoolText(poolText));
    } catch {}
  }, [poolText]);

  const poolCount = useMemo(() => countPoolItems(poolText), [poolText]);

  function loadDefaults() {
    setPoolText(DEFAULT_POOL_TEXT);
    setError("");
    setLatest([]);
    setState({ started: false, deck: [], called: [], round: 0 });
    try {
      localStorage.setItem(POOL_STORAGE_KEY, DEFAULT_POOL_TEXT);
    } catch {}
  }

  function reloadSharedPool() {
    try {
      const shared = localStorage.getItem(POOL_STORAGE_KEY);
      if (shared != null) setPoolText(shared);
    } catch {}
  }

  function clearPool() {
    setPoolText("");
    setError("");
    setLatest([]);
    setState({ started: false, deck: [], called: [], round: 0 });
    try {
      localStorage.setItem(POOL_STORAGE_KEY, "");
    } catch {}
  }

  function onStart() {
    setError("");
    setLatest([]);

    const pool = textToPool(poolText);
    const ds = Math.max(1, Number(deckSize || "0"));
    const dr = Math.max(1, Number(drawSize || "0"));

    if (pool.length === 0) {
      setError("Pool is empty. Paste items or click Load defaults.");
      return;
    }
    if (ds > pool.length) {
      setError(`Deck size (${ds}) is larger than your pool (${pool.length}). Reduce deck size or add more topics.`);
      return;
    }
    if (dr <= 0) {
      setError("Draw size must be 1 or more.");
      return;
    }

    setState(startGame(pool, ds));
  }

  function onReset() {
    setError("");
    setLatest([]);
    setState({ started: false, deck: [], called: [], round: 0 });
  }

  function onNextDraw() {
    setError("");
    const dr = Math.max(1, Number(drawSize || "0"));
    const result = nextDraw(state, dr);
    setState(result.state);
    setLatest(result.latest);
  }

  const calledCount = state.started ? state.called.length : 0;
  const remainingCount = state.started ? Math.max(0, state.deck.length - state.called.length) : 0;

  return (
    <main className="mx-auto max-w-3xl p-4 md:p-8">
      <div className="mb-6 rounded-lg border p-4 space-y-3">
        <h1 className="text-3xl font-bold">Grower Bingo — Caller</h1>

        <div className="flex flex-wrap gap-2">
          <Link href="/">
            <button className="rounded-md border px-3 py-2 font-semibold">⬅ Back to Generator</button>
          </Link>

          <button onClick={reloadSharedPool} className="rounded-md border px-3 py-2 font-semibold">
            Reload shared pool
          </button>
        </div>

        <p className="text-sm opacity-80">
          Draw items in rounds (10 at a time, or whatever you choose). No repeats until the deck is exhausted.
        </p>
      </div>

      {error ? (
        <div className="mb-4 rounded-md border border-red-300 bg-red-50 p-3 text-red-900">
          {error}
        </div>
      ) : null}

      <div className="mb-3 font-semibold">
        Topic Pool (one per line) — Current: {poolCount}
      </div>

      <div className="flex flex-wrap gap-2 mb-2">
        <button onClick={loadDefaults} className="rounded-md border px-3 py-2">Load defaults</button>
        <button onClick={reloadSharedPool} className="rounded-md border px-3 py-2">Reload shared pool</button>
        <button onClick={clearPool} className="rounded-md border px-3 py-2">Clear pool</button>
      </div>

      <textarea
        value={poolText}
        onChange={(e) => setPoolText(e.target.value)}
        rows={10}
        className="w-full rounded-md border p-2 font-mono"
      />

      <div className="mt-4 grid gap-3">
        <div>
          <div className="font-semibold">Deck size</div>
          <input
            value={deckSize}
            onChange={(e) => setDeckSize(e.target.value)}
            inputMode="numeric"
            className="w-full rounded-md border p-2"
          />
          <div className="text-sm opacity-70">Must be ≤ pool count.</div>
        </div>

        <div>
          <div className="font-semibold">Draw size</div>
          <input
            value={drawSize}
            onChange={(e) => setDrawSize(e.target.value)}
            inputMode="numeric"
            className="w-full rounded-md border p-2"
          />
          <div className="text-sm opacity-70">
            How many to call each time you press “Next draw”.
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button onClick={onStart} className="rounded-md border px-4 py-2 font-semibold" disabled={state.started}>
            Start Game
          </button>
          <button onClick={onReset} className="rounded-md border px-4 py-2 font-semibold">
            Reset
          </button>
          <button onClick={onNextDraw} className="rounded-md border px-4 py-2 font-semibold" disabled={!state.started}>
            Next draw
          </button>
        </div>

        <div className="mt-2 space-y-1">
          <div className="font-semibold">Round: {state.round}</div>
          <div className="font-semibold">Called: {calledCount} / {state.deck.length || Number(deckSize || 0)}</div>
          <div className="font-semibold">Remaining: {remainingCount}</div>
        </div>

        <div className="mt-3">
          <div className="font-semibold">Latest draw</div>
          {latest.length ? (
            <ul className="list-disc pl-6">
              {latest.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          ) : (
            <div className="opacity-70">No draw yet.</div>
          )}
        </div>

        <div className="mt-3">
          <div className="font-semibold">All called so far</div>
          {state.called.length ? (
            <div className="whitespace-pre-wrap rounded-md border p-2 font-mono">
              {state.called.join(", ")}
            </div>
          ) : (
            <div className="opacity-70">Nothing called yet.</div>
          )}
        </div>
      </div>
    </main>
  );
}
