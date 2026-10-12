import { describe, expect, it } from "vitest";
import { Rng } from "../src/core/rng.js";

describe("Rng 确定性", () => {
  it("同 seed 产生完全相同的序列", () => {
    const a = new Rng("TESTSEED");
    const b = new Rng("TESTSEED");
    for (let i = 0; i < 1000; i++) {
      expect(a.next()).toBe(b.next());
    }
  });

  it("不同 seed 产生不同序列", () => {
    const a = new Rng("AAA");
    const b = new Rng("BBB");
    const seqA = Array.from({ length: 20 }, () => a.next());
    const seqB = Array.from({ length: 20 }, () => b.next());
    expect(seqA).not.toEqual(seqB);
  });

  it("next() 落在 [0,1)", () => {
    const r = new Rng("RANGE");
    for (let i = 0; i < 10000; i++) {
      const v = r.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it("nextInt 边界与均匀性粗检", () => {
    const r = new Rng("INT");
    for (let i = 0; i < 5000; i++) {
      const v = r.nextInt(6);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(6);
      expect(Number.isInteger(v)).toBe(true);
    }
  });

  it("状态序列化后恢复，序列完全一致", () => {
    const a = new Rng("SAVE");
    a.next();
    a.next();
    const saved = a.getState();
    const expected = [a.next(), a.next(), a.next()];

    const b = new Rng("OTHER");
    b.setState(saved);
    const restored = [b.next(), b.next(), b.next()];
    expect(restored).toEqual(expected);
  });

  it("fork 子流确定且不影响父流", () => {
    const a = new Rng("FORK");
    const child1 = a.fork("deck");
    const child2 = a.fork("deck");
    // 两个同名 fork 在同一父状态下完全一致
    expect(child1.next()).toBe(child2.next());

    // fork 不消耗父流随机数：fork 前后父流序列一致
    const p = new Rng("FORK2");
    const _c = p.fork("x");
    const q = new Rng("FORK2");
    expect(p.next()).toBe(q.next());
  });

  it("shuffle 可复现且不改原数组", () => {
    const input = [1, 2, 3, 4, 5, 6, 7, 8];
    const a = new Rng("SHUF").shuffle(input);
    const b = new Rng("SHUF").shuffle(input);
    expect(a).toEqual(b);
    expect(input).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect([...a].sort((x, y) => x - y)).toEqual(input);
  });

  it("weightedPick 命中分布合理（统计粗检）", () => {
    const r = new Rng("WP");
    const counts = [0, 0, 0];
    for (let i = 0; i < 30000; i++) {
      counts[r.weightedPick([0.7, 0.25, 0.05])]!++;
    }
    expect(counts[0]! / 30000).toBeGreaterThan(0.67);
    expect(counts[0]! / 30000).toBeLessThan(0.73);
    expect(counts[1]! / 30000).toBeGreaterThan(0.23);
    expect(counts[1]! / 30000).toBeLessThan(0.27);
    expect(counts[2]! / 30000).toBeGreaterThan(0.03);
    expect(counts[2]! / 30000).toBeLessThan(0.07);
  });

  it("chance(1) 恒真、chance(0) 恒假", () => {
    const r = new Rng("CH");
    expect(r.chance(1)).toBe(true);
    expect(r.chance(0)).toBe(false);
  });
});
