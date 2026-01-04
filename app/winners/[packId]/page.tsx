"use client";

import React, { useEffect, useMemo, useState } from "react";
import { CENTER_LABEL } from "@/lib/bingo";
import { computeExpectedWinners } from "@/lib/packTypes";

type BingoCard = {
  id: string;
  grid: string[][];
};

type CardsPack = {
  packId: string;
  createdAt: number;
  title?: string;
  sponsorName?: string;
  cards: BingoCard[];
};

type ClaimInfo = {
  claimed: boolean;
  claimedBy?: string;
  claimedAt?: number;
};

type DrawDay = {
  day: number;
  calls: string[];
};

function packStorageKey(packId: string) {
  return `grower-bingo:pack:${packId}`;
}

function drawsStorageKey(packId: string) {
  return `grower-bingo:draws:${packId}`;
}

function claimsStorageKey(packId: string) {
  return `grower-bingo:claims:${packId}`;
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

function parseDrawText(drawText: string): DrawDay[] {
  // Accepts headers like:
  // Day 1:
  // 1:
  // DAY 2
  // Day 3
  const lines = drawText.split("\n").map((l) => l.trimEnd());

  const days: DrawDay[] = [];
  let currentDay: number | null = null;
  let currentCalls: string[] = [];

  const push = () => {
    if (currentDay == null) return;
    days.push({
      day: currentDay,
      calls: currentCalls.map((s) => s.trim()).filter(Boolean),
    });
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;

    const m = line.match(/^day\s*(\d+)\s*:?$/i) || line.match(/^(\d+)\s*:?$/i);
    if (m) {
      push();
      currentDay = Number(m[1]);
      currentCalls = [];
      continue;
    }

    currentCalls.push(line);
  }

  push();
  days.sort((a, b) => a.day - b.day);
  return days;
}

export default function WinnersPage({ params }: { params: { packId: string } }) {
  const { packId } = params;

  const [pack, setPack] = useState<CardsPack | null>(null);
  const [drawText, setDrawText] = useState<string>("");
  const [claims, setClaims] = useState<Record<string, ClaimInfo>>({});
  const [claimName, setClaimName] = useState<string>("");

  useEffect(() => {
    const p = loadJson<CardsPack | null>(packStorageKey(packId), null);
    setPack(p);

    const draws = loadJson<string>(drawsStorageKey(packId), "");
    setDrawText(draws);

    const c = loadJson<Record<string, ClaimInfo>>(claimsStorageKey(packId), {});
    setClaims(c);
  }, [packId]);

  useEffect(() => {
    try {
      window.localStorage.setItem(drawsStorageKey(packId), drawText);
    } catch {
      // ignore
    }
  }, [packId, drawText]);

  useEffect(() => {
    try {
      window.localStorage.setItem(claimsStorageKey(packId), JSON.stringify(claims));
    } catch {
      // ignore
    }
  }, [packId, claims]);

  const drawDays = useMemo(() => parseDrawText(drawText), [drawText]);

  const expected = useMemo(() => {
    if (!pack) return [];
    return computeExpectedWinners({
      pack,
      drawDays,
      centerLabel: CENTER_LABEL,
    });
  }, [pack, drawDays]);

  function toggleClaim(cardId: string) {
    setClaims((prev) => {
      const cur = prev[cardId] || { claimed: false };

      if (cur.claimed) {
        return { ...prev, [cardId]: { claimed: false } };
      }

      const by = (claimName || "").trim() || undefined;

      return {
        ...prev,
        [cardId]: {
          claimed: true,
          claimedBy: by,
          claimedAt: Date.now(),
        },
      };
    });
  }

  if (!pack) {
    return (
      <div
        style={{
          maxWidth: 1000,
          margin: "0 auto",
          padding: 16,
          fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial",
        }}
      >
        <h1 style={{ marginTop: 0 }}>Expected Winners</h1>
        <div style={{ padding: 12, borderRadius: 12, border: "1px solid #e5e7eb" }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Pack not found on this device</div>
          <div>
            packId: <b>{packId}</b>
          </div>
          <div style={{ marginTop: 10, color: "#6b7280", fontSize: 13 }}>
            This is Option 1 (localStorage). Generate the pack on this device so it saves locally, or later
            we can add server storage.
          </div>
        </div>
      </div>
    );
  }

  const packTitle = pack.title || "Bingo Pack";

  return (
    <div
      style={{
        maxWidth: 1000,
        margin: "0 auto",
        padding: 16,
        fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial",
      }}
    >
      <h1 style={{ marginTop: 0, marginBottom: 6 }}>Expected Winners</h1>

      <div style={{ fontSize: 14, marginBottom: 12 }}>
        <div>
          packId: <b>{packId}</b>
        </div>
        <div>
          title: <b>{packTitle}</b>
        </div>
        <div>
          cards: <b>{pack.cards.length}</b>
        </div>
      </div>

      <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 16, marginBottom: 16 }}>
        <div style={{ fontWeight: 800, marginBottom: 8 }}>Draw history</div>

        <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 10 }}>
          Format example:
          <pre style={{ whiteSpace: "pre-wrap", margin: "8px 0 0 0" }}>
{`Day 1:
Trellis net
Defoliate

Day 2:
VPD off
Cal-Mag`}
          </pre>
          You can also use "1:" instead of "Day 1:".
        </div>

        <textarea
          value={drawText}
          onChange={(e) => setDrawText(e.target.value)}
          rows={10}
          style={{
            width: "100%",
            borderRadius: 10,
            border: "1px solid #d1d5db",
            padding: 12,
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
            fontSize: 14,
          }}
        />
      </div>

      <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 16 }}>
        <div
          style={{
            display: "flex",
            gap: 12,
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            marginBottom: 12,
          }}
        >
          <div style={{ fontWeight: 800 }}>Should-have-won timeline + claim tracking</div>

          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <div style={{ fontSize: 13, color: "#6b7280" }}>Claim name (optional):</div>
            <input
              value={claimName}
              onChange={(e) => setClaimName(e.target.value)}
              placeholder="Name or handle"
              style={{
                padding: 10,
                borderRadius: 10,
                border: "1px solid #d1d5db",
                minWidth: 220,
              }}
            />
          </div>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #e5e7eb" }}>Card ID</th>
                <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #e5e7eb" }}>
                  Expected completion
                </th>
                <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #e5e7eb" }}>Claimed</th>
                <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #e5e7eb" }}>Claim details</th>
                <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #e5e7eb" }}>Open card</th>
              </tr>
            </thead>

            <tbody>
              {expected.map((row) => {
                const info = claims[row.cardId] || { claimed: false };

                const completionText =
                  row.completionDay == null ? "Not complete yet" : `Day ${row.completionDay}`;

                const claimText =
                  info.claimed && info.claimedAt
                    ? `${info.claimedBy ? info.claimedBy + " " : ""}(${new Date(info.claimedAt).toLocaleString()})`
                    : "";

                return (
                  <tr key={row.cardId}>
                    <td style={{ padding: 8, borderBottom: "1px solid #f3f4f6", fontWeight: 800 }}>
                      {row.cardId}
                    </td>
                    <td style={{ padding: 8, borderBottom: "1px solid #f3f4f6" }}>{completionText}</td>
                    <td style={{ padding: 8, borderBottom: "1px solid #f3f4f6" }}>
                      <input
                        type="checkbox"
                        checked={!!info.claimed}
                        onChange={() => toggleClaim(row.cardId)}
                      />
                    </td>
                    <td style={{ padding: 8, borderBottom: "1px solid #f3f4f6" }}>{claimText}</td>
                    <td style={{ padding: 8, borderBottom: "1px solid #f3f4f6" }}>
                      <a href={`/card/${encodeURIComponent(packId)}/${encodeURIComponent(row.cardId)}`}>Open</a>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div style={{ marginTop: 10, fontSize: 13, color: "#6b7280" }}>
          Completion day is computed from official calls only (blackout). Claim checkboxes are for claim-first tracking.
        </div>
      </div>
    </div>
  );
}
