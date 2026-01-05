// app/api/card-pdf/route.ts
import { NextResponse } from "next/server";
import { pdf } from "@react-pdf/renderer";
import React from "react";

import BingoPackPdf from "@/pdf/BingoPackPdf";

export const runtime = "nodejs";

type BingoCard = {
  id: string;
  grid: string[][];
};

type Body = {
  title?: string;
  sponsorName?: string;
  bannerImageUrl?: string; // "/banners/current.png" or https://...
  card: BingoCard;
};

function toAbsoluteUrl(reqUrl: string, maybeRelative?: string) {
  if (!maybeRelative) return undefined;

  // Already absolute?
  try {
    const u = new URL(maybeRelative);
    return u.toString();
  } catch {
    // Relative -> absolute using request origin
    const base = new URL(reqUrl);
    return new URL(maybeRelative, `${base.protocol}//${base.host}`).toString();
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;

    if (!body?.card?.id || !Array.isArray(body.card.grid)) {
      return NextResponse.json(
        { ok: false, error: "Missing or invalid card payload." },
        { status: 400 }
      );
    }

    const title = body.title || "Harvest Heroes Bingo";
    const sponsorName = body.sponsorName || "";
    const bannerImageUrl = toAbsoluteUrl(req.url, body.bannerImageUrl);

    // ✅ NO JSX in .ts: use React.createElement
    const doc = React.createElement(BingoPackPdf, {
      cards: [body.card],
      title,
      sponsorName,
      bannerImageUrl,
    });

    const buffer = await pdf(doc).toBuffer();

    // ✅ BodyInit-safe: Uint8Array (not Buffer typing)
    const bytes = Uint8Array.from(buffer);

    return new NextResponse(bytes, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="bingo-card-${body.card.id}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Single card PDF failed." },
      { status: 500 }
    );
  }
}
