// app/api/generate/route.ts
import { NextResponse } from "next/server";
import admin from "firebase-admin";
import { renderToBuffer } from "@react-pdf/renderer";
import React from "react";

import { createBingoPack } from "@/lib/bingo";
import BingoPackPdf from "@/pdf/BingoPackPdf";

type ServiceAccountJson = {
  project_id?: string;
  client_email?: string;
  private_key?: string;
};

function getFirebaseCreds(): admin.ServiceAccount {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error("Missing FIREBASE_SERVICE_ACCOUNT_JSON env var.");

  const parsed = JSON.parse(raw) as ServiceAccountJson;

  // Normalize private_key newlines if needed (Vercel env var often stores \n literally)
  if (parsed.private_key && parsed.private_key.includes("\\n")) {
    parsed.private_key = parsed.private_key.replace(/\\n/g, "\n");
  }

  if (!parsed.client_email || !parsed.private_key) {
    throw new Error("Service account JSON missing client_email or private_key.");
  }

  return {
    projectId: process.env.FIREBASE_PROJECT_ID || parsed.project_id,
    clientEmail: parsed.client_email,
    privateKey: parsed.private_key,
  } as admin.ServiceAccount;
}

function getAdminApp(): admin.app.App {
  if (admin.apps.length) return admin.app();

  const creds = getFirebaseCreds();
  return admin.initializeApp({
    credential: admin.credential.cert(creds),
  });
}

function normalizeLines(text: string): string[] {
  return text
    .split(/\r?\n/g)
    .map((s) => s.trim())
    .filter(Boolean);
}

function toInt(v: unknown, fallback: number) {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    const title =
      typeof body.title === "string" ? body.title.trim() : "Harvest Heroes Bingo";
    const sponsorName = typeof body.sponsorName === "string" ? body.sponsorName.trim() : "";
    const bannerImageUrl =
      typeof body.bannerImageUrl === "string" ? body.bannerImageUrl.trim() : "";
    const sponsorLogoUrl =
      typeof body.sponsorLogoUrl === "string" ? body.sponsorLogoUrl.trim() : "";

    const gridSize = 5;
    const qty = Math.min(Math.max(toInt(body.qty ?? body.quantity, 25), 1), 500);

    const items: string[] = Array.isArray(body.items)
      ? body.items.map((x: any) => String(x).trim()).filter(Boolean)
      : typeof body.itemsText === "string"
        ? normalizeLines(body.itemsText)
        : typeof body.items === "string"
          ? normalizeLines(body.items)
          : [];

    if (items.length < 24) {
      return NextResponse.json(
        { ok: false, error: "Need at least 24 items (one per line)." },
        { status: 400 }
      );
    }

    const centerLabel =
      typeof body.centerLabel === "string" && body.centerLabel.trim()
        ? body.centerLabel.trim()
        : "Joe’s Grows";

    const pack = createBingoPack(items, qty);

    // Firestore does not allow nested arrays (string[][]),
    // so store each grid as a flat array plus metadata.
    const cardsForDb = pack.cards.map((c) => ({
      id: c.id,
      gridFlat: c.grid.flat(),
      gridSize,
      centerLabel,
    }));

    // IMPORTANT: No JSX in route.ts. Use React.createElement.
    const pdfElement = React.createElement(BingoPackPdf as any, {
      title,
      sponsorName,
      bannerImageUrl,
      sponsorLogoUrl,
      centerLabel,
      cards: pack.cards,
      gridSize,
    });

    const pdfBuffer = await renderToBuffer(pdfElement as any);
    const pdfBase64 = Buffer.from(pdfBuffer).toString("base64");
    const createdAt = Date.now();

    const app = getAdminApp();
    const db = admin.firestore(app);

    const packDoc = {
      createdAt,
      title,
      sponsorName,
      bannerImageUrl,
      sponsorLogoUrl,
      centerLabel,
      gridSize,
      qty,
      weeklyPool: pack.weeklyPool,
      usedItems: pack.usedItems,
      cards: cardsForDb,
    };

    const ref = await db.collection("packs").add(packDoc);

    const csv = ["cardId"].concat(pack.cards.map((c) => c.id)).join("\n");

    return NextResponse.json({
      ok: true,
      packId: ref.id,
      createdAt,
      pdfBase64,
      csv,
      usedItems: pack.usedItems,
      weeklyPool: pack.weeklyPool,
      cards: pack.cards,
    });
  } catch (err: any) {
    const msg = err?.message ? String(err.message) : "Unknown error";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

export async function GET() {
  try {
    getAdminApp();
    return NextResponse.json({ ok: true, at: Date.now() });
  } catch (err: any) {
    const msg = err?.message ? String(err.message) : "Unknown error";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
