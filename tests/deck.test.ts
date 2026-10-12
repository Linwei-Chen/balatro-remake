import { describe, expect, it } from "vitest";
import {
  drawCards,
  endRound,
  newRound,
  playCards,
  toDiscard,
} from "../src/core/deck.js";
import { standardDeck } from "../src/core/cards.js";
import { Rng } from "../src/core/rng.js";

const deck = standardDeck();

describe("牌堆管理", () => {
  it("回合开始抽满手牌上限", () => {
    const state = newRound(deck, new Rng("D1"));
    drawCards(state, 8, new Rng("D1"));
    expect(state.hand.length).toBe(8);
    expect(state.drawPile.length).toBe(44);
  });

  it("出牌后进入弃牌堆，可再抽补满", () => {
    const rng = new Rng("D2");
    const state = newRound(deck, rng);
    drawCards(state, 8, rng);
    const played = playCards(state, [state.hand[0]!.id, state.hand[1]!.id]);
    expect(state.hand.length).toBe(6);
    toDiscard(state, played);
    expect(state.discardPile.length).toBe(2);
    drawCards(state, 2, rng);
    expect(state.hand.length).toBe(8);
    expect(state.drawPile.length).toBe(42);
  });

  it("抽牌堆耗尽时弃牌堆重洗回流", () => {
    const rng = new Rng("D3");
    const state = newRound(deck, rng);
    drawCards(state, 30, rng);
    expect(state.drawPile.length).toBe(22);
    // 弃掉 20 张，再抽 30：22 张不够 → 弃牌堆 20 张重洗回流
    const played = playCards(state, state.hand.slice(0, 20).map((c) => c.id));
    toDiscard(state, played);
    drawCards(state, 30, rng);
    // 手上原有 10 张 + 抽 30 张 = 40
    expect(state.hand.length).toBe(40);
  });

  it("抽牌堆与弃牌堆全空时抽牌返回空", () => {
    const rng = new Rng("D4");
    const state = newRound(deck.slice(0, 4), rng);
    drawCards(state, 4, rng);
    expect(drawCards(state, 5, rng).length).toBe(0);
  });

  it("回合结束全部回牌组且保留属性", () => {
    const rng = new Rng("D5");
    const state = newRound(deck, rng);
    drawCards(state, 8, rng);
    const played = playCards(state, [state.hand[0]!.id]);
    played[0]!.enhancement = "glass";
    toDiscard(state, played);
    const all = endRound(state);
    expect(all.length).toBe(52);
    expect(all.find((c) => c.id === played[0]!.id)?.enhancement).toBe("glass");
  });

  it("同一 seed 洗牌结果可复现", () => {
    const a = newRound(deck, new Rng("SEED"));
    const b = newRound(deck, new Rng("SEED"));
    expect(a.drawPile.map((c) => c.id)).toEqual(b.drawPile.map((c) => c.id));
  });
});
