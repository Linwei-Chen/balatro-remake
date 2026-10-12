import { describe, expect, it } from "vitest";
import {
  addScore,
  beatBlind,
  beginBlind,
  failRound,
  newRun,
  settleRound,
  type RunState,
} from "../src/core/run.js";
import { standardDeck } from "../src/core/cards.js";
import { Rng } from "../src/core/rng.js";
import type { EconomyValues } from "../src/core/economy.js";

/** 测试用经济数值 —— 待 fact-table 锁定后统一替换为 gen-content 产物 */
export const testEconomy: EconomyValues = {
  anteBases: [100, 300, 800, 2000, 5000, 11000, 20000, 35000],
  anteBaseBeyond: () => 50000,
  blindMultiplier: { small: 1, big: 1.5, boss: 2 },
  blindReward: { small: 3, big: 4, boss: 5 },
  interestPer: 5,
  interestCap: 5,
  rerollBase: 5,
  rerollIncrement: 1,
  sellRatio: 0.5,
  startingMoney: 4,
  goldCardMoney: 3,
};

function makeRun(): RunState {
  return newRun(
    standardDeck(),
    {
      seed: "RUNTEST",
      economy: testEconomy,
      handSize: 8,
      handsPerRound: 4,
      discardsPerRound: 3,
      jokerSlots: 5,
      consumableSlots: 2,
    },
    new Rng("RUNTEST"),
  );
}

describe("对局状态机", () => {
  it("开局：ante1 小盲注，需求 100，资金 $4", () => {
    const run = makeRun();
    expect(run.ante).toBe(1);
    expect(run.blindKind).toBe("small");
    expect(run.requirement).toBe(100);
    expect(run.money).toBe(4);
    expect(run.phase).toBe("playing");
  });

  it("盲注需求 = base × 倍率：small 100 / big 150 / boss 200", () => {
    let run = makeRun();
    expect(run.requirement).toBe(100);
    run = settleRound(addScore(run, 100), 0);
    expect(run.blindKind).toBe("big");
    run = beginBlind(run);
    expect(run.requirement).toBe(150);
    run = settleRound(addScore(run, 150), 0);
    run = beginBlind(run);
    expect(run.blindKind).toBe("boss");
    expect(run.requirement).toBe(200);
  });

  it("过线结算：奖励 + 利息（无金钱牌）", () => {
    let run = makeRun();
    // 先攒钱：模拟已有 $12
    run.money = 12;
    run = addScore(run, 100);
    expect(beatBlind(run)).toBe(true);
    run = settleRound(run, 0);
    // 奖励 $3 + 利息 floor(12/5)=2 → $17
    expect(run.money).toBe(17);
    expect(run.lastIncome).toEqual({ base: 3, interest: 2, gold: 0, total: 5 });
    expect(run.blindKind).toBe("big");
    expect(run.phase).toBe("blind_select");
  });

  it("利息封顶 $5", () => {
    let run = makeRun();
    run.money = 100;
    run = addScore(run, 100);
    run = settleRound(run, 0);
    // 利息 min(20, 5) = 5，奖励 3 → 100+8=108
    expect(run.lastIncome?.interest).toBe(5);
    expect(run.money).toBe(108);
  });

  it("ante1 boss 通过后进入 ante2 small，round 计数递增", () => {
    let run = makeRun();
    for (let i = 0; i < 3; i++) {
      run = settleRound(addScore(run, run.requirement), 0);
      if (run.phase === "blind_select") run = beginBlind(run);
    }
    expect(run.ante).toBe(2);
    expect(run.blindKind).toBe("small");
    expect(run.requirement).toBe(300);
    expect(run.round).toBe(4);
  });

  it("打完 ante8 boss 判定胜利", () => {
    let run = makeRun();
    let guard = 0;
    while (run.phase !== "won" && run.phase !== "game_over" && guard++ < 100) {
      run = addScore(run, run.requirement);
      run = settleRound(run, 0);
      if (run.phase === "blind_select") run = beginBlind(run);
    }
    expect(run.phase).toBe("won");
    expect(run.ante).toBe(9);
    expect(guard).toBe(24); // 8 底注 × 3 盲注
  });

  it("未过线 → game_over", () => {
    let run = makeRun();
    run = addScore(run, 50);
    expect(beatBlind(run)).toBe(false);
    run = failRound(run);
    expect(run.phase).toBe("game_over");
  });
});
