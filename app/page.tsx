// app/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";

type CardsPack = {
  packId: string;
  createdAt: number;
  title?: string;
  sponsorName?: string;
  cards: { id: string; grid: string[][] }[];
};

type GeneratedPack = {
  pdfBase64: string;
  csv: string;
  createdAt: number;
  requestKey: string;
  usedItems?: string[];
  cardsPack?: CardsPack;
};

const SHARED_POOL_KEY = "grower-bingo:pool:v1";
const LAST_GENERATED_PACK_KEY = "grower-bingo:lastGeneratedPack:v1";

const DEFAULT_ITEMS = `Trellis net
Lollipop
Defoliate
Stretch week
Dryback
Runoff EC
VPD off
Heat stress
Herm watch
Foxtails
Amber trichomes
Cloudy trichomes
Flush debate
Leaf taco
Stunted growth
Light burn
Cal-Mag
pH swing
Overwatered
Underwatered
Powdery mildew
Fungus gnats
Bud rot
Nute lockout
Late flower fade
Taco leaves
Clawing
Nitrogen toxicity
Magnesium deficiency
Calcium deficiency
Iron deficiency
Potassium deficiency
Phosphorus deficiency
Sulfur deficiency
Zinc deficiency
Manganese deficiency
Boron deficiency
Copper deficiency
Molybdenum deficiency
Root rot
Slime roots
Brown roots
White roots
Pythium
Algae bloom
Light leak
Timer fail
Pump fail
Air pump fail
Airstone clogged
Low dissolved oxygen
Water temp high
Water temp low
pH drift up
pH drift down
EC drift up
EC drift down
Res top-off
Res change day
Bubble bucket
Aircube flood cycle
Drain clog
Overflow scare
Salt buildup
Biofilm
Bennies added
H2O2 debate
Silica added
PK boost
KoolBloom week
Transition stretch
Week 3 frost
Week 6 swell
Late flower fade (nice)
Sugar leaves
Leaf strip
LST tie-down
Supercrop
Scrog net
Stake support
Bud stacking
Popcorn buds
Larf cleanup
Calyx swell
Pistils orange
Pistils white
Trichomes clear
Trichomes cloudy
Trichomes amber
Loupe check
Scope pics
Bananas spotted
Nanner panic
Herm confirmed
Seed found
Bud wash
Dry trim
Wet trim
Jar burp
Grove bags
Hay smell
Terp explosion
Odor control
Carbon filter swap
IPM spray
Neem debate
Spinosad talk
Predator mites
Ladybugs released`;

function normalizeLines(text: string): string[] {
  return text
    .split(/\r?\n/g)
    .map((s) => s.trim())
    .filter(Boolean);
}

function safeFileName(s: string) {
  const out = (s || "").replace(/[^\w\- ]+/g, "").trim().replace(/\s+/g, "_");
  return out || "bingo-pack";
}

