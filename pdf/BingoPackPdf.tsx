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
  grid: string[][]; // 5x5 with FREE in center
};

type Props = {
  cards: BingoCard[];
  sponsorImage?: string;   // "/sponsors/joes-grows.png"
  accentColor?: string;    // "#2ecc71"
};

export default function BingoPackPdf({
  cards,
  sponsorImage,
  accentColor = "#000000",
}: Props) {
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

  return (
    <Document>
      {cards.map((card) => (
        <Page size="LETTER" style={styles.page} key={card.id}>
          {/* Header */}
          <View style={styles.header}>
            {sponsorImage && (
              <Image src={sponsorImage} style={styles.sponsorBanner} />
            )}

            <Text style={styles.title}>Grower Bingo</Text>
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
