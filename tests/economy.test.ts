import { describe, expect, it } from "vitest";
import {
  anteBase,
  blindRequirement,
  endOfRoundIncome,
  interestFor,
  rerollCost,
  sellValue,
  type EconomyValues,
} from "../src/core/economy.js";
import { REAL_ECONOMY } from "../src/content/economy.js";

/** 引擎测试用最小经济值（数值 = FT-ECO 已锁定值） */
const V: EconomyValues = {
  anteBases: [100, 300, 800, 2000, 5000, 11000, 20000, 35000],
  anteBaseBeyond: (ante) => {
    const c = ante - 8;
    const raw = 50000 * Math.pow(1.6 + Math.pow(0.75 * c, 1 + 0.2 * c), c);
    const step = Math.pow(10, Math.floor(Math.log10(raw)) - 1);
    return raw - (raw % step);
  },
  blindMultiplier: { small: 1, big: 1.5, boss: 2 },
  blindReward: { small: 3, big: 4, boss: 5 },
  showdownReward: 8,
  perUnusedHand: 1,
  interestPer: 5,
  interestCap: 5,
  rerollBase: 5,
  rerollIncrement: 1,
  sellRatio: 0.5,
  startingMoney: 4,
  goldCardMoney: 3,
};

describe("Ante 筹码曲线", () => {
  it("Ante 1-8 基础值 [FT-ECO-01 ✅ 双锚点]", () => {
    expect(anteBase(1, V)).toBe(100); // 锚点：开局首把小盲 100
    expect(anteBase(2, V)).toBe(300);
    expect(anteBase(3, V)).toBe(800);
    expect(anteBase(4, V)).toBe(2000);
    expect(anteBase(5, V)).toBe(5000);
    expect(anteBase(6, V)).toBe(11000);
    expect(anteBase(7, V)).toBe(20000);
    expect(anteBase(8, V)).toBe(35000); // 锚点：Ante 8 Boss = 35000×2 = 70000
  });

  it("盲注需求 = base × 倍率：ante1 → 100/150/200；ante8 → 35000/52500/70000", () => {
    expect(blindRequirement(1, "small", V)).toBe(100);
    expect(blindRequirement(1, "big", V)).toBe(150);
    expect(blindRequirement(1, "boss", V)).toBe(200);
    expect(blindRequirement(8, "small", V)).toBe(35000);
    expect(blindRequirement(8, "big", V)).toBe(52500);
    expect(blindRequirement(8, "boss", V)).toBe(70000);
  });

  it("无尽模式 Ante 9-11 [FT-ECO-02 ✅ 公式+wiki 表]", () => {
    // 手算：Ante 9 = 50000×(1.6+0.75^1.2) = 115400 → 2位有效 = 110000
    expect(anteBase(9, V)).toBe(110000);
    // Ante 10 = 50000×(1.6+1.5^1.4)^2 = 565900 → 560000
    expect(anteBase(10, V)).toBe(560000);
    // Ante 11 = 50000×(1.6+2.25^1.6)^3 = 7276000 → 7200000
    expect(anteBase(11, V)).toBe(7200000);
  });

  it("生产经济值 REAL_ECONOMY 与锁定锚点一致", () => {
    expect(REAL_ECONOMY.anteBases).toEqual(V.anteBases);
    expect(anteBase(9, REAL_ECONOMY)).toBe(110000);
    expect(blindRequirement(8, "boss", REAL_ECONOMY)).toBe(70000);
    expect(REAL_ECONOMY.startingMoney).toBe(4);
  });
});

describe("回合末结算 endOfRoundIncome", () => {
  it("完整链：Boss $5 + 剩余手牌×$1 + 利息 + 金卡×$3 [✅ code+wiki]", () => {
    // $19 → 利息 floor(19/5)=3；剩手 2 → $2；金卡 2 → $6
    const r = endOfRoundIncome({
      kind: "boss",
      money: 19,
      handsRemaining: 2,
      goldCardsInHand: 2,
      v: V,
    });
    expect(r).toEqual({ base: 5, hands: 2, interest: 3, gold: 6, total: 16 });
  });

  it("剩余手牌给钱、弃牌不给 [✅ code+wiki]", () => {
    const r = endOfRoundIncome({ kind: "small", money: 0, handsRemaining: 4, goldCardsInHand: 0, v: V });
    expect(r.hands).toBe(4);
    expect(r.total).toBe(7); // 3 + 4
  });

  it("Showdown（Ante 8+ Boss）奖励 $8 而非 $5", () => {
    const r = endOfRoundIncome({ kind: "boss", money: 0, handsRemaining: 0, goldCardsInHand: 0, showdown: true, v: V });
    expect(r.base).toBe(8);
  });

  it("利息：每 $5 得 $1，上限 $5，不足 $5 无利息", () => {
    expect(interestFor(4, V)).toBe(0);
    expect(interestFor(5, V)).toBe(1);
    expect(interestFor(19, V)).toBe(3);
    expect(interestFor(25, V)).toBe(5);
    expect(interestFor(100, V)).toBe(5); // 封顶
  });
});

describe("商店经济", () => {
  it("重掷价 $5 起步每次 +$1，进新商店重置", () => {
    expect(rerollCost(0, V)).toBe(5);
    expect(rerollCost(1, V)).toBe(6);
    expect(rerollCost(2, V)).toBe(7);
  });

  it("卖价 = floor(买价/2)，最低 $1 [✅ wiki Shop]", () => {
    expect(sellValue(1, V)).toBe(1); // max(1, 0)
    expect(sellValue(2, V)).toBe(1);
    expect(sellValue(4, V)).toBe(2);
    expect(sellValue(5, V)).toBe(2);
    expect(sellValue(6, V)).toBe(3);
    expect(sellValue(20, V)).toBe(10);
  });
});
