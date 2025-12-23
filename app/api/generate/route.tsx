// app/api/generate/route.tsx
import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import fs from "node:fs";
import path from "node:path";

import BingoPackPdf from "@/pdf/BingoPackPdf";
import { ICON_MAP } from "@/lib/iconMap";
import { createBingoPack, BINGO_ITEMS } from "@/lib/bingo";

export const runtime = "nodejs";

type GenerateRequest = {
  // Frontend sends these:
  packTitle?: string;
  sponsorName?: string;
  bannerUrl?: string | null; // top banner image URL
  logoUrl?: string | null;   // (not used yet)
  qty?: number;              // <-- IMPORTANT

  // Some older versions might send these:
  quantity?: number;

  // Optional override list from UI:
  items?: string[];

  // Optional styling:
  accentColor?: string;
};

function toInt(v: unknown, fallback: number) {
  const n = typeof v === "number" ? v : Number(String(v ?? "").trim());
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

function publicFileToDataUri(publicPath: string) {
  const rel = publicPath.replace(/^\/+/, "");
  const abs = path.join(process.cwd(), "public", rel);

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

function safeTryDataUri(pathOrUrl?: string | null) {
  if (!pathOrUrl) return undefined;

  // If it's a full URL, let react-pdf fetch it (works if reachable publicly)
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;

  // If it's a public path like "/sponsors/joes.png", convert to data uri
  try {
    return publicFileToDataUri(pathOrUrl);
  } catch {
    return pathOrUrl;
  }
}

function buildIconDataMap() {
  const out: Record<string, string> = {};
  for (const [label, iconPath] of Object.entries(ICON_MAP)) {
    try {
      out[label] = publicFileToDataUri(iconPath);
    } catch {
      out[label] = iconPath;
    }
  }
  return out;
}

function normalizeItems(items: unknown): string[] | null {
  if (!Array.isArray(items)) return null;
  const cleaned = items
    .map((x) => String(x ?? "").trim())
    .filter(Boolean);
  return cleaned.length ? cleaned : null;
}

function toRosterCsv(cards: { id: string }[]) {
  return ["CardID", ...cards.map((c) => c.id)].join("\n");
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as GenerateRequest;

    // ✅ Accept qty OR quantity (your UI sends qty)
    const requestedQty = body.qty ?? body.quantity ?? 1;
    const quantity = Math.max(1, Math.min(500, toInt(requestedQty, 1)));

    // ✅ Use posted items if provided; otherwise fallback to built-in pool
    const postedItems = normalizeItems(body.items);
    const itemsPool = postedItems ?? BINGO_ITEMS;

    // Generate pack
    const pack = createBingoPack(itemsPool, quantity);
    const cards = pack.cards;

    // ✅ bannerUrl from UI becomes sponsorImage in PDF
    const sponsorImage = safeTryDataUri(body.bannerUrl ?? null);

    const iconMap = buildIconDataMap();
    const accentColor = body.accentColor ?? "#000000";

    const pdfBuffer = await renderToBuffer(
      <BingoPackPdf
        cards={cards}
        sponsorImage={sponsorImage}
        accentColor={accentColor}
        iconMap={iconMap}
      />
    );

    return NextResponse.json({
      ok: true,
      pdfBase64: pdfBuffer.toString("base64"),
      csv: toRosterCsv(cards),
      cardCount: cards.length,
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Failed to generate bingo pack" },
      { status: 500 }
    );
  }
}
