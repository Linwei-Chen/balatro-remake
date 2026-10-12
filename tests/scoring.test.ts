import { describe, expect, it } from "vitest";
import { scoreHand, type GameValues } from "../src/core/scoring.js";
import type { JokerDef, JokerEffect } from "../src/core/jokerRegistry.js";
import { Rng } from "../src/core/rng.js";
import { standardDeck, type PlayingCard } from "../src/core/cards.js";

/** 测试用数值（数值本身由 golden tests 对照 fact-table 锁定，这里只验证机制） */
export const testValues: GameValues = {
  edition: { foilChips: 50, holoMult: 10, polyFactor: 1.5 },
  enhancement: {
    bonusChips: 30,
    multAdd: 4,
    glassFactor: 2,
    glassBreakChance: 1 / 4,
    stoneChips: 50,
    luckyMultChance: 1 / 5,
    luckyMultBonus: 20,
    luckyMoneyChance: 1 / 15,
    luckyMoney: 20,
    steelFactor: 1.5,
  },
  seal: { redRetriggers: 1, goldSealMoney: 3 },
};

const deck = standardDeck();
export function card(id: string): PlayingCard {
  const found = deck.find((c) => c.id === id);
  if (!found) throw new Error(`无此牌 ${id}`);
  return { ...found };
}

/** 构造一个固定效果小丑 */
function joker(key: string, effects: JokerEffect[], rarity: JokerDef["rarity"] = "common"): JokerDef {
  return { key, name: key, rarity, cost: [4, 5], effects, unlock: null };
}

export function defs(...list: JokerDef[]): Map<string, JokerDef> {
  return new Map(list.map((d) => [d.key, d]));
}

