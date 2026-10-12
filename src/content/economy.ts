/**
 * 生产经济数值（阶段 C 注入用）。
 * 全部出处：docs/fact-table.md FT-ECO-*，采集源 references/economy-blinds.json
 * （balatrowiki.org + 原版 Lua dump 双源核对，confidence=code+wiki）。
 */
import type { EconomyValues } from "../core/economy.js";

/** 向下取整到 2 位有效数字（原版：amount - amount % 10^floor(log10(amount)-1)） */
function floor2sig(n: number): number {
  if (n <= 0) return 0;
  const power = Math.floor(Math.log10(n)) - 1;
  const step = Math.pow(10, power);
  return n - (n % step);
}

/**
 * Ante 9+ 基础需求（无尽模式）[FT-ECO-02 ✅ code+wiki]：
 * floor_2sig( 50000 × (1.6 + (0.75×(ante-8))^(1+0.2×(ante-8)))^(ante-8) )
 * 注意 50000 是公式内硬编码常数（对应假想的 Ante 9 表值），不是 Ante 8 的基础值 35000。
 * 验证锚点：Ante 9=110000、Ante 10=560000、Ante 11=7200000（与 wiki 无尽表逐级一致）。
 */
function anteBaseBeyond(ante: number): number {
  const a = 50000;
  const c = ante - 8;
  const d = 1 + 0.2 * c;
  const raw = a * Math.pow(1.6 + Math.pow(0.75 * c, d), c);
  return floor2sig(raw);
}

/** 基础游戏（白筹码难度）经济参数 */
export const REAL_ECONOMY: EconomyValues = {
  // Ante 1-8 基础筹码 [FT-ECO-01 ✅ code+wiki+双锚点]
  // 锚点：Ante 1 Small Blind = 100（开局首把）；Ante 8 Boss = 70000 = 35000×2（通关标志）。
  // 注意：采集表把 9 值表 {100..50000} 映射到 Ante 0..8 并断言「Ante 1=300」，
  // 与上述双锚点矛盾，系 Lua 数组索引误读；本表映射 Ante 1..8。
  anteBases: [100, 300, 800, 2000, 5000, 11000, 20000, 35000],
  anteBaseBeyond,

  // 盲注倍率 [FT-ECO-03 ✅ code+wiki：small 1x / big 1.5x / boss 2x]
  blindMultiplier: { small: 1, big: 1.5, boss: 2 },

  // 击败奖励 [FT-ECO-04 ✅ code+wiki]
  blindReward: { small: 3, big: 4, boss: 5 },
  showdownReward: 8, // Ante 8+ Boss（Showdown）$8

  // 回合末结算 [✅ code+wiki：cash_out 顺序 盲注→剩余手牌→利息→小丑→Tag]
  perUnusedHand: 1, // $1 × 剩余手牌（弃牌 $0）
  interestPer: 5, // 每持有 $5 得 $1
  interestCap: 5, // 上限 $5/回合（原版 interest_cap=25 除以 5）

  // 商店 [✅ code+wiki]
  rerollBase: 5, // 重掷 $5 起步，每商店重置
  rerollIncrement: 1, // 每次重掷 +$1
  sellRatio: 0.5, // 卖价 floor(买价/2)，最低 $1（见 sellValue）
  startingMoney: 4, // 开局 $4

  // 金钱牌：回合末在手 $3 [FT-CORE-05 ✅]（金印章 $3 在计分时，见 scoring）
  goldCardMoney: 3,
};
