// app/api/generate/route.ts
import { NextResponse } from "next/server";
import { createBingoPackFromMasterPool } from "@/lib/bingo";
import { renderToBuffer } from "@react-pdf/renderer";
import BingoPackPdf from "@/pdf/BingoPackPdf";
import fs from "node:fs/promises";
import path from "node:path";
import { getDb } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";

type Body = {
  title?: string;
  qty?: number;
  quantity?: number;
  items?: string[];
  gridSize?: 3 | 4 | 5;

  sponsorName?: string;

  bannerImageUrl?: string; // default "/banners/current.png"
  sponsorLogoUrl?: string; // not used yet
};

async function readPublicAsDataUri(publicPath: string): Promise<string | null> {
  try {
    const clean = publicPath.startsWith("/") ? publicPath.slice(1) : publicPath;
    const abs = path.join(process.cwd(), "public", clean);
    const buf = await fs.readFile(abs);

    const ext = path.extname(clean).toLowerCase();
    const mime =
      ext === ".png"
        ? "image/png"
        : ext === ".jpg" || ext === ".jpeg"
          ? "image/jpeg"
          : ext === ".webp"
            ? "image/webp"
            : "application/octet-stream";

    return `data:${mime};base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;

    const title = (body.title ?? "Lights Out Bingo").toString();

    const qtyRaw =
      Number.isFinite(body.qty) ? Number(body.qty) : Number(body.quantity);
    const safeQty = Math.max(1, Math.min(500, Number.isFinite(qtyRaw) ? qtyRaw : 25));

    const gridSize = (body.gridSize ?? 5) as 3 | 4 | 5;

    const items = Array.isArray(body.items) ? body.items : [];
    if (gridSize === 5 && items.length < 24) {
      return NextResponse.json(
        { error: `Need at least 24 items for 5x5. Got ${items.length}.` },
        { status: 400 }
      );
    }

    // Generate pack (cards + weeklyPool + usedItems)
    const pack = createBingoPackFromMasterPool({
      masterPool: items,
      qty: safeQty,
      gridSize,
      title,
      sponsorName: body.sponsorName,
    });

    // Stable ids for storage + URLs
    // NOTE: lib/bingo.ts already generates packId/createdAt, but we keep your API behavior stable
    const packId = `pack_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;
    const createdAt = Date.now();

    // --- Banner restore ---
    const bannerUrl = (body.bannerImageUrl ?? "/banners/current.png").toString();

    let bannerDataOrUrl: string | undefined = undefined;
    if (bannerUrl.startsWith("/")) {
      bannerDataOrUrl = (await readPublicAsDataUri(bannerUrl)) ?? undefined;
    } else if (bannerUrl.startsWith("https://") || bannerUrl.startsWith("http://")) {
      bannerDataOrUrl = bannerUrl;
    }

    // IMPORTANT: page.tsx expects RAW base64 (no "data:application/pdf;base64,")
    const pdfBuffer = await renderToBuffer(
      BingoPackPdf({
        title,
        sponsorName: body.sponsorName,
        // Support both prop names (old/new PDF variants)
        bannerImageUrl: bannerDataOrUrl,
        sponsorImage: bannerDataOrUrl,
        cards: pack.cards,
        gridSize,
      }) as any
    );

    const pdfBase64 = pdfBuffer.toString("base64");

    // CSV roster
    const csvLines = ["cardId"];
    for (const c of pack.cards) csvLines.push(c.id);
    const csv = csvLines.join("\n");

    // Shape used by the client + localStorage
    const cardsPack = {
      packId,
      createdAt,
      title,
      sponsorName: body.sponsorName,
      cards: pack.cards,
      weeklyPool: pack.weeklyPool,
      usedItems: pack.usedItems,
      meta: pack.meta,
      bannerImageUrl: bannerUrl,
    };

    // --- Firestore write (server-only, no auth) ---
    // Collections:
    // packs/{packId}
    // packs/{packId}/cards/{cardId}
    const db = getDb();

    const packRef = db.collection("packs").doc(packId);

    await packRef.set(
      {
        packId,
        createdAt,
        title,
        sponsorName: body.sponsorName ?? null,
        gridSize,
        qty: safeQty,
        weeklyPool: pack.weeklyPool,
        usedItems: pack.usedItems,
        meta: pack.meta,
        bannerImageUrl: bannerUrl,
        sponsorLogoUrl: body.sponsorLogoUrl ?? null,
        // Helpful later
        cardCount: pack.cards.length,
      },
      { merge: true }
    );

    // Write cards in a batch
    const batch = db.batch();
    for (const c of pack.cards) {
      const cRef = packRef.collection("cards").doc(c.id);
      batch.set(
        cRef,
        {
          cardId: c.id,
          grid: c.grid,
          createdAt,
        },
        { merge: true }
      );
    }
    await batch.commit();

    const requestKey = packId;

    return NextResponse.json({
      requestKey,
      createdAt,
      packId,
      title,

      pdfBase64,
      csv,
      usedItems: pack.usedItems,
      cardsPack,

      weeklyPool: pack.weeklyPool,
      cards: pack.cards,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Generate failed." },
      { status: 500 }
    );
  }
}
