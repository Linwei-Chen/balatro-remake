/**
 * 计分管线（decisions.md D6）：事件队列模型。
 *
 * 出牌结算顺序（待 fact-table FT-CORE 逐项核对，标 [FT] 处引用之）：
 *  1. 牌型基础 chips/mult（FT-CORE-01 牌型表）
 *  2. hand_played 时机小丑（从左到右）
 *  3. 打出的牌从左到右逐张「计分」，每张计分内部顺序 [FT-CORE-03]：
 *     a. 卡牌基础点数 chips（FT-CORE-02）
 *     b. 版本 edition（foil/holo/poly，FT-CORE-04）
 *     c. 强化 enhancement（bonus/mult/wild/glass/lucky，FT-CORE-05）
 *     d. 小丑从左到右（card_scored 时机）
 *     e. Red seal → 整张牌重新计分一次 [FT-CORE-06]
 *  4. 手中计分阶段（held_scored）：钢铁牌 ×1.5、相关小丑，从左到右 [FT-CORE-07]
 *  5. 终值 = floor(chips × mult)
 *  6. 玻璃破碎、lucky 给钱等延迟/金钱事件在过程中排队与结算
 */

import { baseChips, type PlayingCard } from "./cards.js";
import type { HandType } from "./poker.js";
import { detectHand } from "./poker.js";
import type { Rng } from "./rng.js";
import {
  addChips,
  addMoney,
  addMult,
  timesMult,
  type JokerDef,
  type JokerInstance,
  type JokerTrigger,
  type ScoreContext,
  type TriggerLogEntry,
} from "./jokerRegistry.js";

/** 全部外部数值集中注入，出处 docs/fact-table.md */
export interface GameValues {
  pokerHands: Record<HandType, { chips: number; mult: number }>;
  edition: {
    foilChips: number; // FT-CORE-04 [待核对]
    holoMult: number;
    polyFactor: number;
  };
  enhancement: {
    bonusChips: number; // FT-CORE-05 [待核对]
    multAdd: number;
    glassFactor: number;
    glassBreakChance: number;
    luckyMoneyChance: number;
    luckyMoney: number;
    luckyMultChance: number;
    luckyMultFactor: number;
    steelFactor: number; // 手中计分
  };
  seal: {
    redRetriggers: number;
  };
}

export interface ScoringResult {
  handType: HandType;
  chips: number;
  mult: number;
  score: number;
  money: number;
  log: TriggerLogEntry[];
  destroyed: PlayingCard[];
}

export interface ScoringInput {
  playedCards: readonly PlayingCard[];
  heldCards: readonly PlayingCard[];
  jokers: readonly JokerInstance[];
  defs: ReadonlyMap<string, JokerDef>;
  rng: Rng;
  values: GameValues;
}

export function scoreHand(input: ScoringInput): ScoringResult {
  const { playedCards, heldCards, jokers, defs, rng, values } = input;
  const handType = detectHand(playedCards);
  const base = values.pokerHands[handType];

  const ctx: ScoreContext = {
    chips: base.chips,
    mult: base.mult,
    money: 0,
    handType,
    currentCard: null,
    playedCards,
    heldCards,
    jokers,
    currentJokerIndex: -1,
    rng,
    log: [],
    pendingDestroys: [],
    scoredCount: 0,
  };

  // 2. hand_played 时机
  fireJokers(ctx, defs, "hand_played");

  // 3. 逐张计分（从左到右）
  for (const card of playedCards) {
    if (card.destroyed) continue;
    scoreCardOnce(ctx, card, values, defs);
    // Red seal：重新触发整张牌
    for (let i = 0; i < values.seal.redRetriggers; i++) {
      if (card.seal === "red") {
        ctx.log.push({ source: "seal", cardId: card.id, detail: "Red Seal 重触发" });
        scoreCardOnce(ctx, card, values, defs);
      }
    }
    // 玻璃破碎判定（每次计分后）
    if (card.enhancement === "glass" && rng.chance(values.enhancement.glassBreakChance)) {
      ctx.pendingDestroys.push(card);
      ctx.log.push({ source: "enhancement", cardId: card.id, detail: "玻璃破碎" });
    }
  }

  // 4. 手中计分阶段
  for (const card of heldCards) {
    ctx.currentCard = card;
    if (card.enhancement === "steel") {
      timesMult(ctx, values.enhancement.steelFactor, "enhancement", card.id);
    }
    fireJokers(ctx, defs, "held_scored");
    ctx.currentCard = null;
  }

  // 5. 终值
  const score = Math.floor(ctx.chips * ctx.mult);

  // 6. 销毁排队
  for (const card of ctx.pendingDestroys) card.destroyed = true;

  return {
    handType,
    chips: ctx.chips,
    mult: ctx.mult,
    score,
    money: ctx.money,
    log: ctx.log,
    destroyed: ctx.pendingDestroys,
  };
}

/** 一张牌计分一次：基础点数 → edition → enhancement → 小丑 */
function scoreCardOnce(
  ctx: ScoreContext,
  card: PlayingCard,
  values: GameValues,
  defs: ReadonlyMap<string, JokerDef>,
): void {
  ctx.currentCard = card;
  ctx.scoredCount++;

  // a. 基础点数
  addChips(ctx, baseChips(card.rank), "card", card.id);

  // b. 版本
  if (card.edition === "foil") addChips(ctx, values.edition.foilChips, "edition", card.id);
  if (card.edition === "holo") addMult(ctx, values.edition.holoMult, "edition", card.id);
  if (card.edition === "poly") timesMult(ctx, values.edition.polyFactor, "edition", card.id);

  // c. 强化
  const enh = card.enhancement;
  if (enh === "bonus") addChips(ctx, values.enhancement.bonusChips, "enhancement", card.id);
  if (enh === "mult") addMult(ctx, values.enhancement.multAdd, "enhancement", card.id);
  if (enh === "glass") timesMult(ctx, values.enhancement.glassFactor, "enhancement", card.id);
  if (enh === "lucky") {
    if (ctx.rng.chance(values.enhancement.luckyMultChance)) {
      timesMult(ctx, values.enhancement.luckyMultFactor, "enhancement", card.id);
    }
    if (ctx.rng.chance(values.enhancement.luckyMoneyChance)) {
      addMoney(ctx, values.enhancement.luckyMoney, "enhancement", card.id);
    }
  }

  // d. 小丑（从左到右）
  fireJokers(ctx, defs, "card_scored");

  ctx.currentCard = null;
}

/** 按小丑排列顺序广播某时机事件 */
function fireJokers(
  ctx: ScoreContext,
  defs: ReadonlyMap<string, JokerDef>,
  trigger: JokerTrigger,
): void {
  for (let i = 0; i < ctx.jokers.length; i++) {
    const inst = ctx.jokers[i]!;
    const def = defs.get(inst.key);
    if (!def) continue;
    ctx.currentJokerIndex = i;
    for (const effect of def.effects) {
      if (effect.trigger !== trigger) continue;
      if (effect.condition && !effect.condition(ctx)) continue;
      effect.action(ctx);
    }
  }
  ctx.currentJokerIndex = -1;
}
