/**
 * 经济系统：盲注筹码需求、击败奖励、利息、重掷、卖价。
 * 全部数值出处 docs/fact-table.md（FT-ECO-*），采用注入式 GameValues。
 */

export type BlindKind = "small" | "big" | "boss";

export interface EconomyValues {
  /** Ante 1-8 基础筹码（FT-ECO-01，[待核对]） */
  anteBases: readonly number[];
  /** Ante 9+ 的基础筹码公式（FT-ECO-02，[待核对]） */
  anteBaseBeyond: (ante: number) => number;
  /** 盲注倍率（FT-ECO-03 [待核对]：small 1x / big 1.5x / boss 2x） */
  blindMultiplier: Record<BlindKind, number>;
  /** 击败奖励（FT-ECO-04 ✅ code+wiki：small $3 / big $4 / boss $5 / showdown $8） */
  blindReward: Record<BlindKind, number>;
  /** Showdown Boss（Ante 8+ 的 Boss 盲注）击败奖励（✅ code+wiki：$8） */
  showdownReward: number;
  /** 回合末每张剩余手牌的奖励（✅ code+wiki：$1/剩余手牌；弃牌 $0） */
  perUnusedHand: number;
  /** 利息：每 interestPer 元得 1，上限 interestCap（✅ code+wiki：$5→$1，上限 $5；原版 interest_cap=25） */
  interestPer: number;
  interestCap: number;
  /** 重掷起始价与每次增量（✅ code+wiki：$5 起步 +$1，每商店重置） */
  rerollBase: number;
  rerollIncrement: number;
  /** 卖价 = max(1, floor(成本 × sellRatio))（✅ wiki：floor(买价/2) 最低 $1） */
  sellRatio: number;
  /** 初始资金（✅ code get_starting_params：$4） */
  startingMoney: number;
  /** 金钱牌回合末在手得 $3（FT-CORE-05 ✅；Gold Seal 是打出计分时给钱，不在此处） */
  goldCardMoney: number;
}

export function anteBase(ante: number, v: EconomyValues): number {
  if (ante < 1) throw new Error("ante 从 1 开始");
  if (ante <= v.anteBases.length) return v.anteBases[ante - 1]!;
  return v.anteBaseBeyond(ante);
}

/** 某底注某盲注的筹码需求 = base × 倍率（向上取整防小数） */
export function blindRequirement(ante: number, kind: BlindKind, v: EconomyValues): number {
  return Math.ceil(anteBase(ante, v) * v.blindMultiplier[kind]);
}

/** 击败盲注的基础奖励 */
export function blindRewardFor(kind: BlindKind, v: EconomyValues): number {
  return v.blindReward[kind];
}

/** 回合末利息 = floor(钱 / interestPer)，封顶 */
export function interestFor(money: number, v: EconomyValues): number {
  return Math.min(Math.floor(money / v.interestPer), v.interestCap);
}

/** 回合末总入账，按原版顺序：盲注奖励 → 剩余手牌×$1 → 利息 → 金钱牌（在手）→ 汇总。
 *  showdown=true 时 Boss 盲注按 Showdown 奖励 $8 结算（Ante 8+）。
 *  利息按结算时持有金钱计：回合内发放的钱（金卡/金印章/lucky）计息，
 *  回合末发放的经济小丑（如 Golden Joker）不计当回合利息 [✅ code+wiki]。
 *  Gold Seal 的 $3 在计分管线内（打出计分时）结算。[FT-CORE-06 ✅] */
export function endOfRoundIncome(params: {
  kind: BlindKind;
  money: number;
  handsRemaining: number;
  goldCardsInHand: number;
  showdown?: boolean;
  v: EconomyValues;
}): { base: number; hands: number; interest: number; gold: number; total: number } {
  const base = params.showdown
    ? params.v.showdownReward
    : blindRewardFor(params.kind, params.v);
  const hands = params.handsRemaining * params.v.perUnusedHand;
  const interest = interestFor(params.money, params.v);
  const gold = params.goldCardsInHand * params.v.goldCardMoney;
  return { base, hands, interest, gold, total: base + hands + interest + gold };
}

/** 第 n 次重掷的价格（n 从 0 计）= base + n × increment，每进入新商店重置 */
export function rerollCost(rerollsSoFar: number, v: EconomyValues): number {
  return v.rerollBase + rerollsSoFar * v.rerollIncrement;
}

/** 卖价 = floor(买价/2)，最低 $1 [✅ wiki Shop] */
export function sellValue(cost: number, v: EconomyValues): number {
  return Math.max(1, Math.floor(cost * v.sellRatio));
}
