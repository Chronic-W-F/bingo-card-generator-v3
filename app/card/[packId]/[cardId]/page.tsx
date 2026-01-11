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

// Scale font based on label length so it stays readable on mobile
function fontSizeForLabel(label: string) {
  const n = (label || "").trim().length;
  if (n <= 10) return 15;
  if (n <= 16) return 14;
  if (n <= 22) return 13;
  if (n <= 30) return 12;
  return 11;
}

export default function CardPage({
  params,
}: {
  params: { packId: string; cardId: string };
}) {
  const { packId, cardId } = params;

  const [pack, setPack] = useState<CardsPack | null>(null);
  const [marks, setMarks] = useState<Record<string, boolean>>({});
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    try {
      const sp = new URLSearchParams(window.location.search);
      setIsAdmin(sp.get("admin") === "1");
    } catch {
      setIsAdmin(false);
    }
  }, []);

  useEffect(() => {
    const p = loadPack(packId);
    setPack(p);
    setMarks(loadMarks(packId, cardId));
  }, [packId, cardId]);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        marksStorageKey(packId, cardId),
        JSON.stringify(marks)
      );
    } catch {
      // ignore
    }
  }, [packId, cardId, marks]);

  const card = useMemo(() => {
    return pack?.cards.find((c) => c.id === cardId) ?? null;
  }, [pack, cardId]);

  const title = pack?.title || "Harvest Heroes Bingo";
  const sponsorName = pack?.sponsorName || "Joe's Grows";

  function toggle(r: number, c: number) {
    const key = `${r},${c}`;
    setMarks((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function clearMarks() {
    setMarks({});
  }

  if (!pack || !card) {
    return (
      <div
        style={{
          maxWidth: 900,
          margin: "0 auto",
          padding: 16,
          fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial",
        }}
      >
        <div style={{ fontSize: 28, fontWeight: 900, marginBottom: 10 }}>
          {title}
        </div>
        <div style={{ color: "#6b7280", fontSize: 16, marginBottom: 18 }}>
          Sponsor: {sponsorName}
        </div>

        <div
          style={{
            padding: 14,
            borderRadius: 14,
            border: "1px solid #e5e7eb",
            background: "white",
          }}
        >
          <div style={{ fontWeight: 900, marginBottom: 8 }}>
            This card is not available on this device.
          </div>
          <div style={{ color: "#6b7280", fontSize: 13 }}>
            Open the digital card link on the same phone you will use during the
            game.
          </div>
        </div>
      </div>
    );
  }

  const size = card.grid.length;
  const center = Math.floor(size / 2);

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: 16,
        fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial",
        background:
          "radial-gradient(1200px 600px at 50% -100px, rgba(16,185,129,0.18), transparent 60%), #070b0f",
      }}
    >
      <div style={{ maxWidth: 980, margin: "0 auto" }}>
        <div
          style={{
            borderRadius: 22,
            padding: 18,
            background: "rgba(17,24,39,0.75)",
            border: "1px solid rgba(255,255,255,0.08)",
            boxShadow: "0 18px 60px rgba(0,0,0,0.55)",
          }}
        >
          {/* Header */}
          <div style={{ display: "grid", gap: 6 }}>
            <div style={{ fontSize: 32, fontWeight: 950, color: "white" }}>
              {title}
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <div style={{ color: "rgba(255,255,255,0.78)", fontSize: 16 }}>
                Sponsor: <b style={{ color: "white" }}>{sponsorName}</b>
              </div>

              <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 16 }}>
                •
              </div>

              <div style={{ color: "rgba(255,255,255,0.78)", fontSize: 16 }}>
                Card ID: <b style={{ color: "white" }}>{cardId}</b>
              </div>
            </div>

            {/* Admin-only nav */}
            {isAdmin ? (
              <div
                style={{
                  display: "flex",
                  gap: 10,
                  flexWrap: "wrap",
                  marginTop: 6,
                }}
              >
                <a
                  href="/"
                  style={{
                    padding: "10px 14px",
                    borderRadius: 12,
                    border: "1px solid rgba(255,255,255,0.18)",
                    background: "rgba(255,255,255,0.06)",
                    textDecoration: "none",
                    color: "white",
                  }}
                >
                  Generator
                </a>
                <a
                  href="/caller"
                  style={{
                    padding: "10px 14px",
                    borderRadius: 12,
                    border: "1px solid rgba(255,255,255,0.18)",
                    background: "rgba(255,255,255,0.06)",
                    textDecoration: "none",
                    color: "white",
                  }}
                >
                  Caller
                </a>
                <a
                  href={`/winners/${encodeURIComponent(packId)}`}
                  style={{
                    padding: "10px 14px",
                    borderRadius: 12,
                    border: "1px solid rgba(255,255,255,0.18)",
                    background: "rgba(255,255,255,0.06)",
                    textDecoration: "none",
                    color: "white",
                  }}
                >
                  Winners
                </a>
              </div>
            ) : null}

            {/* Only control contestants get */}
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
              <button
                onClick={clearMarks}
                style={{
                  padding: "10px 14px",
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.18)",
                  background: "rgba(255,255,255,0.06)",
                  color: "white",
                  cursor: "pointer",
                  fontWeight: 800,
                }}
              >
                Clear marks
              </button>
            </div>
          </div>

          {/* Grid */}
          <div
            style={{
              marginTop: 16,
              display: "grid",
              gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))`,
              gap: 12,
            }}
          >
            {card.grid.map((row, r) =>
              row.map((label, c) => {
                const isCenter = r === center && c === center;
                const isMarked = !!marks[`${r},${c}`];

                return (
                  <button
                    key={`${r}-${c}`}
                    onClick={() => toggle(r, c)}
                    style={{
                      position: "relative",
                      minHeight: 78,
                      padding: 10,
                      borderRadius: 18,
                      border: isCenter
                        ? "1px solid rgba(16,185,129,0.55)"
                        : "1px solid rgba(255,255,255,0.12)",
                      background: isCenter
                        ? "rgba(16,185,129,0.16)"
                        : "rgba(255,255,255,0.04)",
                      cursor: "pointer",
                      textAlign: "center",
                      color: "white",
                      overflow: "hidden",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <div
                      style={{
                        fontSize: isCenter ? 14 : fontSizeForLabel(label),
                        fontWeight: 900,
                        lineHeight: 1.05,
                        padding: "0 4px",
                        wordBreak: "break-word",
                        maxHeight: 52,
                        overflow: "hidden",
                      }}
                    >
                      {label}
                    </div>

                    {isCenter ? (
                      <div
                        style={{
                          position: "absolute",
                          bottom: 8,
                          left: 0,
                          right: 0,
                          fontSize: 12,
                          fontWeight: 900,
                          color: "rgba(255,255,255,0.85)",
                        }}
                      >
                        FREE
                      </div>
                    ) : null}

                    {isMarked ? (
                      <>
                        <div
                          aria-hidden
                          style={{
                            position: "absolute",
                            inset: 0,
                            borderRadius: 18,
                            background: "rgba(16,185,129,0.25)",
                          }}
                        />
                        <div
                          aria-hidden
                          style={{
                            position: "absolute",
                            fontSize: 44,
                            fontWeight: 950,
                            color: "rgba(255,255,255,0.92)",
                            transform: "rotate(-10deg)",
                            textShadow: "0 10px 30px rgba(0,0,0,0.65)",
                          }}
                        >
                          ✓
                        </div>
                      </>
                    ) : null}
                  </button>
                );
              })
            )}
          </div>

          {/* Footer like PDF */}
          <div
            style={{
              marginTop: 14,
              display: "flex",
              justifyContent: "space-between",
              color: "rgba(255,255,255,0.45)",
              fontSize: 12,
            }}
          >
            <div>Grower Bingo</div>
            <div>Center is FREE</div>
          </div>
        </div>
      </div>
    </div>
  );
}
