// app/api/generate/route.ts
import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import fs from "node:fs";
import path from "node:path";

import BingoPackPdf from "@/pdf/BingoPackPdf";
import { ICON_MAP } from "@/lib/iconMap";
import { generateBingoPack } from "@/lib/bingo";

type GenerateRequest = {
  quantity?: number;
  sponsorImage?: string; // "/sponsors/joes-grows.png"
  accentColor?: string;  // "#2ecc71"
};

function publicFileToDataUri(publicPath: string) {
  // publicPath like "/sponsors/joes-grows.png" or "/icons/leaf.png"
  const abs = path.join(process.cwd(), "public", publicPath.replace(/^\/+/, ""));
  const buf = fs.readFileSync(abs);
  const ext = path.extname(abs).toLowerCase();

  const mime =
    ext === ".png"
      ? "image/png"
      : ext === ".jpg" || ext === ".jpeg"
      ? "image/jpeg"
      : ext === ".webp"
      ? "image/webp"
      : "application/octet-stream";

  return `data:${mime};base64,${buf.toString("base64")}`;
}

function safeTryDataUri(publicPath?: string) {
  if (!publicPath) return undefined;
  try {
    return publicFileToDataUri(publicPath);
  } catch {
    // If it can't be read (missing file), return original string (might still work locally)
    return publicPath;
  }
}

function buildIconDataMap() {
  const out: Record<string, string> = {};
  for (const [label, publicPath] of Object.entries(ICON_MAP)) {
    try {
      out[label] = publicFileToDataUri(publicPath);
    } catch {
      // fallback to raw path if missing
      out[label] = publicPath;
    }
  }
  return out;
}

function toRosterCsv(cards: { id: string }[]) {
  // Simple roster: Card ID per line. You can expand if you want.
  const header = "CardID";
  const rows = cards.map((c) => c.id);
  return [header, ...rows].join("\n");
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as GenerateRequest;

    const quantity = Math.max(1, Math.min(500, Number(body.quantity ?? 1)));
    const accentColor = body.accentColor ?? "#000000";

    // ✅ Your existing generator (returns { cards })
    const pack = generateBingoPack(quantity);
    const cards = pack.cards;

    // ✅ Convert sponsor and icons to server-safe data URIs
    const sponsorSrc = safeTryDataUri(body.sponsorImage);
    const iconMap = buildIconDataMap();

    // ✅ Render PDF
    const pdfBuffer = await renderToBuffer(
      <BingoPackPdf
        cards={cards}
        sponsorImage={sponsorSrc}
        accentColor={accentColor}
        iconMap={iconMap}
      />
    );

    const pdfBase64 = pdfBuffer.toString("base64");
    const csv = toRosterCsv(cards);

    return NextResponse.json({
      ok: true,
      pdfBase64,
      csv,
      cardCount: cards.length,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        error: err?.message ?? "Failed to generate bingo pack",
      },
      { status: 500 }
    );
  }
}
