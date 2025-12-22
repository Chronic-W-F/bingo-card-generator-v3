import { NextResponse } from "next/server";

/**
 * This API route is intentionally resilient:
 * - It does NOT assume exact named exports from lib/pdf modules.
 * - It searches for a usable function name from a list of candidates.
 * - If not found, it throws an error showing available exports.
 */

function normalizeLines(text: unknown) {
  return String(text ?? "")
    .split(/\r?\n/)
    .map((x) => x.trim())
    .filter(Boolean);
}

function cleanNumericString(v: unknown) {
  const s = String(v ?? "");
  return s.replace(/[^\d]/g, "");
}

function parseQty(v: unknown) {
  const cleaned = cleanNumericString(v);
  const n = Number.parseInt(cleaned, 10);
  return { cleaned, n };
}

function pickFn(mod: any, candidates: string[], label: string) {
  for (const name of candidates) {
    const fn = mod?.[name];
    if (typeof fn === "function") return fn;
  }
  const keys = Object.keys(mod ?? {}).sort();
  throw new Error(
    `API misconfig: could not find ${label} function. Tried: ${candidates.join(
      ", "
    )}. Available exports: ${keys.join(", ")}`
  );
}

function toBase64(buf: ArrayBuffer | Uint8Array) {
  const u8 = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < u8.length; i += chunkSize) {
    binary += String.fromCharCode(...u8.subarray(i, i + chunkSize));
  }
  return Buffer.from(binary, "binary").toString("base64");
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    const packTitle = String(body?.packTitle ?? "Grower Bingo").trim();
    const sponsorName = String(body?.sponsorName ?? "Sponsor").trim();
    const bannerUrl =
      body?.bannerUrl === null || body?.bannerUrl === undefined
        ? ""
        : String(body.bannerUrl).trim();
    const logoUrl =
      body?.logoUrl === null || body?.logoUrl === undefined
        ? ""
        : String(body.logoUrl).trim();

    const { n: qtyNum } = parseQty(body?.qty);

    const itemsArr = Array.isArray(body?.items)
      ? body.items.map((x: any) => String(x).trim()).filter(Boolean)
      : normalizeLines(body?.items);

    // Validate qty
    if (!Number.isFinite(qtyNum) || !Number.isInteger(qtyNum) || qtyNum < 1 || qtyNum > 500) {
      return NextResponse.json(
        {
          error: "Quantity must be between 1 and 500.",
          debug: {
            receivedQty: body?.qty,
            parsedQty: qtyNum,
            packTitle,
            sponsorName,
            itemsCount: itemsArr.length,
          },
        },
        { status: 400 }
      );
    }

    // Validate items
    if (itemsArr.length < 24) {
      return NextResponse.json(
        {
          error: `Need at least 24 square items (you have ${itemsArr.length}).`,
          debug: {
            itemsCount: itemsArr.length,
          },
        },
        { status: 400 }
      );
    }

    // Import modules without assuming named exports
    const bingoMod = await import("@/lib/bingo");
    const pdfMod = await import("@/pdf/BingoPackPdf");

    // Find the pack builder function
    const createPack = pickFn(
      bingoMod as any,
      [
        "createBingoPack",
        "buildBingoPack",
        "makeBingoPack",
        "generateBingoPack",
        "createPack",
        "buildPack",
        "makePack",
        "generatePack",
      ],
      "pack builder"
    );

    // Find the pdf renderer function
    const renderPdf = pickFn(
      pdfMod as any,
      [
        "renderBingoPackPdf",
        "renderPackPdf",
        "renderPdf",
        "makePdf",
        "generatePdf",
        "render",
      ],
      "PDF renderer"
    );

    // Create pack (shape depends on your lib/bingo.ts)
    // We pass a common object, your function can ignore extras it doesn't need.
    const pack = await createPack({
      packTitle,
      sponsorName,
      bannerUrl: bannerUrl || null,
      logoUrl: logoUrl || null,
      qty: qtyNum,
      items: itemsArr,
    });

    // Render PDF (expects your pdf module to know how to render whatever "pack" is)
    const pdfBytesLike = await renderPdf(pack, {
      packTitle,
      sponsorName,
      bannerUrl: bannerUrl || null,
      logoUrl: logoUrl || null,
    });

    // Support renderer returning Uint8Array, ArrayBuffer, Buffer
    const pdfBase64 =
      pdfBytesLike instanceof Uint8Array
        ? Buffer.from(pdfBytesLike).toString("base64")
        : pdfBytesLike instanceof ArrayBuffer
        ? toBase64(pdfBytesLike)
        : Buffer.isBuffer(pdfBytesLike)
        ? pdfBytesLike.toString("base64")
        : typeof pdfBytesLike === "string"
        ? pdfBytesLike // if you already return base64
        : (() => {
            throw new Error(
              `PDF renderer returned unsupported type: ${Object.prototype.toString.call(pdfBytesLike)}`
            );
          })();

    // CSV: if your pack already includes it, use it. Otherwise create minimal roster.
    const csv =
      typeof pack?.csv === "string"
        ? pack.csv
        : typeof pack?.rosterCsv === "string"
        ? pack.rosterCsv
        : "card_id\n" +
          (Array.isArray(pack?.cards)
            ? pack.cards.map((c: any) => c?.id ?? c?.cardId ?? "").filter(Boolean).join("\n")
            : "");

    return NextResponse.json({
      pdfBase64,
      csv,
      debug: {
        qtyNum,
        itemsCount: itemsArr.length,
        bingoExports: Object.keys(bingoMod ?? {}),
        pdfExports: Object.keys(pdfMod ?? {}),
      },
    });
  } catch (e: any) {
    return NextResponse.json(
      {
        error: e?.message || "Server error",
      },
      { status: 500 }
    );
  }
}
