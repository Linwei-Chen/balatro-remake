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
import { detectHandWithRules } from "./poker.js";
import { handValue, initialHandLevels, type HandLevels } from "./hands.js";
import { Rng } from "./rng.js";
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
  edition: {
    foilChips: number; // FT-CORE-04 ✅
    holoMult: number;
    polyFactor: number;
  };
  enhancement: {
    bonusChips: number; // FT-CORE-05 ✅ wiki+代码双源
    multAdd: number;
    glassFactor: number;
    glassBreakChance: number;
    stoneChips: number; // Stone 牌 +50 chips、无点数无花色
    luckyMultChance: number; // 1/5 概率
    luckyMultBonus: number; // +20 Mult（加法！非乘法）
    luckyMoneyChance: number; // 1/15 概率
    luckyMoney: number;
    steelFactor: number; // 手中计分
  };
  seal: {
    redRetriggers: number;
    goldSealMoney: number; // Gold Seal：打出并计分时 $3（FT-CORE-06）
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
  /** 牌型等级（星球牌升级）；缺省 = 全部 1 级 */
  handLevels?: HandLevels;
  /** 当前持有资金（Bull 等用）；缺省 0 */
  funds?: number;
  /** 剩余出牌次数（Acrobat 等用） */
  handsLeft?: number;
  /** 本手牌是本回合第几手（从 1 计） */
  handIndex?: number;
  /** 引擎规则标志（Four Fingers 等） */
  rules?: import("./jokerRegistry.js").EngineRules;
  /** 剩余弃牌次数（Mystic Summit 等用） */
  discardsLeft?: number;
  /** 当前牌组张数（Blue Joker 等用） */
  deckSize?: number;
  /** 本回合已打出的牌型（Card Sharp 等用） */
  handsPlayedTypes?: HandType[];
}

