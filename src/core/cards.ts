/**
 * 扑克牌模型：花色、点数、强化（enhancement）、版本（edition）、封印（seal）。
 * 数值出处见 docs/fact-table.md（FT-CORE-*）；基础点数 2-10 面值、J/Q/K=10、A=11。
 */

export type Suit = "S" | "H" | "C" | "D";
export const SUITS: readonly Suit[] = ["S", "H", "C", "D"] as const;

/** 2-14，其中 11=J、12=Q、13=K、14=A */
export type Rank = number;
export const RANKS: readonly Rank[] = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14] as const;

export type Enhancement =
  | "none"
  | "bonus" // +30 chips
  | "mult" // +4 mult
  | "wild" // 视为任意花色
  | "glass" // ×2 mult，1/4 概率破碎
  | "steel" // 手中计分时 ×1.5 mult
  | "gold" // 回合末在手得 $3
  | "lucky" // 1/5 概率 +20 Mult（加法），1/15 概率 $20
  | "stone"; // +50 chips，无点数无花色（FT-CORE-05）

export type Edition = "base" | "foil" | "holo" | "poly" | "negative";

export type Seal = "none" | "gold" | "red" | "blue" | "purple";

export interface PlayingCard {
  /** 唯一 id，如 "S14"（黑桃A）；扩展卡（复制牌）带后缀 */
  readonly id: string;
  readonly rank: Rank;
  readonly suit: Suit;
  enhancement: Enhancement;
  edition: Edition;
  seal: Seal;
  /** 被消融（destroyed）标记，出牌阶段可能被置位 */
  destroyed?: boolean;
}

export const RANK_LABELS: ReadonlyMap<Rank, string> = new Map([
  [11, "J"],
  [12, "Q"],
  [13, "K"],
  [14, "A"],
]);

export function rankLabel(rank: Rank): string {
  return RANK_LABELS.get(rank) ?? String(rank);
}

export function suitLabel(suit: Suit): string {
  return { S: "♠", H: "♥", C: "♣", D: "♦" }[suit] as string;
}

export function cardLabel(card: PlayingCard): string {
  return `${suitLabel(card.suit)}${rankLabel(card.rank)}`;
}

/** 基础点数：2-10 为面值，J/Q/K=10，A=11 */
export function baseChips(rank: Rank): number {
  if (rank >= 2 && rank <= 10) return rank;
  if (rank >= 11 && rank <= 13) return 10;
  if (rank === 14) return 11;
  throw new Error(`非法点数 ${rank}`);
}

/** 人头牌 J/Q/K */
export function isFace(card: PlayingCard): boolean {
  return card.rank >= 11 && card.rank <= 13;
}

/** 生成一副标准 52 张牌（无强化/版本/封印） */
export function standardDeck(): PlayingCard[] {
  const cards: PlayingCard[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      cards.push({
        id: `${suit}${rank}`,
        rank,
        suit,
        enhancement: "none",
        edition: "base",
        seal: "none",
      });
    }
  }
  return cards;
}
