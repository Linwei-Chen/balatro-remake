# Balatro Remake（小丑牌复刻）

> 一个以「**逆向工程级数值还原 + 全原创实现**」为标准的 Balatro（小丑牌）玩法复刻项目。
> TypeScript 全栈实现，163 个自动化测试，所有数值可溯源。

**当前状态**：引擎层完成并全绿 ✅ · 最小可玩版可游玩 ✅ · 内容灌装 55/150 小丑 🚧 · 渲染层（PixiJS）🚧

---

## 这是什么 / 不是什么

| ✅ 本项目做 | ❌ 本项目不做 |
|---|---|
| 复刻游戏**机制、规则、数值公式**（事实不受版权保护） | 不包含任何原版美术、音频、字体资源 |
| 从公开社区文档（wiki、公开代码 dump）**提取数值事实**并标注出处 | 不复制原版代码、反编译产物、原文文案 |
| 全部代码从零原创实现（洁净室纪律） | 不提供游戏本体，不协助盗版 |

若权利人认为仓库内任何描述性文本存在问题，将立即配合改写或移除。

## 快速开始

```bash
npm install
npm run dev        # 浏览器打开 http://localhost:5173
npm test           # 163 个测试全绿
```

首次进入有 7 步交互教程；顶栏「📖 教程」随时回看。

## 核心特性

### 引擎（`src/core/`，纯逻辑零渲染依赖）

- **可复现 RNG**（`rng.ts`）：字符串播种 + fork 子流派生，同 seed 同操作必然同结果——整局游戏（洗牌、抽牌、幸运判定、商店）全部确定性可回放
- **事件队列计分管线**（`scoring.ts`）：完整还原原版结算顺序——牌型基础 → hand_played 小丑 → 逐张计分（点数→强化→封印→版本→小丑）→ Red Seal 重触发 → 手中计分（钢铁×1.5 → held 小丑）→ floor(筹码×倍率)
- **统一效果注册器**（`jokerRegistry.ts` + `effectHelpers.ts`）：`trigger × condition × action` 三元组 + 类型化构造器。小丑不是 150 个 if-else，而是数据驱动的效果组合（per_scored_card / hand_contains / retrigger / statMods / rules / 特化 builder 六族）
- **引擎规则标志**（`EngineRules`）：Four Fingers（4 张成同花/顺子）、Shortcut（跳空顺子）、Pareidolia（万物皆人头）在牌型判定前注入，被动小丑与主动小丑分层处理
- **对局状态机**（`run.ts` + `roundFlow.ts`）：底注/盲注推进、每回合资源重置、statMods 基于基础值重算（杜绝跨回合累积）、经济结算（盲注奖励→剩余手牌×$1→利息→金卡）

### 数值溯源（`docs/fact-table.md`）

**禁止凭记忆写数值**是本项目的铁律。每个数值必须溯源到事实表：

- 置信度分级：`code+wiki 双源 > wiki 多源一致 > wiki 单源 > 社区共识`
- 典型成果：发现并裁决了采集代理的「Ante 1=300」误读（Lua 数组索引陷阱），用双锚点（开局小盲 100 / Ante 8 Boss 70000）+ 无尽公式手算验证（Ante 9=110000、10=560000、11=7200000）确证正确映射
- 13 组金标准测试（G1-G13）：手工计算期望值锁定计分管线行为

### 内容管线（`scripts/gen-content.ts` → `src/content/`）

采集数据（150 小丑的参数化记录）→ 代码生成 → `buildJokerDef` 按 schema 匹配构建器族 → 引擎可直接消费。未实现条目返回 `null` 并进入 `coverage.md` 看板跟踪（55 已实现 / 95 待实现），快照测试防止回归。

### 最小可玩版 UI（`src/ui/`）

DOM 驱动完整游戏循环：盲注 → 选牌/出牌/弃牌 → 结算 → 商店（买/卖/重掷）→ 下一底注 → … → 通关/失败。7 步分步教程内置。渲染与逻辑严格分离，PixiJS 正式渲染层可整体替换视图而不触碰引擎。

## 项目结构

```
balatro-remake/
├── docs/               # 工程文档（会话中断必读 progress.md）
│   ├── progress.md     # 进度看板 + 关键决策记录
│   ├── fact-table.md   # 数值事实表（每条带出处与置信度）
│   ├── coverage.md     # 内容覆盖看板（已实现/已验证/未实现）
│   └── decisions.md    # 架构决策记录（D1-D7）
├── src/
│   ├── core/           # 引擎：rng/cards/poker/scoring/economy/deck/run/roundFlow/consumables
│   ├── content/        # 数值注入层：REAL_VALUES/REAL_ECONOMY/jokers.data/jokerDefs
│   └── ui/             # 视图：main.ts（DOM）/tutorial.ts
├── scripts/            # gen-content.ts（数据→代码）、build-fact-table.ts
└── tests/              # 13 个测试文件 · 163 测试（含 13 组金标准）
```

## 测试策略

| 层 | 覆盖 |
|---|---|
| 单元 | RNG 确定性、卡牌模型、12 种牌型判定（含规则标志）、经济公式 |
| 管线 | 计分 12 组机制冒烟（强化/封印/版本/重触发/破坏…） |
| 金标准 | 13 组手算场景锁死整条计分链 |
| 内容 | 55 个小丑构建快照 + 24 个代表场景端到端（数据→def→scoreHand 手算期望） |
| 对局 | 状态机推进、经济结算、整回合流程 |

## 路线图

- [x] 阶段 A：多路并行采集（wiki + 公开 Lua dump 数值事实）
- [x] 阶段 B：引擎建模 + 金标准测试
- [x] 经济系统锁定（Ante 曲线/利息/重掷/Showdown）
- [x] 小丑灌装批次 1（55/150）+ 最小可玩版 + 教程
- [ ] 小丑灌装批次 2（blueprint/brainstorm/obelisk、传奇 5 等复杂型）
- [ ] 商店/卡包生成、Tag、Voucher、Stakes
- [ ] 阶段 D：PixiJS 渲染 + 动画手感
- [ ] 阶段 E：整局模拟差分验证 + 独立评审 Agent

## 开发笔记

- 决策记录在 `docs/decisions.md`：技术栈选型、RNG 不追 bit 级一致（只保证确定性）、命名策略、注册器模式、置信度分级、事件队列、独立实现纪律
- 本项目与任何其他复刻项目**零代码共享**，全部实现独立完成

## License

代码以 MIT 许可发布。Balatro 是 LocalThunk 的作品，本项目与官方无关联、非官方授权，仅为学习目的的机制研究实现。请在拥有正版游戏的前提下使用本项目。
