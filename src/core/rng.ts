/**
 * 确定性可复现 RNG（decisions.md D2）。
 * - xmur3 字符串播种 + sfc32 生成器（质量与速度兼顾的小状态 PRNG）。
 * - fork(label) 从当前状态派生独立子流，保证洗牌/开包/触发判定互不干扰。
 * - 支持状态序列化，同 seed 同操作序列必得同结果。
 */

function xmur3(str: string): () => number {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return h >>> 0;
  };
}

export interface RngState {
  readonly s0: number;
  readonly s1: number;
  readonly s2: number;
  readonly s3: number;
}

export class Rng {
  private s0: number;
  private s1: number;
  private s2: number;
  private s3: number;

  constructor(seed: string) {
    const seedGen = xmur3(seed);
    this.s0 = seedGen();
    this.s1 = seedGen();
    this.s2 = seedGen();
    this.s3 = seedGen();
    // 全零状态是 sfc32 的不动点，规避之
    if ((this.s0 | this.s1 | this.s2 | this.s3) === 0) {
      this.s0 = this.s1 = this.s2 = 0x9e3779b9;
      this.s3 = 0x85ebca6b;
    }
  }

  private nextState(): number {
    this.s0 >>>= 0;
    this.s1 >>>= 0;
    this.s2 >>>= 0;
    this.s3 >>>= 0;
    const t = (this.s3 * 21) >>> 0;
    const result = ((this.s3 << 9) | (this.s0 >>> 23)) >>> 0;
    const s0 = (this.s0 + 0x9e3779b9) >>> 0;
    const s1 = (this.s1 + t) >>> 0;
    const s2 = (this.s2 + this.s0) >>> 0;
    this.s3 = (s2 + result) >>> 0;
    this.s0 = s1 >>> 0;
    this.s1 = s2 >>> 0;
    this.s2 = (s2 + s1) >>> 0;
    return result;
  }

  /** [0, 1) 均匀浮点 */
  next(): number {
    return this.nextState() / 4294967296;
  }

  /** [0, maxExclusive) 均匀整数 */
  nextInt(maxExclusive: number): number {
    if (maxExclusive <= 0) throw new Error(`nextInt 需要正数上界，收到 ${maxExclusive}`);
    return Math.floor(this.next() * maxExclusive);
  }

  /** 以概率 p 返回 true */
  chance(p: number): boolean {
    return this.next() < p;
  }

  /** 从数组均匀取一个 */
  pick<T>(arr: readonly T[]): T {
    if (arr.length === 0) throw new Error("pick：空数组");
    return arr[this.nextInt(arr.length)] as T;
  }

  /** Fisher-Yates 洗牌，返回新数组，不改原数组 */
  shuffle<T>(arr: readonly T[]): T[] {
    const out = [...arr];
    for (let i = out.length - 1; i > 0; i--) {
      const j = this.nextInt(i + 1);
      const tmp = out[i] as T;
      out[i] = out[j] as T;
      out[j] = tmp;
    }
    return out;
  }

  /** 加权抽取：weights[i] 为正数，返回命中的下标 */
  weightedPick(weights: readonly number[]): number {
    let total = 0;
    for (const w of weights) {
      if (w <= 0) throw new Error("weightedPick：权重必须为正数");
      total += w;
    }
    let roll = this.next() * total;
    for (let i = 0; i < weights.length; i++) {
      roll -= weights[i] as number;
      if (roll < 0) return i;
    }
    return weights.length - 1;
  }

  /** 派生独立子流：同父状态 + 同 label 必得同子流，且不影响父流后续取值 */
  fork(label: string): Rng {
    const state = this.getState();
    return new Rng(`${state.s0},${state.s1},${state.s2},${state.s3}|${label}`);
  }

  getState(): RngState {
    return { s0: this.s0, s1: this.s1, s2: this.s2, s3: this.s3 };
  }

  setState(state: RngState): void {
    this.s0 = state.s0 >>> 0;
    this.s1 = state.s1 >>> 0;
    this.s2 = state.s2 >>> 0;
    this.s3 = state.s3 >>> 0;
  }
}
