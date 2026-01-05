// app/api/generate/route.ts
import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import admin from "firebase-admin";

import BingoPackPdf from "@/pdf/BingoPackPdf";
import { createBingoPack, type BingoPack } from "@/lib/bingo";

export const runtime = "nodejs";

// ---------- Firebase Admin (safe init) ----------
function getFirebaseAdminApp() {
  if (admin.apps.length) return admin.app();

  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!json) {
    throw new Error("Missing FIREBASE_SERVICE_ACCOUNT_JSON env var.");
  }

  let creds: admin.ServiceAccount;
  try {
    creds = JSON.parse(json);
  } catch {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON.");
  }

  return admin.initializeApp({
    credential: admin.credential.cert(creds),
    // Optional. If you set FIREBASE_PROJECT_ID, we'll use it.
    projectId: process.env.FIREBASE_PROJECT_ID || creds.project_id,
  });
}

// ---------- Helpers ----------
function normalizeLines(text: string): string[] {
  return text
    .split(/\r?\n/g)
    .map((s) => s.trim())
    .filter(Boolean);
}

function asInt(value: unknown, fallback: number) {
  const n = typeof value === "string" ? parseInt(value, 10) : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function safeString(v: unknown) {
  return typeof v === "string" ? v.trim() : "";
}

function toBase64(data: Buffer) {
  return data.toString("base64");
}

// ---------- POST /api/generate ----------
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    // Inputs (match your form)
    const title = safeString(body.title) || "Harvest Heroes Bingo";
    const sponsorName = safeString(body.sponsorName) || "Joe’s Grows";

    // NOTE: Keep these names aligned with your frontend.
    // Your PDF props should be bannerImageUrl + sponsorLogoUrl (strings).
    const bannerImageUrl = safeString(body.bannerImageUrl || body.bannerImage || "");
    const sponsorLogoUrl = safeString(body.sponsorLogoUrl || body.sponsorLogo || "");

    // Pool + qty
    const itemsText =
      safeString(body.itemsText) ||
      safeString(body.items) ||
      safeString(body.squarePool) ||
      "";
    const items = normalizeLines(itemsText);

    const qty = asInt(body.qty ?? body.quantity, 1);
    const quantity = Math.min(Math.max(qty, 1), 500);

    // Grid size (default 5x5)
    const gridSize = Math.min(Math.max(asInt(body.gridSize, 5), 3), 5);

    if (items.length < (gridSize * gridSize - 1)) {
      return NextResponse.json(
        {
          ok: false,
          error: `Need at least ${gridSize * gridSize - 1} items for a ${gridSize}x${gridSize} card (center is free). You provided ${items.length}.`,
        },
        { status: 400 }
      );
    }

    // Create the pack
    const pack: BingoPack = createBingoPack(items, quantity, {
      title,
      sponsorName,
      gridSize,
    });

    const createdAt = Date.now();
    const packId = pack.packId;

    // Render PDF
    const pdfBuffer = await renderToBuffer(
      // IMPORTANT: prop names below must match your pdf/BingoPackPdf.tsx Props
      // Use bannerImageUrl + sponsorLogoUrl (strings).
      // If your PDF component expects different names, change here.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (BingoPackPdf as any)({
        title,
        sponsorName,
        bannerImageUrl,
        sponsorLogoUrl,
        cards: pack.cards,
        gridSize,
      })
    );

    // Build CSV roster (CardId per card)
    const csvLines = ["card_id"];
    for (const c of pack.cards) csvLines.push(c.id);
    const csv = csvLines.join("\n");

    // Build JSON export (for your Download cards.json button)
    const cardsJson = JSON.stringify(
      {
        packId,
        createdAt,
        title,
        sponsorName,
        gridSize,
        bannerImageUrl,
        sponsorLogoUrl,
        cards: pack.cards,
        weeklyPool: pack.weeklyPool,
        usedItems: pack.usedItems,
      },
      null,
      2
    );

    // Persist to Firestore (Option B / future-proof)
    // Fix for your error: Firestore cannot store nested arrays like string[][].
    // We store gridFlat (string[]) + gridSize instead.
    const app = getFirebaseAdminApp();
    const db = app.firestore();

    const packRef = db.collection("packs").doc(packId);

    const batch = db.batch();

    // Pack doc
    batch.set(
      packRef,
      {
        packId,
        createdAt,
        title,
        sponsorName,
        gridSize,
        bannerImageUrl,
        sponsorLogoUrl,
        quantity,
        weeklyPool: pack.weeklyPool,
        usedItems: pack.usedItems,
      },
      { merge: true }
    );

    // Cards subcollection
    for (const c of pack.cards) {
      const cRef = packRef.collection("cards").doc(c.id);
      batch.set(
        cRef,
        {
          cardId: c.id,
          createdAt,
          gridSize,
          gridFlat: c.grid.flat(), // ✅ Firestore-safe (no nested arrays)
        },
        { merge: true }
      );
    }

    await batch.commit();

    return NextResponse.json({
      ok: true,
      data: {
        packId,
        createdAt,
        title,
        sponsorName,
        gridSize,
        bannerImageUrl,
        sponsorLogoUrl,
        qty: quantity,
        weeklyPool: pack.weeklyPool,
        usedItems: pack.usedItems,
        pdfBase64: toBase64(Buffer.from(pdfBuffer)),
        csv,
        cardsJson,
      },
    });
  } catch (err: any) {
    const message = err?.message || "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
