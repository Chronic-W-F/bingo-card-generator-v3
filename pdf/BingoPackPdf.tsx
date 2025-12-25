// pdf/BingoPackPdf.tsx
import React from "react";
import {
  Document,
  Page,
  View,
  Text,
  StyleSheet,
  Image,
} from "@react-pdf/renderer";
import { ICON_MAP } from "@/lib/iconMap";

type BingoCard = {
  id: string;
  grid: string[][];
};

type Props = {
  cards: BingoCard[];

  /**
   * Newer API route props (preferred)
   */
  title?: string;
  sponsorName?: string;
  bannerImageUrl?: string | null;   // top banner
  sponsorLogoUrl?: string | null;   // reserved for future center-logo logic if you want

  /**
   * Backwards compatible (older prop name)
   */
  sponsorImage?: string;            // top banner (older name)

  accentColor?: string;             // "#2ecc71"
  iconMap?: Record<string, string>; // item -> data URI (recommended)
};

export default function BingoPackPdf({
  cards,

  // New props
  title,
  sponsorName,
  bannerImageUrl,
  sponsorLogoUrl, // currently unused, but kept so your route can pass it safely

  // Old prop
  sponsorImage,

  accentColor = "#000000",
  iconMap,
}: Props) {
  // Prefer new bannerImageUrl, fall back to sponsorImage
  const bannerSrc = bannerImageUrl || sponsorImage || null;

  const styles = StyleSheet.create({
    page: {
      padding: 24,
      fontSize: 10,
      fontFamily: "Helvetica",
    },

    header: {
      marginBottom: 12,
      textAlign: "center",
      alignItems: "center",
    },

    sponsorBanner: {
      width: "100%",
      height: 50,
      objectFit: "contain",
      marginBottom: 6,
    },

    title: {
      fontSize: 20,
      fontWeight: "bold",
      color: accentColor,
    },

    subTitle: {
      fontSize: 10,
      marginTop: 2,
      color: accentColor,
      opacity: 0.9,
    },

    cardId: {
      fontSize: 9,
      marginTop: 4,
      color: accentColor,
    },

    grid: {
      display: "flex",
      flexDirection: "row",
      flexWrap: "wrap",
      width: "100%",
      borderWidth: 2,
      borderColor: accentColor,
    },

    cell: {
      width: "20%",
      height: 80,
      borderWidth: 1,
      borderColor: accentColor,
      alignItems: "center",
      justifyContent: "center",
      padding: 4,
      position: "relative",
    },

    cellText: {
      fontSize: 9,
      textAlign: "center",
      zIndex: 2,
    },

    // ✅ No transform; numeric center inside an 80px tall cell:
    // icon size = 36, so centered top/left = (80-36)/2 = 22
    // width is cell-dependent, but 22 looks centered enough visually as a watermark
    watermarkIcon: {
      position: "absolute",
      width: 36,
      height: 36,
      opacity: 0.12,
      top: 22,
      left: 22,
      zIndex: 1,
    },
  });

  const displayTitle = (title && title.trim()) ? title.trim() : "Grower Bingo";
  const displaySponsor = (sponsorName && sponsorName.trim()) ? sponsorName.trim() : "";

  return (
    <Document>
      {cards.map((card) => (
        <Page size="LETTER" style={styles.page} key={card.id}>
          {/* Header */}
          <View style={styles.header}>
            {bannerSrc ? (
              <Image src={bannerSrc} style={styles.sponsorBanner} />
            ) : null}

            <Text style={styles.title}>{displayTitle}</Text>

            {displaySponsor ? (
              <Text style={styles.subTitle}>{displaySponsor}</Text>
            ) : null}

            <Text style={styles.cardId}>Card ID: {card.id}</Text>
          </View>

          {/* Bingo Grid */}
          <View style={styles.grid}>
            {card.grid.flat().map((item, idx) => {
              const iconSrc = (iconMap && iconMap[item]) || ICON_MAP[item];

              return (
                <View style={styles.cell} key={`${card.id}-${idx}`}>
                  {iconSrc ? (
                    <Image src={iconSrc} style={styles.watermarkIcon} />
                  ) : null}
                  <Text style={styles.cellText}>{item}</Text>
                </View>
              );
            })}
          </View>
        </Page>
      ))}
    </Document>
  );
}
