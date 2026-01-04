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
  items?: string[]; // master pool lines
  gridSize?: 3 | 4 | 5; // optional, default 5

  sponsorName?: string;

  // Generator currently sends these, even if PDF ignores them today
  bannerImageUrl?: string; // e.g. "/banners/current.png"
  sponsorLogoUrl?: string; // e.g. "https://..."
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;

    const title = (body.title ?? "Harvest Heroes Bingo").toString();

    const qtyRaw =
      Number.isFinite(body.qty) ? Number(body.qty) : Number(body.quantity);
    const safeQty = Math.max(1, Math.min(500, Number.isFinite(qtyRaw) ? qtyRaw : 25));

    const gridSize = (body.gridSize ?? 5) as 3 | 4 | 5;

    const items = Array.isArray(body.items) ? body.items : [];
    if (gridSize === 5 && items.length < 24) {
      return NextResponse.json(
        { error: `Need at least 24 items for 5x5. Got ${items.length}.` },
        { status: 400 }
      );
    }

    // Generate pack (cards + weeklyPool + usedItems)
    const pack = createBingoPackFromMasterPool({
      masterPool: items,
      qty: safeQty,
      gridSize,
    });

    // Stable ids for storage + URLs
    const packId = `pack_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;
    const createdAt = Date.now();

    // IMPORTANT:
    // - app/page.tsx expects pdfBase64 to be RAW base64 (no "data:application/pdf;base64,")
    //   because downloadBase64Pdf() calls atob(base64).
    const pdfBuffer = await renderToBuffer(
      BingoPackPdf({
        title,
        sponsorName: body.sponsorName,
        // If your PDF component later supports banner/logo, wire them here.
        // For now we keep current props to avoid breaking builds.
        sponsorImage: undefined,
        cards: pack.cards,
      }) as any
    );

    const pdfBase64 = pdfBuffer.toString("base64");

    // Optional CSV roster
    const csvLines = ["cardId"];
    for (const c of pack.cards) csvLines.push(c.id);
    const csv = csvLines.join("\n");

    // This is what the Generator + Caller/Winners need to persist
    const cardsPack = {
      packId,
      createdAt,
      title,
      sponsorName: body.sponsorName,
      cards: pack.cards,
    };

    // requestKey: use packId so filenames and winners urls stay consistent
    const requestKey = packId;

    return NextResponse.json({
      requestKey,
      createdAt,

      // keep these too (handy for debugging)
      packId,
      title,

      // what Generator expects
      pdfBase64,
      csv,
      usedItems: pack.usedItems,
      cardsPack,

      // what older parts might still read
      weeklyPool: pack.weeklyPool,
      cards: pack.cards,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Generate failed." },
      { status: 500 }
    );
  }
}
