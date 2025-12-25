"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { DEFAULT_POOL_TEXT } from "@/lib/defaultItems";
import { buildDeck, drawNext, type CallerState } from "@/lib/caller";

const POOL_STORAGE_KEY = "grower-bingo:pool:v1";

function normalizeLines(text: string) {
  return text
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

export default function CallerPage() {
  const [poolText, setPoolText] = useState(DEFAULT_POOL_TEXT);
  const [deckSize, setDeckSize] = useState(50);
  const [drawSize, setDrawSize] = useState(10);

  const [state, setState] = useState<CallerState | null>(null);
  const [latest, setLatest] = useState<string[]>([]);

  const poolCount = useMemo(() => normalizeLines(poolText).length, [poolText]);

  // ✅ Auto-load the same pool the Generator saved
  useEffect(() => {
    try {
      const saved = localStorage.getItem(POOL_STORAGE_KEY);
      if (saved && saved.trim().length > 0) {
        setPoolText(saved);
      }
    } catch {}
  }, []);

  // Keep the pool saved if user edits here too (optional but useful)
  useEffect(() => {
    try {
      localStorage.setItem(POOL_STORAGE_KEY, poolText);
    } catch {}
  }, [poolText]);

  const deckTooBig = deckSize > poolCount;

  function loadDefaults() {
    setPoolText(DEFAULT_POOL_TEXT);
  }

  function clear() {
    setPoolText("");
    setState(null);
    setLatest([]);
  }

  function startGame() {
    const pool = normalizeLines(poolText);
    if (pool.length < 1) {
      alert("Paste at least one topic");
      return;
    }
    if (deckSize > pool.length) {
      alert(`Deck size (${deckSize}) is larger than your pool (${pool.length}).`);
      return;
    }
    const s = buildDeck(pool, deckSize);
    setState(s);
    setLatest([]);
  }

  function resetGame() {
    setState(null);
    setLatest([]);
  }

  function nextDraw() {
    if (!state) return;
    const res = drawNext(state, drawSize);
    if (res.done) {
      alert("Deck exhausted — game over.");
      setState(res.state);
      setLatest(res.drawn);
      return;
    }
    setState(res.state);
    setLatest(res.drawn);
  }

  async function copyLatest() {
    if (!latest.length) return;
    const text = latest.map((x, i) => `${i + 1}. ${x}`).join("\n");
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // fallback
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
  }

  const round = state?.round ?? 0;
  const called = state?.called?.length ?? 0;
  const total = state?.deck?.length ?? 0;
  const remaining = total - called;

  return (
    <main className="mx-auto max-w-3xl p-4 md:p-8 space-y-4">
      <div className="rounded-lg border p-4 space-y-2">
        <h1 className="text-3xl font-bold">Grower Bingo — Caller</h1>

        <div className="flex flex-wrap gap-2">
          <Link className="rounded border px-3 py-2 font-semibold" href="/">
            ← Back to Generator
          </Link>

          <a className="rounded border px-3 py-2 font-semibold" href="/" target="_blank" rel="noreferrer">
            Generator (new tab)
          </a>
        </div>

        {deckTooBig && (
          <div className="rounded border bg-red-50 p-3 text-sm">
            Deck size ({deckSize}) is larger than your pool ({poolCount}). Reduce deck size or add more topics.
          </div>
        )}
      </div>

      <div className="space-y-2">
        <div className="font-semibold">Topic Pool (one per line) — Current: {poolCount}</div>

        <div className="flex gap-2">
          <button className="rounded border px-3 py-2 font-semibold" onClick={loadDefaults}>
            Load defaults
          </button>
          <button className="rounded border px-3 py-2 font-semibold" onClick={clear}>
            Clear
          </button>
        </div>

        <textarea
          className="h-56 w-full rounded border p-2 font-mono"
          value={poolText}
          onChange={(e) => setPoolText(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <label className="block">
          <div className="font-semibold">Deck size</div>
          <input
            className="w-40 rounded border p-2"
            type="number"
            min={1}
            value={deckSize}
            onChange={(e) => setDeckSize(Number(e.target.value || 1))}
          />
          <div className="text-sm opacity-80">How many items to pull from the pool for this game.</div>
        </label>

        <label className="block">
          <div className="font-semibold">Draw size</div>
          <input
            className="w-40 rounded border p-2"
            type="number"
            min={1}
            value={drawSize}
            onChange={(e) => setDrawSize(Number(e.target.value || 1))}
          />
          <div className="text-sm opacity-80">How many to call each time you press “Next draw”.</div>
        </label>

        <div className="flex flex-wrap gap-2">
          <button className="rounded border px-3 py-2 font-semibold" onClick={startGame} disabled={deckTooBig}>
            Start Game
          </button>
          <button className="rounded border px-3 py-2 font-semibold" onClick={resetGame}>
            Reset
          </button>
          <button className="rounded border px-3 py-2 font-semibold" onClick={nextDraw} disabled={!state}>
            Next draw
          </button>
        </div>

        <div className="text-sm">
          <div>Round: {round}</div>
          <div>
            Called: {called} / {total}
          </div>
          <div>Remaining: {remaining}</div>
        </div>
      </div>

      <div className="space-y-2">
        <h2 className="text-2xl font-bold">Latest draw (Round {round})</h2>
        <ol className="list-decimal pl-6 space-y-1">
          {latest.map((x) => (
            <li key={x}>{x}</li>
          ))}
        </ol>

        <button className="rounded border px-3 py-2 font-semibold" onClick={copyLatest} disabled={!latest.length}>
          Copy latest draw
        </button>
      </div>
    </main>
  );
}
