/**
 * 从 references/*.json 生成 docs/fact-table-appendix.md：
 * 全量内容目录（逐条 + 出处 + 置信度），fact-table.md 的机器生成附录。
 * 用法：npm run gen-fact-table
 */

import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const REF_DIR = join(ROOT, "references");
const OUT = join(ROOT, "docs", "fact-table-appendix.md");

interface Entry {
  key?: string;
  name?: string;
  rarity?: string;
  cost?: unknown;
  effect?: string;
  params?: unknown;
  unlock?: unknown;
  source?: unknown;
  confidence?: string;
  [k: string]: unknown;
}

function fmtCost(cost: unknown): string {
  if (typeof cost === "number") return `$${cost}`;
  if (Array.isArray(cost)) return `$${cost[0]}-${cost[1]}`;
  return "-";
}

function fmtSource(source: unknown): string {
  if (Array.isArray(source)) return source.join(" ; ");
  if (typeof source === "string") return source;
  return "-";
}

function table(title: string, entries: Entry[], note?: string): string {
  const lines: string[] = [`## ${title}`, ""];
  if (note) lines.push(`> ${note}`, "");
  lines.push("| key | 名称 | 稀有度 | 售价 | 效果（转述） | 置信度 |");
  lines.push("|---|---|---|---|---|---|");
  for (const e of entries) {
    const effect = String(e.effect ?? "").replace(/\|/g, "\\|").slice(0, 120);
    lines.push(
      `| ${e.key ?? "-"} | ${e.name ?? "-"} | ${e.rarity ?? "-"} | ${fmtCost(e.cost)} | ${effect} | ${e.confidence ?? "-"} |`,
    );
  }
  lines.push("");
  return lines.join("\n");
}

function main(): void {
  const files = readdirSync(REF_DIR).filter((f) => f.endsWith(".json"));
  const sections: string[] = [
    "# fact-table 附录（自动生成，勿手改）",
    "",
    `> 由 scripts/build-fact-table.ts 从 references/*.json 生成。每条来源与置信度见 references/ 原文件。`,
    "",
  ];

  for (const file of files) {
    const data = JSON.parse(readFileSync(join(REF_DIR, file), "utf8")) as Record<string, unknown>;
    sections.push(`# 来源文件：references/${file}`, "");
    if (typeof data.game_version_note === "string") {
      sections.push(`版本：${data.game_version_note}`, "");
    }
    for (const [k, v] of Object.entries(data)) {
      if (Array.isArray(v) && v.length > 0 && typeof v[0] === "object" && v[0] !== null) {
        const entries = v as Entry[];
        // 只对内容目录类数组生成表格（跳过 sources / gaps 等非目录数组）
        if (!entries.every((e) => typeof e.effect === "string" || typeof e.name === "string")) {
          continue;
        }
        sections.push(table(`${k}（${entries.length} 条）`, entries));
      }
    }
  }

  writeFileSync(OUT, sections.join("\n"));
  console.log(`写入 ${OUT}`);
}

main();
