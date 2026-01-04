"use client";

import React, { useEffect, useMemo, useState } from "react";

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

function packStorageKey(packId: string) {
  return `grower-bingo:pack:${packId}`;
}

function marksStorageKey(packId: string, cardId: string) {
  return `grower-bingo:marks:${packId}:${cardId}`;
}

function loadPack(packId: string): CardsPack | null {
  try {
    const raw = window.localStorage.getItem(packStorageKey(packId));
    if (!raw) return null;
    return JSON.parse(raw) as CardsPack;
  } catch {
    return null;
  }
}

function loadMarks(packId: string, cardId: string): Record<string, boolean> {
  try {
    const raw = window.localStorage.getItem(marksStorageKey(packId, cardId));
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, boolean>;
  } catch {
    return {};
  }
}

export default function CardPage({
  params,
}: {
  params: { packId: string; cardId: string };
}) {
  const { packId, cardId } = params;

  const [pack, setPack] = useState<CardsPack | null>(null);
  const [marks, setMarks] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const p = loadPack(packId);
    setPack(p);
    setMarks(loadMarks(packId, cardId));
  }, [packId, cardId]);

  useEffect(() => {
    try {
      window.localStorage.setItem(marksStorageKey(packId, cardId), JSON.stringify(marks));
    } catch {
      // ignore
    }
  }, [packId, cardId, marks]);

  const card = useMemo(() => {
    return pack?.cards.find((c) => c.id === cardId) ?? null;
  }, [pack, cardId]);

  function toggle(r: number, c: number) {
    const key = `${r},${c}`;
    setMarks((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function clearMarks() {
    setMarks({});
  }

  if (!pack) {
    return (
      <div style={{ maxWidth: 900, margin: "0 auto", padding: 16, fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial" }}>
        <h1 style={{ marginTop: 0 }}>Bingo Card</h1>
        <div style={{ padding: 12, borderRadius: 12, border: "1px solid #e5e7eb" }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Pack not found on this device</div>
          <div>packId: <b>{packId}</b></div>
          <div>cardId: <b>{cardId}</b></div>
          <div style={{ marginTop: 10, color: "#6b7280", fontSize: 13 }}>
            This is Option 1 (localStorage). Generate the pack on this device so it saves locally,
            or later we can add server storage so links work for everyone.
          </div>
        </div>
      </div>
    );
  }

  if (!card) {
    return (
      <div style={{ maxWidth: 900, margin: "0 auto", padding: 16, fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial" }}>
        <h1 style={{ marginTop: 0 }}>Bingo Card</h1>
        <div style={{ padding: 12, borderRadius: 12, border: "1px solid #e5e7eb" }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Card not found in this pack</div>
          <div>packId: <b>{packId}</b></div>
          <div>cardId: <b>{cardId}</b></div>
        </div>
      </div>
    );
  }

  const size = card.grid.length;

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: 16, fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial" }}>
      <div style={{ display: "flex", gap: 12, alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" }}>
        <div>
          <h1 style={{ marginTop: 0, marginBottom: 6 }}>Digital Bingo Card</h1>
          <div style={{ fontSize: 14 }}>
            packId: <b>{packId}</b> • Card ID: <b>{cardId}</b>
          </div>
          <div style={{ marginTop: 6, fontSize: 13, color: "#6b7280" }}>
            Tap squares to mark. Screenshot this page as proof. Marks are stored on this phone.
          </div>
        </div>

        <button
          onClick={clearMarks}
          style={{
            padding: "12px 16px",
            borderRadius: 12,
            border: "1px solid #111827",
            background: "white",
            cursor: "pointer",
          }}
        >
          Clear marks
        </button>
      </div>

      <div
        style={{
          marginTop: 14,
          display: "grid",
          gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))`,
          gap: 10,
        }}
      >
        {card.grid.map((row, r) =>
          row.map((label, c) => {
            const isMarked = !!marks[`${r},${c}`];
            return (
              <button
                key={`${r}-${c}`}
                onClick={() => toggle(r, c)}
                style={{
                  position: "relative",
                  minHeight: 74,
                  padding: 10,
                  borderRadius: 12,
                  border: "1px solid #d1d5db",
                  background: "white",
                  cursor: "pointer",
                  textAlign: "center",
                  lineHeight: 1.15,
                  fontWeight: 800,
                }}
              >
                <div style={{ fontSize: 13 }}>{label}</div>

                {isMarked ? (
                  <div
                    aria-hidden
                    style={{
                      position: "absolute",
                      inset: 0,
                      borderRadius: 12,
                      background: "rgba(0,0,0,0.30)",
                    }}
                  />
                ) : null}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
