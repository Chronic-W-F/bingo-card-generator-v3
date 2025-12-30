// app/api/generate/route.ts
// ✅ IMPORTANT: this file must NOT export anything except allowed Next Route exports.
// ✅ Do NOT export BingoPackPdf from here (even accidentally).

import React from "react";
import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";

import { createBingoPackFromMasterPool } from "@/lib/bingo";
import BingoPackPdf from "@/pdf/BingoPackPdf";

export const runtime = "nodejs";

type GenerateRequest = {
  items?: string[]; // master pool (optional)
  qty?: number;
  quantity?: number; // legacy
  gridSize?: 3 | 4 | 5;
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as GenerateRequest;

    const qtyRaw = body.qty ?? body.quantity ?? 1;
    const qty = clamp(Number(qtyRaw) || 1, 1, 500);

    const gridSize = (body.gridSize ?? 5) as 3 | 4 | 5;

    const masterPool = Array.isArray(body.items) ? body.items : [];

    const pack = createBingoPackFromMasterPool({
      masterPool,
      qty,
      gridSize,
    });

    // ✅ Avoid JSX in route files to prevent Next "invalid Route export field" issues.
    const doc = React.createElement(BingoPackPdf as any, { cards: pack.cards });

    const pdfBuffer = await renderToBuffer(doc);

    return NextResponse.json({
      pdfBase64: Buffer.from(pdfBuffer).toString("base64"),
      usedItems: pack.usedItems,
      weeklyPool: pack.weeklyPool,
      meta: pack.meta,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