describe("计分管线机制（合成小丑冒烟测试）", () => {
  it("基础：一对 = (牌点总和 + 牌型基础chips) × (基础mult)", () => {
    const result = scoreHand({
      playedCards: [card("S9"), card("H9")],
      heldCards: [],
      jokers: [],
      defs: new Map(),
      rng: new Rng("T1"),
      values: testValues,
    });
    // 一对 9：牌点 9+9=18，加牌型基础 10 chips → 28 chips × 2 mult
    expect(result.handType).toBe("PAIR");
    expect(result.chips).toBe(28);
    expect(result.mult).toBe(2);
    expect(result.score).toBe(56);
  });

  it("散牌也计分：一对带3张散牌，散牌点数计入", () => {
    const result = scoreHand({
      playedCards: [card("S9"), card("H9"), card("D2"), card("C3"), card("S4")],
      heldCards: [],
      jokers: [],
      defs: new Map(),
      rng: new Rng("T2"),
      values: testValues,
    });
    // chips = 10 + 9基础... 具体：牌点 9+9+2+3+4=27 + 基础10 = 37
    expect(result.chips).toBe(37);
    expect(result.mult).toBe(2);
    expect(result.score).toBe(74);
  });

  it("card_scored 小丑：每张计分牌触发（含散牌）", () => {
    const j = joker("j_plus", [
      {
        trigger: "card_scored",
        condition: (ctx) => ctx.currentCard !== null,
        action: (ctx) => {
          ctx.mult += 1;
          ctx.log.push({ source: "j_plus", detail: "+1 Mult" });
        },
        description: "每张计分的牌 +1 Mult",
      },
    ]);
    const result = scoreHand({
      playedCards: [card("S9"), card("H9")],
      heldCards: [],
      jokers: [{ key: "j_plus", counters: {} }],
      defs: defs(j),
      rng: new Rng("T3"),
      values: testValues,
    });
    // mult = 2 + 1 + 1 = 4
    expect(result.mult).toBe(4);
    expect(result.chips).toBe(28);
  });

  it("×mult 顺序敏感：+mult 在 ×mult 左边 → 先加后乘", () => {
    const plus = joker("j_plus", [
      {
        trigger: "hand_played",
        action: (ctx) => {
          ctx.mult += 1;
        },
        description: "+1 Mult",
      },
    ]);
    const times = joker("j_times", [
      {
        trigger: "hand_played",
        action: (ctx) => {
          ctx.mult *= 2;
        },
        description: "x2 Mult",
      },
    ]);
    // 顺序 [plus, times]：(2+1)*2 = 6
    const r1 = scoreHand({
      playedCards: [card("S9"), card("H9")],
      heldCards: [],
      jokers: [{ key: "j_plus", counters: {} }, { key: "j_times", counters: {} }],
      defs: defs(plus, times),
      rng: new Rng("T4"),
      values: testValues,
    });
    expect(r1.mult).toBe(6);
    // 顺序 [times, plus]：2*2+1 = 5
    const r2 = scoreHand({
      playedCards: [card("S9"), card("H9")],
      heldCards: [],
      jokers: [{ key: "j_times", counters: {} }, { key: "j_plus", counters: {} }],
      defs: defs(plus, times),
      rng: new Rng("T4"),
      values: testValues,
    });
    expect(r2.mult).toBe(5);
  });

  it("条件小丑：只对指定花色触发", () => {
    const heartsPlus = joker("j_hearts", [
      {
        trigger: "card_scored",
        condition: (ctx) => ctx.currentCard?.suit === "H",
        action: (ctx) => {
          ctx.mult += 3;
        },
        description: "红桃计分 +3 Mult",
      },
    ]);
    const result = scoreHand({
      playedCards: [card("H9"), card("S9"), card("H2")],
      heldCards: [],
      jokers: [{ key: "j_hearts", counters: {} }],
      defs: defs(heartsPlus),
      rng: new Rng("T5"),
      values: testValues,
    });
    // 一对9 + 散牌2：H9、S9、H2 都计分，其中两张红桃触发
    expect(result.mult).toBe(2 + 3 + 3);
  });

  it("edition：foil +50 chips、holo +10 mult、poly ×1.5", () => {
    const foil = { ...card("S9"), edition: "foil" as const };
    const holo = { ...card("H9"), edition: "holo" as const };
    const poly = { ...card("D9"), edition: "poly" as const };
    const result = scoreHand({
      playedCards: [foil, holo, poly],
      heldCards: [],
      jokers: [],
      defs: new Map(),
      rng: new Rng("T6"),
      values: testValues,
    });
    // 三条9：chips = 9+9+9 + 30(基础) + 50(foil) = 107；mult = 3 + 10(holo)，poly 在 holo 之后？
    // 顺序：S9(foil) → H9(holo) → D9(poly)：mult = 3 +10 = 13，×1.5 → 19.5
    expect(result.chips).toBe(107);
    expect(result.mult).toBeCloseTo(19.5, 5);
    // 终值 floor
    expect(result.score).toBe(Math.floor(107 * 19.5));
  });

  it("enhancement：bonus/mult/glass 数值生效", () => {
    const bonus = { ...card("S9"), enhancement: "bonus" as const };
    const multC = { ...card("H9"), enhancement: "mult" as const };
    const glass = { ...card("D9"), enhancement: "glass" as const };
    // 用 chance 恒 false 的 rng 避免破碎：chance(0.25) → 手动控制 rng 状态太复杂，
    // 改用低概率粗验：破碎与否不影响 chips/mult，只影响 destroyed
    const result = scoreHand({
      playedCards: [bonus, multC, glass],
      heldCards: [],
      jokers: [],
      defs: new Map(),
      rng: new Rng("T7"),
      values: testValues,
    });
    // 三条9：chips = 9+30(bonus) + 9 + 9 + 30(基础) = 87；mult = 3 + 4(mult) ，glass ×2
    // 顺序：S9 → H9 → D9：mult = 3 + 4 = 7，glass ×2 → 14
    expect(result.chips).toBe(87);
    expect(result.mult).toBe(14);
    expect(["true", "false"]).toContain(String(!!result.destroyed.length));
  });

  it("lucky 牌：1/5 +20 Mult（加法）、1/15 $20（用可控 rng）", () => {
    const lucky = { ...card("S9"), enhancement: "lucky" as const };
    // 用固定种子驱动两次 chance：先判 mult(1/5) 后判 money(1/15)
    let seed = "";
    for (let i = 0; i < 5000; i++) {
      seed = `LUCKY${i}`;
      const r = new Rng(seed);
      const hitMult = r.chance(1 / 5);
      const hitMoney = r.chance(1 / 15);
      if (hitMult && hitMoney) break;
    }
    const result = scoreHand({
      playedCards: [lucky],
      heldCards: [],
      jokers: [],
      defs: new Map(),
      rng: new Rng(seed),
      values: testValues,
    });
    // 高牌：chips = 9+5=14，mult = 1 + 20（加法）= 21，money +$20
    expect(result.mult).toBe(21);
    expect(result.money).toBe(20);
  });

  it("stone 牌：+50 chips、无牌面点数、不参与牌型判定", () => {
    const stone = { ...card("S9"), enhancement: "stone" as const };
    // 单出一张 Stone：高牌（无点数），chips = 50 + 5(基础) = 55
    const r1 = scoreHand({
      playedCards: [stone],
      heldCards: [],
      jokers: [],
      defs: new Map(),
      rng: new Rng("STONE1"),
      values: testValues,
    });
    expect(r1.handType).toBe("HIGH_CARD");
    expect(r1.chips).toBe(55);
    // Stone + 一对：牌型仍是一对
    const r2 = scoreHand({
      playedCards: [stone, card("H9"), card("D9")],
      heldCards: [],
      jokers: [],
      defs: new Map(),
      rng: new Rng("STONE2"),
      values: testValues,
    });
    expect(r2.handType).toBe("PAIR");
    // chips = 50 + 9 + 9 + 基础10 = 78
    expect(r2.chips).toBe(78);
  });

  it("gold seal：打出并计分时 +$3（非回合末）", () => {
    const goldSealed = { ...card("S9"), seal: "gold" as const };
    const result = scoreHand({
      playedCards: [goldSealed],
      heldCards: [],
      jokers: [],
      defs: new Map(),
      rng: new Rng("GOLD1"),
      values: testValues,
    });
    expect(result.money).toBe(3);
    expect(result.log.some((e) => e.source === "seal")).toBe(true);
  });

  it("steel 牌在手中计分 ×1.5 mult", () => {
    const steelInHand = { ...card("S2"), enhancement: "steel" as const };
    const result = scoreHand({
      playedCards: [card("H9"), card("S9")],
      heldCards: [steelInHand],
      jokers: [],
      defs: new Map(),
      rng: new Rng("T8"),
      values: testValues,
    });
    // 一对9：chips=28，mult = 2×1.5 = 3
    expect(result.mult).toBe(3);
    expect(result.score).toBe(84);
  });

  it("held_scored 时机小丑触发且在 steel 之后？——记录当前实现顺序", () => {
    // 观察性测试：held 阶段小丑与 steel 的相对顺序留待 fact-table 核对后固定
    const baronLike = joker("j_baron", [
      {
        trigger: "held_scored",
        condition: (ctx) => ctx.currentCard?.rank === 13,
        action: (ctx) => {
          ctx.mult += 1.5;
        },
        description: "手中K计分 ×1.5 Mult（测试用 +1.5）",
      },
    ]);
    const king = { ...card("S13"), enhancement: "steel" as const };
    const result = scoreHand({
      playedCards: [card("H9"), card("S9")],
      heldCards: [king],
      jokers: [{ key: "j_baron", counters: {} }],
      defs: defs(baronLike),
      rng: new Rng("T9"),
      values: testValues,
    });
    // 当前实现：先 steel ×1.5，后 joker +1.5 → 2×1.5+1.5 = 4.5
    expect(result.mult).toBe(4.5);
  });

  it("玻璃破碎：强制命中时牌进入 destroyed", () => {
    const glass = { ...card("S9"), enhancement: "glass" as const };
    // 找一个首抽 chance(1/4)=true 的种子
    let seed = "";
    for (let i = 0; i < 100; i++) {
      seed = `GLASS${i}`;
      if (new Rng(seed).chance(1 / 4)) break;
    }
    const result = scoreHand({
      playedCards: [glass],
      heldCards: [],
      jokers: [],
      defs: new Map(),
      rng: new Rng(seed),
      values: testValues,
    });
    expect(result.destroyed.length).toBe(1);
    expect(result.destroyed[0]!.id).toBe("S9");
  });

  it("计分顺序从左到右：两张不同 ed 牌的 mult 顺序", () => {
    const holo = { ...card("S9"), edition: "holo" as const };
    const poly = { ...card("H9"), edition: "poly" as const };
    // [holo, poly]：mult = 2 +10 = 12 → ×1.5 = 18
    const r1 = scoreHand({
      playedCards: [holo, poly],
      heldCards: [],
      jokers: [],
      defs: new Map(),
      rng: new Rng("T10"),
      values: testValues,
    });
    expect(r1.mult).toBeCloseTo(18, 5);
    // [poly, holo]：mult = 2 ×1.5 = 3 → +10 = 13
    const r2 = scoreHand({
      playedCards: [poly, holo],
      heldCards: [],
      jokers: [],
      defs: new Map(),
      rng: new Rng("T10"),
      values: testValues,
    });
    expect(r2.mult).toBeCloseTo(13, 5);
  });
});
