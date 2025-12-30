// pdf/BingoPackPdf.tsx
import React from "react";
import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";

export type BingoCard = {
  id: string;
  grid: string[][];
};

type Props = {
  cards: BingoCard[];
};

const styles = StyleSheet.create({
  page: {
    padding: 24,
    fontSize: 10,
    fontFamily: "Helvetica",
  },
  card: {
    marginBottom: 24,
  },
  header: {
    textAlign: "center",
    marginBottom: 12,
    fontSize: 14,
    fontWeight: "bold",
  },
  grid: {
    display: "flex",
    flexDirection: "column",
    borderWidth: 1,
    borderColor: "#000",
  },
  row: {
    flexDirection: "row",
  },
  cell: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#000",
    minHeight: 60,
    alignItems: "center",
    justifyContent: "center",
    padding: 4,
  },
  cellText: {
    textAlign: "center",
    fontSize: 9,
  },
  footer: {
    marginTop: 8,
    textAlign: "center",
    fontSize: 8,
    color: "#555",
  },
});

const BingoPackPdf: React.FC<Props> = ({ cards }) => {
  return (
    <Document>
      {cards.map((card) => (
        <Page size="LETTER" style={styles.page} key={card.id}>
          <View style={styles.card}>
            <Text style={styles.header}>Grower Bingo</Text>

            <View style={styles.grid}>
              {card.grid.map((row, rIdx) => (
                <View style={styles.row} key={rIdx}>
                  {row.map((cell, cIdx) => (
                    <View style={styles.cell} key={cIdx}>
                      <Text style={styles.cellText}>{cell}</Text>
                    </View>
                  ))}
                </View>
              ))}
            </View>

            <Text style={styles.footer}>Card ID: {card.id}</Text>
          </View>
        </Page>
      ))}
    </Document>
  );
};

export default BingoPackPdf;
