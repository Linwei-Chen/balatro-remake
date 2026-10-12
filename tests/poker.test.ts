import { describe, expect, it } from "vitest";
import { detectHand, type HandType } from "../src/core/poker.js";
import type { PlayingCard } from "../src/core/cards.js";

/** 测试用快捷构造器 */
function c(spec: string, overrides: Partial<PlayingCard> = {}): PlayingCard {
  const suit = spec[0] as PlayingCard["suit"];
  const rankStr = spec.slice(1);
  const rank = rankStr === "J" ? 11 : rankStr === "Q" ? 12 : rankStr === "K" ? 13 : rankStr === "A" ? 14 : parseInt(rankStr, 10);
  return {
    id: spec,
    rank,
    suit,
    enhancement: "none",
    edition: "base",
    seal: "none",
    ...overrides,
  };
}

describe("牌型判定", () => {
  it("高牌（单张）", () => {
    expect(detectHand([c("S14")])).toBe("HIGH_CARD");
  });

  it("一对", () => {
    expect(detectHand([c("S9"), c("H9"), c("D3")])).toBe("PAIR");
  });

  it("两对", () => {
    expect(detectHand([c("S9"), c("H9"), c("D3"), c("C3")])).toBe("TWO_PAIR");
  });

  it("三条", () => {
    expect(detectHand([c("S9"), c("H9"), c("D9"), c("C3"), c("HA")])).toBe("THREE_OF_A_KIND");
  });

  it("四条（4 张出牌也可判定）", () => {
    expect(detectHand([c("S9"), c("H9"), c("D9"), c("C9")])).toBe("FOUR_OF_A_KIND");
  });

  it("四条+散牌（5 张含四条）优先四条而非一对", () => {
    expect(detectHand([c("S9"), c("H9"), c("D9"), c("C9"), c("D2")])).toBe("FOUR_OF_A_KIND");
  });

  it("葫芦", () => {
    expect(detectHand([c("S9"), c("H9"), c("D9"), c("C3"), c("H3")])).toBe("FULL_HOUSE");
  });

  it("同花（非同花色散对干扰时仍取同花为高）", () => {
    // 5 张黑桃中含一对 → 取同花（高于一对）
    expect(detectHand([c("S2"), c("S2"), c("S5"), c("S7"), c("S9")])).toBe("FLUSH");
  });

  it("顺子：普通连顺", () => {
    expect(detectHand([c("S4"), c("H5"), c("D6"), c("C7"), c("S8")])).toBe("STRAIGHT");
  });

  it("顺子：轮子 A-2-3-4-5", () => {
    expect(detectHand([c("S14"), c("H2"), c("D3"), c("C4"), c("S5")])).toBe("STRAIGHT");
  });

  it("顺子：皇家 10-J-Q-K-A（即同花顺等级）", () => {
    expect(detectHand([c("S10"), c("H11"), c("D12"), c("C13"), c("S14")])).toBe("STRAIGHT");
  });

  it("非顺：K-A-2-3-4 不允许环绕", () => {
    expect(detectHand([c("S13"), c("H14"), c("D2"), c("C3"), c("S4")])).toBe("HIGH_CARD");
  });

  it("非顺：含对子破坏连顺（5 5 6 7 8 不是顺子）", () => {
    expect(detectHand([c("S5"), c("H5"), c("D6"), c("C7"), c("S8")])).toBe("PAIR");
  });

  it("非顺：4 张连牌 + 1 张散牌不成顺", () => {
    expect(detectHand([c("S3"), c("H4"), c("D5"), c("C6"), c("S9")])).toBe("HIGH_CARD");
  });

  it("同花顺", () => {
    expect(detectHand([c("S4"), c("S5"), c("S6"), c("S7"), c("S8")])).toBe("STRAIGHT_FLUSH");
  });

  it("重复点数破坏顺子与同花：5 6 7 8 8 只算一对", () => {
    expect(detectHand([c("S5"), c("S6"), c("S7"), c("S8"), c("H8")])).toBe("PAIR");
  });

  it("五条（需牌组复制，测试用合成牌）", () => {
    expect(detectHand([c("S9"), c("H9"), c("D9"), c("C9"), c("S9x")])).toBe("FIVE_OF_A_KIND");
  });

  it("同花五条", () => {
    expect(detectHand([c("S9"), c("S9b"), c("S9c"), c("S9d"), c("S9e")])).toBe("FLUSH_FIVE");
  });

  it("同花葫芦", () => {
    expect(detectHand([c("S9"), c("S9b"), c("S9c"), c("S3"), c("S3b")])).toBe("FLUSH_HOUSE");
  });

  it("同花葫芦优于同花顺优先级正确（全同花 3+2）", () => {
    expect(detectHand([c("S5"), c("S5b"), c("S5c"), c("S6"), c("S6b")])).toBe("FLUSH_HOUSE");
  });

  it("万能牌参与同花判定（不同花色但有 wild）", () => {
    expect(
      detectHand([
        c("S2"),
        c("S5"),
        c("S7"),
        c("S9"),
        c("H3", { enhancement: "wild" }),
      ]),
    ).toBe("FLUSH");
  });

  it("万能牌不改变点数：wild 5 不能补成顺子缺的 K", () => {
    // 3 4 5 6 + wild(J)：J 不是 2 或 7 → 无顺子
    expect(
      detectHand([
        c("S3"),
        c("H4"),
        c("D5"),
        c("C6"),
        c("S11", { enhancement: "wild" }),
      ]),
    ).toBe("HIGH_CARD");
  });

  it("万能牌补全轮子顺", () => {
    expect(
      detectHand([
        c("S14"),
        c("H2"),
        c("D3"),
        c("C4", { enhancement: "wild" }),
        c("D5"),
      ]),
    ).toBe("STRAIGHT");
  });

  it("全 wild 5 张 → 同花（视为任意同花色）", () => {
    expect(
      detectHand([
        c("S2", { enhancement: "wild" }),
        c("H5", { enhancement: "wild" }),
        c("D7", { enhancement: "wild" }),
        c("C9", { enhancement: "wild" }),
        c("H13", { enhancement: "wild" }),
      ]),
    ).toBe("FLUSH");
  });

  it("4+1 全同花仍是四条（四条优先于同花）", () => {
    expect(detectHand([c("S9"), c("S9b"), c("S9c"), c("S9d"), c("S2")])).toBe("FOUR_OF_A_KIND");
  });

  it("所有 12 种牌型均有判定路径", () => {
    const cases: Array<[PlayingCard[], HandType]> = [
      [[c("S14")], "HIGH_CARD"],
      [[c("S9"), c("H9")], "PAIR"],
      [[c("S9"), c("H9"), c("D3"), c("C3")], "TWO_PAIR"],
      [[c("S9"), c("H9"), c("D9")], "THREE_OF_A_KIND"],
      [[c("S4"), c("H5"), c("D6"), c("C7"), c("S8")], "STRAIGHT"],
      [[c("S2"), c("S5"), c("S7"), c("S9"), c("SJ")], "FLUSH"],
      [[c("S9"), c("H9"), c("D9"), c("C3"), c("H3")], "FULL_HOUSE"],
      [[c("S9"), c("H9"), c("D9"), c("C9")], "FOUR_OF_A_KIND"],
      [[c("S4"), c("S5"), c("S6"), c("S7"), c("S8")], "STRAIGHT_FLUSH"],
      [[c("S9"), c("H9"), c("D9"), c("C9"), c("S9x")], "FIVE_OF_A_KIND"],
      [[c("S9"), c("S9b"), c("S9c"), c("S3"), c("S3b")], "FLUSH_HOUSE"],
      [[c("S9"), c("S9b"), c("S9c"), c("S9d"), c("S9e")], "FLUSH_FIVE"],
    ];
    for (const [cards, expected] of cases) {
      expect(detectHand(cards)).toBe(expected);
    }
  });

  it("非法输入抛错", () => {
    expect(() => detectHand([])).toThrow();
    expect(() => detectHand([c("S2"), c("H2"), c("D2"), c("C2"), c("S3"), c("H3")])).toThrow();
  });
});
