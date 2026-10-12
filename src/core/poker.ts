/**
 * 扑克牌型判定器。
 * 规则出处：docs/fact-table.md FT-CORE-01（15 种牌型与优先级，含 3 种隐藏牌型）。
 * Balatro 规则要点：
 * - 出牌 1-5 张，判定「所选牌中包含的最高牌型」；
 * - 牌型优先级（高→低）：同花五条 > 同花葫芦 > 五条 > 同花顺 > 四条 > 葫芦 >
 *   同花 > 顺子 > 三条 > 两对 > 一对 > 高牌；
 * - 顺子允许 A-2-3-4-5（A 当 1），不允许 K-A-2-3-4 环绕；
 * - <5 张不可能有顺子/同花；
 * - Wild（万能牌）花色可视为任意花色参与同花判定，但点数不变。
 */

import type { PlayingCard } from "./cards.js";
import { isFace, baseChips } from "./cards.js";

export type HandType =
  | "FLUSH_FIVE"
  | "FLUSH_HOUSE"
  | "FIVE_OF_A_KIND"
  | "STRAIGHT_FLUSH"
  | "FOUR_OF_A_KIND"
  | "FULL_HOUSE"
  | "FLUSH"
  | "STRAIGHT"
  | "THREE_OF_A_KIND"
  | "TWO_PAIR"
  | "PAIR"
  | "HIGH_CARD";

export const HAND_TYPE_ORDER: readonly HandType[] = [
  "FLUSH_FIVE",
  "FLUSH_HOUSE",
  "FIVE_OF_A_KIND",
  "STRAIGHT_FLUSH",
  "FOUR_OF_A_KIND",
  "FULL_HOUSE",
  "FLUSH",
  "STRAIGHT",
  "THREE_OF_A_KIND",
  "TWO_PAIR",
  "PAIR",
  "HIGH_CARD",
] as const;

/** 每种牌型用几张牌参与判定（用于展示与部分小丑条件） */
export function handTypeCardCount(type: HandType): number {
  switch (type) {
    case "FLUSH_FIVE":
    case "FIVE_OF_A_KIND":
      return 5;
    case "FLUSH_HOUSE":
    case "FULL_HOUSE":
      return 5;
    case "STRAIGHT_FLUSH":
    case "FLUSH":
    case "STRAIGHT":
      return 5;
    case "FOUR_OF_A_KIND":
      return 4;
    case "THREE_OF_A_KIND":
      return 3;
    case "TWO_PAIR":
      return 4;
    case "PAIR":
      return 2;
    case "HIGH_CARD":
      return 1;
  }
}

/** 所选牌中是否含人头牌（J/Q/K） */
export function containsFace(cards: readonly PlayingCard[]): boolean {
  return cards.some((c) => isFace(c));
}

function isFlush5(cards: readonly PlayingCard[]): boolean {
  let fixedSuit: PlayingCard["suit"] | null = null;
  for (const c of cards) {
    if (c.enhancement === "wild") continue;
    if (fixedSuit === null) {
      fixedSuit = c.suit;
    } else if (c.suit !== fixedSuit) {
      return false;
    }
  }
  return true;
}

function isStraight5(cards: readonly PlayingCard[]): boolean {
  const ranks = [...cards.map((c) => c.rank)].sort((a, b) => a - b);
  // 全部点数互异才可能成顺
  for (let i = 1; i < ranks.length; i++) {
    if (ranks[i] === ranks[i - 1]) return false;
  }
  const lo = ranks as number[];
  // 普通连顺
  let normal = true;
  for (let i = 1; i < lo.length; i++) {
    if (lo[i] !== lo[i - 1] + 1) {
      normal = false;
      break;
    }
  }
  if (normal) return true;
  // A-2-3-4-5 轮子（A 当 1）：点数集合恰为 {2,3,4,5,14}
  if (lo.length !== 5) return false;
  const wheel = new Set([14, 2, 3, 4, 5]);
  return lo.every((r) => wheel.has(r));
}

