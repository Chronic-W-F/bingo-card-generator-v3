// app/api/card-pdf/route.ts
import React from "react";
import { pdf } from "@react-pdf/renderer";
import SingleCardPdf from "@/pdf/SingleCardPdf";

export const runtime = "nodejs";

type BingoCard = { id: string; grid: string[][] };

type Body = {
  title?: string;
  sponsorName?: string;
  bannerImageUrl?: string;
  sponsorLogoUrl?: string;
  card: BingoCard;
};

function sanitizeFilename(name: string) {
  return (name || "bingo-card")
    .replace(/[^\w\- ]+/g, "")
    .trim()
    .replace(/\s+/g, "_")
    .slice(0, 120);
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;

    if (!body?.card?.id || !Array.isArray(body.card.grid)) {
      return Response.json({ error: "Missing card payload." }, { status: 400 });
    }

    // ✅ NO JSX in route.ts
    const doc = React.createElement(SingleCardPdf, {
      title: body.title || "Bingo Card",
      sponsorName: body.sponsorName || "",
      bannerImageUrl: body.bannerImageUrl || "",
      sponsorLogoUrl: body.sponsorLogoUrl || "",
      card: body.card,
    });

    const out = await (pdf(doc) as any).toBuffer(); // Buffer on node
    const bytes = new Uint8Array(out);

    const filename = `${sanitizeFilename(body.title || "bingo-card")}-${body.card.id}.pdf`;

    return new Response(bytes, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e: any) {
    return Response.json(
      { error: e?.message || "card-pdf failed" },
      { status: 500 }
    );
  }
}
