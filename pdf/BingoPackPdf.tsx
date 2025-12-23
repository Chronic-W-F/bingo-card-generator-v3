import { Document, Page, View, Text, StyleSheet, Image } from "@react-pdf/renderer";
import { ICON_MAP } from "@/lib/iconMap";

type BingoCard = {
  id: string;
  grid: string[][]; // 5x5 with FREE in center
};

type Props = {
  cards: BingoCard[];
  sponsorName?: string;
};

export default function BingoPackPdf({ cards, sponsorName }: Props) {
  return (
    <Document>
      {cards.map((card) => (
        <Page size="LETTER" style={styles.page} key={card.id}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Grower Bingo</Text>
            {sponsorName && (
              <Text style={styles.sponsor}>Sponsored by {sponsorName}</Text>
            )}
            <Text style={styles.cardId}>Card ID: {card.id}</Text>
          </View>

          {/* Bingo Grid */}
          <View style={styles.grid}>
            {card.grid.flat().map((item, idx) => {
              const iconSrc = ICON_MAP[item];

              return (
                <View style={styles.cell} key={idx}>
                  {/* Watermark Icon */}
                  {iconSrc && (
                    <Image
                      src={iconSrc}
                      style={styles.watermarkIcon}
                    />
                  )}

                  {/* Cell Text */}
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

const styles = StyleSheet.create({
  page: {
    padding: 24,
    fontSize: 10,
    fontFamily: "Helvetica",
  },

  header: {
    marginBottom: 12,
    textAlign: "center",
  },

  title: {
    fontSize: 20,
    fontWeight: "bold",
  },

  sponsor: {
    fontSize: 12,
    marginTop: 2,
  },

  cardId: {
    fontSize: 9,
    marginTop: 4,
  },

  grid: {
    display: "flex",
    flexDirection: "row",
    flexWrap: "wrap",
    width: "100%",
    borderWidth: 2,
    borderColor: "#000",
  },

  cell: {
    width: "20%",
    height: 80,
    borderWidth: 1,
    borderColor: "#000",
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

  watermarkIcon: {
    position: "absolute",
    width: 36,
    height: 36,
    opacity: 0.12,
    top: "50%",
    left: "50%",
    transform: "translate(-18px, -18px)",
    zIndex: 1,
  },
});
