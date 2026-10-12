import { describe, expect, it } from "vitest";
import {
  addMult,
  cardIsFace,
  def,
  handTypeIn,
  onCardScored,
  onHandPlayed,
  suitIs,
  xMult,
} from "../src/core/effectHelpers.js";
import { scoreHand, type GameValues } from "../src/core/scoring.js";
import { Rng } from "../src/core/rng.js";
import { standardDeck, type PlayingCard } from "../src/core/cards.js";
import { testValues, card, defs } from "./scoring.test.js";

const deck = standardDeck();

describe("效果构造器库", () => {
  it("suitIs + onCardScored 组合：Greedy 式效果", () => {
    const greedy = def("j_greedy", "Greedy", "common", [4, 5], [
      onCardScored(addMult(3), "方块牌计分 +3 Mult", suitIs("D")),
    ]);
    const r = scoreHand({
      playedCards: [card("D9"), card("S9"), card("D2")],
      heldCards: [],
      jokers: [{ key: "j_greedy", counters: {} }],
      defs: defs(greedy),
      rng: new Rng("H1"),
      values: testValues,
    });
    expect(r.mult).toBe(2 + 3 + 3);
  });

  it("cardIsFace 条件", () => {
    const faceJ = def("j_face", "Face", "common", [4, 5], [
      onCardScored(addMult(2), "人头牌 +2 Mult", cardIsFace()),
    ]);
    const r = scoreHand({
      playedCards: [card("S13"), card("H13")],
      heldCards: [],
      jokers: [{ key: "j_face", counters: {} }],
      defs: defs(faceJ),
      rng: new Rng("H2"),
      values: testValues,
    });
    // 一对K：基础 mult=2，两张 K 各触发 +2 → 6
    expect(r.mult).toBe(6);
  });

  it("handTypeIn 条件 + xMult", () => {
    const j = def("j_x", "X", "uncommon", [6, 7], [
      onHandPlayed(xMult(3), "打出三条 x3 Mult"),
    ]);
    const r = scoreHand(
      (() => {
        return {
          playedCards: [card("S9"), card("H9"), card("D9")],
          heldCards: [],
          jokers: [{ key: "j_x", counters: {} }],
          defs: defs(j),
          rng: new Rng("H3"),
          values: testValues,
        };
      })(),
    );
    // 三条基础 mult 3 ×3 = 9
    expect(r.mult).toBe(9);
  });

  it("handTypeIn 只匹配指定牌型", () => {
    const j = def("j_x2", "X2", "uncommon", [6, 7], [
      onHandPlayed(
        xMult(2),
        "打出一对 x2",
        handTypeIn("PAIR", "TWO_PAIR", "THREE_OF_A_KIND", "STRAIGHT", "FLUSH", "FULL_HOUSE", "FOUR_OF_A_KIND", "STRAIGHT_FLUSH"),
      ),
    ]);
    const r = scoreHand({
      playedCards: [card("S2"), card("H5"), card("D7"), card("C9"), card("S11")],
      heldCards: [],
      jokers: [{ key: "j_x2", counters: {} }],
      defs: defs(j),
      rng: new Rng("H4"),
      values: testValues,
    });
    // 高牌不触发
    expect(r.mult).toBe(1);
  });

  it("wild 牌按全花色触发条件小丑 [FT 待核对]", () => {
    const hearts = def("j_h", "H", "common", [4, 5], [
      onCardScored(addMult(1), "红桃 +1", suitIs("H")),
    ]);
    const wild = { ...card("S2"), enhancement: "wild" as const };
    const r = scoreHand({
      playedCards: [wild],
      heldCards: [],
      jokers: [{ key: "j_h", counters: {} }],
      defs: defs(hearts),
      rng: new Rng("H5"),
      values: testValues,
    });
    expect(r.mult).toBe(1 + 1);
  });

  it("log 完整记录触发链（验证用）", () => {
    const j = def("j_log", "L", "common", [4, 5], [
      onCardScored(addMult(2), "+2 Mult", cardIsFace()),
    ]);
    const r = scoreHand({
      playedCards: [card("S13")],
      heldCards: [],
      jokers: [{ key: "j_log", counters: {} }],
      defs: defs(j),
      rng: new Rng("H6"),
      values: testValues,
    });
    const sources = r.log.map((e) => e.source);
    expect(sources).toContain("card");
    expect(sources).toContain("j_log");
    expect(r.log.filter((e) => e.source === "j_log").length).toBe(1);
  });

  it("GameValues 类型可整体替换（golden test 接口就绪）", () => {
    const custom: GameValues = JSON.parse(JSON.stringify(testValues));
    custom.pokerHands.PAIR!.mult = 9;
    const r = scoreHand({
      playedCards: [card("S9"), card("H9")],
      heldCards: [],
      jokers: [],
      defs: new Map(),
      rng: new Rng("H7"),
      values: custom,
    });
    expect(r.mult).toBe(9);
  });
});

function card2(spec: string): PlayingCard {
  return deck.find((c) => c.id === spec)!;
}
void card2;
