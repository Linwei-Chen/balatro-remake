/**
 * 牌堆管理：抽牌堆 / 手牌 / 弃牌堆。
 * 规则 [FT-PLAY-01 待核对]：
 * - 回合开始：洗牌，抽满手牌上限；
 * - 出牌/弃牌的牌进入弃牌堆；
 * - 抽牌堆空时，弃牌堆重洗为抽牌堆（局内循环）；
 * - 回合结束所有牌回到牌组（强化/版本保留）。
 */

import type { PlayingCard } from "./cards.js";
import type { Rng } from "./rng.js";

export interface DeckState {
  drawPile: PlayingCard[];
  hand: PlayingCard[];
  discardPile: PlayingCard[];
}

export function newRound(deck: readonly PlayingCard[], rng: Rng): DeckState {
  return { drawPile: rng.shuffle(deck), hand: [], discardPile: [] };
}

/** 从抽牌堆抽 n 张；不够则重洗弃牌堆继续（返回实际抽到的牌） */
export function drawCards(state: DeckState, n: number, rng: Rng): PlayingCard[] {
  const drawn: PlayingCard[] = [];
  for (let i = 0; i < n; i++) {
    if (state.drawPile.length === 0) {
      if (state.discardPile.length === 0) break;
      state.drawPile = rng.shuffle(state.discardPile);
      state.discardPile = [];
    }
    const card = state.drawPile.shift();
    if (card) {
      state.hand.push(card);
      drawn.push(card);
    }
  }
  return drawn;
}

/** 打出的牌移入手牌区之外的结算区（不动牌堆） */
export function playCards(state: DeckState, ids: readonly string[]): PlayingCard[] {
  const played: PlayingCard[] = [];
  for (const id of ids) {
    const idx = state.hand.findIndex((c) => c.id === id);
    if (idx === -1) throw new Error(`手牌中没有 ${id}`);
    const [card] = state.hand.splice(idx, 1);
    if (card) played.push(card);
  }
  return played;
}

/** 结算完成后（计分/弃牌）把牌送进弃牌堆 */
export function toDiscard(state: DeckState, cards: readonly PlayingCard[]): void {
  state.discardPile.push(...cards);
}

/** 回合结束：全部牌回牌组（保留强化等属性） */
export function endRound(state: DeckState): PlayingCard[] {
  const all = [...state.drawPile, ...state.hand, ...state.discardPile];
  state.drawPile = all;
  state.hand = [];
  state.discardPile = [];
  return all;
}
