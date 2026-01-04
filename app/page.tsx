"use client";

import React, { useEffect, useMemo, useState } from "react";

type BingoCard = {
  id: string;
  grid: string[][];
};

type BingoPack = {
  packId: string;
  createdAt: number;
  title?: string;
  sponsorName?: string;
  cards: BingoCard[];
  weeklyPool: string[];
  usedItems: string[];
};

const FORM_KEY = "grower-bingo:form:v3";
const LAST_PACK_KEY = "grower-bingo:lastPackId:v1";

function normalizeLines(text: string): string[] {
  return text
    .split(/\r?\n/g)
    .map((s) => s.trim())
    .filter(Boolean);
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

function base64ToBlob(base64: string, mime: string) {
  const clean = base64.includes(",") ? base64.split(",")[1] : base64;
  const bytes = Uint8Array.from(atob(clean), (c) => c.charCodeAt(0));
  return new Blob([bytes], { type: mime });
}

function packStorageKey(packId: string) {
  return `grower-bingo:pack:${packId}`;
}

const DEFAULT_MASTER_POOL = `Trellis net
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
Salt buildup
Root rot
PPM creep
PH pen died
Reservoir slimy
EC drift
Hotspot in tent
Cold snaps
Light leak
Timer failed
Fans died
Clogged dripper
Pump failed
Air stone clogged
PH up overdose
PH down overdose
Nutrient burn
Nitrogen toxicity
Magnesium deficiency
Calcium deficiency
Iron deficiency
Potassium deficiency
Spider mites
Thrips
Aphids
Whiteflies
Neem smell
Sticky traps full
Trichome check
Loupe lost
Harvest window
Dry room too dry
Dry room too wet
Hay smell panic
Jar burp schedule
Humidity pack debate
Cure stalled`;

export default function HomePage() {
  const [title, setTitle] = useState("Harvest Heroes Bingo");
  const [qtyInput, setQtyInput] = useState("25");
  const [itemsText, setItemsText] = useState(DEFAULT_MASTER_POOL);

  const masterPool = useMemo(() => normalizeLines(itemsText), [itemsText]);

  const [isBusy, setIsBusy] = useState(false);
  const [status, setStatus] = useState<string>("");

  useEffect(() => {
    const raw = window.localStorage.getItem(FORM_KEY);
    if (!raw) return;
    try {
      const s = JSON.parse(raw) as {
        title?: string;
        qtyInput?: string;
        itemsText?: string;
      };
      if (typeof s.title === "string") setTitle(s.title);
      if (typeof s.qtyInput === "string") setQtyInput(s.qtyInput);
      if (typeof s.itemsText === "string") setItemsText(s.itemsText);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        FORM_KEY,
        JSON.stringify({ title, qtyInput, itemsText })
      );
    } catch {
      // ignore
    }
  }, [title, qtyInput, itemsText]);

  async function generatePack() {
    setStatus("");
    setIsBusy(true);
    try {
      const qty = Math.max(1, Number.parseInt(qtyInput, 10) || 1);

      if (masterPool.length < 24) {
        setStatus(`Need at least 24 unique items in the master pool. You have ${masterPool.length}.`);
        setIsBusy(false);
        return;
      }

      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title,
          qty,
          items: masterPool,
          gridSize: 5,
        }),
      });

      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || `Generate failed (${res.status})`);
      }

      const data = (await res.json()) as any;

      const pack: BingoPack = {
        packId: data.packId,
        createdAt: data.createdAt ?? Date.now(),
        title: data.title ?? title,
        sponsorName: data.sponsorName,
        cards: data.cards,
        weeklyPool: data.weeklyPool ?? [],
        usedItems: data.usedItems ?? [],
      };

      if (!pack.packId || !Array.isArray(pack.cards)) {
        throw new Error("API response missing packId/cards.");
      }

      // CRITICAL: save pack where Caller expects it
      window.localStorage.setItem(packStorageKey(pack.packId), JSON.stringify(pack));
      window.localStorage.setItem(LAST_PACK_KEY, pack.packId);

      // Optional fallback storage of weekly pool text
      if (Array.isArray(pack.weeklyPool) && pack.weeklyPool.length) {
        window.localStorage.setItem("grower-bingo:pool:v1", pack.weeklyPool.join("\n"));
      }

      // Download PDF
      const pdfBase64 = data.pdfBase64 ?? data.pdf;
      if (typeof pdfBase64 === "string" && pdfBase64.length > 0) {
        const pdfBlob = base64ToBlob(pdfBase64, "application/pdf");
        downloadBlob(`${pack.title || "bingo"}_${pack.packId}.pdf`, pdfBlob);
      } else {
        setStatus("Pack generated and saved, but API did not return pdfBase64.");
      }

      // Download CSV if included
      if (typeof data.csv === "string" && data.csv.length > 0) {
        const csvBlob = new Blob([data.csv], { type: "text/csv;charset=utf-8" });
        downloadBlob(`${pack.title || "bingo"}_${pack.packId}.csv`, csvBlob);
      }

      setStatus(`Generated pack ${pack.packId}. Saved for Caller/Winners.`);
    } catch (e: any) {
      setStatus(e?.message || "Generate failed.");
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <div style={{ maxWidth: 820, margin: "0 auto", padding: 16, fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial" }}>
      <h1 style={{ marginTop: 0 }}>Grower Bingo Generator</h1>

      <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 16, marginBottom: 16 }}>
        <label style={{ display: "block", fontWeight: 700, marginBottom: 6 }}>Title</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          style={{ width: "100%", padding: 12, borderRadius: 10, border: "1px solid #d1d5db", fontSize: 16 }}
        />

        <div style={{ height: 12 }} />

        <label style={{ display: "block", fontWeight: 700, marginBottom: 6 }}>Quantity (cards)</label>
        <input
          value={qtyInput}
          onChange={(e) => setQtyInput(e.target.value)}
          inputMode="numeric"
          style={{ width: "100%", padding: 12, borderRadius: 10, border: "1px solid #d1d5db", fontSize: 16 }}
        />

        <div style={{ height: 12 }} />

        <div style={{ fontWeight: 700, marginBottom: 6 }}>
          Master pool (one per line). Current unique lines: {masterPool.length}
        </div>
        <textarea
          value={itemsText}
          onChange={(e) => setItemsText(e.target.value)}
          rows={14}
          style={{
            width: "100%",
            borderRadius: 10,
            border: "1px solid #d1d5db",
            padding: 12,
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
            fontSize: 14,
          }}
        />

        <div style={{ marginTop: 12, display: "flex", gap: 12, flexWrap: "wrap" }}>
          <button
            onClick={generatePack}
            disabled={isBusy}
            style={{
              padding: "10px 14px",
              borderRadius: 10,
              border: "1px solid #111827",
              background: isBusy ? "#9ca3af" : "#111827",
              color: "white",
              cursor: isBusy ? "not-allowed" : "pointer",
            }}
          >
            Generate + Download PDF
          </button>

          <a
            href="/caller"
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
            Go to Caller
          </a>
        </div>

        {status ? (
          <div style={{ marginTop: 12, fontSize: 13, color: "#374151" }}>
            {status}
          </div>
        ) : null}
      </div>

      <div style={{ fontSize: 13, color: "#6b7280" }}>
        Generator saves the latest pack to localStorage so Caller can auto-load the weekly pool without typing.
      </div>
    </div>
  );
        }
