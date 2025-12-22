"use client";

import { useEffect, useMemo, useState } from "react";

type GeneratedPack = {
  packTitle: string;
  sponsorName: string;
  pdfBase64: string;
  csv: string;
  createdAt: number;
};

type SponsorSkin = {
  id: string; // local-only id
  label: string; // "Joe's Grows", "Sponsor X"
  bannerUrl: string;
  logoUrl: string;
};

const SKINS_KEY = "grower-bingo:sponsor-skins:v1";

function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function safeFileName(s: string) {
  return (
    s
      .trim()
      .replace(/[^\w\-]+/g, "_")
      .replace(/_+/g, "_")
      .slice(0, 80) || "bingo_pack"
  );
}

function makeLocalId() {
  // good enough for local-only IDs
  return Math.random().toString(36).slice(2, 10) + "-" + Date.now().toString(36);
}

export default function HomePage() {
  const [packTitle, setPackTitle] = useState("Harvest Heroes Bingo");
  const [sponsorName, setSponsorName] = useState("Joe’s Grows");
  const [bannerUrl, setBannerUrl] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [qty, setQty] = useState<number>(25);
  const [items, setItems] = useState<string>("");

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [pack, setPack] = useState<GeneratedPack | null>(null);

  // Sponsor skins (local presets)
  const [skins, setSkins] = useState<SponsorSkin[]>([]);
  const [selectedSkinId, setSelectedSkinId] = useState<string>("");
  const [newSkinLabel, setNewSkinLabel] = useState<string>("");

  // Load skins from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(SKINS_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) setSkins(parsed);
    } catch {
      // ignore
    }
  }, []);

  // Persist skins
  useEffect(() => {
    try {
      localStorage.setItem(SKINS_KEY, JSON.stringify(skins));
    } catch {
      // ignore
    }
  }, [skins]);

  const itemsCount = useMemo(() => {
    return items
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean).length;
  }, [items]);

  function applySkin(skin: SponsorSkin) {
    setSponsorName(skin.label);
    setBannerUrl(skin.bannerUrl);
    setLogoUrl(skin.logoUrl);
  }

  function onSelectSkin(id: string) {
    setSelectedSkinId(id);
    const skin = skins.find((s) => s.id === id);
    if (skin) applySkin(skin);
  }

  function saveCurrentAsSkin() {
    setErr(null);

    const label = (newSkinLabel || sponsorName).trim();
    if (!label) {
      setErr("Skin name is required.");
      return;
    }
    // URLs can be blank; that’s allowed
    const skin: SponsorSkin = {
      id: makeLocalId(),
      label,
      bannerUrl: bannerUrl.trim(),
      logoUrl: logoUrl.trim(),
    };

    setSkins((prev) => [skin, ...prev]);
    setSelectedSkinId(skin.id);
    setNewSkinLabel("");
  }

  function deleteSelectedSkin() {
    setErr(null);
    if (!selectedSkinId) {
      setErr("Select a skin first.");
      return;
    }
    setSkins((prev) => prev.filter((s) => s.id !== selectedSkinId));
    setSelectedSkinId("");
  }

  async function generatePack() {
    setBusy(true);
    setErr(null);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          packTitle,
          sponsorName,
          bannerUrl,
          logoUrl,
          qty,
          items,
        }),
      });

      const data = await res.json();
      if (!data.ok) {
        const msg =
          typeof data.error === "string"
            ? data.error
            : "Invalid input (check items, URLs, and quantity).";
        throw new Error(msg);
      }

      const newPack: GeneratedPack = {
        packTitle,
        sponsorName,
        pdfBase64: data.pdfBase64,
        csv: data.csv,
        createdAt: Date.now(),
      };

      setPack(newPack);
      return newPack;
    } finally {
      setBusy(false);
    }
  }

  async function onGenerateAndDownloadPdf() {
    try {
      const p = await generatePack();

      const bytes = Uint8Array.from(atob(p.pdfBase64), (c) => c.charCodeAt(0));
      const filename = `${safeFileName(p.packTitle)}_cards.pdf`;
      downloadBlob(filename, new Blob([bytes], { type: "application/pdf" }));
    } catch (e: any) {
      setErr(e?.message ?? "Generation failed");
    }
  }

  function onDownloadCsv() {
    if (!pack) {
      setErr("Generate the pack first, then download the CSV.");
      return;
    }
    setErr(null);

    const filename = `${safeFileName(pack.packTitle)}_roster.csv`;
    downloadBlob(filename, new Blob([pack.csv], { type: "text/csv;charset=utf-8" }));
  }

  return (
    <main style={{ padding: 20, maxWidth: 980, margin: "0 auto" }}>
      <h1 style={{ fontSize: 28, margin: 0 }}>Grower Bingo Generator</h1>
      <p style={{ marginTop: 8, opacity: 0.85 }}>
        Random 5×5 cards (24 random items + FREE sponsor center) with sponsor banner & logo.
      </p>

      {/* Sponsor skins */}
      <section
        style={{
          marginTop: 16,
          padding: 14,
          border: "1px solid #ddd",
          borderRadius: 12,
        }}
      >
        <h2 style={{ margin: 0, fontSize: 16 }}>Sponsor Skins (saved on this device)</h2>
        <p style={{ marginTop: 6, marginBottom: 10, fontSize: 13, opacity: 0.85 }}>
          Save sponsor presets so you can swap banner/logo instantly each week.
        </p>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <select
            value={selectedSkinId}
            onChange={(e) => onSelectSkin(e.target.value)}
            style={{ padding: 10, borderRadius: 10, border: "1px solid #ccc", minWidth: 220 }}
          >
            <option value="">Select a saved skin…</option>
            {skins.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>

          <input
            value={newSkinLabel}
            onChange={(e) => setNewSkinLabel(e.target.value)}
            placeholder="Skin name (optional)"
            style={{ padding: 10, borderRadius: 10, border: "1px solid #ccc", minWidth: 220 }}
          />

          <button
            onClick={saveCurrentAsSkin}
            disabled={busy}
            style={{
              padding: "10px 12px",
              borderRadius: 10,
              border: "1px solid #111",
              background: "#111",
              color: "white",
              opacity: busy ? 0.6 : 1,
            }}
          >
            Save current as skin
          </button>

          <button
            onClick={deleteSelectedSkin}
            disabled={busy}
            style={{
              padding: "10px 12px",
              borderRadius: 10,
              border: "1px solid #111",
              background: "white",
              color: "#111",
              opacity: busy ? 0.6 : 1,
            }}
          >
            Delete selected skin
          </button>
        </div>
      </section>

      <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontSize: 14 }}>Pack title</span>
          <input
            value={packTitle}
            onChange={(e) => setPackTitle(e.target.value)}
            style={{ padding: 10, border: "1px solid #ccc", borderRadius: 8 }}
          />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontSize: 14 }}>Sponsor name</span>
          <input
            value={sponsorName}
            onChange={(e) => setSponsorName(e.target.value)}
            style={{ padding: 10, border: "1px solid #ccc", borderRadius: 8 }}
          />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontSize: 14 }}>Banner image URL (top banner)</span>
          <input
            value={bannerUrl}
            onChange={(e) => setBannerUrl(e.target.value)}
            placeholder="https://..."
            style={{ padding: 10, border: "1px solid #ccc", borderRadius: 8 }}
          />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontSize: 14 }}>Sponsor logo URL (FREE center square)</span>
          <input
            value={logoUrl}
            onChange={(e) => setLogoUrl(e.target.value)}
            placeholder="https://..."
            style={{ padding: 10, border: "1px solid #ccc", borderRadius: 8 }}
          />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontSize: 14 }}>Quantity (1–500)</span>
          <input
            type="number"
            min={1}
            max={500}
            value={qty}
            onChange={(e) => setQty(Number(e.target.value))}
            style={{ padding: 10, border: "1px solid #ccc", borderRadius: 8, width: 160 }}
          />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontSize: 14 }}>
            Square pool items (one per line — need 24+). Current: <b>{itemsCount}</b>
          </span>
          <textarea
            value={items}
            onChange={(e) => setItems(e.target.value)}
            style={{
              padding: 10,
              border: "1px solid #ccc",
              borderRadius: 8,
              minHeight: 220,
              fontFamily: "monospace",
            }}
            placeholder={"Example:\nDeep Water Culture\nPH swing\nCal-Mag\n..."}
          />
        </label>

        {err ? (
          <div style={{ color: "#b00020", fontSize: 14 }}>
            <b>Error:</b> {err}
          </div>
        ) : null}

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 4 }}>
          <button
            onClick={onGenerateAndDownloadPdf}
            disabled={busy}
            style={{
              padding: "12px 14px",
              borderRadius: 10,
              border: "1px solid #111",
              background: "#111",
              color: "white",
              opacity: busy ? 0.6 : 1,
            }}
          >
            {busy ? "Generating..." : "Generate + Download PDF"}
          </button>

          <button
            onClick={onDownloadCsv}
            disabled={busy}
            style={{
              padding: "12px 14px",
              borderRadius: 10,
              border: "1px solid #111",
              background: "white",
              color: "#111",
              opacity: busy ? 0.6 : 1,
            }}
          >
            Download CSV (Roster)
          </button>
        </div>

        {pack ? (
          <div style={{ marginTop: 10, fontSize: 13, opacity: 0.85 }}>
            Last generated: <b>{pack.packTitle}</b> — {new Date(pack.createdAt).toLocaleString()}
          </div>
        ) : null}
      </div>
    </main>
  );
      }
