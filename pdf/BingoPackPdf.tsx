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
  sponsorImage?: string; // data URI recommended, but can be "/sponsors/..."
  accentColor?: string;  // "#2ecc71"
  iconMap?: Record<string, string>; // item -> data URI (recommended)
};

export default function BingoPackPdf({
  cards,
  sponsorImage,
  accentColor = "#000000",
  iconMap,
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
      // ✅ Type-safe for older react-pdf Transform typings
      transform: [{
