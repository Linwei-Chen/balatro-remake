/**
 * 对局状态机：底注/盲注推进、回合资源、结算入账。
 * 商店与卡池生成需要内容数据（阶段 C 接入），此处只做推进逻辑与经济结算。
 */

import type { PlayingCard } from "./cards.js";
import type { JokerInstance } from "./jokerRegistry.js";
import type { HandType } from "./poker.js";
import {
  blindRequirement,
  endOfRoundIncome,
  type BlindKind,
  type EconomyValues,
} from "./economy.js";
import type { Rng } from "./rng.js";

export type RunPhase = "blind_select" | "playing" | "round_won" | "shop" | "game_over" | "won";

export interface RunOptions {
  seed: string;
  economy: EconomyValues;
  /** 每回合资源（FT-PLAY-02 [待核对]：手牌 8 / 出牌 4 / 弃牌 3 / 小丑槽 5 / 消耗品槽 2） */
  handSize: number;
  handsPerRound: number;
  discardsPerRound: number;
  jokerSlots: number;
  consumableSlots: number;
}

export interface RunState {
  readonly seed: string;
  readonly economy: EconomyValues;
  rng: Rng;
  ante: number;
  /** 底注内盲注序：0=Small 1=Big 2=Boss */
  blindIndex: number;
  blindKind: BlindKind;
  /** 当前盲注筹码需求 */
  requirement: number;
  /** 本回合已累计分数 */
  roundScore: number;
  money: number;
  round: number;
  handSize: number;
  handsLeft: number;
  discardsLeft: number;
  jokerSlots: number;
  consumableSlots: number;
  jokers: JokerInstance[];
  deck: PlayingCard[];
  /** 本回合已打出的牌型（Card Sharp 用；beginBlind 清空） */
  handsPlayedTypes: HandType[];
  phase: RunPhase;
  /** 结算明细（最后一回合） */
  lastIncome: { base: number; hands: number; interest: number; gold: number; total: number } | null;
}

export function newRun(deck: PlayingCard[], opts: RunOptions, rng: Rng): RunState {
  const state: RunState = {
    seed: opts.seed,
    economy: opts.economy,
    rng,
    ante: 1,
    blindIndex: 0,
    blindKind: "small",
    requirement: 0,
    roundScore: 0,
    money: opts.economy.startingMoney,
    round: 1,
    handSize: opts.handSize,
    handsLeft: opts.handsPerRound,
    discardsLeft: opts.discardsPerRound,
    jokerSlots: opts.jokerSlots,
    consumableSlots: opts.consumableSlots,
    jokers: [],
    deck,
    handsPlayedTypes: [],
    phase: "blind_select",
    lastIncome: null,
  };
  return beginBlind(state);
}

/** 进入当前盲注（从选择界面确认） */
export function beginBlind(state: RunState): RunState {
  const s = { ...state };
  s.requirement = blindRequirement(s.ante, s.blindKind, s.economy);
  s.roundScore = 0;
  s.handsLeft = s.handsLeft > 0 ? s.handsLeft : 0;
  s.handsPlayedTypes = [];
  s.phase = "playing";
  return s;
}

/** 打出一手牌后累加分数 */
export function addScore(state: RunState, score: number): RunState {
  const s = { ...state };
  s.roundScore += score;
  return s;
}

/** 是否已过线 */
export function beatBlind(state: RunState): boolean {
  return state.roundScore >= state.requirement;
}

/** 击败盲注后的结算入账并推进（blind_select 或下一底注）
 *  goldCardsInHand：回合末留在手中的金钱牌数量；handsRemaining：剩余出牌次数。
 *  Ante 8+ 的 Boss 盲注按 Showdown 奖励 $8 结算 [✅ code+wiki] */
export function settleRound(
  state: RunState,
  goldCardsInHand: number,
  handsRemaining = 0,
): RunState {
  const s = { ...state };
  const showdown = s.blindKind === "boss" && s.ante >= 8;
  // 利息按结算前持有金钱计 [✅ code+wiki：回合内收入计息、回合末小丑不计]
  const income = endOfRoundIncome({
    kind: s.blindKind,
    money: s.money,
    goldCardsInHand,
    handsRemaining,
    showdown,
    v: s.economy,
  });
  s.money += income.total;
  s.lastIncome = income;
  s.round++;
  return advanceBlind(s);
}

function advanceBlind(state: RunState): RunState {
  const s = { ...state };
  if (s.blindIndex < 2) {
    s.blindIndex++;
    s.blindKind = s.blindIndex === 1 ? "big" : "boss";
  } else {
    s.blindIndex = 0;
    s.blindKind = "small";
    s.ante++;
    // [FT-PLAY-03 待核对] 通关条件：底注 8 Boss 通过即胜利（ endless 模式另说）
    if (s.ante > 8) {
      s.phase = "won";
      return s;
    }
  }
  s.phase = "blind_select";
  return s;
}

/** 回合失败 */
export function failRound(state: RunState): RunState {
  return { ...state, phase: "game_over" };
}
