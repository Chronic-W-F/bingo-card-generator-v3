"use client";

import React, { useEffect, useMemo, useState } from "react";

const SHARED_POOL_KEY = "grower-bingo:pool:v1";
const LAST_PACK_META_KEY = "grower-bingo:lastPackMeta:v1";

type CardsPack = {
  packId: string;
  createdAt: number;
  title?: string;
  sponsorName?: string;
  cards: { id: string; grid: string[][] }[];
};

type LastPackMeta = {
  requestKey: string;
  createdAt: number;
  usedItems?: string[];
  cardsPack?: CardsPack;
};

type CallerState = {
  packId: string;
  poolText: string;
  deckSize: number;
  drawSize: number;
  deckSizeInput: string;
  drawSizeInput: string;
  round: number;
  deck: string[];
  called: string[];
  draws: string[][];
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

function safeParseInt(s: string, fallback: number) {
  const n = Number.parseInt(s, 10);
  return Number.isFinite(n) ? n : fallback;
}

function loadJson<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function callerKey(packId: string) {
  return `grower-bingo:caller:${packId}`;
}

function drawsKey(packId: string) {
  return `grower-bingo:draws:${packId}`;
}

function drawTextFromDraws(draws: string[][]) {
  if (!draws.length) return "";
  const parts: string[] = [];
  for (let i = 0; i < draws.length; i++) {
    parts.push(`Day ${i + 1}:`);
    for (const item of draws[i]) parts.push(item);
    parts.push(""); // blank line between days
  }
  return parts.join("\n");
}

export default function CallerPage() {
  const [packId, setPackId] = useState<string>("");

  const [poolText, setPoolText] = useState<string>("");

  const poolLines = useMemo(() => normalizeLines(poolText), [poolText]);
  const poolCount = poolLines.length;

  const [deckSize, setDeckSize] = useState<number>(50);
  const [drawSize, setDrawSize] = useState<number>(10);

  const [deckSizeInput, setDeckSizeInput] = useState<string>("50");
  const [drawSizeInput, setDrawSizeInput] = useState<string>("10");

  const [round, setRound] = useState<number>(0);
  const [deck, setDeck] = useState<string[]>([]);
  const [called, setCalled] = useState<string[]>([]);
  const [draws, setDraws] = useState<string[][]>([]);

  // Resolve packId from URL or from lastPackMeta
  useEffect(() => {
    const url = new URL(window.location.href);
    const fromQuery = (url.searchParams.get("packId") || "").trim();

    if (fromQuery) {
      setPackId(fromQuery);
      return;
    }

    const last = loadJson<LastPackMeta | null>(LAST_PACK_META_KEY, null);
    const fallback = last?.cardsPack?.packId || "";
    setPackId(fallback);
  }, []);

  // Load state for this packId
  useEffect(() => {
    if (!packId) {
      // No packId yet, still allow using shared pool for ad-hoc calls
      const shared = window.localStorage.getItem(SHARED_POOL_KEY) ?? "";
      setPoolText(shared);
      return;
    }

    const shared = window.localStorage.getItem(SHARED_POOL_KEY) ?? "";
    const saved = loadJson<CallerState | null>(callerKey(packId), null);

    if (saved && saved.packId === packId) {
      setPoolText((saved.poolText ?? "").trim() || shared);

      const restoredDeckInput = (saved.deckSizeInput ?? "").trim() || String(saved.deckSize ?? 50);
      const restoredDrawInput = (saved.drawSizeInput ?? "").trim() || String(saved.drawSize ?? 10);
      setDeckSizeInput(restoredDeckInput);
      setDrawSizeInput(restoredDrawInput);

      setDeckSize(Number.isFinite(saved.deckSize) ? saved.deckSize : 50);
      setDrawSize(Number.isFinite(saved.drawSize) ? saved.drawSize : 10);

      setRound(Number.isFinite(saved.round) ? saved.round : 0);
      setDeck(Array.isArray(saved.deck) ? saved.deck : []);
      setCalled(Array.isArray(saved.called) ? saved.called : []);
      setDraws(Array.isArray(saved.draws) ? saved.draws : []);
      return;
    }

    // No saved state for this packId, start clean but pull shared pool
    setPoolText(shared);
    setDeckSize(50);
    setDrawSize(10);
    setDeckSizeInput("50");
    setDrawSizeInput("10");
    setRound(0);
    setDeck([]);
    setCalled([]);
    setDraws([]);
  }, [packId]);

  // Persist caller state per packId
  useEffect(() => {
    if (!packId) return;
    const state: CallerState = {
      packId,
      poolText,
      deckSize,
      drawSize,
      deckSizeInput,
      drawSizeInput,
      round,
      deck,
      called,
      draws,
    };
    try {
      window.localStorage.setItem(callerKey(packId), JSON.stringify(state));
    } catch {
      // ignore
    }
  }, [packId, poolText, deckSize, drawSize, deckSizeInput, drawSizeInput, round, deck, called, draws]);

  // Write draw history for Winners
  useEffect(() => {
    if (!packId) return;
    try {
      window.localStorage.setItem(drawsKey(packId), drawTextFromDraws(draws));
    } catch {
      // ignore
    }
  }, [packId, draws]);

  function reloadSharedPool() {
    const shared = window.localStorage.getItem(SHARED_POOL_KEY) ?? "";
    setPoolText(shared);
  }

  function clampDeckOnBlur() {
    const maxDeck = Math.max(1, poolCount || 1);
    const wanted = safeParseInt(deckSizeInput, deckSize);
    const next = clamp(wanted, 1, maxDeck);
    setDeckSize(next);
    setDeckSizeInput(String(next));

    const wantedDraw = safeParseInt(drawSizeInput, drawSize);
    const nextDraw = clamp(wantedDraw, 1, next);
    setDrawSize(nextDraw);
    setDrawSizeInput(String(nextDraw));
  }

  function clampDrawOnBlur() {
    const wanted = safeParseInt(drawSizeInput, drawSize);
    const next = clamp(wanted, 1, Math.max(1, deckSize));
    setDrawSize(next);
    setDrawSizeInput(String(next));
  }

  function startGame() {
    const maxDeck = Math.max(1, poolCount || 1);

    const ds = clamp(safeParseInt(deckSizeInput, deckSize), 1, maxDeck);
    const dr = clamp(safeParseInt(drawSizeInput, drawSize), 1, ds);

    setDeckSize(ds);
    setDrawSize(dr);
    setDeckSizeInput(String(ds));
    setDrawSizeInput(String(dr));

    const shuffled = shuffle(poolLines);
    const newDeck = shuffled.slice(0, ds);

    setDeck(newDeck);
    setCalled([]);
    setDraws([]);
    setRound(0);
  }

  function resetGame() {
    setDeck([]);
    setCalled([]);
    setDraws([]);
    setRound(0);
  }

  function nextDraw() {
    if (!deck.length) return;

    const remaining = deck.filter((x) => !called.includes(x));
    if (!remaining.length) return;

    const wanted = safeParseInt(drawSizeInput, drawSize);
    const n = clamp(wanted, 1, remaining.length);

    const ok = window.confirm(`Draw next ${n} item(s)?`);
    if (!ok) return;

    const batch = remaining.slice(0, n);

    setCalled((prev) => [...prev, ...batch]);
    setDraws((prev) => [...prev, batch]);
    setRound((prev) => prev + 1);
  }

  const calledCount = called.length;
  const remainingCount = Math.max(0, deck.length - called.length);

  const canStart = poolCount > 0;
  const hasGame = deck.length > 0;

  const winnersHref = packId ? `/winners/${encodeURIComponent(packId)}` : "";

  return (
    <div
      style={{
        maxWidth: 720,
        margin: "0 auto",
        padding: 16,
        fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial",
      }}
    >
      <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 16, marginBottom: 16 }}>
        <h1 style={{ margin: 0, fontSize: 24 }}>Grower Bingo Caller</h1>

        <div style={{ marginTop: 10, fontSize: 13, color: "#6b7280" }}>
          Active packId: <b>{packId || "(none yet)"}</b>
        </div>

        <div style={{ marginTop: 12, display: "flex", gap: 12, flexWrap: "wrap" }}>
          <a
            href="/"
            style={{
              display: "inline-block",
              padding: "10px 14px",
              borderRadius: 10,
              border: "1px solid #111827",
              background: "#111827",
              color: "white",
              textDecoration: "none",
            }}
          >
            Back to Generator
          </a>

          {packId ? (
            <a
              href={winnersHref}
              target="_blank"
              rel="noreferrer"
              style={{
                display: "inline-block",
                padding: "10px 14px",
                borderRadius: 10,
                border: "1px solid #111827",
                background: "white",
                color: "#111827",
                textDecoration: "none",
              }}
            >
              Open Winners (new tab)
            </a>
          ) : null}
        </div>
      </div>

      <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 16, marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: 18 }}>Topic Pool (one per line) Current: {poolCount}</h2>

        <textarea
          value={poolText}
          onChange={(e) => setPoolText(e.target.value)}
          rows={10}
          style={{
            marginTop: 12,
            width: "100%",
            borderRadius: 10,
            border: "1px solid #d1d5db",
            padding: 12,
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
            fontSize: 14,
          }}
          placeholder="One item per line"
        />

        <div style={{ marginTop: 12, display: "flex", gap: 12, flexWrap: "wrap" }}>
          <button
            onClick={reloadSharedPool}
            style={{
              padding: "10px 14px",
              borderRadius: 10,
              border: "1px solid #111827",
              background: "white",
            }}
          >
            Reload shared pool
          </button>
        </div>

        <div style={{ marginTop: 12, fontSize: 13, color: "#374151" }}>
          Shared pool key: <b>{SHARED_POOL_KEY}</b>
        </div>
      </div>

      <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 16, marginBottom: 16 }}>
        <label style={{ display: "block", fontWeight: 600, marginBottom: 6 }}>Deck size</label>
        <input
          value={deckSizeInput}
          onChange={(e) => setDeckSizeInput(e.target.value)}
          onBlur={clampDeckOnBlur}
          inputMode="numeric"
          style={{
            width: "100%",
            padding: 12,
            borderRadius: 10,
            border: "1px solid #d1d5db",
            fontSize: 16,
          }}
        />
        <div style={{ marginTop: 6, fontSize: 13, color: "#6b7280" }}>Must be ≤ pool count.</div>

        <div style={{ height: 12 }} />

        <label style={{ display: "block", fontWeight: 600, marginBottom: 6 }}>Draw size</label>
        <input
          value={drawSizeInput}
          onChange={(e) => setDrawSizeInput(e.target.value)}
          onBlur={clampDrawOnBlur}
          inputMode="numeric"
          style={{
            width: "100%",
            padding: 12,
            borderRadius: 10,
            border: "1px solid #d1d5db",
            fontSize: 16,
          }}
        />
        <div style={{ marginTop: 6, fontSize: 13, color: "#6b7280" }}>Must be ≤ deck size.</div>

        <div style={{ marginTop: 16, display: "flex", gap: 12, flexWrap: "wrap" }}>
          <button
            onClick={startGame}
            disabled={!canStart}
            style={{
              padding: "10px 14px",
              borderRadius: 10,
              border: "1px solid #111827",
              background: canStart ? "#111827" : "#9ca3af",
              color: "white",
              cursor: canStart ? "pointer" : "not-allowed",
            }}
          >
            Start Game
          </button>

          <button
            onClick={resetGame}
            style={{
              padding: "10px 14px",
              borderRadius: 10,
              border: "1px solid #111827",
              background: "white",
            }}
          >
            Reset
          </button>

          <button
            onClick={nextDraw}
            disabled={!hasGame || remainingCount === 0}
            style={{
              padding: "10px 14px",
              borderRadius: 10,
              border: "1px solid #111827",
              background: !hasGame || remainingCount === 0 ? "#9ca3af" : "white",
              cursor: !hasGame || remainingCount === 0 ? "not-allowed" : "pointer",
            }}
          >
            Next draw
          </button>
        </div>

        <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 12 }}>
            <div style={{ fontSize: 12, color: "#6b7280" }}>Round</div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>{round}</div>
          </div>
          <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 12 }}>
            <div style={{ fontSize: 12, color: "#6b7280" }}>Called</div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>
              {calledCount} / {deck.length || 0}
            </div>
          </div>
          <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 12 }}>
            <div style={{ fontSize: 12, color: "#6b7280" }}>Remaining</div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>{remainingCount}</div>
          </div>
        </div>
      </div>

      <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 16 }}>
        <h2 style={{ margin: 0, fontSize: 18 }}>Draw history</h2>

        {!draws.length ? (
          <div style={{ marginTop: 10, color: "#6b7280" }}>No draws yet.</div>
        ) : (
          <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 12 }}>
            {draws.map((batch, idx) => (
              <div key={idx} style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 12 }}>
                <div style={{ fontWeight: 700, marginBottom: 8 }}>Day {idx + 1}</div>
                <div style={{ lineHeight: 1.6 }}>
                  {batch.map((item) => (
                    <div key={item}>{item}</div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ marginTop: 12, fontSize: 12, color: "#6b7280" }}>
        This page persists state per packId, so you can refresh without losing the current game.
      </div>
    </div>
  );
}
