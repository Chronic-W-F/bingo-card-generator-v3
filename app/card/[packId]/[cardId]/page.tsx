// app/card/[packId]/[cardId]/page.tsx
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

function safeJsonParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function packStorageKey(packId: string) {
  return `grower-bingo:pack:${packId}`;
}

function loadPackFromLocalStorage(packId: string): CardsPack | null {
  return safeJsonParse<CardsPack>(window.localStorage.getItem(packStorageKey(packId)));
}

function savePackToLocalStorage(packId: string, pack: CardsPack) {
  try {
    window.localStorage.setItem(packStorageKey(packId), JSON.stringify(pack));
  } catch {
    // ignore
  }
}

async function fetchPackFromApi(packId: string): Promise<CardsPack | null> {
  try {
    const res = await fetch(`/api/packs/${encodeURIComponent(packId)}`, { cache: "no-store" });
    const data = await res.json();
    if (!data?.ok || !data?.pack) return null;
    return data.pack as CardsPack;
  } catch {
    return null;
  }
}

function marksKey(packId: string, cardId: string) {
  return `grower-bingo:marks:${packId}:${cardId}`;
}

function loadMarks(packId: string, cardId: string): Record<string, boolean> {
  try {
    const raw = window.localStorage.getItem(marksKey(packId, cardId));
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, boolean>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function saveMarks(packId: string, cardId: string, marks: Record<string, boolean>) {
  try {
    window.localStorage.setItem(marksKey(packId, cardId), JSON.stringify(marks));
  } catch {
    // ignore
  }
}

function cellKey(r: number, c: number) {
  return `${r}_${c}`;
}

export default function CardPage({
  params,
}: {
  params: { packId: string; cardId: string };
}) {
  const packId = String(params.packId || "").trim();
  const cardId = String(params.cardId || "").trim();

  const [pack, setPack] = useState<CardsPack | null>(null);
  const [card, setCard] = useState<BingoCard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  const [marks, setMarks] = useState<Record<string, boolean>>({});

  // Load marks on mount / packId change
  useEffect(() => {
    if (!packId || !cardId) return;
    setMarks(loadMarks(packId, cardId));
  }, [packId, cardId]);

  // Load pack+card (NO device lock)
  useEffect(() => {
    let cancelled = false;

    async function run() {
      setLoading(true);
      setError("");

      if (!packId || !cardId) {
        setError("Missing packId or cardId.");
        setLoading(false);
        return;
      }

      // 1) Try localStorage cache first (fast)
      const local = loadPackFromLocalStorage(packId);
      if (local && Array.isArray(local.cards)) {
        const found = local.cards.find((c) => c.id === cardId) || null;
        if (!cancelled) {
          setPack(local);
          setCard(found);
        }
        // If found, we can still background-refresh, but not required.
      }

      // 2) Always fetch from API (source of truth for share links)
      const remote = await fetchPackFromApi(packId);
      if (cancelled) return;

      if (!remote) {
        setError("Could not load this pack from the server. The link may be wrong or the pack no longer exists.");
        setPack(null);
        setCard(null);
        setLoading(false);
        return;
      }

      savePackToLocalStorage(packId, remote);

      const found = remote.cards.find((c) => c.id === cardId) || null;
      if (!found) {
        setError("Card not found in this pack. The link may be wrong.");
        setPack(remote);
        setCard(null);
        setLoading(false);
        return;
      }

      setPack(remote);
      setCard(found);
      setLoading(false);
    }

    run();

    return () => {
      cancelled = true;
    };
  }, [packId, cardId]);

  const title = pack?.title || "Harvest Heroes Bingo";
  const sponsorName = pack?.sponsorName || "Joe’s Grows";

  const size = card?.grid?.length || 5;
  const center = Math.floor(size / 2);

  const grid = useMemo(() => {
    return card?.grid || Array.from({ length: 5 }, () => Array.from({ length: 5 }, () => ""));
  }, [card]);

  function toggleMark(r: number, c: number) {
    // Center is always free/marked
    if (r === center && c === center) return;

    const k = cellKey(r, c);
    setMarks((prev) => {
      const next = { ...prev, [k]: !prev[k] };
      saveMarks(packId, cardId, next);
      return next;
    });
  }

  function clearMarks() {
    setMarks({});
    saveMarks(packId, cardId, {});
  }

  // Always treat center as marked for UI
  function isMarked(r: number, c: number) {
    if (r === center && c === center) return true;
    return !!marks[cellKey(r, c)];
  }

  if (loading) {
    return (
      <div
        style={{
          maxWidth: 720,
          margin: "0 auto",
          padding: 16,
          fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial",
        }}
      >
        <h1 style={{ marginTop: 0, marginBottom: 8 }}>{title}</h1>
        <div style={{ color: "#6b7280" }}>Sponsor: {sponsorName}</div>
        <div style={{ marginTop: 14 }}>Loading card...</div>
      </div>
    );
  }

  if (error || !pack || !card) {
    return (
      <div
        style={{
          maxWidth: 720,
          margin: "0 auto",
          padding: 16,
          fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial",
        }}
      >
        <h1 style={{ marginTop: 0, marginBottom: 8 }}>{title}</h1>
        <div style={{ color: "#6b7280" }}>Sponsor: {sponsorName}</div>

        <div
          style={{
            marginTop: 12,
            border: "1px solid #e5e7eb",
            borderRadius: 14,
            padding: 14,
            background: "white",
          }}
        >
          <div style={{ fontWeight: 800, marginBottom: 6 }}>This card could not be loaded.</div>
          <div style={{ color: "#6b7280", fontSize: 14 }}>
            {error || "Unknown error."}
          </div>
          <div style={{ marginTop: 10, color: "#6b7280", fontSize: 12 }}>
            PackId: <b>{packId || "(missing)"}</b> • CardId: <b>{cardId || "(missing)"}</b>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        maxWidth: 720,
        margin: "0 auto",
        padding: 16,
        fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
        <div>
          <h1 style={{ marginTop: 0, marginBottom: 6 }}>{title}</h1>
          <div style={{ color: "#6b7280" }}>Sponsor: {sponsorName}</div>
          <div style={{ marginTop: 6, fontSize: 14 }}>
            Card ID: <b>{card.id}</b>
          </div>
        </div>

        <button
          onClick={clearMarks}
          style={{
            padding: "10px 14px",
            borderRadius: 12,
            border: "1px solid #111827",
            background: "white",
            cursor: "pointer",
            height: 42,
            alignSelf: "flex-start",
          }}
        >
          Clear marks
        </button>
      </div>

      <div
        style={{
          marginTop: 14,
          borderRadius: 20,
          border: "1px solid #1f2937",
          padding: 14,
          background: "#0b1220",
          boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))`,
            gap: 10,
          }}
        >
          {grid.map((row, r) =>
            row.map((label, c) => {
              const marked = isMarked(r, c);
              const isCenter = r === center && c === center;

              return (
                <button
                  key={`${r}-${c}`}
                  onClick={() => toggleMark(r, c)}
                  style={{
                    borderRadius: 18,
                    border: marked ? "1px solid rgba(16,185,129,0.6)" : "1px solid rgba(255,255,255,0.08)",
                    background: marked ? "rgba(16,185,129,0.18)" : "rgba(255,255,255,0.06)",
                    color: "white",
                    padding: 10,
                    minHeight: 72,
                    textAlign: "center",
                    cursor: isCenter ? "default" : "pointer",
                    display: "grid",
                    placeItems: "center",
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      fontWeight: 800,
                      fontSize: 16,
                      lineHeight: 1.05,
                      wordBreak: "break-word",
                      paddingInline: 6,
                    }}
                  >
                    {label}
                  </div>

                  {isCenter ? (
                    <div style={{ marginTop: 6, fontSize: 12, opacity: 0.85 }}>
                      FREE
                    </div>
                  ) : null}

                  {marked && !isCenter ? (
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        display: "grid",
                        placeItems: "center",
                        pointerEvents: "none",
                        opacity: 0.9,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 44,
                          fontWeight: 900,
                          transform: "rotate(-12deg)",
                          color: "rgba(255,255,255,0.85)",
                        }}
                      >
                        ✓
                      </div>
                    </div>
                  ) : null}
                </button>
              );
            })
          )}
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12, color: "rgba(255,255,255,0.55)", fontSize: 12 }}>
          <div>Grower Bingo</div>
          <div>Center is FREE</div>
        </div>
      </div>
    </div>
  );
}
