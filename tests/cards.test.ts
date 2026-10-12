import { describe, expect, it } from "vitest";
import {
  baseChips,
  cardLabel,
  isFace,
  standardDeck,
  type PlayingCard,
} from "../src/core/cards.js";

describe("卡牌模型", () => {
  it("标准牌组 52 张、无重复 id", () => {
    const deck = standardDeck();
    expect(deck.length).toBe(52);
    expect(new Set(deck.map((c) => c.id)).size).toBe(52);
  });

  it("基础点数：2-10 面值，J/Q/K=10，A=11", () => {
    expect(baseChips(2)).toBe(2);
    expect(baseChips(10)).toBe(10);
    expect(baseChips(11)).toBe(10); // J
    expect(baseChips(12)).toBe(10); // Q
    expect(baseChips(13)).toBe(10); // K
    expect(baseChips(14)).toBe(11); // A
  });

  it("人头牌判定", () => {
    const deck = standardDeck();
    const faces = deck.filter((c) => isFace(c));
    expect(faces.length).toBe(12); // 3 花色外每花色 J Q K
  });

  it("牌面标签", () => {
    const deck = standardDeck();
    const ace = deck.find((c) => c.id === "S14")!;
    expect(cardLabel(ace)).toBe("♠A");
    const jack = deck.find((c) => c.id === "H11")!;
    expect(cardLabel(jack)).toBe("♥J");
  });

  it("卡牌可变属性可修改（强化/版本/封印）", () => {
    const card: PlayingCard = {
      id: "S14",
      rank: 14,
      suit: "S",
      enhancement: "none",
      edition: "base",
      seal: "none",
    };
    card.enhancement = "steel";
    card.edition = "poly";
    card.seal = "red";
    expect(card.enhancement).toBe("steel");
    expect(card.edition).toBe("poly");
    expect(card.seal).toBe("red");
  });
});
