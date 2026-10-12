/**
 * 灌装层端到端测试：采集数据 → buildJokerDef → scoreHand。
 * 每个代表场景的期望值全部手算（依据 FT-CORE-01/02/03/04/05 与 jokers-*.json 参数）。
 */
import { describe, expect, it } from "vitest";
import { scoreHand, roundEndPayout, type GameValues } from "../src/core/scoring.js";
import type { JokerInstance } from "../src/core/jokerRegistry.js";
import type { PlayingCard } from "../src/core/cards.js";
import { Rng } from "../src/core/rng.js";
import { REAL_VALUES } from "../src/content/values.js";
import { buildAllJokerDefs } from "../src/content/jokerDefs.js";
import { collectRules } from "../src/core/roundFlow.js";

const V: GameValues = REAL_VALUES;
const { defs } = buildAllJokerDefs();

function card(id: string, rank: number, suit: PlayingCard["suit"], extra?: Partial<PlayingCard>): PlayingCard {
  return { id, rank, suit, enhancement: "none", edition: "base", seal: "none", ...extra };
}
function inst(key: string, counters: Record<string, number> = {}): JokerInstance {
  return { key, counters, edition: "base" as const };
}
/** 高牌基线：base 5/1 [FT-CORE-01] */
function play(cards: PlayingCard[], jokers: JokerInstance[], held: PlayingCard[] = [], opts: Partial<Parameters<typeof scoreHand>[0]> = {}) {
  return scoreHand({
    playedCards: cards,
    heldCards: held,
    jokers,
    defs,
    rng: new Rng("JT"),
    values: V,
    ...opts,
  });
}

describe("灌装端到端：per_scored_card 模板族", () => {
  it("Greedy Joker：每张钻石计分 +3 Mult（2 张钻石 +6）", () => {
    // 高牌 base 5/1；牌面 5+7+9=21 → chips 26；mult 1+6=7 → 182
    const r = play(
      [card("a", 5, "D"), card("b", 7, "D"), card("c", 9, "H")],
      [inst("j_greedy_joker")],
    );
    expect(r.mult).toBe(7);
    expect(r.score).toBe(182);
  });

  it("Scholar：每张 A +20 Chips +4 Mult（2 张 A）", () => {
    // chips 5+11+5+40=61；mult 1+8=9 → 549
    const r = play([card("a", 14, "S"), card("b", 5, "S")], [inst("j_scholar")]);
    expect(r.chips).toBe(61);
    expect(r.score).toBe(549);
  });

  it("Even Steven：10/8/6/4/2 每张 +4 Mult；Odd Todd：A/9/7/5/3 每张 +31 Chips", () => {
    // [8C, 3H] 高牌：chips 5+8+3=16，mult 1+4=5 → 80
    const r = play([card("a", 8, "C"), card("b", 3, "H")], [inst("j_even_steven")]);
    expect(r.mult).toBe(5);
    expect(r.score).toBe(80);
    // [9S, 9D] 对子：chips 10+9+9+31+31=90，mult 2 → 180
    const r2 = play([card("a", 9, "S"), card("b", 9, "D")], [inst("j_odd_todd")]);
    expect(r2.chips).toBe(90);
    expect(r2.score).toBe(180);
  });

  it("Scary Face：每张人头牌 +30 Chips；Smiley +5 Mult", () => {
    // [KH, 5S] 高牌：chips 5+10+5+30=50（K 面值 10）→ 50
    const r = play([card("a", 13, "H"), card("b", 5, "S")], [inst("j_scary_face")]);
    expect(r.chips).toBe(50);
    // [KH, KD] 对子：chips 10+10+10=30，mult 2+5+5=12 → 360
    const r2 = play([card("a", 13, "H"), card("b", 13, "D")], [inst("j_smiley")]);
    expect(r2.mult).toBe(12);
    expect(r2.score).toBe(360);
  });

  it("Ticket：每张金卡计分 $4（2 张金卡 +$8）", () => {
    const r = play(
      [card("a", 9, "H", { enhancement: "gold" }), card("b", 5, "S", { enhancement: "gold" })],
      [inst("j_ticket")],
    );
    expect(r.money).toBe(8);
  });
});

