import { NextResponse } from "next/server";
import { createBingoPack } from "@/lib/bingo";
import { renderBingoPackPdf } from "@/pdf/BingoPackPdf";

function normalizeLines(text: unknown) {
  return String(text ?? "")
    .split(/\r?\n/)
    .map((x) => x.trim())
    .filter(Boolean);
}

// Accept qty as number OR string, strip non-digits, parse int
function coerceQty(qty: unknown) {
  const raw = String(qty ?? "");
  const cleaned = raw.replace(/[^\d]/g, "");
  const n = Number.parseInt(cleaned, 10);
  return { raw, cleaned, n };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const packTitle = String(body?.packTitle ?? "Bingo Pack").trim();
    const sponsorName = String(body?.sponsorName ?? "Sponsor").trim();
    const bannerUrl = body?.bannerUrl ? String(body.bannerUrl).trim() : null;
    const logoUrl = body?.logoUrl ? String(body.logoUrl).trim() : null;

    const { raw, cleaned, n: qtyNum } = coerceQty(body?.qty);

    const itemsArr =
      Array.isArray(body?.items) ? body.items.map((x: any) => String(x).trim()).filter(Boolean) : normalizeLines(body?.items);

    if (!Number.isFinite(qtyNum) || !Number.isInteger(qtyNum) || qtyNum < 1 || qtyNum > 500) {
      return NextResponse.json(
        {
          error: "Quantity must be between 1 and 500.",
          debug: { qtyRaw: raw, qtyCleaned: cleaned, qtyParsed: qtyNum },
        },
        { status: 400 }
      );
    }

    if (itemsArr.length < 24) {
      return NextResponse.json(
        { error: `Need at least 24 square items (you have ${itemsArr.length}).` },
        { status: 400 }
      );
    }

    const pack = createBingoPack({
      packTitle,
      sponsorName,
      bannerUrl,
      logoUrl,
      qty: qtyNum,
      items: itemsArr,
    });

    const { pdfBase64, csv } = await renderBingoPackPdf(pack);

    return NextResponse.json({ pdfBase64, csv });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Server error." },
      { status: 500 }
    );
  }
}
