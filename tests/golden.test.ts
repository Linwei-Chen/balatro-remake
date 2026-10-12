/**
 * 金标准计分测试：12 组手算 golden case。
 * 全部期望值按 docs/fact-table.md FT-CORE 手工推导，注释含完整算式。
 * 数值源：src/content/values.ts（REAL_VALUES）+ src/core/hands.ts（POKER_HANDS）。
 */

import { describe, expect, it } from "vitest";
import { scoreHand } from "../src/core/scoring.js";
import { REAL_VALUES } from "../src/content/values.js";
import { initialHandLevels, levelUpHand, POKER_HANDS } from "../src/core/hands.js";
import { def, onCardScored, onHandPlayed, addMult, xMult } from "../src/core/effectHelpers.js";
import { Rng } from "../src/core/rng.js";
import { standardDeck, type PlayingCard } from "../src/core/cards.js";

const deck = standardDeck();
function card(id: string, mods: Partial<PlayingCard> = {}): PlayingCard {
  const found = deck.find((c) => c.id === id);
  if (!found) throw new Error(`无此牌 ${id}`);
  return { ...found, ...mods };
}
function defs(...list: ReturnType<typeof def>[]): Map<string, ReturnType<typeof def>> {
  return new Map(list.map((d) => [d.key, d]));
}

