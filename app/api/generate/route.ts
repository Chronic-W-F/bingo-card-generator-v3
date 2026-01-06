// app/api/generate/route.ts
import { NextResponse } from "next/server";
import admin from "firebase-admin";
import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import path from "path";
import { readFile } from "fs/promises";

import BingoPackPdf from "@/pdf/BingoPackPdf";
import { createBingoPack } from "@/lib/bingo";

// Force Node runtime (we use fs + firebase-admin)
export const runtime = "nodejs";

type ReqBody = {
  title?: string;
  sponsorName?: string;
  bannerImageUrl?: string; // "/banners/current.png" preferred
  sponsorLogoUrl?: string; // optional (not used in PDF yet unless your PDF supports it)
  qty?: number;
  quantity?: number; // allow old/new client shapes
  items?: string[];
};

function safeJsonParse(raw: string | undefined) {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function normalizeItems(items: unknown): string[] {
  if (!Array.isArray(items)) return [];
  return items.map((x) => String(x ?? "").trim()).filter(Boolean);
}

function uniqCaseSensitive(items: string[]) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const it of items) {
    if (seen.has(it)) continue;
    seen.add(it);
    out.push(it);
  }
  return out;
}

function clampQty(n: unknown) {
  const v = Number.parseInt(String(n ?? ""), 10);
  if (!Number.isFinite(v)) return 25;
  return Math.max(1, Math.min(500, v));
}

function toDataUri(mime: string, buf: Buffer) {
  return `data:${mime};base64,${buf.toString("base64")}`;
}

async function loadBannerAsDataUri(
  bannerImageUrl?: string
): Promise<string | undefined> {
  if (!bannerImageUrl) return undefined;

  // We only "guarantee" local banners in /public (your locked default)
  // Example: "/banners/current.png"
  if (bannerImageUrl.startsWith("/")) {
    const abs = path.join(
      process.cwd(),
      "public",
      bannerImageUrl.replace(/^\//, "")
    );
    try {
      const buf = await readFile(abs);
      // crude mime detection
      const lower = bannerImageUrl.toLowerCase();
      const mime = lower.endsWith(".png")
        ? "image/png"
        : lower.endsWith(".jpg") || lower.endsWith(".jpeg")
        ? "image/jpeg"
        : lower.endsWith(".webp")
        ? "image/webp"
        : "application/octet-stream";

      return toDataUri(mime, buf);
    } catch {
      // If file is missing, just skip the banner (better than failing)
      return undefined;
    }
  }

  // If you ever pass a full https URL, let react-pdf fetch it (works sometimes),
  // but data-uri is most reliable. You can upgrade later if needed.
  return bannerImageUrl;
}

function getAdminApp() {
  if (admin.apps.length) return admin.app();

  const credsRaw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  const credsJson = safeJsonParse(credsRaw);

  if (!credsJson) {
    throw new Error("Missing FIREBASE_SERVICE_ACCOUNT_JSON env var.");
  }

  const projectId =
    process.env.FIREBASE_PROJECT_ID ||
    credsJson.projectId ||
    credsJson.project_id ||
    undefined;

  admin.initializeApp({
    credential: admin.credential.cert(credsJson),
    ...(projectId ? { projectId } : {}),
  });

  return admin.app();
}

function cardsToFirestore(cards: { id: string; grid: string[][] }[]) {
  // Firestore does NOT allow nested arrays like string[][]
  // Store as flat list + size
  return cards.map((c) => {
    const size = c.grid.length;
    const gridFlat = c.grid.flat();
    return { id: c.id, size, gridFlat };
  });
}

function buildCsv(cards: { id: string; grid: string[][] }[]) {
  // Simple roster: Card ID + 25 squares (including center)
  const header = ["card_id", ...Array.from({ length: 25 }, (_, i) => `sq_${i + 1}`)].join(",");
  const rows = cards.map((c) => {
    const flat = c.grid.flat().map((x) => `"${String(x).replace(/"/g, '""')}"`);
    return [`"${c.id}"`, ...flat].join(",");
  });
  return [header, ...rows].join("\n");
}

function newPackId() {
  // ✅ Always unique per request, even on warm serverless instances
  try {
    // Node 18+ (Vercel) supports crypto.randomUUID()
    return `pack_${crypto.randomUUID().slice(0, 12)}`;
  } catch {
    return `pack_${Date.now()}_${Math.random().toString(16).slice(2, 10)}`;
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as ReqBody;

    const title = String(body.title ?? "Harvest Heroes Bingo");
    const sponsorName = String(body.sponsorName ?? "");

    // accept qty or quantity
    const qty = clampQty(body.qty ?? body.quantity);

    // normalize + dedupe the pool
    const items = uniqCaseSensitive(normalizeItems(body.items));

    if (items.length < 24) {
      return NextResponse.json(
        { ok: false, error: `Need at least 24 pool items. Got ${items.length}.` },
        { status: 400 }
      );
    }

    // Create bingo pack (your lib controls uniqueness rules)
    const cardsPack = createBingoPack(items, qty);

    // ✅ Force a new packId every time (prevents "sticky" packId bugs)
    const forcedPackId = newPackId();
    const forcedCreatedAt = Date.now();

    // Banner: read /public/banners/current.png and convert to data-uri
    const bannerDataUri = await loadBannerAsDataUri(body.bannerImageUrl);

    // Render PDF buffer (no JSX in this file; use React.createElement)
    const pdfElement = React.createElement(BingoPackPdf as any, {
      cards: cardsPack.cards,
      title,
      sponsorName,
      bannerImageUrl: bannerDataUri,
    });

    const pdfBuffer = await renderToBuffer(pdfElement);

    const pdfBase64 = Buffer.from(pdfBuffer).toString("base64");
    const csv = buildCsv(cardsPack.cards);

    // Save pack to Firestore
    const app = getAdminApp();
    const db = admin.firestore(app);

    const firestorePack = {
      // ✅ store the forced pack id
      packId: forcedPackId,
      createdAt: forcedCreatedAt,
      title,
      sponsorName,
      usedItems: cardsPack.usedItems ?? [],
      weeklyPool: cardsPack.weeklyPool ?? [],
      cards: cardsToFirestore(cardsPack.cards),
    };

    // ✅ write using forced pack id, not the possibly-sticky one
    await db.collection("bingoPacks").doc(forcedPackId).set(firestorePack, { merge: true });

    return NextResponse.json({
      ok: true,
      pdfBase64,
      csv,
      createdAt: forcedCreatedAt,
      // ✅ requestKey must match the pack id your UI stores/uses
      requestKey: forcedPackId,
      usedItems: cardsPack.usedItems ?? [],
      cardsPack: {
        // ✅ return the forced pack id so caller/winners follow the latest pack
        packId: forcedPackId,
        createdAt: forcedCreatedAt,
        title,
        sponsorName,
        cards: cardsPack.cards,
      },
    });
  } catch (e: any) {
    const msg = e?.message || "Generate failed.";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
