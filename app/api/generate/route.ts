// app/api/generate/route.ts
import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";

import BingoPackPdf from "@/pdf/BingoPackPdf";
import { createBingoPack } from "@/lib/bingo";

export const runtime = "nodejs";

type Body = {
  requestKey?: string;
  title?: string;
  sponsorName?: string;
  bannerImageUrl?: string | null;
  sponsorLogoUrl?: string | null;
  qty?: number;
  quantity?: number;
  items?: string[];
};

function cleanLines(items: unknown): string[] {
  if (!Array.isArray(items)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of items) {
    const s = String(raw ?? "").trim();
    if (!s) continue;
    const k = s.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(s);
  }
  return out;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;

    const title = body.title ?? "Grower Bingo";
    const sponsorName = body.sponsorName ?? "Joe’s Grows";
    const bannerImageUrl = body.bannerImageUrl ?? null;
    const sponsorLogoUrl = body.sponsorLogoUrl ?? null;

    const quantity = Math.max(
      1,
      Math.min(500, Number(body.qty ?? body.quantity ?? 1))
    );

    const pool = cleanLines(body.items);
    if (pool.length < 24) {
      return NextResponse.json(
        { error: "Need at least 24 items (FREE center)." },
        { status: 400 }
      );
    }

    const pack = createBingoPack(pool, quantity, sponsorName);

    const pdfBuffer = await renderToBuffer(
      BingoPackPdf({
        title,
        sponsorName,
        bannerImageUrl,
        sponsorLogoUrl,
        cards: pack.cards,
      }) as any
    );

    return NextResponse.json({
      pdfBase64: pdfBuffer.toString("base64"),
      cardsCount: pack.cards.length,
      createdAt: Date.now(),
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Generate failed" },
      { status: 500 }
    );
  }
}
