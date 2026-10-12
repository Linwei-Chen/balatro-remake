/**
 * 生产数值常量 —— 全部取自 docs/fact-table.md，逐项标注 FT 条目。
 * 这是引擎的规范数值源；测试与运行时都从这里取值。
 * [FT-CORE] 全部条目置信度：代码+wiki 双源（references/core-scoring.json）。
 */

import type { GameValues } from "../core/scoring.js";

export const REAL_VALUES: GameValues = {
  edition: {
    foilChips: 50, // FT-CORE-04
    holoMult: 10,
    polyFactor: 1.5,
  },
  enhancement: {
    bonusChips: 30, // FT-CORE-05
    multAdd: 4,
    glassFactor: 2,
    glassBreakChance: 1 / 4,
    stoneChips: 50,
    luckyMultChance: 1 / 5, // Lucky：1/5 +20 Mult（加法）
    luckyMultBonus: 20,
    luckyMoneyChance: 1 / 15, // 1/15 $20
    luckyMoney: 20,
    steelFactor: 1.5,
  },
  seal: {
    redRetriggers: 1, // FT-CORE-06
    goldSealMoney: 3,
  },
};