function downloadBase64Pdf(filename: string, base64: string) {
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const blob = new Blob([bytes], { type: "application/pdf" });

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function downloadTextFile(
  filename: string,
  text: string,
  mime = "text/plain;charset=utf-8"
) {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function downloadJsonFile(filename: string, obj: unknown) {
  const text = JSON.stringify(obj, null, 2);
  downloadTextFile(filename, text, "application/json;charset=utf-8");
}

export default function Page() {
  const [title, setTitle] = useState("Harvest Heroes Bingo");
  const [sponsorName, setSponsorName] = useState("Joe’s Grows");

  // Locked default: always use /banners/current.png
  const [bannerImageUrl, setBannerImageUrl] = useState("/banners/current.png");

  const [sponsorLogoUrl, setSponsorLogoUrl] = useState("");
  const [qtyInput, setQtyInput] = useState("25");
  const [itemsText, setItemsText] = useState(DEFAULT_ITEMS);

  const [isGenerating, setIsGenerating] = useState(false);
  const [pack, setPack] = useState<GeneratedPack | null>(null);
  const [error, setError] = useState<string>("");
  const [info, setInfo] = useState<string>("");

  // Single-card PDF selector
  const [singleCardId, setSingleCardId] = useState<string>("");

  const poolLines = useMemo(() => normalizeLines(itemsText), [itemsText]);
  const poolCount = poolLines.length;

  // Restore last pack so Back navigation doesn't gray out buttons
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(LAST_GENERATED_PACK_KEY);
      if (!raw) return;
      const restored = JSON.parse(raw) as GeneratedPack;
      if (restored?.pdfBase64 && restored?.requestKey) {
        setPack(restored);

        const firstId = restored?.cardsPack?.cards?.[0]?.id;
        if (firstId) setSingleCardId(firstId);
      }
    } catch {
      // ignore
    }
  }, []);

  // Keep the shared pool synced for Caller reload
  useEffect(() => {
    try {
      window.localStorage.setItem(SHARED_POOL_KEY, poolLines.join("\n"));
    } catch {
      // ignore
    }
  }, [poolLines]);

  // When pack changes, set default single card id to first card
  useEffect(() => {
    const first = pack?.cardsPack?.cards?.[0]?.id;
    if (first) setSingleCardId(first);
  }, [pack?.cardsPack?.packId]);

  function loadDefaults() {
    setItemsText(DEFAULT_ITEMS);
    setError("");
    setInfo("");
  }

  function clampQty(raw: string) {
    const n = Number.parseInt(raw, 10);
    if (!Number.isFinite(n)) return 25;
    return Math.max(1, Math.min(500, n));
  }

  async function generateAndDownloadPdf() {
    setError("");
    setInfo("");

    const qty = clampQty(qtyInput);

    if (poolLines.length < 24) {
      setError(
        `Pool too small. Need at least 24 items for a 5x5 card (FREE center). You have ${poolLines.length}.`
      );
      return;
    }

    // Ensure caller pool is synced before generating
    try {
      window.localStorage.setItem(SHARED_POOL_KEY, poolLines.join("\n"));
    } catch {
      // ignore
    }

    setIsGenerating(true);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          sponsorName,
          bannerImageUrl,
          sponsorLogoUrl,
          qty,
          items: poolLines,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data?.error || "Generate failed.");
        return;
      }

      if (!data?.pdfBase64) {
        setError("Generate succeeded but PDF was missing from the response.");
        return;
      }

      const nextPack: GeneratedPack = {
        pdfBase64: data.pdfBase64,
        csv: data.csv || "",
        createdAt: data.createdAt || Date.now(),
        requestKey: data.requestKey || String(Date.now()),
        usedItems: data.usedItems,
        cardsPack: data.cardsPack,
      };

      setPack(nextPack);

      // Persist generator state so Back button doesn't gray out everything
      try {
        window.localStorage.setItem(
          LAST_GENERATED_PACK_KEY,
          JSON.stringify(nextPack)
        );
      } catch {
        // ignore
      }

      // Save last pack id and store a full pack object Caller can use
      if (data?.cardsPack?.packId) {
        try {
          const packId = data.cardsPack.packId;

          window.localStorage.setItem("grower-bingo:lastPackId:v1", packId);

          const storedPack = {
            ...data.cardsPack,
            weeklyPool:
              Array.isArray(data.usedItems) && data.usedItems.length
                ? data.usedItems
                : poolLines,
            usedItems: Array.isArray(data.usedItems) ? data.usedItems : [],
          };

          window.localStorage.setItem(
            `grower-bingo:pack:${packId}`,
            JSON.stringify(storedPack)
          );
        } catch {
          // ignore
        }
      }

      // Option B: if API returns usedItems, sync those to Caller pool
      if (Array.isArray(data.usedItems) && data.usedItems.length) {
        try {
          window.localStorage.setItem(SHARED_POOL_KEY, data.usedItems.join("\n"));
        } catch {
          // ignore
        }
      }

      // Auto download PDF
      const filename = `${safeFileName(title)}-${nextPack.requestKey}.pdf`;

      setTimeout(() => {
        try {
          downloadBase64Pdf(filename, data.pdfBase64);
          setInfo(
            "PDF download triggered. If nothing happened, use the manual Download PDF button below."
          );
        } catch (e: any) {
          setError(e?.message || "Could not trigger PDF download.");
        }
      }, 150);
    } catch (e: any) {
      setError(e?.message || "Generate failed.");
    } finally {
      setIsGenerating(false);
    }
  }

  function manualDownloadPdf() {
    if (!pack?.pdfBase64) return;
    const filename = `${safeFileName(title)}-${pack.requestKey}.pdf`;
    downloadBase64Pdf(filename, pack.pdfBase64);
  }

  function downloadCsv() {
    if (!pack?.csv) return;
    const filename = `${safeFileName(title)}-${pack.requestKey}.csv`;
    downloadTextFile(filename, pack.csv, "text/csv;charset=utf-8");
  }

  function downloadCardsJson() {
    const cardsPack = pack?.cardsPack;
    if (!cardsPack?.packId) {
      setError("No cardsPack found. Generate a pack first.");
      return;
    }
    setError("");
    const filename = `${safeFileName(title)}-${cardsPack.packId}.cards.json`;
    downloadJsonFile(filename, cardsPack);
    setInfo("cards.json downloaded.");
  }

  function openWinners() {
    const packId = pack?.cardsPack?.packId || pack?.requestKey;
    if (!packId) return;
    const url = `/winners/${encodeURIComponent(packId)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  async function downloadSingleCardPdf() {
    setError("");
    setInfo("");

    const cards = pack?.cardsPack?.cards || [];
    if (!cards.length) {
      setError("Generate a pack first (need cardsPack).");
      return;
    }

    const chosen = cards.find((c) => c.id === singleCardId) || cards[0];
    if (!chosen) {
      setError("No card found.");
      return;
    }

    try {
      const res = await fetch("/api/card-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          sponsorName,
          bannerImageUrl,
          card: chosen,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        setError(text || "Single card PDF failed.");
        return;
      }

      const blob = await res.blob();
      const filename = `${safeFileName(title)}-${chosen.id}.pdf`;
      downloadBlob(filename, blob);
      setInfo(`Downloaded single card PDF for ${chosen.id}.`);
    } catch (e: any) {
      setError(e?.message || "Single card PDF failed.");
    }
  }

  const cardCount = pack?.cardsPack?.cards?.length || 0;

  return (
    <div
      style={{
        maxWidth: 760,
        margin: "0 auto",
        padding: 16,
        fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial",
      }}
    >
      <h1 style={{ marginTop: 0, fontSize: 32 }}>Grower Bingo Generator</h1>

      <div
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          padding: 16,
          marginBottom: 16,
        }}
      >
        <div style={{ display: "grid", gap: 12 }}>
          <div>
            <label style={{ display: "block", fontWeight: 600, marginBottom: 6 }}>
              Pack title
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={{
                width: "100%",
                padding: 12,
                borderRadius: 10,
                border: "1px solid #d1d5db",
                fontSize: 16,
              }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontWeight: 600, marginBottom: 6 }}>
              Sponsor name
            </label>
            <input
              value={sponsorName}
              onChange={(e) => setSponsorName(e.target.value)}
              style={{
                width: "100%",
                padding: 12,
                borderRadius: 10,
                border: "1px solid #d1d5db",
                fontSize: 16,
              }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontWeight: 600, marginBottom: 6 }}>
              Banner image URL (top banner)
            </label>
            <input
              value={bannerImageUrl}
              onChange={(e) => setBannerImageUrl(e.target.value)}
              placeholder="/banners/current.png"
              style={{
                width: "100%",
                padding: 12,
                borderRadius: 10,
                border: "1px solid #d1d5db",
                fontSize: 16,
              }}
            />
            <div style={{ marginTop: 6, fontSize: 12, color: "#6b7280" }}>
              Weekly swap: replace <b>public/banners/current.png</b> in GitHub. Keep
              this value unchanged.
            </div>
          </div>

          <div>
            <label style={{ display: "block", fontWeight: 600, marginBottom: 6 }}>
              Sponsor logo URL (FREE center square)
            </label>
            <input
              value={sponsorLogoUrl}
              onChange={(e) => setSponsorLogoUrl(e.target.value)}
              placeholder="https://..."
              style={{
                width: "100%",
                padding: 12,
                borderRadius: 10,
                border: "1px solid #d1d5db",
                fontSize: 16,
              }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontWeight: 600, marginBottom: 6 }}>
              Quantity (1–500)
            </label>
            <input
              value={qtyInput}
              onChange={(e) => setQtyInput(e.target.value)}
              inputMode="numeric"
              style={{
                width: "100%",
                maxWidth: 220,
                padding: 12,
                borderRadius: 10,
                border: "1px solid #d1d5db",
                fontSize: 16,
              }}
            />
          </div>

          <div>
            <div
              style={{
                display: "flex",
                gap: 10,
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div style={{ fontWeight: 700 }}>
                Square pool items (one per line, need 24+). Current: {poolCount}
              </div>

              <button
                onClick={loadDefaults}
                style={{
                  padding: "10px 14px",
                  borderRadius: 10,
                  border: "1px solid #111827",
                  background: "white",
                  cursor: "pointer",
                }}
              >
                Load defaults
              </button>
            </div>

            <textarea
              value={itemsText}
              onChange={(e) => setItemsText(e.target.value)}
              rows={12}
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
              Caller pool sync key: <b>{SHARED_POOL_KEY}</b>
            </div>
          </div>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 8 }}>
            <button
              onClick={generateAndDownloadPdf}
              disabled={isGenerating}
              style={{
                padding: "12px 16px",
                borderRadius: 12,
                border: "1px solid #111827",
                background: isGenerating ? "#9ca3af" : "#111827",
                color: "white",
                cursor: isGenerating ? "not-allowed" : "pointer",
                minWidth: 240,
              }}
            >
              {isGenerating ? "Generating..." : "Generate + Download PDF"}
            </button>

            <button
              onClick={manualDownloadPdf}
              disabled={!pack}
              style={{
                padding: "12px 16px",
                borderRadius: 12,
                border: "1px solid #111827",
                background: !pack ? "#9ca3af" : "white",
                cursor: !pack ? "not-allowed" : "pointer",
                minWidth: 180,
              }}
            >
              Download PDF
            </button>

            <button
              onClick={downloadCsv}
              disabled={!pack}
              style={{
                padding: "12px 16px",
                borderRadius: 12,
                border: "1px solid #111827",
                background: !pack ? "#9ca3af" : "white",
                cursor: !pack ? "not-allowed" : "pointer",
                minWidth: 220,
              }}
            >
              Download CSV (Roster)
            </button>

            <button
              onClick={downloadCardsJson}
              disabled={!pack?.cardsPack?.packId}
              style={{
                padding: "12px 16px",
                borderRadius: 12,
                border: "1px solid #111827",
                background: !pack?.cardsPack?.packId ? "#9ca3af" : "white",
                cursor: !pack?.cardsPack?.packId ? "not-allowed" : "pointer",
                minWidth: 220,
              }}
            >
              Download cards.json
            </button>

            <button
              onClick={openWinners}
              disabled={!pack?.cardsPack?.packId && !pack?.requestKey}
              style={{
                padding: "12px 16px",
                borderRadius: 12,
                border: "1px solid #111827",
                background:
                  !pack?.cardsPack?.packId && !pack?.requestKey ? "#9ca3af" : "white",
                cursor:
                  !pack?.cardsPack?.packId && !pack?.requestKey
                    ? "not-allowed"
                    : "pointer",
                minWidth: 220,
              }}
            >
              Open Winners
            </button>

            <a
              href="/caller"
              style={{
                padding: "12px 16px",
                borderRadius: 12,
                border: "1px solid #111827",
                background: "white",
                textDecoration: "none",
                color: "#111827",
                display: "inline-block",
              }}
            >
              Open Caller
            </a>
          </div>

          {/* Single-card PDF section */}
          <div
            style={{
              marginTop: 14,
              paddingTop: 14,
              borderTop: "1px solid #e5e7eb",
            }}
          >
            <div style={{ fontWeight: 800, marginBottom: 8 }}>
              Single card PDF
            </div>

            <div style={{ fontSize: 13, color: "#374151", marginBottom: 10 }}>
              Generate a pack first. Then select a Card ID and download just that card as a 1-page PDF.
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <select
                value={singleCardId}
                onChange={(e) => setSingleCardId(e.target.value)}
                disabled={!cardCount}
                style={{
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: "1px solid #d1d5db",
                  minWidth: 280,
                  background: !cardCount ? "#f3f4f6" : "white",
                }}
              >
                {!cardCount ? (
                  <option value="">Generate a pack first</option>
                ) : (
                  pack?.cardsPack?.cards.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.id}
                    </option>
                  ))
                )}
              </select>

              <button
                onClick={downloadSingleCardPdf}
                disabled={!cardCount}
                style={{
                  padding: "12px 16px",
                  borderRadius: 12,
                  border: "1px solid #111827",
                  background: !cardCount ? "#9ca3af" : "white",
                  cursor: !cardCount ? "not-allowed" : "pointer",
                  minWidth: 220,
                }}
              >
                Download selected card PDF
              </button>
            </div>
          </div>

          {error ? (
            <div style={{ marginTop: 10, color: "#b91c1c", fontWeight: 600 }}>
              {error}
            </div>
          ) : null}
          {info ? <div style={{ marginTop: 10, color: "#111827" }}>{info}</div> : null}
        </div>
      </div>
    </div>
  );
            }
