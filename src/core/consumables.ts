/**
 * 消耗牌系统：塔罗 / 星球 / 幻灵 的定义与应用。
 * 数值与效果出处 docs/fact-table.md FT-CONS（references/consumables-decks.json）。
 * 效果用 target 判别的参数化表达（与小丑注册器同哲学，非 if-else 堆叠）。
 */

import type { Enhancement, Edition, PlayingCard, Seal } from "./cards.js";
import type { HandType } from "./poker.js";
import { levelUpHand, type HandLevels } from "./hands.js";
import type { Rng } from "./rng.js";

export type ConsumableSet = "tarot" | "planet" | "spectral";

export type ConsumableTarget =
  | "enhance" // 强化选中手牌
  | "seal" // 加封印
  | "edition" // 加版本
  | "create" // 生成牌/消耗牌
  | "level_up" // 牌型升级（星球）
  | "money" // 金钱效果
  | "destroy_create" // 摧毁+生成（幻灵常见）
  | "special"; // 特殊逻辑（Black Hole 等，单独 handler）

export interface ConsumableDef {
  key: string;
  name: string;
  set: ConsumableSet;
  cost: number;
  effect: string;
  params: Record<string, unknown>;
  unlock: string | null;
}

export interface ConsumableInstance {
  readonly key: string;
  set: ConsumableSet;
}

/** 应用消耗牌所需的运行时上下文 */
export interface ConsumableContext {
  hand: PlayingCard[];
  /** 全牌组引用（破坏/改强化直接影响） */
  deck: PlayingCard[];
  handLevels: HandLevels;
  money: number;
  rng: Rng;
  /** 本局最后使用的消耗牌 key（The Fool 用） */
  lastUsedKey: string | null;
  /** 本局打出过的隐藏牌型（隐藏星球入池条件） */
  playedHiddenHands: Set<HandType>;
  /** 事件回执（UI 展示与验证） */
  log: string[];
}

export interface ApplyResult {
  ok: boolean;
  reason?: string;
  moneyDelta: number;
}

function fail(reason: string): ApplyResult {
  return { ok: false, reason, moneyDelta: 0 };
}

/** 从牌组找到手牌中的原始卡对象（手牌可能只是引用子集） */
function deckCard(deck: PlayingCard[], card: PlayingCard): PlayingCard | undefined {
  return deck.find((c) => c.id === card.id);
}

/** 应用一张消耗牌。selected 为玩家选中的手牌（可为空）。 */
export function applyConsumable(
  def: ConsumableDef,
  ctx: ConsumableContext,
  selected: readonly PlayingCard[],
): ApplyResult {
  const p = def.params;
  const target = targetOf(def, p);

  switch (target) {
    case "enhance": {
      const enhancement = p.enhancement as Enhancement | undefined;
      const count = (p.count as number | undefined) ?? selected.length;
      if (!enhancement || selected.length === 0 || selected.length > count) {
        return fail(`${def.name} 需要选择至多 ${count} 张手牌`);
      }
      for (const sel of selected) {
        const inDeck = deckCard(ctx.deck, sel);
        if (!inDeck) return fail(`选中牌 ${sel.id} 不在牌组中`);
        inDeck.enhancement = enhancement;
        ctx.log.push(`${def.name}: ${sel.id} → ${enhancement}`);
      }
      return { ok: true, moneyDelta: 0 };
    }

    case "seal": {
      const seal = p.seal as Seal | undefined;
      if (!seal || selected.length === 0) return fail(`${def.name} 需要选择 1 张手牌`);
      for (const sel of selected) {
        const inDeck = deckCard(ctx.deck, sel);
        if (!inDeck) return fail(`选中牌 ${sel.id} 不在牌组中`);
        inDeck.seal = seal;
        ctx.log.push(`${def.name}: ${sel.id} → ${seal} seal`);
      }
      return { ok: true, moneyDelta: 0 };
    }

    case "edition": {
      const editions = (p.editions as Edition[] | undefined) ?? [];
      if (editions.length === 0 || selected.length === 0)
        return fail(`${def.name} 需要选择 1 张手牌`);
      for (const sel of selected) {
        const inDeck = deckCard(ctx.deck, sel);
        if (!inDeck) return fail(`选中牌 ${sel.id} 不在牌组中`);
        inDeck.edition = ctx.rng.pick(editions);
        ctx.log.push(`${def.name}: ${sel.id} → ${inDeck.edition}`);
      }
      return { ok: true, moneyDelta: 0 };
    }

    case "level_up": {
      const hand = p.hand as HandType | undefined;
      const levels = (p.levels as number | undefined) ?? 1;
      if (!hand) return fail(`${def.name} 缺少 hand 参数`);
      levelUpHand(ctx.handLevels, hand, levels);
      ctx.log.push(`${def.name}: ${hand} 等级 +${levels}`);
      return { ok: true, moneyDelta: 0 };
    }

    case "money": {
      // Hermit / Temperance 等：金额依赖运行时状态，由 special 分支处理
      return fail(`${def.name} 的金钱效果需要 special handler`);
    }

    case "create":
    case "destroy_create":
    case "special":
      // 生成类/复合类效果依赖包池与槽位，由上层（run 集成）实现
      return fail(`${def.name} 需要上层 special handler（阶段 C 灌装）`);

    default:
      return fail(`${def.name} 未知目标 ${String(target)}`);
  }
}

/** 根据参数推断目标类型 */
function targetOf(def: ConsumableDef, p: Record<string, unknown>): ConsumableTarget {
  if (typeof p.target === "string") return p.target as ConsumableTarget;
  if (def.set === "planet") return "level_up";
  return "special";
}
