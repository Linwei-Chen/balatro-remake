/**
 * 小丑效果注册器（decisions.md D4）。
 * 每张小丑 = 一条注册记录 {trigger × condition × action}；
 * 计分管线在固定时机广播事件，注册器匹配后执行 action。
 * 特殊机制（Blueprint 复制等）用内置 handler。
 */

import type { PlayingCard } from "./cards.js";
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
  /** 出售/销毁事件 */
  | "card_destroyed";

/** 计分管线共享上下文 */
export interface ScoreContext {
  chips: number;
  mult: number;
  /** 本回合累计金额变化（$事件单独结算，不进 chips×mult） */
  money: number;
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
}

export interface JokerEffect {
  trigger: JokerTrigger;
  /** 谓词；缺省 = 恒真 */
  condition?: (ctx: ScoreContext) => boolean;
  /** 副作用：修改 ctx.chips/mult/money、写 log、排队销毁 */
  action: (ctx: ScoreContext) => void;
  /** 描述（生成 tooltip 用） */
  description: string;
}

export interface JokerDef {
  key: string;
  name: string;
  rarity: Rarity;
  /** 商店售价区间 [min, max] */
  cost: readonly [number, number];
  effects: JokerEffect[];
  /** 解锁条件描述（null = 无需解锁） */
  unlock: string | null;
  /** 效果类别标记（供特殊 handler 识别，如 "copy_left_neighbor"） */
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
