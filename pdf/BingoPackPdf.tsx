// pdf/BingoPackPdf.tsx
import React from "react";
import { Document, Page, View, Text, StyleSheet, Image } from "@react-pdf/renderer";

type BingoCard = {
  id: string;
  grid: string[][];
};

type Props = {
  cards: BingoCard[];
  gridSize?: number;
  title?: string;
  sponsorName?: string;

  // Banner image as a data URI (preferred) or https URL.
  // Your API already converts /public/banners/current.png into a data URI.
  bannerImage?: string;

  // If you still pass a URL from client sometimes, keep this too (optional).
  // bannerImageUrl?: string;
};

const PAGE_PADDING = 36;
const CONTENT_WIDTH = 540;

// Banner tuning: readable and never cropped
const BANNER_HEIGHT = 70;
const BANNER_MARGIN_BOTTOM = 10;

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export default function BingoPackPdf({
  cards,
  gridSize: gridSizeProp,
  title,
  sponsorName,
  bannerImage,
}: Props) {
  const inferred = cards?.[0]?.grid?.length ?? 5;
  const gridSize = (gridSizeProp ?? inferred) as number;

  const cellSize = clamp(Math.floor(CONTENT_WIDTH / gridSize), 70, 110);
  const gridWidth = cellSize * gridSize;
  const gridHeight = cellSize * gridSize;

  const styles = StyleSheet.create({
    page: {
      paddingTop: PAGE_PADDING,
      paddingBottom: PAGE_PADDING,
      paddingLeft: PAGE_PADDING,
      paddingRight: PAGE_PADDING,
      fontSize: 10,
      fontFamily: "Helvetica",
    },

    header: {
      alignItems: "center",
      marginBottom: 12,
    },

    bannerWrap: {
      width: "100%",
      height: BANNER_HEIGHT,
      marginBottom: BANNER_MARGIN_BOTTOM,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#ffffff",
    },

    banner: {
      width: "100%",
      height: "100%",
      objectFit: "contain",
    },

    title: {
      fontSize: 16,
      fontWeight: "bold",
      marginBottom: 2,
    },

    sub: {
      fontSize: 10,
      color: "#444",
      marginBottom: 2,
    },

    gridWrap: {
      width: gridWidth,
      height: gridHeight,
      alignSelf: "center",
      borderWidth: 2,
      borderColor: "#000",
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
    },

    cellLastCol: {
      borderRightWidth: 0,
    },

    cellLastRow: {
      borderBottomWidth: 0,
    },

    label: {
      fontSize: 10,
      textAlign: "center",
      lineHeight: 1.15,
    },

    footer: {
      marginTop: 12,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },

    footerLeft: {
      fontSize: 9,
      color: "#444",
    },

    footerRight: {
      fontSize: 9,
      color: "#111",
      fontWeight: "bold",
    },
  });

  return (
    <Document>
      {cards.map((card) => (
        <Page key={card.id} size="LETTER" style={styles.page}>
          <View style={styles.header}>
            {bannerImage ? (
              <View style={styles.bannerWrap}>
                <Image src={bannerImage} style={styles.banner as any} />
              </View>
            ) : null}

            <Text style={styles.title}>{title || "Harvest Heroes Bingo"}</Text>

            {/* NEW: Lights Out label (blackout rules) */}
            <Text style={styles.sub}>Lights Out Bingo (Blackout)</Text>

            {sponsorName ? <Text style={styles.sub}>Sponsor: {sponsorName}</Text> : null}
          </View>

          <View style={styles.gridWrap}>
            {card.grid.map((row, rIdx) => {
              const isLastRow = rIdx === card.grid.length - 1;

              return (
                <View key={`r-${card.id}-${rIdx}`} style={styles.row}>
                  {row.map((label, cIdx) => {
                    const isLastCol = cIdx === row.length - 1;

                    const cellStyle = [
                      styles.cell,
                      isLastCol ? styles.cellLastCol : null,
                      isLastRow ? styles.cellLastRow : null,
                    ];

                    return (
                      <View key={`c-${card.id}-${rIdx}-${cIdx}`} style={cellStyle as any}>
                        <Text style={styles.label}>{label}</Text>
                      </View>
                    );
                  })}
                </View>
              );
            })}
          </View>

          {/* Footer: move Card ID to bottom. Remove the old “10 icons” text entirely. */}
          <View style={styles.footer}>
            <Text style={styles.footerLeft}>Text labels are the source of truth.</Text>
            <Text style={styles.footerRight}>Card ID: {card.id}</Text>
          </View>
        </Page>
      ))}
    </Document>
  );
}
