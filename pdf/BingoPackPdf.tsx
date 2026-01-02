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

  // Header + sponsor controls
  title?: string;                 // e.g. "Grower Bingo"
  sponsorName?: string;           // e.g. "Chronic Worm Genetics"
  bannerImageUrl?: string;        // absolute URL or /public path (needs assetBaseUrl)
  sponsorLogoUrl?: string;        // absolute URL or /public path (needs assetBaseUrl)

  // Weekly styling
  backgroundImageUrl?: string;    // absolute URL or /public path (needs assetBaseUrl)

  // IMPORTANT for server-side PDF render:
  // If you use /icons/... or /uploads/... this must be the site origin:
  // e.g. "https://grower-bingo-generator.vercel.app"
  assetBaseUrl?: string;
};

const PAGE_PADDING = 36;
const CONTENT_WIDTH = 540;
const CONTENT_HEIGHT = 720;

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

// If ICON_MAP contains an emoji, allow it (tight filter)
function getPrintableEmoji(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const v = value.trim();
  if (!v) return null;

  // If it looks like a file path/url, it's not an emoji
  if (v.includes("/") || v.includes(".") || v.startsWith("http")) return null;

  // Block CJK ranges (the “mystery character” issue)
  if (/[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/.test(v)) return null;

  // Reject letters/numbers
  if (/[\p{L}\p{N}]/u.test(v)) return null;

  // Keep it short
  if (v.length <= 4) return v;

  return null;
}

function resolveAsset(urlOrPath?: string, assetBaseUrl?: string) {
  if (!urlOrPath) return null;
  const v = urlOrPath.trim();
  if (!v) return null;

  // Already absolute
  if (v.startsWith("http://") || v.startsWith("https://") || v.startsWith("data:")) return v;

  // Looks like a /public path
  if (v.startsWith("/")) {
    // Needs base URL to become absolute for server-side rendering
    if (!assetBaseUrl) return null;
    return `${assetBaseUrl}${v}`;
  }

  // Otherwise treat as invalid
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
  const inferred = cards?.[0]?.grid?.length ?? 5;
  const gridSize = (gridSizeProp ?? inferred) as number;

  const cellSize = clamp(Math.floor(CONTENT_WIDTH / gridSize), 70, 110);
  const gridWidth = cellSize * gridSize;
  const gridHeight = cellSize * gridSize;

  const topPad = Math.max(0, Math.floor((CONTENT_HEIGHT - 120 - gridHeight) / 2));

  const styles = StyleSheet.create({
    page: {
      paddingTop: PAGE_PADDING,
      paddingBottom: PAGE_PADDING,
      paddingLeft: PAGE_PADDING,
      paddingRight: PAGE_PADDING,
      fontSize: 10,
      fontFamily: "Helvetica",
      position: "relative",
    },

    // Background behind everything
    pageBg: {
      position: "absolute",
      left: 0,
      top: 0,
      width: "100%",
      height: "100%",
      opacity: 0.18, // keep subtle so text is readable
    },

    header: {
      width: "100%",
      alignItems: "center",
      marginBottom: 10,
    },

    bannerWrap: {
      width: "100%",
      borderRadius: 10,
      overflow: "hidden",
      marginBottom: 10,
    },

    banner: {
      width: "100%",
      height: 70,
      objectFit: "cover",
    },

    headerRow: {
      width: "100%",
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },

    titleBlock: {
      flexGrow: 1,
      paddingRight: 10,
    },

    title: {
      fontSize: 18,
      fontWeight: 700,
      marginBottom: 2,
    },

    sub: {
      fontSize: 10,
      color: "#444",
    },

    sponsor: {
      fontSize: 10,
      color: "#111",
      marginTop: 2,
    },

    sponsorLogo: {
      width: 54,
      height: 54,
      objectFit: "contain",
    },

    spacer: {
      height: topPad,
    },

    gridWrap: {
      width: gridWidth,
      height: gridHeight,
      alignSelf: "center",
      borderWidth: 2,
      borderColor: "#000",
      backgroundColor: "rgba(255,255,255,0.88)", // keeps squares readable even with bg
    },

    row: {
      flexDirection: "row",
      width: gridWidth,
      height: cellSize,
    },

    cell: {
      width: cellSize,
      height: cellSize,
      borderRightWidth: 1,
      borderBottomWidth: 1,
      borderColor: "#000",
      alignItems: "center",
      justifyContent: "center",
      padding: 6,
      backgroundColor: "#fff", // ✅ makes squares clean (no background inside)
    },

    cellLastCol: { borderRightWidth: 0 },
    cellLastRow: { borderBottomWidth: 0 },

    cellInner: {
      width: "100%",
      height: "100%",
      alignItems: "center",
      justifyContent: "center",
    },

    iconImage: {
      width: 28,
      height: 28,
      marginBottom: 4,
      objectFit: "contain",
    },

    iconEmoji: {
      fontSize: 18,
      marginBottom: 4,
    },

    label: {
      fontSize: 10,
      textAlign: "center",
      lineHeight: 1.15,
    },

    footer: {
      marginTop: 14,
      alignItems: "center",
      color: "#666",
      fontSize: 9,
    },
  });

  const bannerSrc = resolveAsset(bannerImageUrl, assetBaseUrl);
  const sponsorLogoSrc = resolveAsset(sponsorLogoUrl, assetBaseUrl);
  const bgSrc = resolveAsset(backgroundImageUrl, assetBaseUrl);

  return (
    <Document>
      {cards.map((card) => (
        <Page key={card.id} size="LETTER" style={styles.page}>
          {/* ✅ Background image (optional) */}
          {bgSrc ? <Image src={bgSrc} style={styles.pageBg} /> : null}

          <View style={styles.header}>
            {/* ✅ Banner image (optional) */}
            {bannerSrc ? (
              <View style={styles.bannerWrap}>
                <Image src={bannerSrc} style={styles.banner} />
              </View>
            ) : null}

            <View style={styles.headerRow}>
              <View style={styles.titleBlock}>
                <Text style={styles.title}>{title}</Text>
                <Text style={styles.sub}>Card ID: {card.id}</Text>
                {sponsorName ? <Text style={styles.sponsor}>Sponsor: {sponsorName}</Text> : null}
              </View>

              {/* ✅ Sponsor logo (optional) */}
              {sponsorLogoSrc ? <Image src={sponsorLogoSrc} style={styles.sponsorLogo} /> : null}
            </View>
          </View>

          <View style={styles.spacer} />

          <View style={styles.grid
