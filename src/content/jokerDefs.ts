/**
 * 小丑灌装层：ContentJokerRecord（采集数据）→ 可执行 JokerDef（注册器配置）。
 * 已实现的小丑逐条在 IMPLEMENTED_KEYS；未实现的返回 null 并记录在 coverage.md。
 * 每个实现的配置都引用采集参数（params），数值不在此处硬编码。
 */

import { JOKER_RECORDS, type ContentJokerRecord } from "./jokers.data.js";
import {
  addChipsN,
  addMult,
  cardIsFace,
  def,
  earnMoney,
  enhIs,
  handTypeIn,
  onCardScored,
  onHandPlayed,
  onHeldScored,
  onRoundEnd,
  rankIs,
  suitIs,
  xMult,
  type Cond,
} from "../core/effectHelpers.js";
import { isFace, type Suit } from "../core/cards.js";
import type { HandType } from "../core/poker.js";
import type { JokerDef, ScoreContext } from "../core/jokerRegistry.js";

const SUIT_MAP: Record<string, Suit> = {
  Diamonds: "D",
  Hearts: "H",
  Spades: "S",
  Clubs: "C",
};

/** "Pair"→PAIR 等采集名归一化 */
function handName(s: string): HandType | null {
  const m: Record<string, HandType> = {
    Pair: "PAIR",
    "Two Pair": "TWO_PAIR",
    "Three of a Kind": "THREE_OF_A_KIND",
    Straight: "STRAIGHT",
    Flush: "FLUSH",
    "Full House": "FULL_HOUSE",
    "Four of a Kind": "FOUR_OF_A_KIND",
    "Straight Flush": "STRAIGHT_FLUSH",
    "Five of a Kind": "FIVE_OF_A_KIND",
    "Flush House": "FLUSH_HOUSE",
    "Flush Five": "FLUSH_FIVE",
    "High Card": "HIGH_CARD",
  };
  return m[s] ?? null;
}

/** 「手牌包含 X」谓词：比最高牌型更宽（如葫芦包含一对） */
function handContains(type: HandType): Cond {
  return (ctx) => {
    const ranks = ctx.playedCards.filter((c) => c.enhancement !== "stone").map((c) => c.rank);
    const counts = new Map<number, number>();
    for (const r of ranks) counts.set(r, (counts.get(r) ?? 0) + 1);
    const maxCount = Math.max(0, ...counts.values());
    switch (type) {
      case "PAIR":
        return maxCount >= 2;
      case "TWO_PAIR":
        return [...counts.values()].filter((n) => n >= 2).length >= 2;
      case "THREE_OF_A_KIND":
        return maxCount >= 3;
      case "FOUR_OF_A_KIND":
        return maxCount >= 4;
      case "FIVE_OF_A_KIND":
        return maxCount >= 5;
      case "FLUSH":
        return hasFlushRun(ctx, 5);
      case "STRAIGHT":
        return hasStraightRun(ctx, 5);
      default:
        // 葫芦/同花顺等复合型按最高牌型近似
        return ctx.handType === type;
    }
  };
}

function hasFlushRun(ctx: ScoreContext, need: number): boolean {
  const suits = ["S", "H", "C", "D"] as const;
  for (const s of suits) {
    if (ctx.playedCards.filter((c) => c.suit === s || c.enhancement === "wild").length >= need) {
      return true;
    }
  }
  return false;
}

function hasStraightRun(ctx: ScoreContext, need: number): boolean {
  const ranks = [...new Set(ctx.playedCards.map((c) => c.rank))].sort((a, b) => a - b);
  if (ranks.length < need) return false;
  for (let i = 0; i + need <= ranks.length; i++) {
    let ok = true;
    for (let j = 1; j < need; j++) {
      if ((ranks[i + j] as number) !== (ranks[i + j - 1] as number) + 1) {
        ok = false;
        break;
      }
    }
    if (ok) return true;
  }
  // 轮子
  if (need === 5 && [14, 2, 3, 4, 5].every((r) => ranks.includes(r))) return true;
  return false;
}

function num(p: Record<string, unknown>, key: string, fallback: number): number {
  const v = p[key];
  return typeof v === "number" ? v : fallback;
}

