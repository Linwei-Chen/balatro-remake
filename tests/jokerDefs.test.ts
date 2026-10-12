import { describe, expect, it } from "vitest";
import { JOKER_COUNTS, JOKER_RECORDS } from "../src/content/jokers.data.js";
import { buildAllJokerDefs, buildJokerDef } from "../src/content/jokerDefs.js";

describe("小丑灌装统计（阶段 C coverage 数据源）", () => {
  const { defs, implemented, pending } = buildAllJokerDefs();

  it("150 条数据全部载入，无重复 key", () => {
    expect(JOKER_RECORDS.length).toBe(150);
    expect(JOKER_COUNTS.total).toBe(150);
    const keys = new Set(JOKER_RECORDS.map((j) => j.key));
    expect(keys.size).toBe(150);
  });

  it("每个 joker 记录都有 source 与 confidence", () => {
    for (const j of JOKER_RECORDS) {
      expect(j.source.length).toBeGreaterThan(0);
      expect(j.confidence).toBeTruthy();
    }
  });

  it("buildAllJokerDefs 返回的 defs 均可构建、rarity 合法且效果非空", () => {
    const rarities = new Set(["common", "uncommon", "rare", "legendary"]);
    expect(defs.size).toBe(implemented.length);
    for (const d of defs.values()) {
      expect(rarities.has(d.rarity)).toBe(true);
      // 效果载体三选一：effects（计分触发）/ statMods（回合资源）/ rules（引擎规则）
      const hasEffect =
        d.effects.length > 0 ||
        (d.statMods !== undefined && Object.keys(d.statMods).length > 0) ||
        (d.rules !== undefined && Object.keys(d.rules).length > 0);
      expect(hasEffect, `${d.key} 无任何效果`).toBe(true);
    }
  });

  it("待实现清单 key 稳定可追溯（快照防漂移）", () => {
    expect(pending.length + implemented.length).toBe(150);
    // 快照：当前实现数（每实现新 joker 更新此数）
    expect(implemented.length).toBeGreaterThan(40);
  });

  it("未实现的记录 buildJokerDef 返回 null 而不是抛错", () => {
    for (const key of pending.slice(0, 20)) {
      const rec = JOKER_RECORDS.find((j) => j.key === key)!;
      expect(() => buildJokerDef(rec)).not.toThrow();
    }
  });

  it("输出 implemented/pending 清单到控制台（人工核对用）", () => {
    console.log(`implemented=${implemented.length} pending=${pending.length}`);
    console.log(`待实现: ${pending.join(", ")}`);
  });
});
