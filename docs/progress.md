# 进度看板（balatro-remake 独立实现）

> 会话重启时，第一件事读本文件续做。每完成一个子任务立即更新。

## 重要背景（2026-10-13）
1. **用户指令：一定要独立实现。** 本项目与并行会话的 `balatro-clone/` 项目完全独立：
   - 独立目录、独立 git、独立脚手架；
   - **不读取、不引用对方任何代码**（洁净室纪律，见 decisions.md D7）；
   - 引擎、内容生成、测试全部自主实现。
2. 本机无 Balatro 安装（Steam 库 / App 目录 / Downloads 均无），按任务梯度降级到
   「社区文档采集」（balatrowiki.org + GitHub 公开 Lua dump 数值事实），全部数值带出处与置信度；
   待拿到游戏文件后用导出 mod 升级置信度。不得从非官方渠道下载游戏本体。

## 当前阶段
- **阶段 A（数据采集）**：✅ 完成 —— 5 路采集代理全部返回（`references/*.json`），fact-table.md 已合并
- **阶段 B（引擎建模）**：✅ 完成 —— 计分管线 + 经济 + 163 测试全绿
- **阶段 C（内容灌装）**：进行中 —— 150 小丑数据已生成，55 已实现 + 24 例端到端验证
- **阶段 D（渲染手感）**：未开始
- **阶段 E（差分验证）**：未开始

## 任务看板
- [x] 项目骨架（独立目录 + git + package.json + tsconfig + vitest）
- [x] decisions.md（D1-D7）
- [x] src/core/rng.ts 可复现 RNG + 测试
- [x] src/core/cards.ts 卡牌模型
- [x] src/core/poker.ts 扑克判定器（12 种牌型 + 规则标志）+ 测试
- [x] 首次 git commit（ae816f5，41 测试全绿）
- [x] src/core/scoring.ts 计分管线（事件队列）+ jokerRegistry.ts + 12 组机制冒烟测试（29e56a2）
- [x] src/core/economy.ts 经济系统骨架（注入式数值）
- [x] src/core/deck.ts 牌堆管理 + 6 测试（59 测试全绿）
- [x] 阶段A 汇总：references/*.json → docs/fact-table.md（每条带出处+置信度）
- [x] 阶段B 计分管线（事件队列）+ golden tests G1-G13（123 测试）
- [x] 阶段B 经济系统锁定：REAL_ECONOMY + 无尽公式 + Showdown $8 + 卖价最低 $1 + 利息口径（10 测试）
- [x] 阶段C 小丑灌装批次 1：55/150 实现 + jokerContent.test 24 例端到端（163 测试全绿）
- [ ] 阶段C 小丑灌装批次 2：剩余 95（blueprint/brainstorm/obelisk/传奇 5 等复杂型）
- [ ] 阶段C 商店/卡包生成、Tag、Voucher、Stakes、幻灵 create/destroy
- [ ] 阶段D PixiJS 渲染 + 手感复刻
- [ ] 阶段E 差分验证 + 独立评审 agent + 整局 run 模拟

## 采集代理状态（产出 → references/）
- [x] core-scoring（牌型表/点数/顺序/版本/强化/封印）
- [x] economy-blinds（Ante 曲线/盲注/利息/商店/卡包/Tag/优惠券/Boss）
- [x] jokers-common（61 普通小丑）
- [x] jokers-rare（89 罕见/稀有/传说小丑）
- [x] consumables-decks（塔罗/星球/幻灵/牌组）

## 本轮会话关键产出（2026-10-13）
1. **经济系统锁定**（FT-ECO-01~07 全 ✅ code+wiki）：
   - `src/content/economy.ts` REAL_ECONOMY（Ante 表/无尽公式/倍率/奖励/利息/重掷/卖价/起始 $4）
   - economy.ts 加 `perUnusedHand`（$1/剩余手牌）与 `showdownReward`（$8）；sellValue 最低 $1
   - run.ts `settleRound(state, goldCards, handsRemaining)` + Showdown 判定（ante≥8 boss）
   - **Ante 索引坑裁决**（FT-ECO-01）：采集代理「Ante 1=300」系 Lua 数组索引误读，
     双锚点（首把小盲 100 / Ante 8 Boss 70000）确证 `anteBases[ante-1]` 映射正确；
     无尽公式 50000 为硬编码常数非 Ante 8 值（手算 Ante 9/10/11 = 110000/560000/7200000 验证）
2. **灌装层端到端测试**（tests/jokerContent.test.ts，24 例手算期望）
3. **修 3 个真 bug**：
   - scoring.ts：`scoreCardOnce` 末尾清 `currentCard` 导致 Hack/Sock 类重触发条件永远失败
   - jokerDefs.ts：retrigger 采集 schema 双形态（`p.target` vs `p.retrigger.target`）解析错误，
     Sock and Buskin 变无条件重触发；Mime 补 `retriggerPhase:"held"` 阶段过滤
   - scoring.ts：补 `round_end` 时机触发点 `roundEndPayout()`（Golden Joker 之前给不了钱）
4. **对局集成补线**：roundFlow `collectRules()`（Four Fingers/Shortcut/Pareidolia 在牌型判定前生效）、
   attemptPlay 传 funds/handsLeft/discardsLeft/deckSize/handsPlayedTypes；
   run.ts RunState 加 `handsPlayedTypes`（beginBlind 清空，Card Sharp 用）
5. effectHelpers.cardIsFace 读 `rules.allCardsAreFace`（Pareidolia 联动）

## 下一步
1. 小丑灌装批次 2（先做 shop 生成依赖的 spawn 权重，再做复杂型）
2. 阶段 D：PixiJS 渲染层（渲染与逻辑严格分离，逻辑层已全部就绪）
3. 阶段 E：整局 run 模拟 + 差分验证 + 独立评审 agent

## 已知偏差
- RNG：确定性 PRNG，保证同 seed 同操作同结果；不追求与原版 bit 级一致（decisions.md D2）。
- 小丑售价用采集固定值（cost.min=max）；原版有浮动区间（待游戏文件核对）。
- 幻灵 create/destroy 类、Egg/增值类小丑需要 run 集成层，批次 2 处理。