/** 每张计分牌的条件与加成（per_scored_card 族） */
function perScoredCardEffects(p: Record<string, unknown>): JokerDef["effects"] {
  const psc = p.per_scored_card as Record<string, unknown>;
  const effects: JokerDef["effects"] = [];
  const mult = typeof psc.mult === "number" ? psc.mult : 0;
  const chips = typeof psc.chips === "number" ? psc.chips : 0;
  const dollars = typeof psc.dollars === "number" ? psc.dollars : 0;
  const chance = psc.chance as { numerator: number; denominator: number } | undefined;

  let cond: Cond | undefined;
  if (typeof psc.suit === "string") {
    const suit = SUIT_MAP[psc.suit];
    cond = suit ? suitIs(suit) : undefined;
  } else if (Array.isArray(psc.ranks)) {
    const ranks = (psc.ranks as (string | number)[]).map((r) => (r === "A" ? 14 : Number(r)));
    cond = (ctx) => ctx.currentCard !== null && ranks.includes(ctx.currentCard.rank);
  } else if (psc.card_type === "face") {
    cond = cardIsFace();
  } else if (typeof psc.card_enhancement === "string") {
    const enh = psc.card_enhancement.toLowerCase();
    cond = enhIs(enh as never);
  }

  const action = (ctx: ScoreContext) => {
    if (mult) addMult(mult)(ctx);
    if (chips) addChipsN(chips)(ctx);
    if (dollars) {
      if (chance) {
        if (ctx.rng.chance(chance.numerator / chance.denominator)) earnMoney(dollars)(ctx);
      } else {
        earnMoney(dollars)(ctx);
      }
    }
  };
  effects.push(onCardScored(action, String(p.effect ?? "per scored card"), cond));
  return effects;
}

/** 重触发提供者（retrigger 族）。采集 schema 两种：
 *  {retrigger:{target,additional_times}}（Hanging Chad）与
 *  {retrigger_count, target?/ranks?/condition?}（Mime/Sock/Hack/Dusk） */
function retriggerEffects(p: Record<string, unknown>): JokerDef["effects"] | null {
  const ret = p.retrigger as { target?: string; additional_times?: number } | undefined;
  const count = typeof p.retrigger_count === "number" ? p.retrigger_count : ret?.additional_times;
  if (typeof count !== "number") return null;
  const action = (ctx: ScoreContext) => {
    ctx.pendingRetriggers += count;
  };
  const trigger: "retrigger" = "retrigger";
  const target = (p.target ?? ret?.target) as string | undefined;
  let condition: Cond | undefined;
  let phase: "scored" | "held" = "scored";
  if (target === "first_scored_card") {
    condition = (ctx) => ctx.scoredCount === 1; // Hanging Chad
  } else if (Array.isArray(p.ranks)) {
    const ranks = (p.ranks as (string | number)[]).map((r) => Number(r)); // Hack
    condition = (ctx) => ctx.currentCard !== null && ranks.includes(ctx.currentCard!.rank);
  } else if (target === "played_face_cards") {
    condition = cardIsFace(); // Sock and Buskin
  } else if (target === "held_in_hand_abilities") {
    phase = "held"; // Mime：无附加条件，仅在 held 阶段收集
  } else if (p.condition === "final_hand_of_round") {
    condition = (ctx) => ctx.handsLeft === 1; // Dusk
  }
  return [ { trigger, condition, action, description: `重触发 ×${count}`, retriggerPhase: phase } ];
}

// ---------- 每 joker 特化构建 ----------

type Builder = (r: ContentJokerRecord) => JokerDef | null;

function simpleHandContains(r: ContentJokerRecord): JokerDef | null {
  const p = r.params;
  const type = handName(String(p.hand_contains));
  if (!type) return null;
  const effects: JokerDef["effects"] = [];
  if (typeof p.mult === "number") {
    effects.push(onHandPlayed(addMult(p.mult), `+${p.mult} Mult`, handContains(type)));
  }
  if (typeof p.chips === "number") {
    effects.push(onHandPlayed(addChipsN(p.chips), `+${p.chips} Chips`, handContains(type)));
  }
  return def(r.key, r.name, r.rarity, [r.cost, r.cost], effects, r.unlock);
}

