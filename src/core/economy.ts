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
  /** 击败奖励（FT-ECO-04 [待核对]：$3/$4/$5） */
  blindReward: Record<BlindKind, number>;
  /** 利息：每 interestPer 元得 1，上限 interestCap（FT-ECO-05 [待核对]） */
  interestPer: number;
  interestCap: number;
  /** 重掷起始价与每次增量（FT-ECO-06 [待核对]：$5 起步 +$1） */
  rerollBase: number;
  rerollIncrement: number;
  /** 卖价 = floor(成本 × sellRatio)（FT-ECO-07 [待核对]） */
  sellRatio: number;
  /** 初始资金（FT-ECO-08 [待核对]：$4） */
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

/** 回合末总入账：盲注奖励 + 利息 + 金钱牌（在手）。
 *  Gold Seal 的 $3 在计分管线内（打出计分时）结算，不在此处。[FT-CORE-06 ✅] */
export function endOfRoundIncome(params: {
  kind: BlindKind;
  money: number;
  goldCardsInHand: number;
  v: EconomyValues;
}): { base: number; interest: number; gold: number; total: number } {
  const base = blindRewardFor(params.kind, params.v);
  const interest = interestFor(params.money, params.v);
  const gold = params.goldCardsInHand * params.v.goldCardMoney;
  return { base, interest, gold, total: base + interest + gold };
}

/** 第 n 次重掷的价格（n 从 0 计）= base + n × increment */
export function rerollCost(rerollsSoFar: number, v: EconomyValues): number {
  return v.rerollBase + rerollsSoFar * v.rerollIncrement;
}

/** 卖价 */
export function sellValue(cost: number, v: EconomyValues): number {
  return Math.floor(cost * v.sellRatio);
}