export interface HandCounts {
  readonly rankCounts: ReadonlyMap<number, number>;
  readonly sortedCounts: readonly number[];
  readonly maxCount: number;
}

function rankStats(cards: readonly PlayingCard[]): HandCounts {
  const rankCounts = new Map<number, number>();
  for (const c of cards) {
    rankCounts.set(c.rank, (rankCounts.get(c.rank) ?? 0) + 1);
  }
  const sortedCounts = [...rankCounts.values()].sort((a, b) => b - a);
  return { rankCounts, sortedCounts, maxCount: sortedCounts[0] ?? 0 };
}

/**
 * 判定所选 1-5 张牌中的最高牌型。
 * 所有打出的牌都会计分（含不参与牌型的散牌），此函数只决定牌型本身。
 */
export function detectHand(cards: readonly PlayingCard[]): HandType {
  if (cards.length === 0 || cards.length > 5) {
    throw new Error(`detectHand：需要 1-5 张牌，收到 ${cards.length}`);
  }
  const { sortedCounts, maxCount } = rankStats(cards);

  if (cards.length === 5) {
    const flush = isFlush5(cards);
    const straight = isStraight5(cards);
    if (maxCount === 5) return flush ? "FLUSH_FIVE" : "FIVE_OF_A_KIND";
    if (maxCount === 3 && sortedCounts[1] === 2) return flush ? "FLUSH_HOUSE" : "FULL_HOUSE";
    if (straight && flush) return "STRAIGHT_FLUSH";
    if (maxCount === 4) return "FOUR_OF_A_KIND";
    if (flush) return "FLUSH";
    if (straight) return "STRAIGHT";
  } else {
    // <5 张：只可能是 四条/三条/两对/一对/高牌
    if (maxCount === 4) return "FOUR_OF_A_KIND";
  }
  if (maxCount === 3) return "THREE_OF_A_KIND";
  if (maxCount === 2 && sortedCounts.length >= 2 && sortedCounts[1] === 2) return "TWO_PAIR";
  if (maxCount === 2) return "PAIR";
  return "HIGH_CARD";
}

/** 工具：某种牌型在所选牌中的「参与牌」（当前实现按花色/点数近似，仅供 UI 展示） */
export function cardsInHandType(cards: readonly PlayingCard[], type: HandType): PlayingCard[] {
  const { rankCounts } = rankStats(cards);
  const countFor = (n: number) =>
    [...cards].filter((c) => (rankCounts.get(c.rank) ?? 0) >= 1 && (rankCounts.get(c.rank) ?? 0) === n);
  switch (type) {
    case "FLUSH_FIVE":
    case "FIVE_OF_A_KIND":
      return [...cards];
    case "FLUSH_HOUSE":
    case "FULL_HOUSE":
      return [...cards];
    case "STRAIGHT_FLUSH":
    case "FLUSH":
    case "STRAIGHT":
      return [...cards];
    case "FOUR_OF_A_KIND": {
      const quad = [...rankCounts.entries()].find(([, n]) => n === 4)?.[0];
      return cards.filter((c) => c.rank === quad);
    }
    case "THREE_OF_A_KIND": {
      const trips = [...rankCounts.entries()].find(([, n]) => n === 3)?.[0];
      return cards.filter((c) => c.rank === trips);
    }
    case "TWO_PAIR": {
      const pairs = [...rankCounts.entries()].filter(([, n]) => n === 2).map(([r]) => r);
      return cards.filter((c) => pairs.includes(c.rank));
    }
    case "PAIR": {
      const pair = [...rankCounts.entries()].find(([, n]) => n === 2)?.[0];
      return cards.filter((c) => c.rank === pair);
    }
    case "HIGH_CARD": {
      return [...cards].sort((a, b) => b.rank - a.rank).slice(0, 1);
    }
  }
}

export { baseChips };