function simpleHandXmult(r: ContentJokerRecord): JokerDef | null {
  const p = r.params;
  const type = handName(String(p.hand));
  const factor = typeof p.x_mult === "number" ? p.x_mult : null;
  if (!type || factor === null) return null;
  return def(r.key, r.name, r.rarity, [r.cost, r.cost], [
    onHandPlayed(xMult(factor), `X${factor} Mult`, handTypeIn(type)),
  ], r.unlock);
}

function conditionJoker(r: ContentJokerRecord): JokerDef | null {
  const p = r.params;
  const condStr = String(p.condition ?? "");
  const effects: JokerDef["effects"] = [];
  let condition: Cond | undefined;
  switch (condStr) {
    case "played_cards_count<=3":
      condition = (ctx) => ctx.playedCards.length <= 3;
      break;
    case "discards_remaining==0":
      condition = (ctx) => ctx.discardsLeft === 0;
      break;
    case "all_held_cards_spades_or_clubs":
      condition = (ctx) =>
        ctx.heldCards.every((c) => c.suit === "S" || c.suit === "C" || c.enhancement === "wild");
      break;
    case "final_hand_of_round":
      condition = (ctx) => ctx.handsLeft === 1;
      break;
    case "hand_contains_all_four_suits":
      condition = (ctx) => {
        const suits = new Set(ctx.playedCards.map((c) => c.suit));
        return suits.size >= 4 || ctx.playedCards.some((c) => c.enhancement === "wild");
      };
      break;
    case "hand_type_already_played_this_round":
      condition = (ctx) => ctx.handsPlayedTypes.includes(ctx.handType);
      break;
    default:
      return null;
  }
  if (typeof p.mult === "number") effects.push(onHandPlayed(addMult(p.mult), `+${p.mult} Mult`, condition));
  if (typeof p.chips === "number") effects.push(onHandPlayed(addChipsN(p.chips), `+${p.chips} Chips`, condition));
  if (typeof p.x_mult === "number") effects.push(onHandPlayed(xMult(p.x_mult), `X${p.x_mult} Mult`, condition));
  if (typeof p.dollars === "number") effects.push(onHandPlayed(earnMoney(p.dollars), `$${p.dollars}`, condition));
  if (effects.length === 0) return null;
  return def(r.key, r.name, r.rarity, [r.cost, r.cost], effects, r.unlock);
}

function statModJoker(r: ContentJokerRecord): JokerDef | null {
  const p = r.params;
  const mods: JokerDef["statMods"] = {};
  if (typeof p.hand_size === "number") mods.handSize = p.hand_size;
  if (typeof p.hand_size_bonus === "number") mods.handSize = p.hand_size_bonus;
  if (typeof p.discards_bonus === "number") mods.discards = p.discards_bonus;
  if (typeof p.discards === "number") mods.discards = p.discards;
  if (typeof p.hands_per_round === "number") mods.handsPerRound = p.hands_per_round;
  if (p.discards_set_to === 0) mods.blindStartDiscardsSetTo = 0;
  if (typeof p.hands_gained === "number") mods.blindStartHandsGain = p.hands_gained;
  if (Object.keys(mods).length === 0) return null;
  const effects: JokerDef["effects"] = [];
  if (typeof p.chips === "number") {
    effects.push(onHandPlayed(addChipsN(p.chips), `+${p.chips} Chips`));
  }
  const d = def(r.key, r.name, r.rarity, [r.cost, r.cost], effects, r.unlock);
  d.statMods = mods;
  return d;
}

