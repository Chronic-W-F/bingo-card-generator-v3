"use client";

import React, { useEffect, useMemo, useState } from "react";

const POOL_KEY = "grower-bingo:pool:v1"; // Option B pool sync (generator -> caller)
const CALLER_STATE_KEY = "grower-bingo:callerState:v1";
const LAST_PACK_ID_KEY = "grower-bingo:lastPackId:v1";

type CallerState = {
  version: 1;
  createdAt: number;
  updatedAt: number;

  // Pool data
  poolLines: string[]; // current pool (unique)
  remaining: string[]; // remaining items to draw (shuffled)
  called: string[]; // called items in order

  // Settings
  drawCount: number; // how many to draw per click

  // UX
  lastSavedAt?: number; // when user clicked "Save pool and reshuffle"
};

function normalizeLines(text: string): string[] {
  return text
    .split(/\r?\n/g)
    .map((s) => s.trim())
    .filter(Boolean);
}

function uniq(lines: string[]) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const l of lines) {
    const k = l.trim();
    if (!k) continue;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(k);
  }
  return out;
}

function shuffle<T>(arr: T[]) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function clampInt(n: number, min: number, max: number) {
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, Math.floor(n)));
}

function readTextFromLocalStorage(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeTextToLocalStorage(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // ignore
  }
}

function writeJsonToLocalStorage(key: string, value: any) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
}

function readJsonFromLocalStorage<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function makeFreshState(poolLines: string[], drawCount = 10): CallerState {
  const cleanPool = uniq(poolLines);
  const shuffled = shuffle(cleanPool);
  const now = Date.now();
  return {
    version: 1,
    createdAt: now,
    updatedAt: now,
    poolLines: cleanPool,
    remaining: shuffled,
    called: [],
    drawCount: clampInt(drawCount, 1, 25),
    lastSavedAt: undefined,
  };
}

function formatTime(ts?: number) {
  if (!ts) return "";
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return String(ts);
  }
}

