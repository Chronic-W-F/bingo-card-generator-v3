"use client";

import { useEffect, useMemo, useState } from "react";

/* ===================== TYPES ===================== */

type GeneratedPack = {
  packTitle: string;
  sponsorName: string;
  pdfBase64: string;
  csv: string;
  createdAt: number;
};

type SponsorSkin = {
  id: string;
  label: string;
  bannerUrl: string;
  logoUrl: string;
};

type FormState = {
  packTitle: string;
  sponsorName: string;
  bannerUrl: string;
  logoUrl: string;
  qty: string;
  items: string;
  selectedSkinId: string;
  newSkinLabel: string;
};

/* ===================== STORAGE KEYS ===================== */

const SKINS_KEY = "grower-bingo:sponsor-skins:v1";
const FORM_KEY = "grower-bingo:form:v1";

/* ===================== HELPERS ===================== */

function makeLocalId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
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

function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function normalizeLines(text: string) {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
}

/* ===================== PAGE ===================== */

export default function Page() {
  /* ---------- form state ---------- */
  const [packTitle, setPackTitle] = useState("Harvest Heroes Bingo");
  const [sponsorName, setSponsorName] = useState("Joe’s Grows");
  const [bannerUrl, setBannerUrl] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [qty, setQty] = useState("25"); // STRING ON PURPOSE
  const [items, setItems] = useState("");

  /* ---------- ui state ---------- */
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [pack, setPack] = useState<GeneratedPack | null>(null);

  /* ---------- skins ---------- */
  const [skins, setSkins] = useState<SponsorSkin[]>([]);
  const [selectedSkinId, setSelectedSkinId] = useState("");
  const [newSkinLabel, setNewSkinLabel] = useState("");

  /* ===================== LOAD / SAVE ===================== */

  useEffect(() => {
    const s = localStorage.getItem(SKINS_KEY);
    if (s) setSkins(JSON.parse(s));
    const f = localStorage.getItem(FORM_KEY);
    if (f) {
      const v: Partial<FormState> = JSON.parse(f);
      setPackTitle(v.packTitle ?? "Harvest Heroes Bingo");
      setSponsorName(v.sponsorName ?? "Joe’s Grows");
      setBannerUrl(v.bannerUrl ?? "");
      setLogoUrl(v.logoUrl ?? "");
      setQty(v.qty ?? "25");
      setItems(v.items ?? "");
      setSelectedSkinId(v.selectedSkinId ?? "");
      setNewSkinLabel(v.newSkinLabel ?? "");
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(SKINS_KEY, JSON.stringify(skins));
  }, [skins]);

  useEffect(() => {
    const data: FormState = {
      packTitle,
      sponsorName,
      bannerUrl,
      logoUrl,
      qty,
      items,
      selectedSkinId,
      newSkinLabel,
    };
    localStorage.setItem(FORM_KEY, JSON.stringify(data));
  }, [packTitle, sponsorName, bannerUrl, logoUrl, qty, items, selectedSkinId, newSkinLabel]);

  /* ===================== DERIVED ===================== */

  const itemsList = useMemo(() => normalizeLines(items), [items]);
  const itemsCount = itemsList.length;

  /* ===================== ACTIONS ===================== */

  function applySkin(id: string) {
    setSelectedSkinId(id);
    const s = skins.find((x) => x.id === id);
    if (!s) return;
    setSponsorName(s.label);
    setBannerUrl(s.bannerUrl);
    setLogoUrl(s.logoUrl);
  }

  function saveSkin() {
    const label = (newSkinLabel || sponsorName).trim();
    if (!label) {
      setErr("Skin name required");
      return;
    }
    const skin: SponsorSkin = {
      id: makeLocalId(),
      label,
      bannerUrl,
      logoUrl,
    };
    setSkins((p) => [skin, ...p]);
    setSelectedSkinId(skin.id);
    setNewSkinLabel("");
  }

  function deleteSkin() {
    if (!selectedSkinId) return;
    setSkins((p) => p.filter((s) => s.id !== selectedSkinId));
    setSelectedSkinId("");
  }

  function validate() {
    const q = Number(qty);
    if (!Number.isInteger(q) || q < 1 || q > 500) {
      setErr("Quantity must be between 1 and 500.");
      return null;
    }
    if (itemsList.length < 24) {
      setErr(`Need at least 24 items (you have ${itemsList.length}).`);
      return null;
    }
    return q;
  }

  async function generate(): Promise<GeneratedPack> {
    setErr(null);
    const q = validate();
    if (!q) throw new Error("Invalid input");

    const res = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        packTitle,
        sponsorName,
        bannerUrl,
        logoUrl,
        qty: q,
        items: itemsList,
      }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data?.error ?? "Generation failed");

    const p: GeneratedPack = {
      packTitle,
      sponsorName,
      pdfBase64: data.pdfBase64,
      csv: data.csv,
      createdAt: Date.now(),
    };
    setPack(p);
    return p;
  }

  async function downloadPdf() {
    setBusy(true);
    try {
      const p = await generate();
      const bytes = Uint8Array.from(atob(p.pdfBase64), (c) => c.charCodeAt(0));
      downloadBlob(
        `${safeFileName(p.packTitle)}_${safeFileName(p.sponsorName)}.pdf`,
        new Blob([bytes], { type: "application/pdf" })
      );
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function downloadCsv() {
    try {
      const p = pack ?? (await generate());
      downloadBlob(
        `${safeFileName(p.packTitle)}_${safeFileName(p.sponsorName)}_roster.csv`,
        new Blob([p.csv], { type: "text/csv;charset=utf-8" })
      );
    } catch (e: any) {
      setErr(e.message);
    }
  }

  /* ===================== UI ===================== */

  return (
    <main style={{ maxWidth: 740, margin: "0 auto", padding: 16 }}>
      <h1>Grower Bingo Generator</h1>

      <label>Pack title</label>
      <input value={packTitle} onChange={(e) => setPackTitle(e.target.value)} />

      <label>Sponsor name</label>
      <input value={sponsorName} onChange={(e) => setSponsorName(e.target.value)} />

      <label>Banner image URL</label>
      <input value={bannerUrl} onChange={(e) => setBannerUrl(e.target.value)} />

      <label>Sponsor logo URL</label>
      <input value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} />

      <label>Quantity (1–500)</label>
      <input
        type="text"
        inputMode="numeric"
        value={qty}
        onChange={(e) => setQty(e.target.value.replace(/[^\d]/g, ""))}
        style={{ width: 120 }}
      />

      <label>Square pool items (one per line). Current: {itemsCount}</label>
      <textarea
        value={items}
        onChange={(e) => setItems(e.target.value)}
        rows={10}
        style={{ fontFamily: "monospace" }}
      />

      {err && <div style={{ color: "red" }}>{err}</div>}

      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={downloadPdf} disabled={busy}>
          Generate + Download PDF
        </button>
        <button onClick={downloadCsv} disabled={busy}>
          Download CSV (Roster)
        </button>
      </div>

      {pack && <p>Last generated: {new Date(pack.createdAt).toLocaleString()}</p>}
    </main>
  );
}
