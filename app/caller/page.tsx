// app/caller/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";

const SHARED_POOL_KEY = "grower-bingo:pool:v1";

// Caller state now becomes PER-PACK when packId is present
function callerStateKey(packId?: string | null) {
  return packId ? `grower-bingo:caller:v1:${packId}` : "grower-bingo:caller:v1";
}

function drawsStorageKey(packId: string) {
  return `grower-bingo:draws:${packId}`;
}

type CallerState = {
  poolText: string;
  deckSize: number;
  drawSize: number;
  deckSizeInput: string;
  drawSizeInput: string;
  round: number;
  deck: string[];
  called: string[];
  draws: string[][];
};

function normalizeLines(text: string): string[] {
  return text
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function safeParseInt(s: string, fallback: number) {
  const n = Number.parseInt(s, 10);
  return Number.isFinite(n) ? n : fallback;
}

function toWinnersDrawText(draws: string[][]) {
  // Each round becomes "Day N:"
  // This matches your Winners parser (Day 1:, Day 2:, etc.)
  return draws
    .map((batch, idx) => {
      const day = idx + 1;
      const lines = batch.map((x) => x.trim()).filter(Boolean);
      return [`Day ${day}:`, ...lines, ""].join("\n");
    })
    .join("\n")
    .trim();
}

export default function CallerPage() {
  const [packId, setPackId] = useState<string>("");

  const [poolText, setPoolText] = useState<string>("");

  const poolLines = useMemo(() => normalizeLines(poolText), [poolText]);
  const poolCount = poolLines.length;

  // numeric state
  const [deckSize, setDeckSize] = useState<number>(50);
  const [drawSize, setDrawSize] = useState<number>(10);

  // input strings
  const [deckSizeInput, setDeckSizeInput] = useState<string>("50");
  const [drawSizeInput, setDrawSizeInput] = useState<string>("10");

  const [round, setRound] = useState<number>(0);
  const [deck, setDeck] = useState<string[]>([]);
  const [called, setCalled] = useState<string[]>([]);
  const [draws, setDraws] = useState<string[][]>([]);

  // Read packId from query string (?packId=...)
  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      const pid = url.searchParams.get("packId") || "";
      setPackId(pid);
    } catch {
      setPackId("");
    }
  }, []);

  // ---------- Load on mount (and when packId changes) ----------
  useEffect(() => {
    const shared = window.localStorage.getItem(SHARED_POOL_KEY);
    const sharedText = shared ?? "";

    const rawState = window.localStorage.getItem(callerStateKey(packId || null));

    if (rawState) {
      try {
        const s = JSON.parse(rawState) as CallerState;

        const restoredPoolText = (s.poolText ?? "").trim() || sharedText;
        setPoolText(restoredPoolText);

        const restoredDeckInput =
          (s.deckSizeInput ?? "").trim() || String(s.deckSize ?? 50);
        const restoredDrawInput =
          (s.drawSizeInput ?? "").trim() || String(s.drawSize ?? 10);
        setDeckSizeInput(restoredDeckInput);
        setDrawSizeInput(restoredDrawInput);

        const restoredDeck = Number.isFinite(s.deckSize) ? s.deckSize : 50;
        const restoredDraw = Number.isFinite(s.drawSize) ? s.drawSize : 10;
        setDeckSize(restoredDeck);
        setDrawSize(restoredDraw);

        setRound(Number.isFinite(s.round) ? s.round : 0);
        setDeck(Array.isArray(s.deck) ? s.deck : []);
        setCalled(Array.isArray(s.called) ? s.called : []);
        setDraws(Array.isArray(s.draws) ? s.draws : []);
        return;
      } catch {
        // fall through
      }
    }

    // no saved state
    setPoolText(sharedText);
    setDeckSize(50);
    setDrawSize(10);
    setDeckSizeInput("50");
    setDrawSizeInput("10");
    setRound(0);
    setDeck([]);
    setCalled([]);
    setDraws([]);
  }, [packId]);

  // ---------- Persist whenever anything changes ----------
  useEffect(() => {
    const state: CallerState = {
      poolText,
      deckSize,
      drawSize,
      deckSizeInput,
      drawSizeInput,
      round,
      deck,
      called,
      draws,
    };
    try {
      window.localStorage.setItem(callerStateKey(packId || null), JSON.stringify(state));
    } catch {
      // ignore
    }
  }, [packId, poolText, deckSize, drawSize, deckSize
