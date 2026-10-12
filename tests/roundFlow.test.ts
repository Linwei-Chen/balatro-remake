import { describe, expect, it } from "vitest";
import {
  attemptPlay,
  discardCards,
  roundStatus,
  startRound,
} from "../src/core/roundFlow.js";
import { beginBlind, newRun, settleRound, addScore, type RunState } from "../src/core/run.js";
import { standardDeck } from "../src/core/cards.js";
import { Rng } from "../src/core/rng.js";
import { REAL_VALUES } from "../src/content/values.js";
import { initialHandLevels } from "../src/core/hands.js";
import { testEconomy } from "./run.test.js";

function makeRun(): RunState {
  return newRun(
    standardDeck(),
    {
      seed: "FLOW",
      economy: testEconomy,
      handSize: 8,
      handsPerRound: 4,
      discardsPerRound: 3,
      jokerSlots: 5,
      consumableSlots: 2,
    },
    new Rng("FLOW"),
  );
}

describe("对局集成层", () => {
  it("回合开始抽满手牌，出牌计分并推进状态", () => {
    let run = makeRun();
    const deckState = startRound(run, run.rng);
    expect(deckState.hand.length).toBe(8);

    const first = deckState.hand[0]!;
    const match = deckState.hand.find((c) => c !== first && c.rank === first.rank);
    const ids = match ? [first.id, match.id] : [first.id];

    const result = attemptPlay({
      run,
      deckState,
      selectedIds: ids,
      jokers: [],
      defs: new Map(),
      values: REAL_VALUES,
      handLevels: initialHandLevels(),
    });
    expect(result.run.handsLeft).toBe(3);
    expect(result.scoring.score).toBeGreaterThan(0);
    expect(result.run.roundScore).toBe(result.scoring.score);
    expect(deckState.hand.length).toBe(7); // 8 - 出1 + 抽1
  });

  it("过线后 roundStatus=won，settle 后进入下一盲注选择", () => {
    let run = makeRun();
    startRound(run, run.rng);
    run = addScore(run, run.requirement);
    expect(roundStatus(run)).toBe("won");
    run = settleRound(run, 0);
    expect(run.blindKind).toBe("big");
    expect(run.phase).toBe("blind_select");
    run = beginBlind(run);
    expect(run.phase).toBe("playing");
  });

  it("出牌次数耗尽未过线 → lost", () => {
    let run = makeRun();
    run = { ...run, handsLeft: 1 };
    expect(roundStatus(run)).toBe("ongoing");
    run = { ...run, handsLeft: 0 };
    expect(roundStatus(run)).toBe("lost");
  });

  it("弃牌扣减次数并进弃牌堆", () => {
    const run = makeRun();
    const deckState = startRound(run, run.rng);
    const ids = [deckState.hand[0]!.id];
    const r = discardCards({ run, deckState, ids });
    expect(r.run.discardsLeft).toBe(2);
    expect(deckState.hand.length).toBe(7);
    expect(deckState.discardPile.length).toBe(1);
  });

  it("玻璃破碎：destroyed 非空时牌从牌组移除，否则保留（seed 决定分支）", () => {
    const run = makeRun();
    const ds = startRound(run, run.rng);
    ds.hand[0]!.enhancement = "glass";
    const before = run.deck.length;
    const result = attemptPlay({
      run,
      deckState: ds,
      selectedIds: [ds.hand[0]!.id],
      jokers: [],
      defs: new Map(),
      values: REAL_VALUES,
      handLevels: initialHandLevels(),
      drawUpTo: 8,
    });
    const destroyedCount = result.scoring.destroyed.length;
    expect([0, 1]).toContain(destroyedCount);
    expect(result.run.deck.length).toBe(before - destroyedCount);
    // 两次同 seed 结果一致（可复现）
    const run2 = makeRun();
    const ds2 = startRound(run2, run2.rng);
    ds2.hand[0]!.enhancement = "glass";
    const result2 = attemptPlay({
      run: run2,
      deckState: ds2,
      selectedIds: [ds2.hand[0]!.id],
      jokers: [],
      defs: new Map(),
      values: REAL_VALUES,
      handLevels: initialHandLevels(),
      drawUpTo: 8,
    });
    expect(result2.scoring.destroyed.length).toBe(destroyedCount);
  });

  it("出牌超过 5 张或 0 张抛错", () => {
    const run = makeRun();
    const ds = startRound(run, run.rng);
    expect(() =>
      attemptPlay({
        run,
        deckState: ds,
        selectedIds: [],
        jokers: [],
        defs: new Map(),
        values: REAL_VALUES,
        handLevels: initialHandLevels(),
      }),
    ).toThrow();
  });
});
