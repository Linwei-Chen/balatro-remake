import { describe, expect, it } from "vitest";
import {
  applyConsumable,
  type ConsumableContext,
  type ConsumableDef,
} from "../src/core/consumables.js";
import { initialHandLevels, handValue } from "../src/core/hands.js";
import { standardDeck } from "../src/core/cards.js";
import { Rng } from "../src/core/rng.js";

const deck = standardDeck();

function makeCtx(hand: string[]): ConsumableContext {
  return {
    hand: hand.map((id) => deck.find((c) => c.id === id)!),
    deck: deck.map((c) => ({ ...c })),
    handLevels: initialHandLevels(),
    money: 10,
    rng: new Rng("CONS"),
    lastUsedKey: null,
    playedHiddenHands: new Set(),
    log: [],
  };
}

function tarotDef(params: Record<string, unknown>, name = "T"): ConsumableDef {
  return { key: "c_test", name, set: "tarot", cost: 3, effect: "", params, unlock: null };
}

describe("消耗牌应用", () => {
  it("星球牌：升级牌型（Mercury→对子 +1）", () => {
    const ctx = makeCtx([]);
    const planet: ConsumableDef = {
      key: "c_mercury",
      name: "Mercury",
      set: "planet",
      cost: 3,
      effect: "",
      params: { target: "level_up", hand: "pair", levels: 1 },
      unlock: null,
    };
    const r = applyConsumable(planet, ctx, []);
    expect(r.ok).toBe(true);
    expect(handValue(ctx.handLevels, "PAIR")).toEqual({ chips: 25, mult: 3 });
  });

  it("塔罗 The Empress：2 张选中手牌 → Mult 强化", () => {
    const ctx = makeCtx(["S9", "H9", "D2"]);
    const empress = tarotDef({
      target: "enhance",
      enhancement: "mult",
      count: 2,
      select: 2,
    }, "The Empress");
    const r = applyConsumable(empress, ctx, [ctx.hand[0]!, ctx.hand[1]!]);
    expect(r.ok).toBe(true);
    expect(ctx.deck.find((c) => c.id === "S9")?.enhancement).toBe("mult");
    expect(ctx.deck.find((c) => c.id === "H9")?.enhancement).toBe("mult");
    expect(ctx.deck.find((c) => c.id === "D2")?.enhancement).toBe("none");
  });

  it("塔罗选中数量超限 → 拒绝", () => {
    const ctx = makeCtx(["S9", "H9", "D2"]);
    const empress = tarotDef({ target: "enhance", enhancement: "mult", count: 2 });
    const r = applyConsumable(empress, ctx, [ctx.hand[0]!, ctx.hand[1]!, ctx.hand[2]!]);
    expect(r.ok).toBe(false);
  });

  it("幻灵 Talisman：加金封印", () => {
    const ctx = makeCtx(["S9"]);
    const talisman: ConsumableDef = {
      key: "c_talisman",
      name: "Talisman",
      set: "spectral",
      cost: 4,
      effect: "",
      params: { target: "seal", seal: "gold", count: 1 },
      unlock: null,
    };
    const r = applyConsumable(talisman, ctx, [ctx.hand[0]!]);
    expect(r.ok).toBe(true);
    expect(ctx.deck.find((c) => c.id === "S9")?.seal).toBe("gold");
  });

  it("幻灵 Aura：随机版本（seed 决定）", () => {
    const ctx = makeCtx(["S9"]);
    const aura: ConsumableDef = {
      key: "c_aura",
      name: "Aura",
      set: "spectral",
      cost: 4,
      effect: "",
      params: { target: "edition", editions: ["foil", "holo", "poly"], count: 1 },
      unlock: null,
    };
    const r = applyConsumable(aura, ctx, [ctx.hand[0]!]);
    expect(r.ok).toBe(true);
    const ed = ctx.deck.find((c) => c.id === "S9")?.edition;
    expect(["foil", "holo", "poly"]).toContain(ed);
    // 可复现
    const ctx2 = makeCtx(["S9"]);
    applyConsumable(aura, ctx2, [ctx2.hand[0]!]);
    expect(ctx2.deck.find((c) => c.id === "S9")?.edition).toBe(ed);
  });

  it("create 类目标未实现时明确拒绝（不静默成功）", () => {
    const ctx = makeCtx(["S9"]);
    const fool = tarotDef({ target: "create", cardType: "tarot_or_planet" }, "The Fool");
    const r = applyConsumable(fool, ctx, []);
    expect(r.ok).toBe(false);
    expect(r.reason).toContain("special handler");
  });
});
