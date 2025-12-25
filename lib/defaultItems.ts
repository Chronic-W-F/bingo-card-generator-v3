// lib/defaultItems.ts
// Single source of truth for defaults used by BOTH pages.

import { BINGO_ITEMS } from "@/lib/bingo";

export const DEFAULT_POOL: string[] = BINGO_ITEMS;
export const DEFAULT_POOL_TEXT: string = BINGO_ITEMS.join("\n");
