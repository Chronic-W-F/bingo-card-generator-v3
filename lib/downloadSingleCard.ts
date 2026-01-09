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
    throw new Error(
      `card-pdf returned tiny blob (${blob.size}): ${t.slice(0, 300)}`
    );
  }

  const filename = `bingo-card-${payload.card.id}.pdf`;
  downloadBlob(filename, blob);
}
