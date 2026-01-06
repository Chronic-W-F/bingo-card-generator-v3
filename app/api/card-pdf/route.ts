// app/api/card-pdf/route.ts
import { NextResponse } from "next/server";
import { pdf } from "@react-pdf/renderer";
import React from "react";
import SingleCardPdf from "@/pdf/SingleCardPdf";

export const runtime = "nodejs"; // IMPORTANT for Buffer + react-pdf

type BingoCard = { id: string; grid: string[][] };

type Body = {
  title?: string;
  sponsorName?: string;
  bannerImageUrl?: string;
  sponsorLogoUrl?: string;
  card: BingoCard;
};

function sanitizeFilename(name: string) {
  return (name || "")
    .replace(/[^\w\- ]+/g, "")
    .trim()
    .replace(/\s+/g, "_")
    .slice(0, 80) || "bingo-card";
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;

    if (!body?.card?.id || !Array.isArray(body?.card?.grid)) {
      return NextResponse.json(
        { error: "Missing card data (id/grid)." },
        { status: 400 }
      );
    }

    // ✅ NO JSX HERE: use React.createElement
    const element = React.createElement(SingleCardPdf, {
      title: body.title || "Bingo Card",
      sponsorName: body.sponsorName || "",
      bannerImageUrl: body.bannerImageUrl || "",
      sponsorLogoUrl: body.sponsorLogoUrl || "",
      card: body.card,
    });

    const buf = await pdf(element).toBuffer();

    if (!buf || buf.length < 500) {
      return NextResponse.json(
        { error: `PDF render returned tiny buffer (${buf?.length ?? 0}).` },
        { status: 500 }
      );
    }

    const filename = `${sanitizeFilename(body.card.id)}.pdf`;

    return new Response(buf, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "card-pdf failed" },
      { status: 500 }
    );
  }
}
