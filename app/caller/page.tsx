"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { DEFAULT_POOL_TEXT } from "@/lib/defaultItems";

const SHARED_POOL_KEY = "grower-bingo:pool:v1";
const CALLER_STATE_KEY = "grower-bingo:caller:v1";

type CallerState = {
  poolText: string;
  deckSize: number;
  drawSize: number;
  round: number;
  deck: string[]; // shuffled items used this game (length = deckSize)
  called: string[]; // called items in order
};

function normalizeLines(text: string): string[] {
  return text
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function safeParse<T>(value: string | null): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

export default function CallerPage() {
  const [poolText, setPoolText] = useState<string>("");
  const [deckSize, setDeckSize] = useState<number>(50);
  const [drawSize, setDrawSize] = useState<number>(10);

  const [round, setRound] = useState<number>(0);
  const [deck, setDeck] = useState<string[]>([]);
  const [called, setCalled] = useState<string[]>([]);

  // Derived pool
  const pool = useMemo(() => normalizeLines(poolText), [poolText]);
  const poolCount = pool.length;

  // Remaining derived from actual deck length (never from deckSize input)
  const remaining = Math.max(0, deck.length - called.length);

  // Load saved caller state on mount
  useEffect(() => {
    const saved = safeParse<CallerState>(localStorage.getItem(CALLER_STATE_KEY));

    if (saved) {
      setPoolText(saved.poolText ?? "");
      setDeckSize(saved.deckSize ?? 50);
      setDrawSize(saved.drawSize ?? 10);
      setRound(saved.round ?? 0);
      setDeck(Array.isArray(saved.deck) ? saved.deck : []);
      setCalled(Array.isArray(saved.called) ? saved.called : []);
      return;
    }

    // If no saved state, try shared pool, otherwise defaults
    const shared = localStorage.getItem(SHARED_POOL_KEY);
    if (shared && shared.trim()) {
      setPoolText(shared);
    } else {
      setPoolText(DEFAULT_POOL_TEXT);
    }
  }, []);

  // Persist caller state whenever anything changes
  useEffect(() => {
    const state: CallerState = {
      poolText,
      deckSize,
      drawSize,
      round,
      deck,
      called,
    };
    localStorage.setItem(CALLER_STATE_KEY, JSON.stringify(state));
  }, [poolText, deckSize, drawSize, round, deck, called]);

  // IMPORTANT: whenever pool changes, clamp deckSize down to poolCount
  useEffect(() => {
    if (poolCount <= 0) return;

    // Clamp deckSize to [1..poolCount]
    const clampedDeck = clamp(deckSize, 1, poolCount);
    if (clampedDeck !== deckSize) setDeckSize(clampedDeck);

    // Clamp drawSize to [1..clampedDeck]
    const clampedDraw = clamp(drawSize, 1, clampedDeck);
    if (clampedDraw !== drawSize) setDrawSize(clampedDraw);

    // If a game is already started, ALSO ensure the existing deck isn't invalid.
    // (If pool shrank below deck length, shrink deck while preserving already-called ordering.)
    if (deck.length > 0 && deck.length > poolCount) {
      const newDeck = deck.filter((x) => pool.includes(x)).slice(0, poolCount);
      const newCalled = called.filter((x) => newDeck.includes(x));
      setDeck(newDeck);
      setCalled(newCalled);
      setRound(Math.ceil(newCalled.length / Math.max(1, drawSize)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [poolCount]);

  function loadDefaults() {
    setPoolText(DEFAULT_POOL_TEXT);
  }

  function reloadSharedPool() {
    const shared = localStorage.getItem(SHARED_POOL_KEY);
    if (shared && shared.trim()) {
      setPoolText(shared);
    }
  }

  function onDeckSizeChange(v: string) {
    const n = Number(v);
    const max = Math.max(1, poolCount);
    const clamped = Number.isFinite(n) ? clamp(n, 1, max) : 1;
    setDeckSize(clamped);

    // Keep drawSize valid too
    setDrawSize((d) => clamp(d, 1, clamped));
  }

  function onDrawSizeChange(v: string) {
    const n = Number(v);
    const max = Math.max(1, Math.min(deckSize, Math.max(1, poolCount)));
    const clamped = Number.isFinite(n) ? clamp(n, 1, max) : 1;
    setDrawSize(clamped);
  }

  function startGame() {
    if (poolCount === 0) return;

    const finalDeckSize = clamp(deckSize, 1, poolCount);
    const newDeck = shuffle(pool).slice(0, finalDeckSize);

    setDeck(newDeck);
    setCalled([]);
    setRound(0);
  }

  function resetGame() {
    setDeck([]);
    setCalled([]);
    setRound(0);
  }

  function nextDraw() {
    if (deck.length === 0) return;

    const stillRemaining = deck.length - called.length;
    if (stillRemaining <= 0) return;

    const n = clamp(drawSize, 1, deck.length);
    const toTake = Math.min(n, stillRemaining);

    const ok = window.confirm(`Draw the next ${toTake} item(s)?`);
    if (!ok) return;

    const next = deck.slice(called.length, called.length + toTake);
    const updatedCalled = [...called, ...next];

    setCalled(updatedCalled);
    setRound((r) => r + 1);
  }

  return (
    <div style={{ padding: 16, maxWidth: 900, margin: "0 auto" }}>
      <div
        style={{
          border: "1px solid #ddd",
          borderRadius: 12,
          padding: 16,
          marginBottom: 16,
        }}
      >
        <h1 style={{ margin: 0 }}>Grower Bingo — Caller</h1>
        <div style={{ display: "flex", gap: 12, marginTop: 12, flexWrap: "wrap" }}>
          <Link href="/" style={{ padding: "10px 14px", border: "1px solid #000", borderRadius: 10 }}>
            Back to Generator
          </Link>
          <button
            onClick={reloadSharedPool}
            style={{ padding: "10px 14px", border: "1px solid #000", borderRadius: 10 }}
          >
            Reload shared pool
          </button>
        </div>
      </div>

      <div style={{ marginBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <h2 style={{ margin: 0 }}>Topic Pool (one per line) — Current: {poolCount}</h2>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button onClick={loadDefaults}>Load defaults</button>
            <button onClick={reloadSharedPool}>Reload shared pool</button>
          </div>
        </div>

        <textarea
          value={poolText}
          onChange={(e) => setPoolText(e.target.value)}
          rows={10}
          style={{ width: "100%", marginTop: 8, fontFamily: "monospace" }}
        />
      </div>

      <div style={{ display: "grid", gap: 12 }}>
        <div>
          <label style={{ display: "block", fontWeight: 600 }}>Deck size</label>
          <input
            value={deckSize}
            type="number"
            min={1}
            max={Math.max(1, poolCount)}
            onChange={(e) => onDeckSizeChange(e.target.value)}
            style={{ width: 160 }}
          />
          <div style={{ fontSize: 12, color: "#555", marginTop: 4 }}>
            Must be ≤ pool count. (Auto-clamped)
          </div>
        </div>

        <div>
          <label style={{ display: "block", fontWeight: 600 }}>Draw size</label>
          <input
            value={drawSize}
            type="number"
            min={1}
            max={Math.max(1, Math.min(deckSize, Math.max(1, poolCount)))}
            onChange={(e) => onDrawSizeChange(e.target.value)}
            style={{ width: 160 }}
          />
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button onClick={startGame}>Start Game</button>
          <button onClick={resetGame}>Reset</button>
          <button onClick={nextDraw}>Next draw</button>
        </div>

        <div style={{ fontWeight: 700 }}>
          <div>Round: {round}</div>
          <div>Called: {called.length} / {deck.length}</div>
          <div>Remaining: {remaining}</div>
        </div>

        {called.length > 0 ? (
          <div>
            <h3 style={{ marginBottom: 8 }}>Called so far</h3>
            <ol>
              {called.map((x, i) => (
                <li key={`${x}-${i}`}>{x}</li>
              ))}
            </ol>
          </div>
        ) : null}
      </div>
    </div>
  );
}