function Modal({
  open,
  title,
  body,
  confirmText = "Confirm",
  cancelText = "Cancel",
  danger,
  onConfirm,
  onCancel,
  busy,
}: {
  open: boolean;
  title: string;
  body: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        zIndex: 9999,
      }}
      onMouseDown={onCancel}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 520,
          background: "white",
          borderRadius: 14,
          border: "1px solid #e5e7eb",
          boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
          overflow: "hidden",
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div style={{ padding: 16, borderBottom: "1px solid #e5e7eb" }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: "#111827" }}>
            {title}
          </div>
        </div>

        <div style={{ padding: 16, color: "#111827", fontSize: 14 }}>
          {body}
        </div>

        <div
          style={{
            padding: 16,
            display: "flex",
            justifyContent: "flex-end",
            gap: 10,
            borderTop: "1px solid #e5e7eb",
            background: "#fafafa",
          }}
        >
          <button
            onClick={onCancel}
            disabled={!!busy}
            style={{
              padding: "10px 14px",
              borderRadius: 10,
              border: "1px solid #111827",
              background: "white",
              cursor: busy ? "not-allowed" : "pointer",
            }}
          >
            {cancelText}
          </button>

          <button
            onClick={onConfirm}
            disabled={!!busy}
            style={{
              padding: "10px 14px",
              borderRadius: 10,
              border: "1px solid transparent",
              background: danger ? "#b91c1c" : "#111827",
              color: "white",
              cursor: busy ? "not-allowed" : "pointer",
              minWidth: 120,
              fontWeight: 700,
            }}
          >
            {busy ? "Working..." : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CallerPage() {
  const [state, setState] = useState<CallerState | null>(null);
  const [poolText, setPoolText] = useState<string>("");

  const [error, setError] = useState<string>("");
  const [info, setInfo] = useState<string>("");

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmMode, setConfirmMode] = useState<"next" | "reset" | "undo" | null>(
    null
  );
  const [busy, setBusy] = useState(false);

  const poolLines = useMemo(() => normalizeLines(poolText), [poolText]);

  const lastPackId = useMemo(() => {
    return readTextFromLocalStorage(LAST_PACK_ID_KEY) || "";
  }, []);

  // Load logic (priority):
  // 1) Always try POOL_KEY from generator first (most current weekly pool)
  // 2) If missing, try restoring CALLER_STATE_KEY
  // 3) If both missing, start empty
  useEffect(() => {
    const rawPool = readTextFromLocalStorage(POOL_KEY) || "";
    const fromPoolKey = normalizeLines(rawPool);

    if (fromPoolKey.length) {
      const fresh = makeFreshState(fromPoolKey, 10);
      setState(fresh);
      setPoolText(fromPoolKey.join("\n"));
      writeJsonToLocalStorage(CALLER_STATE_KEY, fresh);
      setInfo(`Loaded pool from ${POOL_KEY}.`);
      return;
    }

    const restored = readJsonFromLocalStorage<CallerState>(CALLER_STATE_KEY);
    if (
      restored?.version === 1 &&
      Array.isArray(restored.remaining) &&
      Array.isArray(restored.poolLines)
    ) {
      setState(restored);
      setPoolText(restored.poolLines.join("\n"));
      setInfo(`Restored caller state from ${CALLER_STATE_KEY}.`);
      return;
    }

    const empty = makeFreshState([], 10);
    setState(empty);
    setPoolText("");
    writeJsonToLocalStorage(CALLER_STATE_KEY, empty);
  }, []);

  // Persist state on change
  useEffect(() => {
    if (!state) return;
    writeJsonToLocalStorage(CALLER_STATE_KEY, state);
  }, [state]);

  function applyPoolToState(newPoolLines: string[], setSavedAt?: boolean) {
    const currentDrawCount = state?.drawCount ?? 10;
    const fresh = makeFreshState(newPoolLines, currentDrawCount);
    if (setSavedAt) fresh.lastSavedAt = Date.now();
    setState(fresh);
    setError("");
    setInfo(
      `Saved + reshuffled. Pool stored in ${POOL_KEY}. State stored in ${CALLER_STATE_KEY}.`
    );
  }

  function openConfirm(mode: "next" | "reset" | "undo") {
    setConfirmMode(mode);
    setConfirmOpen(true);
    setError("");
    setInfo("");
  }

  function closeConfirm() {
    setConfirmOpen(false);
    setConfirmMode(null);
    setBusy(false);
  }

  function handleConfirm() {
    if (!state || !confirmMode) return;

    if (confirmMode === "reset") {
      setBusy(true);
      const fresh = makeFreshState(state.poolLines, state.drawCount);
      fresh.lastSavedAt = state.lastSavedAt;
      setState(fresh);
      setBusy(false);
      closeConfirm();
      setInfo("Game reset. Deck reshuffled.");
      return;
    }

    if (confirmMode === "undo") {
      setBusy(true);
      const k = clampInt(state.drawCount, 1, 25);
      const undoCount = Math.min(k, state.called.length);
      if (undoCount === 0) {
        setBusy(false);
        closeConfirm();
        setInfo("Nothing to undo.");
        return;
      }

      const back = state.called.slice(state.called.length - undoCount);
      const remaining = back.concat(state.remaining);
      const called = state.called.slice(0, state.called.length - undoCount);

      const next: CallerState = {
        ...state,
        updatedAt: Date.now(),
        remaining,
        called,
      };

      setState(next);
      setBusy(false);
      closeConfirm();
      setInfo(`Undid last ${undoCount} call(s).`);
      return;
    }

    if (confirmMode === "next") {
      setBusy(true);

      const remaining = state.remaining.slice();
      if (remaining.length === 0) {
        setBusy(false);
        closeConfirm();
        setInfo("Deck empty. Reset to reshuffle.");
        return;
      }

      const k = clampInt(state.drawCount, 1, 25);
      const batch: string[] = [];
      for (let i = 0; i < k && remaining.length > 0; i++) {
        const item = remaining.shift();
        if (item) batch.push(item);
      }

      const next: CallerState = {
        ...state,
        updatedAt: Date.now(),
        remaining,
        called: state.called.concat(batch),
      };

      setState(next);
      setBusy(false);
      closeConfirm();
      return;
    }
  }

  function savePoolAndReshuffle() {
    const lines = uniq(poolLines);
    if (lines.length === 0) {
      setError("Pool is empty. Paste items (one per line).");
      return;
    }

    // This is the “recall” location:
    // - POOL_KEY is what Generator and Caller share
    // - CALLER_STATE_KEY is the in-progress game state
    writeTextToLocalStorage(POOL_KEY, lines.join("\n"));

    applyPoolToState(lines, true);
  }

  function setDrawCount(raw: string) {
    const n = clampInt(Number.parseInt(raw, 10), 1, 25);
    if (!state) return;
    setState({ ...state, drawCount: n, updatedAt: Date.now() });
  }

  function openWinners() {
    const packId = readTextFromLocalStorage(LAST_PACK_ID_KEY) || "";
    if (!packId) {
      setError(
        `No packId found. Generate a pack first (Generator sets ${LAST_PACK_ID_KEY}).`
      );
      return;
    }
    const url = `/winners/${encodeURIComponent(packId)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  const calledLatest = state?.called.slice().reverse() ?? [];
  const remainingCount = state?.remaining.length ?? 0;

  const confirmTitle =
    confirmMode === "next"
      ? "Confirm next draw"
      : confirmMode === "reset"
      ? "Reset game"
      : "Undo last draw";

  const confirmBody =
    confirmMode === "next" ? (
      <div style={{ lineHeight: 1.5 }}>
        <div>
          Draw <b>{state?.drawCount ?? 10}</b> item(s) now?
        </div>
        <div style={{ marginTop: 8, color: "#6b7280" }}>
          Remaining after draw:{" "}
          <b>
            {Math.max(
              0,
              (state?.remaining.length ?? 0) - (state?.drawCount ?? 10)
            )}
          </b>
        </div>
      </div>
    ) : confirmMode === "reset" ? (
      <div style={{ lineHeight: 1.5 }}>
        This will clear called items and reshuffle the deck.
      </div>
    ) : (
      <div style={{ lineHeight: 1.5 }}>
        Undo the last <b>{state?.drawCount ?? 10}</b> call(s) (or fewer if less
        were called).
      </div>
    );

  const confirmDanger = confirmMode === "reset";

  return (
    <div
      style={{
        maxWidth: 860,
        margin: "0 auto",
        padding: 16,
        fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <h1 style={{ marginTop: 0, fontSize: 30 }}>Caller</h1>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <a
            href="/"
            style={{
              padding: "10px 14px",
              borderRadius: 10,
              border: "1px solid #111827",
              background: "white",
              textDecoration: "none",
              color: "#111827",
              display: "inline-block",
              fontWeight: 700,
            }}
          >
            Back to Generator
          </a>

          <button
            onClick={openWinners}
            style={{
              padding: "10px 14px",
              borderRadius: 10,
              border: "1px solid #111827",
              background: "white",
              color: "#111827",
              cursor: "pointer",
              fontWeight: 700,
            }}
          >
            Open Winners
          </button>
        </div>
      </div>

      <div style={{ marginTop: 6, color: "#6b7280", fontSize: 12 }}>
        Pool key: <b>{POOL_KEY}</b> | Caller state: <b>{CALLER_STATE_KEY}</b>
        {lastPackId ? (
          <>
            {" "}
            | Last packId: <b>{lastPackId}</b>
          </>
        ) : null}
      </div>

      <div
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          padding: 16,
          marginTop: 12,
          marginBottom: 16,
        }}
      >
        <div style={{ display: "grid", gap: 12 }}>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <div style={{ minWidth: 220 }}>
              <label style={{ display: "block", fontWeight: 700, marginBottom: 6 }}>
                Draw count (per click)
              </label>
              <input
                value={String(state?.drawCount ?? 10)}
                onChange={(e) => setDrawCount(e.target.value)}
                inputMode="numeric"
                style={{
                  width: 160,
                  padding: 12,
                  borderRadius: 10,
                  border: "1px solid #d1d5db",
                  fontSize: 16,
                }}
              />
              <div style={{ marginTop: 6, fontSize: 12, color: "#6b7280" }}>
                Typical: 10
              </div>
            </div>

            <div style={{ flex: 1, minWidth: 260 }}>
              <div style={{ fontWeight: 800, marginBottom: 6 }}>
                Remaining: {remainingCount} | Called: {state?.called.length ?? 0}
              </div>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button
                  onClick={() => openConfirm("next")}
                  disabled={!state || remainingCount === 0}
                  style={{
                    padding: "12px 16px",
                    borderRadius: 12,
                    border: "1px solid #111827",
                    background:
                      !state || remainingCount === 0 ? "#9ca3af" : "#111827",
                    color: "white",
                    cursor:
                      !state || remainingCount === 0 ? "not-allowed" : "pointer",
                    minWidth: 180,
                    fontWeight: 800,
                  }}
                >
                  Next draw
                </button>

                <button
                  onClick={() => openConfirm("undo")}
                  disabled={!state || (state?.called.length ?? 0) === 0}
                  style={{
                    padding: "12px 16px",
                    borderRadius: 12,
                    border: "1px solid #111827",
                    background:
                      !state || (state?.called.length ?? 0) === 0
                        ? "#9ca3af"
                        : "white",
                    cursor:
                      !state || (state?.called.length ?? 0) === 0
                        ? "not-allowed"
                        : "pointer",
                    minWidth: 180,
                    fontWeight: 700,
                  }}
                >
                  Undo last batch
                </button>

                <button
                  onClick={() => openConfirm("reset")}
                  disabled={!state}
                  style={{
                    padding: "12px 16px",
                    borderRadius: 12,
                    border: "1px solid #b91c1c",
                    background: "white",
                    color: "#b91c1c",
                    cursor: !state ? "not-allowed" : "pointer",
                    minWidth: 160,
                    fontWeight: 800,
                  }}
                >
                  Reset game
                </button>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 8 }}>
            <div
              style={{
                display: "flex",
                gap: 10,
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div style={{ fontWeight: 800 }}>
                Caller pool (one per line). Items:{" "}
                <b>{uniq(poolLines).length}</b>
              </div>

              <button
                onClick={savePoolAndReshuffle}
                style={{
                  padding: "10px 14px",
                  borderRadius: 10,
                  border: "1px solid #111827",
                  background: "white",
                  cursor: "pointer",
                  fontWeight: 700,
                }}
              >
                Save pool and reshuffle
              </button>
            </div>

            <textarea
              value={poolText}
              onChange={(e) => setPoolText(e.target.value)}
              rows={10}
              style={{
                marginTop: 10,
                width: "100%",
                borderRadius: 10,
                border: "1px solid #d1d5db",
                padding: 12,
                fontFamily:
                  "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                fontSize: 14,
              }}
            />

            <div style={{ marginTop: 8, fontSize: 12, color: "#6b7280" }}>
              Last saved: <b>{formatTime(state?.lastSavedAt) || "Never"}</b>
            </div>
          </div>

          {error ? (
            <div style={{ color: "#b91c1c", fontWeight: 700 }}>{error}</div>
          ) : null}
          {info ? <div style={{ color: "#111827" }}>{info}</div> : null}
        </div>
      </div>

      <div
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          padding: 16,
        }}
      >
        <div style={{ fontWeight: 900, marginBottom: 10, fontSize: 18 }}>
          Called items (latest first)
        </div>

        {calledLatest.length === 0 ? (
          <div style={{ color: "#6b7280" }}>No calls yet.</div>
        ) : (
          <ol style={{ margin: 0, paddingLeft: 18, lineHeight: 1.55 }}>
            {calledLatest.map((item, idx) => (
              <li key={`${item}-${idx}`}>{item}</li>
            ))}
          </ol>
        )}
      </div>

      <Modal
        open={confirmOpen}
        title={confirmTitle}
        body={confirmBody}
        confirmText={
          confirmMode === "next"
            ? "Draw now"
            : confirmMode === "reset"
            ? "Reset"
            : "Undo"
        }
        cancelText="Cancel"
        danger={confirmDanger}
        busy={busy}
        onConfirm={handleConfirm}
        onCancel={closeConfirm}
      />
    </div>
  );
                    }
