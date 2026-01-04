// app/api/generate/route.ts
import { NextResponse } from "next/server";
import { createBingoPackFromMasterPool } from "@/lib/bingo";
import { renderToBuffer } from "@react-pdf/renderer";
import BingoPackPdf from "@/pdf/BingoPackPdf";

export const runtime = "nodejs";

type Body = {
  title?: string;
  qty?: number;
  quantity?: number;
  items?: string[];      // master pool lines
  gridSize?: 3 | 4 | 5;  // optional, default 5
  sponsorName?: string;
  sponsorImage?: string; // data URI optional
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;

    const title = (body.title ?? "Harvest Heroes Bingo").toString();
    const qty = Number.isFinite(body.qty) ? Number(body.qty) : Number(body.quantity);
    const safeQty = Math.max(1, Math.min(500, Number.isFinite(qty) ? qty : 25));

    const gridSize = (body.gridSize ?? 5) as 3 | 4 | 5;

    const items = Array.isArray(body.items) ? body.items : [];
    if (items.length < 24 && gridSize === 5) {
      return NextResponse.json(
        { error: `Need at least 24 items for 5x5. Got ${items.length}.` },
        { status: 400 }
      );
    }

    // Generate pack (this returns cards + weeklyPool + usedItems + meta)
    const pack = createBingoPackFromMasterPool({
      masterPool: items,
      qty: safeQty,
      gridSize,
    });

    // Create a stable packId and createdAt for storage + URLs
    const packId = `pack_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;
    const createdAt = Date.now();

    // Render PDF
    const pdfBuffer = await renderToBuffer(
      BingoPackPdf({
        title,
        sponsorName: body.sponsorName,
        sponsorImage: body.sponsorImage,
        cards: pack.cards,
      }) as any
    );

    const pdfBase64 = `data:application/pdf;base64,${pdfBuffer.toString("base64")}`;

    // Optional CSV roster
    const csvLines = ["cardId"];
    for (const c of pack.cards) csvLines.push(c.id);
    const csv = csvLines.join("\n");

    return NextResponse.json({
      packId,
      createdAt,
      title,
      cards: pack.cards,
      weeklyPool: pack.weeklyPool,
      usedItems: pack.usedItems,
      pdfBase64,
      csv,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Generate failed." },
      { status: 500 }
    );
  }
}
