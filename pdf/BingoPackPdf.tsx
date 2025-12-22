// pdf/BingoPackPdf.tsx
import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
  pdf,
} from "@react-pdf/renderer";

export type BingoGrid = string[][];
export type BingoCard = { id: string; grid: BingoGrid };

export type BingoPack = {
  packTitle: string;
  sponsorName: string;
  bannerUrl?: string;
  logoUrl?: string;
  cards: BingoCard[];
};

const styles = StyleSheet.create({
  page: { padding: 24, fontSize: 10 },
  headerWrap: { marginBottom: 10 },
  headerBar: {
    backgroundColor: "#000",
    padding: 8,
    borderRadius: 6,
  },
  headerTitle: { color: "#fff", fontSize: 14, fontWeight: "bold" },
  headerSponsor: { color: "#ddd", fontSize: 9 },
  cardIdRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  grid: {
    borderWidth: 1,
    borderColor: "#333",
  },
  row: {
    flexDirection: "row",
  },
  cell: {
    flex: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#333",
    alignItems: "center",
    justifyContent: "center",
    height: 48,
    padding: 2,
  },
  cellText: {
    textAlign: "center",
    fontSize: 9,
  },
  freeCell: {
    backgroundColor: "#000",
  },
  freeText: {
    color: "#fff",
    fontWeight: "bold",
  },
  footer: {
    marginTop: 6,
    fontSize: 8,
    color: "#555",
  },
});

function BingoPackDoc({ pack }: { pack: BingoPack }) {
  return (
    <Document>
      {pack.cards.map((card) => (
        <Page key={card.id} size="LETTER" style={styles.page}>
          <View style={styles.headerWrap}>
            <View style={styles.headerBar}>
              <Text style={styles.headerTitle}>{pack.packTitle}</Text>
              <Text style={styles.headerSponsor}>
                Sponsor: {pack.sponsorName}
              </Text>
            </View>
          </View>

          <View style={styles.cardIdRow}>
            <Text>Card ID: {card.id}</Text>
            <Text>5×5 • Center is FREE</Text>
          </View>

          <View style={styles.grid}>
            {card.grid.map((row, rIdx) => (
              <View key={rIdx} style={styles.row}>
                {row.map((cell, cIdx) => {
                  const isFree = cell === "FREE";
                  return (
                    <View
                      key={cIdx}
                      style={[
                        styles.cell,
                        cIdx === 4 ? undefined : {},
                        rIdx === 4 ? undefined : {},
                        isFree ? styles.freeCell : undefined,
                      ]}
                    >
                      <Text
                        style={[
                          styles.cellText,
                          isFree ? styles.freeText : undefined,
                        ]}
                      >
                        {isFree ? `${pack.sponsorName}\nFREE` : cell}
                      </Text>
                    </View>
                  );
                })}
              </View>
            ))}
          </View>

          <Text style={styles.footer}>
            Verification: Screenshot your card with Card ID visible when you
            claim bingo.
          </Text>
        </Page>
      ))}
    </Document>
  );
}

/**
 * ✅ THIS IS THE KEY
 * We explicitly return a Buffer — nothing else
 */
export async function renderBingoPackPdf(
  pack: BingoPack
): Promise<Buffer> {
  const doc = <BingoPackDoc pack={pack} />;
  const instance = pdf(doc);
  const buffer = await instance.toBuffer();
  return buffer;
}