describe("金标准计分（手算 golden cases，FT-CORE 数值）", () => {
  it("G1 一对7 + 原版 Joker（+4 Mult）", () => {
    const joker = def("j_joker", "Joker", "common", [4, 5], [
      onHandPlayed(addMult(4), "+4 Mult"),
    ]);
    // chips = 7 + 7 + 10(一对基础) = 24；mult = 2 + 4 = 6 → 144
    const r = scoreHand({
      playedCards: [card("S7"), card("H7")],
      heldCards: [],
      jokers: [{ key: "j_joker", counters: {} }],
      defs: defs(joker),
      rng: new Rng("G1"),
      values: REAL_VALUES,
    });
    expect(r.chips).toBe(24);
    expect(r.mult).toBe(6);
    expect(r.score).toBe(144);
  });

  it("G2 同花（非连续，避免成同花顺）", () => {
    // chips = 2+4+6+8+10 + 35(同花基础) = 65；mult = 4 → 260
    const r = scoreHand({
      playedCards: [card("H2"), card("H4"), card("H6"), card("H8"), card("H10")],
      heldCards: [],
      jokers: [],
      defs: new Map(),
      rng: new Rng("G2"),
      values: REAL_VALUES,
    });
    expect(r.handType).toBe("FLUSH");
    expect(r.chips).toBe(65);
    expect(r.mult).toBe(4);
    expect(r.score).toBe(260);
  });

  it("G3 轮子顺 A-2-3-4-5", () => {
    // chips = 11+2+3+4+5 + 30(顺子基础) = 55；mult = 4 → 220
    const r = scoreHand({
      playedCards: [card("S14"), card("H2"), card("D3"), card("C4"), card("S5")],
      heldCards: [],
      jokers: [],
      defs: new Map(),
      rng: new Rng("G3"),
      values: REAL_VALUES,
    });
    expect(r.handType).toBe("STRAIGHT");
    expect(r.chips).toBe(55);
    expect(r.score).toBe(220);
  });

  it("G4 Bonus 强化的 K 参与一对", () => {
    // chips = (10+30) + 10 + 10(一对基础) = 60；mult = 2 → 120
    const r = scoreHand({
      playedCards: [card("S13", { enhancement: "bonus" }), card("H13")],
      heldCards: [],
      jokers: [],
      defs: new Map(),
      rng: new Rng("G4"),
      values: REAL_VALUES,
    });
    expect(r.chips).toBe(60);
    expect(r.mult).toBe(2);
    expect(r.score).toBe(120);
  });

  it("G5 Mult 强化的 Q 参与一对", () => {
    // chips = 10 + 10 + 10(基础) = 30；mult = 2 + 4 = 6 → 180
    const r = scoreHand({
      playedCards: [card("S12", { enhancement: "mult" }), card("H12")],
      heldCards: [],
      jokers: [],
      defs: new Map(),
      rng: new Rng("G5"),
      values: REAL_VALUES,
    });
    expect(r.chips).toBe(30);
    expect(r.mult).toBe(6);
    expect(r.score).toBe(180);
  });

  it("G6 Glass + Foil 的高牌 A", () => {
    // chips = 11 + 50(foil) + 5(高牌基础) = 66；mult = (1 ×2(glass)) = 2 → 132
    const r = scoreHand({
      playedCards: [card("S14", { enhancement: "glass", edition: "foil" })],
      heldCards: [],
      jokers: [],
      defs: new Map(),
      rng: new Rng("G6"),
      values: REAL_VALUES,
    });
    expect(r.chips).toBe(66);
    expect(r.mult).toBe(2);
    expect(r.score).toBe(132);
  });

  it("G7 Holo + Poly 两张 A（一对）：版本顺序 点数→强化→封印→版本→小丑", () => {
    // 内部顺序：S14 holo 先计分：mult 2+10=12；H14 poly：×1.5 → 18
    // chips = 11+11+10 = 32 → 576
    const r = scoreHand({
      playedCards: [
        card("S14", { edition: "holo" }),
        card("H14", { edition: "poly" }),
      ],
      heldCards: [],
      jokers: [],
      defs: new Map(),
      rng: new Rng("G7"),
      values: REAL_VALUES,
    });
    expect(r.chips).toBe(32);
    expect(r.mult).toBeCloseTo(18, 6);
    expect(r.score).toBe(576);
  });

  it("G8 两张 Steel 在手中：一对9", () => {
    // chips = 9+9+10 = 28；mult = ((2 ×1.5) ×1.5) = 4.5 → 126
    const r = scoreHand({
      playedCards: [card("S9"), card("H9")],
      heldCards: [card("S2", { enhancement: "steel" }), card("H2", { enhancement: "steel" })],
      jokers: [],
      defs: new Map(),
      rng: new Rng("G8"),
      values: REAL_VALUES,
    });
    expect(r.chips).toBe(28);
    expect(r.mult).toBeCloseTo(4.5, 6);
    expect(r.score).toBe(126);
  });

  it("G9 Red Seal K 重触发 + Gold Seal 给钱", () => {
    // 一对9 + 红封印K：K 计分两次
    // chips = 9+9+10+10 + 10(基础) = 48；mult = 2 → 96；money = $3(gold seal)
    const r = scoreHand({
      playedCards: [card("S9"), card("H9"), card("D13", { seal: "red", ...{} })],
      heldCards: [],
      jokers: [],
      defs: new Map(),
      rng: new Rng("G9"),
      values: REAL_VALUES,
    });
    // D13 无 gold seal → money 0
    expect(r.chips).toBe(48);
    expect(r.score).toBe(96);
    expect(r.money).toBe(0);
    // 金封印版本：计分时 $3
    const r2 = scoreHand({
      playedCards: [card("S9"), card("H9"), card("D13", { seal: "gold" })],
      heldCards: [],
      jokers: [],
      defs: new Map(),
      rng: new Rng("G9b"),
      values: REAL_VALUES,
    });
    expect(r2.money).toBe(3); // Gold Seal 只在计分时给一次（非重触发……见 FT-CORE-03 重触发重跑序列）
    // 注意：重触发会重跑整个序列，但此 K 无 red seal；gold seal 只触发一次
  });

  it("G10 小丑 ×mult 顺序敏感性（+4 Mult 与 ×2 Mult 两种排列）", () => {
    const plus = def("j_plus4", "+4", "common", [4, 5], [onHandPlayed(addMult(4), "+4 Mult")]);
    const times = def("j_x2", "x2", "uncommon", [6, 7], [onHandPlayed(xMult(2), "x2 Mult")]);
    // [plus, times]：mult = (2+4)×2 = 12 → 28×12 = 336
    const r1 = scoreHand({
      playedCards: [card("S9"), card("H9")],
      heldCards: [],
      jokers: [
        { key: "j_plus4", counters: {} },
        { key: "j_x2", counters: {} },
      ],
      defs: defs(plus, times),
      rng: new Rng("G10"),
      values: REAL_VALUES,
    });
    expect(r1.score).toBe(336);
    // [times, plus]：mult = 2×2+4 = 8 → 28×8 = 224
    const r2 = scoreHand({
      playedCards: [card("S9"), card("H9")],
      heldCards: [],
      jokers: [
        { key: "j_x2", counters: {} },
        { key: "j_plus4", counters: {} },
      ],
      defs: defs(plus, times),
      rng: new Rng("G10"),
      values: REAL_VALUES,
    });
    expect(r2.score).toBe(224);
  });

  it("G11 Lucky 牌双命中（可控种子）：+20 Mult 加法与 $20", () => {
    let seed = "";
    for (let i = 0; i < 5000; i++) {
      seed = `GLUCKY${i}`;
      const r = new Rng(seed);
      if (r.chance(1 / 5) && r.chance(1 / 15)) break;
    }
    // 高牌 lucky 5：chips = 5+5 = 10；mult = 1 + 20 = 21 → 210；money $20
    const r = scoreHand({
      playedCards: [card("S5", { enhancement: "lucky" })],
      heldCards: [],
      jokers: [],
      defs: new Map(),
      rng: new Rng(seed),
      values: REAL_VALUES,
    });
    expect(r.chips).toBe(10);
    expect(r.mult).toBe(21);
    expect(r.score).toBe(210);
    expect(r.money).toBe(20);
  });

  it("G12 五张 Stone：高牌 + 每张 50 chips", () => {
    // chips = 50×5 + 5(高牌基础) = 255；mult = 1 → 255
    const stones = ["S2", "H5", "D7", "C9", "H13"].map((id) =>
      card(id, { enhancement: "stone" }),
    );
    const r = scoreHand({
      playedCards: stones,
      heldCards: [],
      jokers: [],
      defs: new Map(),
      rng: new Rng("G12"),
      values: REAL_VALUES,
    });
    expect(r.handType).toBe("HIGH_CARD");
    expect(r.chips).toBe(255);
    expect(r.score).toBe(255);
  });

  it("G13 星球升级：同花顺 2 级", () => {
    const levels = initialHandLevels();
    levelUpHand(levels, "STRAIGHT_FLUSH", 1);
    // 同花顺 2 级：基础 100+40=140；chips = 4+5+6+7+8 + 140 = 170；mult = 12 → 2040
    expect(POKER_HANDS.STRAIGHT_FLUSH.chips).toBe(100);
    const r = scoreHand({
      playedCards: [card("S4"), card("S5"), card("S6"), card("S7"), card("S8")],
      heldCards: [],
      jokers: [],
      defs: new Map(),
      rng: new Rng("G13"),
      values: REAL_VALUES,
      handLevels: levels,
    });
    expect(r.chips).toBe(170);
    expect(r.mult).toBe(12);
    expect(r.score).toBe(2040);
  });
});