const SPECIAL_BUILDERS: Record<string, Builder> = {
  j_joker: (r) =>
    def(r.key, r.name, r.rarity, [r.cost, r.cost], [onHandPlayed(addMult(4), "+4 Mult")], r.unlock),

  j_misprint: (r) => {
    const lo = num(r.params, "mult_min", 0);
    const hi = num(r.params, "mult_max", 23);
    return def(r.key, r.name, r.rarity, [r.cost, r.cost], [
      onHandPlayed((ctx) => {
        const n = lo + ctx.rng.nextInt(hi - lo + 1);
        addMult(n)(ctx);
      }, `+${lo}-${hi} Mult（每手重随机）`),
    ], r.unlock);
  },

  j_abstract: (r) =>
    def(r.key, r.name, r.rarity, [r.cost, r.cost], [
      onHandPlayed((ctx) => addMult(num(r.params, "mult_per_joker_owned", 3) * ctx.jokers.length)(ctx), "+3 Mult/每张小丑"),
    ], r.unlock),

  j_blue_joker: (r) =>
    def(r.key, r.name, r.rarity, [r.cost, r.cost], [
      onHandPlayed((ctx) => addChipsN(num(r.params, "chips_per_card_remaining_in_deck", 2) * ctx.deckSize)(ctx), "+2 Chips/牌组每张"),
    ], r.unlock),

  j_bull: (r) =>
    def(r.key, r.name, r.rarity, [r.cost, r.cost], [
      onHandPlayed((ctx) => addChipsN(num(r.params, "chips_per_dollar", 2) * ctx.funds)(ctx), "+2 Chips/每$1"),
    ], r.unlock),

  j_golden: (r) =>
    def(r.key, r.name, r.rarity, [r.cost, r.cost], [
      onRoundEnd(earnMoney(num(r.params, "dollars_per_round_end", 4)), `$${r.params.dollars_per_round_end}/回合末`),
    ], r.unlock),

  j_ride_the_bus: (r) => {
    const gain = (r.params.scaling as Record<string, unknown>).mult_gain_per_hand as number;
    return def(r.key, r.name, r.rarity, [r.cost, r.cost], [
      onHandPlayed((ctx) => {
        const hasFace = ctx.playedCards.some((c) => c.enhancement === "wild" || isFace(c));
        if (hasFace) ctx.jokers[ctx.currentJokerIndex]!.counters.streak = 0;
        else ctx.jokers[ctx.currentJokerIndex]!.counters.streak = (ctx.jokers[ctx.currentJokerIndex]!.counters.streak ?? 0) + 1;
        const n = ctx.jokers[ctx.currentJokerIndex]!.counters.streak ?? 0;
        if (n > 0) addMult(n * gain)(ctx);
      }, "连击：无面牌出牌 +1 Mult"),
    ], r.unlock);
  },

  j_runner: (r) => {
    const gain = (r.params.scaling as Record<string, unknown>).chips_gain_per_hand as number;
    return def(r.key, r.name, r.rarity, [r.cost, r.cost], [
      onHandPlayed((ctx) => {
        if (hasStraightRun(ctx, 4)) {
          const inst = ctx.jokers[ctx.currentJokerIndex]!;
          inst.counters.chips = (inst.counters.chips ?? 0) + gain;
        }
        addChipsN(ctx.jokers[ctx.currentJokerIndex]!.counters.chips ?? 0)(ctx);
      }, "每次出牌含顺子 +15 Chips（永久累积）"),
    ], r.unlock);
  },

  j_square: (r) => {
    const gain = (r.params.scaling as Record<string, unknown>).chips_gain_per_hand as number;
    return def(r.key, r.name, r.rarity, [r.cost, r.cost], [
      onHandPlayed((ctx) => {
        if (ctx.playedCards.length === 4) {
          const inst = ctx.jokers[ctx.currentJokerIndex]!;
          inst.counters.chips = (inst.counters.chips ?? 0) + gain;
        }
        addChipsN(ctx.jokers[ctx.currentJokerIndex]!.counters.chips ?? 0)(ctx);
      }, "出 4 张牌 +4 Chips（永久累积）"),
    ], r.unlock);
  },

  j_wee: (r) => {
    const gain = num(r.params, "chips_gain", 8);
    return def(r.key, r.name, r.rarity, [r.cost, r.cost], [
      onCardScored((ctx) => {
        const inst = ctx.jokers[ctx.currentJokerIndex]!;
        inst.counters.chips = (inst.counters.chips ?? 0) + gain;
      }, "2 被计分 +8 Chips（永久）", rankIs(2)),
      onHandPlayed((ctx) => addChipsN(ctx.jokers[ctx.currentJokerIndex]!.counters.chips ?? 0)(ctx), "累计 Chips"),
    ], r.unlock);
  },

  j_photograph: (r) =>
    def(r.key, r.name, r.rarity, [r.cost, r.cost], [
      onCardScored(xMult(num(r.params, "xmult", 2)), "首张计分人头牌 X2", (ctx) =>
        ctx.currentCard !== null && isFace(ctx.currentCard) && ctx.scoredCount === 1),
    ], r.unlock),

  j_baseball_card: (r) => {
    const factor = num(r.params, "x_mult_per_uncommon_joker_held", 1.5);
    return def(r.key, r.name, r.rarity, [r.cost, r.cost], [
      onHandPlayed((ctx) => {
        void r;
        for (const inst of ctx.jokers) {
          if (inst.key === "j_baseball_card") continue;
          if (ctx.defsRef?.get(inst.key)?.rarity === "uncommon") xMult(factor)(ctx);
        }
      }, "每张罕见小丑 X1.5 Mult"),
    ], r.unlock);
  },

  j_four_fingers: (r) =>
    Object.assign(
      def(r.key, r.name, r.rarity, [r.cost, r.cost], [], r.unlock),
      { rules: { minFlushCards: 4, minStraightCards: 4 } },
    ),

  j_shortcut: (r) =>
    Object.assign(
      def(r.key, r.name, r.rarity, [r.cost, r.cost], [], r.unlock),
      { rules: { maxRankGap: 1 } },
    ),

  j_pareidolia: (r) =>
    Object.assign(
      def(r.key, r.name, r.rarity, [r.cost, r.cost], [], r.unlock),
      { rules: { allCardsAreFace: true } },
    ),
};

