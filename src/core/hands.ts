/**
 * 牌型等级状态（星球牌/黑洞牌的升级目标）。
 * 数值出处 docs/fact-table.md FT-CORE-01（✅代码+wiki 双源）。
 */

import type { HandType } from "./poker.js";

export interface HandLevelDef {
  /** 1 级基础值 */
  chips: number;
  mult: number;
  /** 每升 1 级增量 */
  chipsPerLevel: number;
  multPerLevel: number;
}

export interface HandLevel {
  level: number;
}

/** FT-CORE-01 全表（12 牌型，含 3 隐藏） */
export const POKER_HANDS: Record<HandType, HandLevelDef> = {
  HIGH_CARD: { chips: 5, mult: 1, chipsPerLevel: 10, multPerLevel: 1 },
  PAIR: { chips: 10, mult: 2, chipsPerLevel: 15, multPerLevel: 1 },
  TWO_PAIR: { chips: 20, mult: 2, chipsPerLevel: 20, multPerLevel: 1 },
  THREE_OF_A_KIND: { chips: 30, mult: 3, chipsPerLevel: 20, multPerLevel: 2 },
  STRAIGHT: { chips: 30, mult: 4, chipsPerLevel: 30, multPerLevel: 3 },
  FLUSH: { chips: 35, mult: 4, chipsPerLevel: 15, multPerLevel: 2 },
  FULL_HOUSE: { chips: 40, mult: 4, chipsPerLevel: 25, multPerLevel: 2 },
  FOUR_OF_A_KIND: { chips: 60, mult: 7, chipsPerLevel: 30, multPerLevel: 3 },
  STRAIGHT_FLUSH: { chips: 100, mult: 8, chipsPerLevel: 40, multPerLevel: 4 },
  FIVE_OF_A_KIND: { chips: 120, mult: 12, chipsPerLevel: 35, multPerLevel: 3 },
  FLUSH_HOUSE: { chips: 140, mult: 14, chipsPerLevel: 40, multPerLevel: 4 },
  FLUSH_FIVE: { chips: 160, mult: 16, chipsPerLevel: 50, multPerLevel: 3 },
};

export type HandLevels = Record<HandType, HandLevel>;

export function initialHandLevels(): HandLevels {
  const out = {} as HandLevels;
  for (const k of Object.keys(POKER_HANDS) as HandType[]) {
    out[k] = { level: 1 };
  }
  return out;
}

/** 当前等级下的实际 chips/mult */
export function handValue(levels: HandLevels, type: HandType): { chips: number; mult: number } {
  const def = POKER_HANDS[type];
  const lv = levels[type]?.level ?? 1;
  return {
    chips: def.chips + def.chipsPerLevel * (lv - 1),
    mult: def.mult + def.multPerLevel * (lv - 1),
  };
}

export function levelUpHand(levels: HandLevels, type: HandType, count = 1): void {
  const cur = levels[type] ?? { level: 1 };
  levels[type] = { level: cur.level + count };
}