describe("灌装端到端：hand_contains / condition / xmult 族", () => {
  it("Jolly Joker：含对子 +8 Mult；高牌不触发", () => {
    // 对子：mult 2+8=10，chips 28 → 280
    const r = play([card("a", 9, "H"), card("b", 9, "S")], [inst("j_jolly")]);
    expect(r.score).toBe(280);
    const r2 = play([card("a", 9, "H"), card("b", 5, "S")], [inst("j_jolly")]);
    expect(r2.score).toBe(19);
  });

  it("Half Joker：≤3 张牌 +20 Mult；5 张不触发", () => {
    // 三条：chips 30+27=57，mult 3+20=23 → 1311
    const r = play(
      [card("a", 9, "H"), card("b", 9, "S"), card("c", 9, "D")],
      [inst("j_half")],
    );
    expect(r.score).toBe(1311);
  });

  it("Acrobat：本回合最后一手 ×3 Mult", () => {
    const cs = [card("a", 9, "H"), card("b", 9, "S")];
    // 最后一手（打出前剩 1）：mult 2×3=6 → 168
    const last = play(cs, [inst("j_acrobat")], [], { handsLeft: 1 });
    expect(last.score).toBe(168);
    // 非最后一手：mult 2 → 56
    const notLast = play(cs, [inst("j_acrobat")], [], { handsLeft: 2 });
    expect(notLast.score).toBe(56);
  });

  it("Blackboard：手中全黑桃/梅花 ×3 Mult", () => {
    const cs = [card("a", 9, "H"), card("b", 9, "S")];
    const allBlack = play(cs, [inst("j_blackboard")], [card("h1", 2, "S"), card("h2", 3, "C")]);
    expect(allBlack.score).toBe(168);
    const mixed = play(cs, [inst("j_blackboard")], [card("h1", 2, "S"), card("h2", 3, "H")]);
    expect(mixed.score).toBe(56);
  });

  it("Flower Pot：四种花色齐 ×3 Mult", () => {
    // 四条 5 + K：chips 60+20+10=90，mult 7×3=21 → 1890
    const r = play(
      [
        card("a", 5, "S"), card("b", 5, "H"), card("c", 5, "D"),
        card("d", 5, "C"), card("e", 13, "H"),
      ],
      [inst("j_flower_pot")],
    );
    expect(r.mult).toBe(21);
    expect(r.score).toBe(1890);
  });

  it("Card Sharp：本回合已打出过同牌型 ×3 Mult", () => {
    const cs = [card("a", 9, "H"), card("b", 9, "S")];
    const repeated = play(cs, [inst("j_card_sharp")], [], { handsPlayedTypes: ["PAIR"] });
    expect(repeated.score).toBe(168);
    const first = play(cs, [inst("j_card_sharp")], [], { handsPlayedTypes: [] });
    expect(first.score).toBe(56);
  });
});

describe("灌装端到端：retrigger 族", () => {
  it("Hanging Chad：第一张计分牌重触发 2 次（3 次计分）", () => {
    // [H9, S5] 高牌：9 计 3 次=27，chips 5+27+5=37 → 37
    const r = play([card("a", 9, "H"), card("b", 5, "S")], [inst("j_hanging_chad")]);
    expect(r.score).toBe(37);
  });

  it("Hack：2/3/4/5 每张重触发 1 次", () => {
    // [2C, 2D] 对子：chips 10+2×2+2×2=18，mult 2 → 36
    const r = play([card("a", 2, "C"), card("b", 2, "D")], [inst("j_hack")]);
    expect(r.score).toBe(36);
  });

  it("Sock and Buskin：人头牌重触发 1 次", () => {
    // [KH, HQ] 高牌（K≠Q）：K、Q 各计 2 次 → chips 5+20+20=45，mult 1 → 45
    const r = play([card("a", 13, "H"), card("b", 12, "H")], [inst("j_sock_and_buskin")]);
    expect(r.chips).toBe(45);
    expect(r.score).toBe(45);
  });

  it("Dusk：本回合最后一手所有打出的牌重触发 1 次", () => {
    const cs = [card("a", 9, "H"), card("b", 5, "S")];
    // 最后一手：chips 5+9×2+5×2=33 → 33
    const last = play(cs, [inst("j_dusk")], [], { handsLeft: 1 });
    expect(last.score).toBe(33);
    const notLast = play(cs, [inst("j_dusk")], [], { handsLeft: 2 });
    expect(notLast.score).toBe(19);
  });

  it("Mime：手中牌能力重触发（steel ×1.5 再 ×1.5）", () => {
    // 高牌 chips 5+9=14；steel 2 ×1.5 两次 → mult 2.25 → floor(31.5)=31
    const r = play([card("a", 9, "H")], [inst("j_mime")], [
      card("h1", 2, "S", { enhancement: "steel" }),
    ]);
    expect(r.score).toBe(31);
  });
});

