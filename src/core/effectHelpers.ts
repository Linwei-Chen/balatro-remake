/**
 * 小丑效果构造器库：trigger × condition × action 的类型化快捷方式。
 * Phase C 灌装时每个小丑用这些构造器组合出效果，计分管线按 trigger 分发，
 * 不存在巨型 if-else（decisions.md D4）。
 */

import type { Enhancement, Edition, PlayingCard, Rank, Suit } from "./cards.js";
import { isFace } from "./cards.js";
import type { HandType } from "./poker.js";
import type { JokerDef, JokerEffect, JokerTrigger, Rarity, ScoreContext } from "./jokerRegistry.js";

/** 小丑定义快捷构造器 */
export function def(
  key: string,
  name: string,
  rarity: Rarity,
  cost: readonly [number, number],
  effects: JokerEffect[],
  unlock: string | null = null,
): JokerDef {
  return { key, name, rarity, cost, effects, unlock };
}

type Action = (ctx: ScoreContext) => void;
type Cond = (ctx: ScoreContext) => boolean;

// ---------- trigger 构造器 ----------

export function onHandPlayed(
  action: Action,
  description: string,
  condition?: Cond,
): JokerEffect {
  return { trigger: "hand_played", condition, action, description };
}

export function onCardScored(
  action: Action,
  description: string,
  condition?: Cond,
): JokerEffect {
  return { trigger: "card_scored", condition, action, description };
}

export function onHeldScored(
  action: Action,
  description: string,
  condition?: Cond,
): JokerEffect {
  return { trigger: "held_scored", condition, action, description };
}

export function onCardDiscarded(
  action: Action,
  description: string,
  condition?: Cond,
): JokerEffect {
  return { trigger: "card_discarded", condition, action, description };
}

export function onBlindStart(action: Action, description: string): JokerEffect {
  return { trigger: "blind_start", action, description };
}

export function onRoundEnd(action: Action, description: string): JokerEffect {
  return { trigger: "round_end", action, description };
}

// ---------- condition 构造器 ----------

/** 当前计分牌花色匹配（wild 视为全花色 [FT 待核对]） */
export function suitIs(suit: Suit): Cond {
  return (ctx) =>
    ctx.currentCard !== null &&
    (ctx.currentCard.suit === suit || ctx.currentCard.enhancement === "wild");
}

export function rankIs(rank: Rank): Cond {
  return (ctx) => ctx.currentCard?.rank === rank;
}

export function cardIsFace(): Cond {
  return (ctx) => ctx.currentCard !== null && isFace(ctx.currentCard);
}

export function enhIs(enh: Enhancement): Cond {
  return (ctx) => ctx.currentCard?.enhancement === enh;
}

export function editionIs(ed: Edition): Cond {
  return (ctx) => ctx.currentCard?.edition === ed;
}

export function handTypeIn(...types: HandType[]): Cond {
  return (ctx) => types.includes(ctx.handType);
}

/** 本手牌打出的张数 */
export function playedCountAtLeast(n: number): Cond {
  return (ctx) => ctx.playedCards.length >= n;
}

// ---------- action 构造器（统一写结算日志） ----------

function log(ctx: ScoreContext, detail: string): void {
  ctx.log.push({ source: ctx.activeJokerKey ?? "unknown_joker", detail });
}

export function addMult(n: number): Action {
  return (ctx) => {
    ctx.mult += n;
    log(ctx, `+${n} Mult`);
  };
}

export function addChipsN(n: number): Action {
  return (ctx) => {
    ctx.chips += n;
    log(ctx, `+${n} Chips`);
  };
}

export function xMult(f: number): Action {
  return (ctx) => {
    ctx.mult *= f;
    log(ctx, `x${f} Mult`);
  };
}

export function earnMoney(n: number): Action {
  return (ctx) => {
    ctx.money += n;
    log(ctx, `$${n >= 0 ? "+" : ""}${n}`);
  };
}

/** 组合多个 action */
export function seq(...actions: Action[]): Action {
  return (ctx) => {
    for (const a of actions) a(ctx);
  };
}

/** 计数器谓词工厂：每 n 次触发一次（部分小丑用） */
export function everyNth(n: number, get: (ctx: ScoreContext) => number, set: (ctx: ScoreContext, v: number) => void): Cond {
  return (ctx) => {
    const v = get(ctx) + 1;
    set(ctx, v);
    return v % n === 0;
  };
}
