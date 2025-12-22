import { NextResponse } from "next/server";
import { createBingoPackUnique } from "@/lib/bingo";
import { renderBingoPackPdf, type BingoPack } from "@/pdf/BingoPackPdf";

export const runtime = "nodejs";

// Convert unknown input -> array of clean lines
function normalizeLines(input: unknown): string[] {
  const out: string[] = [];

  const pushLine = (s: string) => {
    const t = s.trim();
    if (t) out.push(t);
  };

  const walk = (v: unknown) => {
    if (v == null) return;

    // If it's already a string, split by newlines
    if (typeof v === "string") {
      v.split(/\r?\n/g).forEach(pushLine);
      return;
    }

    // If it's an array, walk each element (and split any multiline strings inside)
    if (Array.isArray(v)) {
      v.forEach(walk);
      return;
    }

    // If it's an object, walk its values (handles weird state shapes)
    if (typeof v === "object") {
      for (const val of Object.values(v as Record<string, unknown>)) {
        walk(val);
      }
      return;
    }

    // Fallback: coerce primitives
    if (typeof v === "number" || typeof v === "boolean") {
      pushLine(String(v));
    }
  };

  walk(input);
  return out;
}

function asString(v: unknown): string {
  return typeof v === "string" ? v : "";
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const packTitle = asString(body.packTitle) || "Harvest Heroes Bingo";
    const sponsorName = asString(body.sponsorName) || "Joe’s Grows";

    const bannerUrlRaw = asString(body.bannerUrl).trim();
    const logoUrlRaw = asString(body.logoUrl).trim();
    const bannerUrl = bannerUrlRaw.length ? bannerUrlRaw : undefined;
    const logoUrl = logoUrlRaw.length ? logoUrlRaw : undefined;

    const qtyNum = Number(body.qty);
    const qty = Number.isFinite(qtyNum) ? Math.max(1, Math.min(500, qtyNum)) : 25;

    // ✅ Robust: accepts string, string[], objects, arrays-with-multiline, etc.
    const items = normalizeLines(body.items);

    if (items.length < 24) {
      return NextResponse.json(
        { ok: false, error: `Need at least 24 items. Found ${items.length}.` },
        { status: 400 }
      );
    }

    // ✅ Create UNIQUE cards
    const generated = createBingoPackUnique({ items, qty });

    const pack: BingoPack = {
      packTitle,
      sponsorName,
      bannerUrl,
      logoUrl,
      cards: generated.cards,
    };

    // Render PDF -> base64
    const pdfBuffer = await renderBingoPackPdf(pack);
    const pdfBase64 = Buffer.from(pdfBuffer).toString("base64");

    // Roster CSV (Card IDs)
    const csvLines = ["card_id", ...pack.cards.map((c) => c.id)];
    const csv = csvLines.join("\n");

    return NextResponse.json({
      ok: true,
      pdfBase64,
      csv,
      count: pack.cards.length,
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || "Server error" },
      { status: 500 }
    );
  }
}