describe("灌装端到端：per 特化", () => {
  it("Abstract Joker：每个小丑（含自身）+3 Mult", () => {
    // 高牌 chips 14，mult 1+3×2=7 → 98（Golden 不参与计分）
    const r = play([card("a", 9, "H")], [inst("j_abstract"), inst("j_golden")]);
    expect(r.score).toBe(98);
  });

  it("Blue Joker：牌组每剩一张 +2 Chips", () => {
    const r = play([card("a", 9, "H")], [inst("j_blue_joker")], [], { deckSize: 40 });
    expect(r.chips).toBe(14 + 80);
  });

  it("Bull：每持有 $1 +2 Chips", () => {
    const r = play([card("a", 9, "H")], [inst("j_bull")], [], { funds: 10 });
    expect(r.chips).toBe(14 + 20);
  });

  it("Golden Joker：回合末 $4（round_end 时机经 roundEndPayout 结算）", () => {
    const r = play([card("a", 9, "H")], [inst("j_golden")]);
    expect(r.money).toBe(0); // 计分管线内不发
    const payout = roundEndPayout([inst("j_golden")], defs, V);
    expect(payout.money).toBe(4);
    expect(r.score).toBe(14);
  });

  it("Misprint：+0~23 Mult，同 seed 结果一致", () => {
    const cs = [card("a", 9, "H")];
    const r1 = play(cs, [inst("j_misprint")]);
    const r2 = play(cs, [inst("j_misprint")]);
    expect(r1.mult).toBe(r2.mult);
    expect(r1.mult).toBeGreaterThanOrEqual(1);
    expect(r1.mult).toBeLessThanOrEqual(24);
  });
});

describe("灌装端到端：rules 型小丑", () => {
  it("Four Fingers：4 张同花成立 Flush（经 collectRules 透传）", () => {
    const cs = [card("a", 9, "H"), card("b", 5, "H"), card("c", 3, "H"), card("d", 2, "H")];
    const rules = collectRules([inst("j_four_fingers")], defs);
    expect(rules.minFlushCards).toBe(4);
    // Flush base 35/4：chips 35+19=54，mult 4 → 216
    const r = play(cs, [inst("j_four_fingers")], [], { rules });
    expect(r.handType).toBe("FLUSH");
    expect(r.score).toBe(216);
  });

  it("Pareidolia：所有牌视为人头牌（Scary Face 对 2 生效）", () => {
    // 仅 Scary Face：2 非 face 不触发，chips 5+2=7
    const plain = play([card("a", 2, "S")], [inst("j_scary_face")]);
    expect(plain.chips).toBe(7);
    // 加 Pareidolia（rules 经 collectRules 透传）：2 视为 face → +30 chips → 37
    const rules = collectRules([inst("j_pareidolia")], defs);
    expect(rules.allCardsAreFace).toBe(true);
    const r = play([card("a", 2, "S")], [inst("j_pareidolia"), inst("j_scary_face")], [], { rules });
    expect(r.chips).toBe(37);
  });
});

describe("灌装端到端：statMods 型小丑", () => {
  it("Stuntman：+250 Chips 且手牌上限 -2", () => {
    const d = defs.get("j_stuntman")!;
    // 高牌：chips 5+9+250=264
    const r = play([card("a", 9, "H")], [inst("j_stuntman")]);
    expect(r.score).toBe(264);
    expect(d.statMods?.handSize).toBe(-2);
  });
});
