/**
 * 对局集成层：把 状态机 × 牌堆 × 计分管线 打成一个回合动作。
 * 渲染层与整局模拟（阶段 E）都从这里驱动引擎。
 */

import type { PlayingCard } from "./cards.js";
import { drawCards, newRound, playCards, toDiscard, type DeckState } from "./deck.js";
import { scoreHand, type GameValues, type ScoringResult } from "./scoring.js";
import type { HandLevels } from "./hands.js";
import type { JokerDef, JokerInstance } from "./jokerRegistry.js";
import { addScore, beatBlind, type RunState } from "./run.js";

export interface PlayHandResult {
  scoring: ScoringResult;
  run: RunState;
  deckState: DeckState;
  /** 本手牌打出的牌（已进弃牌堆） */
  played: PlayingCard[];
}

/**
 * 出牌动作：抽手牌 → 出牌 → 计分 → 累计 → 清场。
 * 不自动判定胜负/结算（由调用方根据 beatBlind/handsLeft 决定，
 * 便于 UI 在中间态做动画与弹窗）。
 */
export function attemptPlay(params: {
  run: RunState;
  deckState: DeckState;
  selectedIds: readonly string[];
  jokers: readonly JokerInstance[];
  defs: ReadonlyMap<string, JokerDef>;
  values: GameValues;
  handLevels: HandLevels;
  /** 手牌不足时先抽满（正常出牌流程） */
  drawUpTo?: number;
}): PlayHandResult {
  const { run, deckState, selectedIds, jokers, defs, values, handLevels } = params;

  if (run.handsLeft <= 0) throw new Error("没有剩余出牌次数");
  if (selectedIds.length === 0 || selectedIds.length > 5)
    throw new Error("需要选择 1-5 张牌");

  const drawUpTo = params.drawUpTo ?? run.handSize;
  drawCards(deckState, Math.max(0, drawUpTo - deckState.hand.length), run.rng);

  const played = playCards(deckState, selectedIds);
  const scoring = scoreHand({
    playedCards: played,
    heldCards: deckState.hand,
    jokers,
    defs,
    rng: run.rng,
    values,
    handLevels,
  });

  let nextRun = addScore(run, scoring.score);
  nextRun = { ...nextRun, handsLeft: nextRun.handsLeft - 1 };

  // 玻璃破碎的牌从牌组中移除；其余进弃牌堆
  const destroyedIds = new Set(scoring.destroyed.map((c) => c.id));
  const survivors = played.filter((c) => !destroyedIds.has(c.id));
  toDiscard(deckState, survivors);
  for (const c of scoring.destroyed) {
    const idx = nextRun.deck.findIndex((d) => d.id === c.id);
    if (idx !== -1) {
      const d = [...nextRun.deck];
      d.splice(idx, 1);
      nextRun = { ...nextRun, deck: d };
    }
  }

  return { scoring, run: nextRun, deckState, played };
}

/** 回合收尾判断：是否过线 / 是否还有出牌机会 */
export function roundStatus(run: RunState): "won" | "lost" | "ongoing" {
  if (beatBlind(run)) return "won";
  if (run.handsLeft <= 0) return "lost";
  return "ongoing";
}

/** 弃牌动作 */
export function discardCards(params: {
  run: RunState;
  deckState: DeckState;
  ids: readonly string[];
}): { run: RunState; deckState: DeckState; discarded: PlayingCard[] } {
  const { run, deckState, ids } = params;
  if (run.discardsLeft <= 0) throw new Error("没有剩余弃牌次数");
  if (ids.length === 0 || ids.length > 5) throw new Error("弃牌需要 1-5 张");
  const discarded = playCards(deckState, ids);
  toDiscard(deckState, discarded);
  const run2: RunState = { ...run, discardsLeft: run.discardsLeft - 1 };
  return { run: run2, deckState, discarded };
}

/** 回合开始：洗牌发牌 */
export function startRound(run: RunState, rng: import("./rng.js").Rng): DeckState {
  const state = newRound(run.deck, rng);
  drawCards(state, run.handSize, rng);
  return state;
}
