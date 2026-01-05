// app/winners/[packId]/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";

const CALLER_STATE_KEY = "grower-bingo:callerState:v1";

function packCallerKey(packId: string) {
  return `grower-bingo:callerState:${packId}`;
}

function packStorageKey(packId: string) {
  return `grower-bingo:pack:${packId}`;
}

const CENTER_LABEL = "Joe’s Grows";

type BingoCard = {
  id: string;
  grid: string[][];
};

type StoredPack = {
  packId: string;
  createdAt: number;
  title?: string;
  sponsorName?: string;
  cards: BingoCard[];
  weeklyPool?: string[];
  usedItems?: string[];
};

type CallerState = {
  packId: string;
  savedAt: number | null;
  pool: string[];
  remaining: string[];
  called: string[];
  lastBatch: string[];
};

function safeJsonParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

// Normalize for matching
function norm(s: string) {
  return (s || "")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[’‘]/g, "'")
    .toLowerCase();
}

function isCenter(label: string) {
  return norm(label) === norm(CENTER_LABEL);
}

export default function WinnersPage({ params }: { params: { packId: string } }) {
  const packId = decodeURIComponent(params.packId);

  const [pack, setPack] = useState<StoredPack | null>(null);
  const [caller, setCaller] = useState<CallerState | null>(null);

  useEffect(() => {
    const p = safeJsonParse<StoredPack>(window.localStorage.getItem(packStorageKey(packId)));
    setPack(p || null);

    // Prefer per-pack caller state
    const byPack = safeJsonParse<CallerState>(window.localStorage.getItem(packCallerKey(packId)));
    const global = safeJsonParse<CallerState>(window.localStorage.getItem(CALLER_STATE_KEY));

    const resolved =
      (byPack && byPack.packId === packId ? byPack : null) ||
      (global && global.packId === packId ? global : null) ||
      null;

    setCaller(resolved);
  }, [packId]);

  const calledSet = useMemo(() => {
    const set = new Set<string>();
    for (const c of caller?.called || []) set.add(norm(c));
    return set;
  }, [caller]);

  const completion = useMemo(() => {
    const cards = pack?.cards || [];
    const called = caller?.called || [];

    const results = cards.map((card) => {
      let totalNeeded = 0;
      let matched = 0;

      // Track at what call index this card becomes complete (blackout)
      const needed = new Set<string>();

      for (const row of card.grid) {
        for (const cell of row) {
          if (!cell) continue;
          if (isCenter(cell)) continue;
          totalNeeded += 1;
          needed.add(norm(cell));
        }
      }

      for (const key of needed) {
        if (calledSet.has(key)) matched += 1;
      }

      // If complete, find earliest call index where all needed are satisfied
      let completeAt: number | null = null;
      if (matched === totalNeeded && totalNeeded > 0) {
        const running = new Set<string>();
        for (let i = 0; i < called.length; i++) {
          running.add(norm(called[i]));
          let ok = true;
          for (const key of needed) {
            if (!running.has(key)) {
              ok = false;
              break;
            }
          }
          if (ok) {
            completeAt = i + 1; // 1-based call number
            break;
          }
        }
      }

      return {
        cardId: card.id,
        matched,
        totalNeeded,
        isComplete: matched === totalNeeded && totalNeeded > 0,
        completeAtCall: completeAt,
      };
    });

    return results;
  }, [pack, caller, calledSet]);

  const summary = useMemo(() => {
    if (!pack?.cards?.length) return { complete: 0, total: 0 };
    const total = pack.cards.length;
    const complete = completion.filter((c) => c.isComplete).length;
    return { complete, total };
  }, [pack, completion]);

  const title = pack?.title || "Winners";
  const sponsorName = pack?.sponsorName || "";

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: 16, fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial" }}>
      <div style={{ display: "flex", gap: 10, alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <h1 style={{ margin: 0, fontSize: 34 }}>Winners</h1>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
          <a
            href="/caller"
            style={{
              padding: "10px 14px",
              borderRadius: 10,
              border: "1px solid #111827",
              background: "white",
              textDecoration: "none",
              color: "#111827",
              display: "inline-block",
            }}
          >
            Back to Caller
          </a>

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
            }}
          >
            Back to Generator
          </a>
        </div>
      </div>

      <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 16 }}>
        PackId: <b>{packId}</b>
        {caller?.savedAt ? (
          <>
            {" "}
            | Caller state saved: <b>{new Date(caller.savedAt).toLocaleString()}</b>
            {" "}
            | Called: <b>{caller.called.length}</b> | Remaining: <b>{caller.remaining.length}</b>
          </>
        ) : (
          <> | Caller state: <b>Not loaded</b></>
        )}
      </div>

      <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 16, marginBottom: 16 }}>
        <div style={{ fontSize: 20, fontWeight: 900 }}>{title}</div>
        {sponsorName ? <div style={{ color: "#6b7280", marginTop: 4 }}>Sponsor: {sponsorName}</div> : null}
      </div>

      <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 16, marginBottom: 16 }}>
        <div style={{ fontWeight: 900, marginBottom: 8 }}>Completion summary</div>

        {!pack?.cards?.length ? (
          <div style={{ color: "#b91c1c", fontWeight: 700 }}>
            No pack loaded for this packId. Generate a pack first, then open Winners from Caller.
          </div>
        ) : !caller ? (
          <div style={{ color: "#b91c1c", fontWeight: 700 }}>
            No caller state loaded for this pack. Go to Caller, run draws, and make sure it says it saved for this packId.
          </div>
        ) : (
          <div>
            Cards complete: <b>{summary.complete}</b> / <b>{summary.total}</b>
          </div>
        )}
      </div>

      <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 16 }}>
        <div style={{ fontWeight: 900, marginBottom: 10 }}>Should-have-won timeline and claim tracking</div>

        {pack?.cards?.length ? (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ textAlign: "left" }}>
                  <th style={{ padding: 10, borderBottom: "1px solid #e5e7eb" }}>Card ID</th>
                  <th style={{ padding: 10, borderBottom: "1px solid #e5e7eb" }}>Expected completion</th>
                </tr>
              </thead>
              <tbody>
                {completion.map((c) => (
                  <tr key={c.cardId}>
                    <td style={{ padding: 10, borderBottom: "1px solid #f3f4f6", fontWeight: 700 }}>{c.cardId}</td>
                    <td style={{ padding: 10, borderBottom: "1px solid #f3f4f6" }}>
                      {c.isComplete ? (
                        <span>Complete at call #{c.completeAtCall ?? "?"}</span>
                      ) : (
                        <span>Not complete yet ({c.matched}/{c.totalNeeded})</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ marginTop: 10, fontSize: 12, color: "#6b7280" }}>
              Completion is computed from official calls only (blackout). Center is treated as FREE.
            </div>
          </div>
        ) : (
          <div style={{ color: "#6b7280" }}>No cards found for this pack.</div>
        )}
      </div>
    </div>
  );
}