// retrigger 提供者单独构建
const RETRIGGER_BUILDERS: Record<string, Builder> = {
  j_mime: (r) => {
    const effs = retriggerEffects(r.params);
    return effs ? def(r.key, r.name, r.rarity, [r.cost, r.cost], effs, r.unlock) : null;
  },
  j_hanging_chad: (r) => {
    const effs = retriggerEffects(r.params);
    return effs ? def(r.key, r.name, r.rarity, [r.cost, r.cost], effs, r.unlock) : null;
  },
  j_hack: (r) => {
    const effs = retriggerEffects(r.params);
    return effs ? def(r.key, r.name, r.rarity, [r.cost, r.cost], effs, r.unlock) : null;
  },
  j_dusk: (r) => {
    const effs = retriggerEffects(r.params);
    return effs ? def(r.key, r.name, r.rarity, [r.cost, r.cost], effs, r.unlock) : null;
  },
  j_sock_and_buskin: (r) => {
    const effs = retriggerEffects(r.params);
    return effs ? def(r.key, r.name, r.rarity, [r.cost, r.cost], effs, r.unlock) : null;
  },
};

const STATMOD_KEYS = new Set([
  "j_juggler", "j_drunkard", "j_troubadour", "j_merry_andy", "j_stuntman", "j_burglar",
]);

/** 主入口：构建单个小丑；未实现返回 null */
export function buildJokerDef(record: ContentJokerRecord): JokerDef | null {
  const r = record;
  const special = SPECIAL_BUILDERS[r.key];
  if (special) return special(r);
  if (RETRIGGER_BUILDERS[r.key]) return RETRIGGER_BUILDERS[r.key]!(r);

  const p = r.params;
  // 模板族匹配（按优先级）
  if (r.key === "j_stencil") return null; // 槽位计算待 run 集成
  if (p.per_scored_card) {
    const effects = perScoredCardEffects(p);
    return def(r.key, r.name, r.rarity, [r.cost, r.cost], effects, r.unlock);
  }
  if (p.hand_contains) return simpleHandContains(r);
  if (p.hand && p.x_mult !== undefined) return simpleHandXmult(r);
  if (p.condition && (p.mult !== undefined || p.chips !== undefined || p.x_mult !== undefined || p.dollars !== undefined)) {
    return conditionJoker(r);
  }
  if (STATMOD_KEYS.has(r.key)) return statModJoker(r);
  return null;
}

/** 构建全部已实现小丑；同时输出未实现清单 */
export function buildAllJokerDefs(): {
  defs: Map<string, JokerDef>;
  implemented: string[];
  pending: string[];
} {
  const defs = new Map<string, JokerDef>();
  const implemented: string[] = [];
  const pending: string[] = [];
  for (const record of JOKER_RECORDS) {
    const built = buildJokerDef(record);
    if (built) {
      defs.set(record.key, built);
      implemented.push(record.key);
    } else {
      pending.push(record.key);
    }
  }
  return { defs, implemented, pending };
}
