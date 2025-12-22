// pdf/BingoPackPdf.tsx
import React from "react";
import { Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer";
import type { BingoCard } from "@/lib/bingo";

type Props = {
  packTitle: string;
  sponsorName: string;
  bannerUrl?: string;
  logoUrl?: string;
  cards: BingoCard[];
};

const styles = StyleSheet.create({
  page: { padding: 20, fontSize: 10 },
  headerWrap: { marginBottom: 10 },
  headerBar: {
    backgroundColor: "#111",
    borderRadius: 10,
    padding: 10,
  },
  title: { color: "white", fontSize: 18, fontWeight: 700 },
  subtitle: { color: "white", fontSize: 10, marginTop: 3 },

  banner: { width: "100%", height: 60, marginTop: 10, borderRadius: 10, objectFit: "cover" },

  metaRow: { marginTop: 10, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cardId: { fontSize: 9, opacity: 0.85 },

  grid: { marginTop: 10, borderWidth: 1, borderColor: "#333" },
  row: { flexDirection: "row" },

  cell: {
    flex: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#333",
    alignItems: "center",
    justifyContent: "center",
    height: 64,
    padding: 6,
  },
  cellLastCol: { borderRightWidth: 0 },
  lastRowCell: { borderBottomWidth: 0 },

  freeCell: { backgroundColor: "#f2f2f2" },
  freeLogo: { width: 36, height: 36, marginBottom: 4, objectFit: "contain" },
  cellText: { textAlign: "center" },

  footer: { marginTop: 8, fontSize: 9, opacity: 0.85 },
});

export default function BingoPackPdf(props: Props) {
  const { packTitle, sponsorName, bannerUrl, logoUrl, cards } = props;

  return (
    <Document>
      {cards.map((card) => (
        <Page key={card.id} size="LETTER" style={styles.page}>
          <View style={styles.headerWrap}>
            <View style={styles.headerBar}>
              <Text style={styles.title}>{packTitle}</Text>
              <Text style={styles.subtitle}>Sponsor: {sponsorName}</Text>
            </View>

            {bannerUrl ? <Image style={styles.banner} src={bannerUrl} /> : null}

            <View style={styles.metaRow}>
              <Text style={styles.cardId}>Card ID: {card.id}</Text>
              <Text style={styles.cardId}>5×5 • Center is FREE</Text>
            </View>
          </View>

          <View style={styles.grid}>
            {card.grid.map((row, rIdx) => (
              <View key={rIdx} style={styles.row}>
                {row.map((cell, cIdx) => {
                  const isLastCol = cIdx === 4;
                  const isLastRow = rIdx === 4;
                  const isFree = cell.text === "FREE";

                  // IMPORTANT: no undefined/null in the style array
                  const styleArr: any[] = [styles.cell];
                  if (isLastCol) styleArr.push(styles.cellLastCol);
                  if (isLastRow) styleArr.push(styles.lastRowCell);
                  if (isFree) styleArr.push(styles.freeCell);

                  return (
                    <View key={cIdx} style={styleArr}>
                      {isFree && logoUrl ? <Image style={styles.freeLogo} src={logoUrl} /> : null}
                      <Text style={styles.cellText}>{cell.text}</Text>
                    </View>
                  );
                })}
              </View>
            ))}
          </View>

          <Text style={styles.footer}>
            Verification: Screenshot your card with your Card ID visible when you claim bingo.
          </Text>
        </Page>
      ))}
    </Document>
  );
}