export function scoreHand(input: ScoringInput): ScoringResult {
  const { playedCards, heldCards, jokers, defs, rng, values } = input;
  const handType = detectHandWithRules(playedCards, input.rules);
  const base = handValue(input.handLevels ?? initialHandLevels(), handType);

  const ctx: ScoreContext = {
    chips: base.chips,
    mult: base.mult,
    money: 0,
    funds: input.funds ?? 0,
    handsLeft: input.handsLeft ?? 1,
    handIndex: input.handIndex ?? 1,
    rules: input.rules ?? {},
    discardsLeft: input.discardsLeft ?? 0,
    deckSize: input.deckSize ?? 52,
    handsPlayedTypes: input.handsPlayedTypes ?? [],
    handType,
    currentCard: null,
    playedCards,
    heldCards,
    jokers,
    currentJokerIndex: -1,
    activeJokerKey: null,
    rng,
    log: [],
    pendingDestroys: [],
    scoredCount: 0,
    pendingRetriggers: 0,
    defsRef: defs,
  };

  // 2. hand_played 时机
  fireJokers(ctx, defs, "hand_played", values);

  // 3. 逐张计分（从左到右）
  for (const card of playedCards) {
    if (card.destroyed) continue;
    // currentCard 保持到重触发收集结束（Hack/Sock 等条件依赖当前牌）
    ctx.currentCard = card;
    scoreCardOnce(ctx, card, values, defs);
    // Red seal：重新触发整张牌
    for (let i = 0; i < values.seal.redRetriggers; i++) {
      if (card.seal === "red") {
        ctx.log.push({ source: "seal", cardId: card.id, detail: "Red Seal 重触发" });
        scoreCardOnce(ctx, card, values, defs);
      }
    }
    // 小丑重触发（Hanging Chad / Hack / Sock and Buskin / Dusk）
    const retriggers = collectRetriggers(ctx, defs, "scored");
    for (let i = 0; i < retriggers; i++) {
      scoreCardOnce(ctx, card, values, defs);
    }
    ctx.currentCard = null;
    // 玻璃破碎判定（每次计分后）
    if (card.enhancement === "glass" && rng.chance(values.enhancement.glassBreakChance)) {
      ctx.pendingDestroys.push(card);
      ctx.log.push({ source: "enhancement", cardId: card.id, detail: "玻璃破碎" });
    }
  }

  // 4. 手中计分阶段
  for (const card of heldCards) {
    ctx.currentCard = card;
    applyHeldOnce(ctx, values, defs);
    // Mime：重触发手中能力（steel + held 小丑再来一次）
    const heldRetriggers = collectRetriggers(ctx, defs, "held");
    for (let i = 0; i < heldRetriggers; i++) {
      applyHeldOnce(ctx, values, defs);
    }
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

/** 一张牌计分一次。内部顺序 [FT-CORE-03 ✅ wiki+代码双源]：
 *  基础点数 → 强化 → 封印 → 版本 → on-scored 小丑 */
function scoreCardOnce(
  ctx: ScoreContext,
  card: PlayingCard,
  values: GameValues,
  defs: ReadonlyMap<string, JokerDef>,
): void {
  ctx.currentCard = card;
  ctx.scoredCount++;

  // a. 基础点数：Stone 无点数无花色 → +50 替代牌面点数
  if (card.enhancement === "stone") {
    addChips(ctx, values.enhancement.stoneChips, "card", card.id);
  } else {
    addChips(ctx, baseChips(card.rank), "card", card.id);
  }

  // b. 强化（Bonus 属点数步，紧跟牌面点数）
  const enh = card.enhancement;
  if (enh === "bonus") addChips(ctx, values.enhancement.bonusChips, "enhancement", card.id);
  if (enh === "mult") addMult(ctx, values.enhancement.multAdd, "enhancement", card.id);
  if (enh === "glass") timesMult(ctx, values.enhancement.glassFactor, "enhancement", card.id);
  if (enh === "lucky") {
    // Lucky：1/5 概率 +20 Mult（加法），1/15 概率 $20 [FT-CORE-05 ✅ 代码佐证]
    if (ctx.rng.chance(values.enhancement.luckyMultChance)) {
      addMult(ctx, values.enhancement.luckyMultBonus, "enhancement", card.id);
    }
    if (ctx.rng.chance(values.enhancement.luckyMoneyChance)) {
      addMoney(ctx, values.enhancement.luckyMoney, "enhancement", card.id);
    }
  }

  // c. 封印（Gold Seal 打出并计分时 $3）
  if (card.seal === "gold") {
    addMoney(ctx, values.seal.goldSealMoney, "seal", card.id);
  }

  // d. 版本
  if (card.edition === "foil") addChips(ctx, values.edition.foilChips, "edition", card.id);
  if (card.edition === "holo") addMult(ctx, values.edition.holoMult, "edition", card.id);
  if (card.edition === "poly") timesMult(ctx, values.edition.polyFactor, "edition", card.id);

  // e. 小丑（从左到右）
  fireJokers(ctx, defs, "card_scored", values);
}

/** 手中单张的一次完整计分（steel + held 小丑） */
function applyHeldOnce(
  ctx: ScoreContext,
  values: GameValues,
  defs: ReadonlyMap<string, JokerDef>,
): void {
  if (ctx.currentCard?.enhancement === "steel") {
    timesMult(ctx, values.enhancement.steelFactor, "enhancement", ctx.currentCard.id);
  }
  fireJokers(ctx, defs, "held_scored", values);
}

/** 收集本轮牌的小丑重触发数（retrigger 时机；按 effect.retriggerPhase 过滤阶段） */
function collectRetriggers(
  ctx: ScoreContext,
  defs: ReadonlyMap<string, JokerDef>,
  phase: "scored" | "held",
): number {
  let total = 0;
  for (let i = 0; i < ctx.jokers.length; i++) {
    const inst = ctx.jokers[i]!;
    const def = defs.get(inst.key);
    if (!def) continue;
    ctx.currentJokerIndex = i;
    ctx.activeJokerKey = inst.key;
    for (const effect of def.effects) {
      if (effect.trigger !== "retrigger") continue;
      if (effect.retriggerPhase && effect.retriggerPhase !== phase) continue;
      if (effect.condition && !effect.condition(ctx)) continue;
      ctx.pendingRetriggers = 0;
      effect.action(ctx);
      total += ctx.pendingRetriggers;
      ctx.pendingRetriggers = 0;
    }
  }
  ctx.currentJokerIndex = -1;
  ctx.activeJokerKey = null;
  return total;
}

/** 回合末（cash out 前）小丑结算：目前支持无条件 earnMoney 型（Golden Joker 等）。
 *  返回入账金额；counters 增值类（Egg 等）待 run 集成时扩展。 */
export function roundEndPayout(
  jokers: readonly JokerInstance[],
  defs: ReadonlyMap<string, JokerDef>,
  values: GameValues,
): { money: number; log: TriggerLogEntry[] } {
  const ctx: ScoreContext = {
    chips: 0,
    mult: 0,
    money: 0,
    funds: 0,
    handsLeft: 0,
    handIndex: 1,
    rules: {},
    discardsLeft: 0,
    deckSize: 0,
    handsPlayedTypes: [],
    handType: "HIGH_CARD",
    currentCard: null,
    playedCards: [],
    heldCards: [],
    jokers,
    currentJokerIndex: -1,
    activeJokerKey: null,
    rng: new Rng("round-end"),
    log: [],
    pendingDestroys: [],
    scoredCount: 0,
    pendingRetriggers: 0,
  };
  fireJokers(ctx, defs, "round_end", values);
  return { money: ctx.money, log: ctx.log };
}

/** 按小丑排列顺序广播某时机事件；小丑自身版本在其触发后结算 [FT-CORE-04] */
function fireJokers(
  ctx: ScoreContext,
  defs: ReadonlyMap<string, JokerDef>,
  trigger: JokerTrigger,
  values: GameValues,
): void {
  for (let i = 0; i < ctx.jokers.length; i++) {
    const inst = ctx.jokers[i]!;
    const def = defs.get(inst.key);
    if (!def) continue;
    ctx.currentJokerIndex = i;
    ctx.activeJokerKey = inst.key;
    let fired = false;
    for (const effect of def.effects) {
      if (effect.trigger !== trigger) continue;
      if (effect.condition && !effect.condition(ctx)) continue;
      effect.action(ctx);
      fired = true;
    }
    // 小丑版本：每次实际触发后结算（Negative 在槽位计算时处理，不在计分中）
    if (fired && inst.edition && inst.edition !== "base" && inst.edition !== "negative") {
      if (inst.edition === "foil") addChips(ctx, values.edition.foilChips, "edition", undefined);
      if (inst.edition === "holo") addMult(ctx, values.edition.holoMult, "edition", undefined);
      if (inst.edition === "poly") timesMult(ctx, values.edition.polyFactor, "edition", undefined);
    }
  }
  ctx.currentJokerIndex = -1;
  ctx.activeJokerKey = null;
}
