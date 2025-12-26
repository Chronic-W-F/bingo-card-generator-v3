// app/caller/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";

const POOL_KEY = "grower-bingo:pool:v1";
const META_KEY = "grower-bingo:poolmeta:v1";
const STATE_KEY = "grower-bingo:callerstate:v1";

type CallerState = {
  createdAt: number;
  pool: string[];       // active weekly pool
  remaining: string[];
  called: string[];
  callsPerDraw: number; // "1 a day" = set to 1
};

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function parseLines(raw: string | null): string[] {
  if (!raw) return [];
  return raw
    .split(/\r?\n/g)
    .map((s) => s.trim())
    .filter(Boolean);
}

function saveState(st: CallerState) {
  localStorage.setItem(STATE_KEY, JSON.stringify(st));
}

function loadState(): CallerState | null {
  const raw = localStorage.getItem(STATE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as CallerState;
  } catch {
    return null;
  }
}

export default function CallerPage() {
  const [state, setState] = useState<CallerState | null>(null);
  const [poolSource, setPoolSource] = useState<"weekly" | "missing">("missing");
  const [meta, setMeta] = useState<any>(null);

  // Load meta for display
  useEffect(() => {
    const m = localStorage.getItem(META_KEY);
    if (m) {
      try { setMeta(JSON.parse(m)); } catch {}
    }
  }, []);

  // Restore active game state (survive refresh)
  useEffect(() => {
    const existing = loadState();
    if (existing && Array.isArray(existing.pool) && existing.pool.length > 0) {
      setState(existing);
      setPoolSource("weekly");
      return;
    }

    // No game in progress, load weekly pool from generator
    const weeklyPool = parseLines(localStorage.getItem(POOL_KEY));
    if (weeklyPool.length === 0) {
      setPoolSource("missing");
      setState({
        createdAt: Date.now(),
        pool: [],
        remaining: [],
        called: [],
        callsPerDraw: 10,
      });
      return;
    }

    const shuffled = shuffle(weeklyPool);
    const fresh: CallerState = {
      createdAt: Date.now(),
      pool: weeklyPool,
      remaining: shuffled,
      called: [],
      callsPerDraw: 10,
    };
    setPoolSource("weekly");
    setState(fresh);
    saveState(fresh);
  }, []);

  const activeCount = state?.pool.length ?? 0;
  const remainingCount = state?.remaining.length ?? 0;
  const calledCount = state?.called.length ?? 0;

  const lastDraw = useMemo(() => {
    if (!state) return [];
    // last "callsPerDraw" items from called
    const n = Math.max(1, state.callsPerDraw);
    return state.called.slice(-n);
  }, [state]);

  function resetGame() {
    const weeklyPool = parseLines(localStorage.getItem(POOL_KEY));
    if (weeklyPool.length === 0) {
      const empty: CallerState = {
        createdAt: Date.now(),
        pool: [],
        remaining: [],
        called: [],
        callsPerDraw: 10,
      };
      setPoolSource("missing");
      setState(empty);
      saveState(empty);
      return;
    }

    const fresh: CallerState = {
      createdAt: Date.now(),
      pool: weeklyPool,
      remaining: shuffle(weeklyPool),
      called: [],
      callsPerDraw: state?.callsPerDraw ?? 10,
    };
    setPoolSource("weekly");
    setState(fresh);
    saveState(fresh);
  }

  function nextDraw() {
    if (!state) return;

    // confirmation prompt (locked requirement)
    const ok = window.confirm(`Draw the next ${state.callsPerDraw} item(s)?`);
    if (!ok) return;

    const n = Math.max(1, Math.min(state.callsPerDraw, state.remaining.length));
    const drawn = state.remaining.slice(0, n);
    const next: CallerState = {
      ...state,
      remaining: state.remaining.slice(n),
      called: state.called.concat(drawn),
    };
    setState(next);
    saveState(next);
  }

  if (!state) return null;

  return (
    <main style={{ padding: 16, maxWidth: 900, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, fontWeight: 700 }}>Grower Bingo Caller</h1>

      <div style={{ marginTop: 8, opacity: 0.9 }}>
        Active pool:{" "}
        <b>{poolSource === "weekly" ? `Weekly Pool (${activeCount})` : "MISSING (generate cards first)"}</b>
        {meta && (
          <span style={{ marginLeft: 10, opacity: 0.85 }}>
            • Grid {meta.gridSize}×{meta.gridSize} • Weekly pool {meta.weeklyPoolSize}
          </span>
        )}
      </div>

      <div style={{ marginTop: 10, display: "flex", gap: 12, flexWrap: "wrap" }}>
        <label>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>Calls per draw</div>
          <input
            type="number"
            min={1}
            max={50}
            value={state.callsPerDraw}
            onChange={(e) => {
              const next = { ...state, callsPerDraw: Number(e.target.value) || 1 };
              setState(next);
              saveState(next);
            }}
          />
          <div style={{ marginTop: 6, opacity: 0.85 }}>
            Set to 1 for “one a day”.
          </div>
        </label>

        <div style={{ alignSelf: "end", display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button onClick={nextDraw} disabled={remainingCount === 0 || activeCount === 0}>
            Next draw
          </button>
          <button onClick={resetGame}>
            Reset game
          </button>
        </div>
      </div>

      <div style={{ marginTop: 14, display: "flex", gap: 14, flexWrap: "wrap" }}>
        <div style={{ padding: 10, border: "1px solid #ddd", borderRadius: 8 }}>
          <div style={{ fontWeight: 700 }}>Remaining</div>
          <div>{remainingCount}</div>
        </div>
        <div style={{ padding: 10, border: "1px solid #ddd", borderRadius: 8 }}>
          <div style={{ fontWeight: 700 }}>Called</div>
          <div>{calledCount}</div>
        </div>
      </div>

      <div style={{ marginTop: 16, padding: 12, border: "1px solid #ddd", borderRadius: 8 }}>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>Most recent draw</div>
        {lastDraw.length === 0 ? (
          <div style={{ opacity: 0.8 }}>No calls yet.</div>
        ) : (
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {lastDraw.map((x, i) => (
              <li key={`${x}-${i}`} style={{ fontSize: 18, marginBottom: 4 }}>
                {x}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div style={{ marginTop: 16, padding: 12, border: "1px solid #ddd", borderRadius: 8 }}>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>All calls (stays on page)</div>
        {state.called.length === 0 ? (
          <div style={{ opacity: 0.8 }}>Nothing called yet.</div>
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {state.called.map((x, i) => (
              <span
                key={`${x}-${i}`}
                style={{
                  border: "1px solid #ccc",
                  borderRadius: 999,
                  padding: "6px 10px",
                }}
              >
                {i + 1}. {x}
              </span>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
