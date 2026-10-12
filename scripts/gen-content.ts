/**
 * 内容生成器：references/*.json → src/content/*.ts
 * 当前：jokers（150 条）→ jokers.data.ts
 * 用法：npm run gen-content
 */

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const REF = join(ROOT, "references");
const OUT = join(ROOT, "src", "content", "jokers.data.ts");

interface RawJoker {
  key: string;
  name: string;
  rarity: string;
  cost: { min: number; max: number };
  effect: string;
  params: Record<string, unknown>;
  trigger: string;
  unlock: string | null;
  source: string | string[];
  confidence: string;
  cross_check?: string;
  notes?: string;
  spawn_condition?: string | null;
}

const HEADER = `/**
 * 小丑全量目录（自动生成，勿手改）—— 150 条。
 * 生成器：scripts/gen-content.ts ← references/jokers-common.json + jokers-rare.json
 * 每条的 effect 为中文转述，params 为可执行参数，confidence 为采集置信度。
 * 发布版改名换皮由 scripts/rename-pass.ts 处理（decisions.md D3）。
 */

export interface ContentJokerRecord {
  key: string;
  name: string;
  rarity: "common" | "uncommon" | "rare" | "legendary";
  cost: number;
  effect: string;
  params: Record<string, unknown>;
  trigger: string;
  unlock: string | null;
  source: string[];
  confidence: string;
  notes?: string;
  spawnCondition?: string;
}

export const JOKER_RECORDS: ContentJokerRecord[] = [
`;

function normalizeCost(cost: RawJoker["cost"]): number {
  if (typeof cost === "number") return cost;
  return cost.min ?? cost.max ?? 4;
}

function normalizeSource(s: RawJoker["source"]): string[] {
  return Array.isArray(s) ? s : [s];
}

function tsStr(v: unknown): string {
  return JSON.stringify(v ?? null);
}

function main(): void {
  const common = (JSON.parse(readFileSync(join(REF, "jokers-common.json"), "utf8")) as { jokers: RawJoker[] }).jokers;
  const rare = JSON.parse(readFileSync(join(REF, "jokers-rare.json"), "utf8")) as {
    uncommon: RawJoker[];
    rare: RawJoker[];
    legendary: RawJoker[];
  };
  const all = [...common, ...rare.uncommon, ...rare.rare, ...rare.legendary];

  const seen = new Set<string>();
  for (const j of all) {
    if (seen.has(j.key)) throw new Error(`重复 key: ${j.key}`);
    seen.add(j.key);
  }

  const body = all
    .map((j) => {
      return `  { key: ${tsStr(j.key)}, name: ${tsStr(j.name)}, rarity: ${tsStr(j.rarity)}, cost: ${normalizeCost(j.cost)}, effect: ${tsStr(j.effect)}, params: ${JSON.stringify(j.params)}, trigger: ${tsStr(j.trigger)}, unlock: ${tsStr(j.unlock)}, source: ${JSON.stringify(normalizeSource(j.source))}, confidence: ${tsStr(j.confidence)}${j.notes ? `, notes: ${tsStr(j.notes)}` : ""}${j.spawn_condition ? `, spawnCondition: ${tsStr(j.spawn_condition)}` : ""} },`;
    })
    .join("\n");

  const out = `${HEADER}${body}\n];\n\nexport const JOKER_COUNTS = { total: ${all.length}, common: ${common.length}, uncommon: ${rare.uncommon.length}, rare: ${rare.rare.length}, legendary: ${rare.legendary.length} } as const;\n`;
  writeFileSync(OUT, out);
  console.log(`写入 ${OUT}：${all.length} 条小丑`);
}

main();
