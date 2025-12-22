// app/api/generate/route.ts
import { NextResponse } from "next/server";
import { createBingoPack } from "@/lib/bingo";
import { renderBingoPackPdf, type BingoPack } from "@/pdf/BingoPackPdf";

export const runtime = "nodejs";

function normalizeLines(v: unknown) {
  if (Array.isArray(v)) return v.map(String).map((s) => s.trim()).filter(Boolean);
  if (typeof v !== "string") return [];
  return v
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
}

async function toArrayBufferMaybe(
  input: unknown
): Promise<ArrayBuffer> {
  // Buffer
  if (typeof Buffer !== "undefined" && Buffer.isBuffer(input)) {
    return input.buffer.slice(input.byteOffset, input.byteOffset + input.byteLength);
  }

  // Uint8Array / ArrayBuffer
  if (input instanceof ArrayBuffer) return input;
  if (input instanceof Uint8Array) return input.buffer.slice(input.byteOffset, input.byteOffset + input.byteLength);

  // ReadableStream (what you're hitting)
  // new Response(stream).arrayBuffer() works in Node runtimes that include fetch/web streams (Next does)
  if (input && typeof (input as any).getReader === "function") {
    const ab = await new Response(input as any).arrayBuffer();
    return ab;
  }

  // Fallback: if it’s already a Response-like
  if (input && typeof (input as any).arrayBuffer === "function") {
    return await (input as any).arrayBuffer();
  }

  throw new Error("PDF renderer returned an unsupported type.");
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const packTitle = String(body.packTitle ?? "Grower Bingo").trim();
    const sponsorName = String(body.sponsorName ?? "Sponsor").trim();

    const bannerUrlRaw = body.bannerUrl;
    const logoUrlRaw = body.logoUrl;

    const bannerUrl =
      typeof bannerUrlRaw === "string" && bannerUrlRaw.trim()
        ? bannerUrlRaw.trim()
        : undefined;

    const logoUrl =
      typeof logoUrlRaw === "string" && logoUrlRaw.trim()
        ? logoUrlRaw.trim()
        : undefined;

    const qty = Number.parseInt(String(body.qty ?? "25"), 10);
    if (!Number.isFinite(qty) || qty < 1 || qty > 500) {
      return NextResponse.json({ error: "qty must be between 1 and 500" }, { status: 400 });
    }

    const items = Array.isArray(body.items)
      ? normalizeLines(body.items)
      : normalizeLines(body.items);

    if (items.length < 24) {
      return NextResponse.json(
        { error: `Need at least 24 items. You have ${items.length}.` },
        { status: 400 }
      );
    }

    const generated = createBingoPack(items, qty);

    const pack: BingoPack = {
      packTitle,
      sponsorName,
      bannerUrl,
      logoUrl,
      cards: generated.cards.map((c) => ({
        id: c.id,
        grid: c.grid, // expects string[][]
      })),
    };

    // ✅ render PDF (stream or bytes depending on implementation)
    const pdfOut = await renderBingoPackPdf(pack);

    // ✅ convert to bytes
    const ab = await toArrayBufferMaybe(pdfOut);
    const pdfBase64 = Buffer.from(new Uint8Array(ab)).toString("base64");

    // roster CSV
    const csvLines = ["card_id"];
    for (const c of pack.cards) csvLines.push(c.id);
    const csv = csvLines.join("\n");

    return NextResponse.json({ pdfBase64, csv });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unknown server error" }, { status: 500 });
  }
}
