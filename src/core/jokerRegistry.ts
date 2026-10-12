/**
 * 小丑效果注册器（decisions.md D4）。
 * 每张小丑 = 一条注册记录 {trigger × condition × action}；
 * 计分管线在固定时机广播事件，注册器匹配后执行 action。
 * 特殊机制（Blueprint 复制等）用内置 handler。
 */

import type { PlayingCard, Suit } from "./cards.js";
import type { HandType } from "./poker.js";
import type { Rng } from "./rng.js";

export type Rarity = "common" | "uncommon" | "rare" | "legendary";

export type JokerTrigger =
  /** 一张打出的牌被计分时（逐张、从左到右） */
  | "card_scored"
  /** 手牌中的牌计分时（钢铁牌阶段，从左到右） */
  | "held_scored"
  /** 打出一手牌时（牌型确定后、逐张计分前） */
  | "hand_played"
  /** 独立生效（常驻修正） */
  | "independent"
  /** 弃牌时 */
  | "card_discarded"
  /** 盲注开始时 */
  | "blind_start"
  /** 回合结束时（经济类） */
  | "round_end"
  /** 重触发提供者（Mime/Hack/Hanging Chad 等；action 累加 ctx.pendingRetriggers） */
  | "retrigger"
  /** 出售/销毁事件 */
  | "card_destroyed";

/** 小丑对回合资源的静态修正（Troubadour/Stuntman/Juggler 等） */
export interface JokerStatMods {
  handSize?: number;
  handsPerRound?: number;
  discards?: number;
  /** 每盲注开始时的特殊修正（Burglar：hands+3、discards 清零） */
  blindStartHandsGain?: number;
  blindStartDiscardsSetTo?: number;
}

/** 小丑提供的引擎规则（Four Fingers 等），聚合后进计分输入 */
export type JokerRulesProvider = EngineRules;

/** 引擎级规则标志（改判定规则的小丑：Four Fingers、Shortcut、Pareidolia、Smeared Bull） */
export interface EngineRules {
  /** 同花最少张数（Four Fingers → 4） */
  minFlushCards?: number;
  /** 顺子最少张数（Four Fingers → 4） */
  minStraightCards?: number;
  /** 顺子允许的最大跳空（Shortcut → 1） */
  maxRankGap?: number;
  /** 所有牌视为人头牌（Pareidolia） */
  allCardsAreFace?: boolean;
  /** 花色合并（Smeared Bull：红桃=方块、黑桃=梅花） */
  suitMerges?: [Suit, Suit][];
}

/** 计分管线共享上下文 */
export interface ScoreContext {
  chips: number;
  mult: number;
  /** 本回合累计金额变化（$事件单独结算，不进 chips×mult） */
  money: number;
  /** 当前持有资金（Bull 等以资金为自变量的小丑用） */
  funds: number;
  /** 本回合剩余出牌次数（Acrobat 等用） */
  handsLeft: number;
  /** 本回合出牌序号（从 1 计，首手=1） */
  handIndex: number;
  /** 引擎规则标志（改判定规则的小丑：Four Fingers / Shortcut 等） */
  rules: EngineRules;
  /** 剩余弃牌次数（Mystic Summit 等用） */
  discardsLeft: number;
  /** 当前牌组张数（Blue Joker 等用） */
  deckSize: number;
  /** 本回合已打出的牌型（Card Sharp 等用） */
  handsPlayedTypes: HandType[];
  handType: HandType;
  /** 当前正在计分的牌（card_scored / held_scored 时机有效） */
  currentCard: PlayingCard | null;
  /** 本手牌打出的全部牌 */
  playedCards: readonly PlayingCard[];
  /** 手中剩余的牌（held_scored 时机用） */
  heldCards: readonly PlayingCard[];
  /** 当前小丑实例数组（顺序即结算顺序） */
  jokers: readonly JokerInstance[];
  /** 当前触发的小丑下标（Blueprinted 复制判定用） */
  currentJokerIndex: number;
  /** 当前触发的小丑 key（效果构造器写日志用） */
  activeJokerKey: string | null;
  rng: Rng;
  /** 结算日志（UI 与验证用） */
  log: TriggerLogEntry[];
  /** 玻璃牌破碎、销毁等延迟事件在此排队 */
  pendingDestroys: PlayingCard[];
  /** 计分过的牌（Red seal 重触发与部分小丑条件用） */
  scoredCount: number;
  /** 当前牌的待处理小丑重触发数（retrigger 时机累加） */
  pendingRetriggers: number;
  /** 小丑定义表（Baseball Card 等按稀有度查询用，运行时注入） */
  defsRef?: ReadonlyMap<string, import("./jokerRegistry.js").JokerDef>;
}

export interface TriggerLogEntry {
  source: string; // 小丑 key 或 "card"/"edition"/"enhancement"
  cardId?: string;
  detail: string; // 如 "+4 Mult"、"x2 Mult"、"+50 Chips"
}

export interface JokerInstance {
  readonly key: string;
  /** 运行时状态（如 Baron 累积、Ride the Bus 面板计数） */
  counters: Record<string, number>;
  /** 小丑自身的版本（Foil 小丑触发时 +50 Chips 等）[FT-CORE-04] */
  edition?: "base" | "foil" | "holo" | "poly" | "negative";
}

export interface JokerEffect {
  trigger: JokerTrigger;
  /** 谓词；缺省 = 恒真 */
  condition?: (ctx: ScoreContext) => boolean;
  /** 副作用：修改 ctx.chips/mult/money、写 log、排队销毁 */
  action: (ctx: ScoreContext) => void;
  /** 描述（生成 tooltip 用） */
  description: string;
  /** retrigger 专属：限定重触发收集阶段（Mime 仅 held，其余默认 scored） */
  retriggerPhase?: "scored" | "held";
}

export interface JokerDef {
  key: string;
  name: string;
  rarity: Rarity;
  /** 商店售价（原版为固定值，min=max） */
  cost: readonly [number, number];
  effects: JokerEffect[];
  /** 解锁条件描述（null = 无需解锁） */
  unlock: string | null;
  /** 回合资源静态修正 */
  statMods?: JokerStatMods;
  /** 引擎规则提供（Four Fingers 等） */
  rules?: JokerRulesProvider;
  /** 特殊机制标记（copy_right_neighbor / copy_leftmost 等） */
  special?: string;
}

/** 计分工具：+chips / +mult / ×mult 都走这里，保证日志一致 */
export function addChips(ctx: ScoreContext, amount: number, source: string, cardId?: string): void {
  ctx.chips += amount;
  ctx.log.push({ source, cardId, detail: `+${amount} Chips` });
}

export function addMult(ctx: ScoreContext, amount: number, source: string, cardId?: string): void {
  ctx.mult += amount;
  ctx.log.push({ source, cardId, detail: `+${amount} Mult` });
}

export function timesMult(ctx: ScoreContext, factor: number, source: string, cardId?: string): void {
  ctx.mult *= factor;
  ctx.log.push({ source, cardId, detail: `x${factor} Mult` });
}

export function addMoney(ctx: ScoreContext, amount: number, source: string, cardId?: string): void {
  ctx.money += amount;
  ctx.log.push({ source, cardId, detail: `$${amount >= 0 ? "+" : ""}${amount}` });
}
