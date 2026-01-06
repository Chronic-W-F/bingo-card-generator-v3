"use client";

import { downloadBlob } from "@/lib/download";

export type BingoCard = {
  id: string;
  grid: string[][];
};

export async function downloadSingleCardPdf(payload: {
  title?: string;
  sponsorName?: string;
  bannerImageUrl?: string;
  sponsorLogoUrl?: string;
  card: BingoCard;
}) {
  // ✅ Must happen immediately from the user click
  const popup = window.open("about:blank", "_blank");

  try {
    const res = await fetch("/api/card-pdf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`card-pdf failed (${res.status}): ${text.slice(0, 300)}`);
    }

    const blob = await res.blob();

    if (blob.size < 800) {
      const t = await blob.text().catch(() => "");
      throw new Error(`card-pdf returned tiny blob (${blob.size}): ${t.slice(0, 300)}`);
    }

    const url = URL.createObjectURL(blob);

    // ✅ Best path: use the tab we opened from the gesture
    if (popup && !popup.closed) {
      popup.location.href = url;
      setTimeout(() => {
        try {
          URL.revokeObjectURL(url);
        } catch {}
      }, 15000);
      return;
    }

    // ✅ Popup blocked: fall back to same-tab open (Android-safe)
    // This usually avoids Chrome "Download error" because it's not a forced download,
    // it's just opening the PDF viewer.
    window.location.href = url;

    // Optional: still offer the classic download (works on many devices)
    // downloadBlob(`bingo-card-${payload.card.id}.pdf`, blob);

    setTimeout(() => {
      try {
        URL.revokeObjectURL(url);
      } catch {}
    }, 15000);
  } catch (err) {
    // If popup opened but we failed, close the blank tab
    try {
      if (popup && !popup.closed) popup.close();
    } catch {}
    throw err;
  }
}
