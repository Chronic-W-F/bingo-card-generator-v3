// pdf/BingoPackPdf.tsx
import React from "react";
import { Document, Page, View, Text, StyleSheet, Image } from "@react-pdf/renderer";
import { ICON_MAP } from "@/lib/iconMap";

type BingoCard = {
  id: string;
  grid: string[][];
};

type Props = {
  cards: BingoCard[];
  gridSize?: number;

  // Optional (weekly style)
  title?: string;
  sponsorName?: string;
  bannerImageUrl?: string;
  sponsorLogoUrl?: string;
  backgroundImageUrl?: string;

  // REQUIRED if you use "/icons/..." or any "/public" path:
  // e.g. "https://grower-bingo-generator.vercel.app"
  assetBaseUrl?: string;
};

const PAGE_PADDING = 36;
const CONTENT_WIDTH = 540;
const CONTENT_HEIGHT = 720;

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function resolveAsset(urlOrPath?: string, assetBaseUrl?: string) {
  if (!urlOrPath) return null;
  const v = urlOrPath.trim();
  if (!v) return null;

  if (v.startsWith("http://") || v.startsWith("https://") || v.startsWith("data:")) return v;

  if (v.startsWith("/")) {
    if (!assetBaseUrl) return null;
    return `${assetBaseUrl}${v}`;
  }

  return null;
}

// Optional: allow safe emoji if you ever put emoji values in ICON_MAP
function getPrintableEmoji(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const v = value.trim();
  if (!v) return null;

  if (v.includes("/") || v.includes(".") || v.startsWith("http")) return null;

  // block “mystery characters”
  if (/[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/.test(v)) return null;

  // reject letters/numbers
  if (/[\p{L}\p{N}]/u.test(v)) return null;

  // keep short
  if (v.length <= 4) return v;

  return null;
}

export default function BingoPackPdf({
  cards,
  gridSize: gridSizeProp,
  title = "Grower Bingo",
  sponsorName,
  bannerImageUrl,
  sponsorLogoUrl,
  backgroundImageUrl,
  assetBaseUrl,
}: Props) {
  const e = React.createElement;

  const inferred = cards?.[0]?.grid?.length
