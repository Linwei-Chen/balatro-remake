# 进度看板（balatro-remake 独立实现）

> 会话重启时，第一件事读本文件续做。每完成一个子任务立即更新。

## 重要背景（2026-10-13）
1. **用户指令：一定要独立实现。** 本项目与并行会话的 `balatro-clone/` 项目完全独立：
   - 独立目录、独立 git、独立脚手架；
   - **不读取、不引用对方任何代码**（洁净室纪律，见 decisions.md D7）；
   - 引擎、内容生成、测试全部自主实现。
2. 本机无 Balatro 安装（Steam 库 / App 目录 / Downloads 均无），按任务梯度降级到
   「社区文档采集」（balatrowiki.org 等），全部数值带出处与置信度；
   待拿到游戏文件后用导出 mod 升级置信度。不得从非官方渠道下载游戏本体。

## 当前阶段
- **阶段 A（数据采集）**：进行中 —— 5 路并行采集代理已派出（产出 → `references/*.json`）
- **阶段 B（引擎建模）**：进行中 —— 与 A 并行，先写不依赖采集数据的模块

## 任务看板
- [x] 项目骨架（独立目录 + git + package.json + tsconfig + vitest）
- [x] decisions.md（D1-D7）
- [x] src/core/rng.ts 可复现 RNG + 测试
- [x] src/core/cards.ts 卡牌模型
- [x] src/core/poker.ts 扑克判定器（15 种牌型含 3 隐藏）+ 测试
- [x] 首次 git commit（ae816f5，41 测试全绿）
- [x] src/core/scoring.ts 计分管线（事件队列）+ jokerRegistry.ts + 12 组机制冒烟测试（29e56a2）
- [x] src/core/economy.ts 经济系统骨架（注入式数值）
- [x] src/core/deck.ts 牌堆管理 + 6 测试（59 测试全绿）
- [ ] 阶段A 汇总：references/*.json → docs/fact-table.md（每条带出处+置信度）
- [ ] 阶段B 计分管线（事件队列）+ 10 组手算 golden tests
- [ ] 阶段B 经济系统（利息/重掷/盲注奖励）+ 测试
- [ ] 阶段C scripts/gen-content.ts + 小丑注册器（trigger×condition×action）+ coverage.md
- [ ] 阶段D PixiJS 渲染 + 手感复刻
- [ ] 阶段E 差分验证 + 独立评审 agent + 整局 run 模拟

## 采集代理状态（产出 → references/）
- [ ] core-scoring（牌型表/点数/顺序/版本/强化/封印）
- [ ] economy-blinds（Ante 曲线/盲注/利息/商店/卡包/Tag/优惠券/Boss）
- [ ] jokers-common（全部普通小丑）
- [ ] jokers-rare（全部罕见/稀有/传说小丑）
- [ ] consumables-decks（塔罗/星球/幻灵/牌组）

## 下一步
1. 等采集代理返回 → 合并写 docs/fact-table.md
2. 计分管线事件队列建模 + golden tests（数值取自 fact-table）
3. 经济系统 + 测试

## 已知偏差
- RNG：确定性 PRNG，保证同 seed 同操作同结果；不追求与原版 bit 级一致（decisions.md D2）。
