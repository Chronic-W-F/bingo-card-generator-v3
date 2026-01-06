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
  // ✅ CRITICAL: open tab immediately from user gesture
  const popup = window.open("", "_blank");

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

    // Safety check: if server returned HTML/JSON error
    if (blob.size < 800) {
      const t = await blob.text().catch(() => "");
      throw new Error(
        `card-pdf returned tiny blob (${blob.size}): ${t.slice(0, 300)}`
      );
    }

    const url = URL.createObjectURL(blob);

    if (popup && !popup.closed) {
      // ✅ Navigate already-opened tab (Android-safe)
      popup.location.href = url;

      // Delay revoke or Android fails to load
      setTimeout(() => {
        try {
          URL.revokeObjectURL(url);
        } catch {}
      }, 15000);
    } else {
      // Fallback (desktop / popup blocked)
      downloadBlob(`bingo-card-${payload.card.id}.pdf`, blob);
    }
  } catch (err) {
    // Close blank tab if something failed
    try {
      if (popup && !popup.closed) popup.close();
    } catch {}
    throw err;
  }
}
