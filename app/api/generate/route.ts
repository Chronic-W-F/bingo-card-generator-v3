// app/api/generate/route.ts
import React from "react";
import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import BingoPackPdf from "@/pdf/BingoPackPdf";
import { createBingoPackFromMasterPool } from "@/lib/bingo";

export const runtime = "nodejs";

type BingoCard = {
  id: string;
  grid: string[][];
};

function normalizeItems(items: unknown): string[] {
  if (!Array.isArray(items)) return [];
  return items
    .map((x) => (typeof x === "string" ? x.trim() : ""))
    .filter(Boolean);
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function safeInt(x: unknown, fallback: number) {
  const n = typeof x === "number" ? x : Number.parseInt(String(x ?? ""), 10);
  return Number.isFinite(n) ? n : fallback;
}

function csvEscape(s: string) {
  const needs = /[,"\n\r]/.test(s);
  const out = s.replace(/"/g, '""');
  return needs ? `"${out}"` : out;
}

function buildRosterCsv(cards: BingoCard[]) {
  const header = ["cardId"];
  for (let i = 1; i <= 25; i++) header.push(`cell${i}`);

  const lines: string[] = [];
  lines.push(header.join(","));

  for (const c of cards) {
    const flat = c.grid.flat(); // 25 strings
    const row = [c.id, ...flat].map(csvEscape).join(",");
    lines.push(row);
  }
  return lines.join("\n");
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const title = typeof body?.title === "string" ? body.title : "Bingo Pack";
    const sponsorName = typeof body?.sponsorName === "string" ? body.sponsorName : "";
    const bannerImageUrl = typeof body?.bannerImageUrl === "string" ? body.bannerImageUrl : "";
    const sponsorLogoUrl = typeof body?.sponsorLogoUrl === "string" ? body.sponsorLogoUrl : "";

    const qty = clamp(safeInt(body?.qty, 25), 1, 500);

    // Expect array of strings from client
    const items = normalizeItems(body?.items);

    if (items.length < 24) {
      return NextResponse.json(
        {
          error: `Pool too small. Need at least 24 items for a 5x5 card (freeCenter=true). You have ${items.length}.`,
        },
        { status: 400 }
      );
    }

    const pack = createBingoPackFromMasterPool(items, qty);
    const cards: BingoCard[] = (pack?.cards ?? []) as BingoCard[];

    if (!Array.isArray(cards) || cards.length === 0) {
      return NextResponse.json({ error: "No cards were generated." }, { status: 500 });
    }

    // ✅ NO JSX in .ts file
    const pdfBuffer = await renderToBuffer(
      React.createElement(BingoPackPdf as any, { cards })
    );

    const pdfBase64 = Buffer.from(pdfBuffer).toString("base64");
    const csv = buildRosterCsv(cards);

    const usedItems = Array.isArray((pack as any)?.usedItems) ? (pack as any).usedItems : [];

    return NextResponse.json({
      requestKey: `${Date.now()}`,
      title,
      sponsorName,
      bannerImageUrl,
      sponsorLogoUrl,
      qty,
      pdfBase64,
      csv,
      usedItems,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Server error generating pack." },
      { status: 500 }
    );
  }
}
