# 事实表（fact-table）

> 全部数值、公式、概率、权重必须溯源到本表。格式：`FT-xxx | 事实 | 值/公式 | 出处 | 置信度`
> 机器可读全量目录（每条带 source/confidence）在 `references/*.json`，由 `scripts/build-fact-table.ts` 生成附录。
>
> 置信度分级（decisions.md D5）：
> - **代码+wiki 双源**：balatrowiki.org 与公开 Lua dump（GladdonT/balatro-source-code，v1.0.1o-FULL）一致 —— 当前最高级
> - **wiki-多源一致**：两个以上独立社区来源一致
> - **wiki-单源 / high_secondary**：单一来源
> - **社区共识**：未经结构化确认
>
> 本机无原版游戏文件 → 待拿到安装文件后用导出 mod 将条目升级为「实测」。

## FT-CORE 计分核心（出处：references/core-scoring.json）

### FT-CORE-01 扑克牌型（共 12 种，含 3 隐藏；Royal Flush 非独立牌型，与同花顺同值）✅代码+wiki
| 牌型 | 基础 chips | 基础 mult | 每级 +chips | 每级 +mult |
|---|---|---|---|---|
| 高牌 High Card | 5 | 1 | +10 | +1 |
| 一对 Pair | 10 | 2 | +15 | +1 |
| 两对 Two Pair | 20 | 2 | +20 | +1 |
| 三条 Three of a Kind | 30 | 3 | +20 | +2 |
| 顺子 Straight | 30 | 4 | +30 | +3 |
| 同花 Flush | 35 | 4 | +15 | +2 |
| 葫芦 Full House | 40 | 4 | +25 | +2 |
| 四条 Four of a Kind | 60 | 7 | +30 | +3 |
| 同花顺 Straight Flush | 100 | 8 | +40 | +4 |
| 五条 Five of a Kind（隐藏） | 120 | 12 | +35 | +3 |
| 同花葫芦 Flush House（隐藏） | 140 | 14 | +40 | +4 |
| 同花五条 Flush Five（隐藏） | 160 | 16 | +50 | +3 |

### FT-CORE-02 牌面基础点数 ✅代码+wiki
2-10 = 面值；J/Q/K = 10；A = 11。

### FT-CORE-03 出牌结算顺序 ✅代码+wiki（eval_card / state_events）
1. Boss 盲注效果先结算（The Flint 等）
2. 计入牌型基础 chips/mult（FT-CORE-01，含等级加成）
3. hand_played 小丑从左到右（出牌即刻、计分前）
4. 打出的牌从左到右逐张计分，每张内部顺序：
   **基础点数（Stone +50 替代牌面；Bonus +30 紧随）→ 强化（mult/glass/lucky 判定）→ 封印（Gold Seal $3）→ 版本（Foil/Holo/Poly）→ on-scored 小丑从左到右**
5. 重触发完整重跑该卡序列；来源顺序 Red Seal 优先、再重触发类小丑从左到右
6. 手中计分阶段（Steel ×1.5 → held 小丑从左到右 → 重触发），在所有打出牌之后
7. 回合末：Gold Card（在手）$3 → Blue Seal（在手）生成星球

### FT-CORE-04 版本 Edition ✅代码+wiki
- Foil：+50 Chips（商店加价 +$2）
- Holographic：+10 Mult（+$2）
- Polychrome：×1.5 Mult（+$3）
- Negative：+1 小丑槽（消耗品则 +1 消耗品槽）（+$5）

### FT-CORE-05 强化 Enhancement ✅代码+wiki
- Bonus：+30 Chips
- Mult：+4 Mult
- Wild：视为任意花色（数值规则型）
- Glass：×2 Mult；计分后 1/4 概率销毁
- Steel：手中计分阶段 ×1.5 Mult
- **Stone：+50 Chips；无点数无花色；不参与牌型判定**
- Gold：回合末若在手得 $3
- **Lucky：1/5 概率 +20 Mult（加法！）；1/15 概率得 $20**

### FT-CORE-06 封印 Seal ✅代码+wiki
- Gold Seal：**打出并计分时** $3（非回合末；与 Gold Card 独立可共存）
- Red Seal：重触发此牌 1 次
- Blue Seal：回合末若在手 → 生成本回合最后打出牌型的星球牌（需槽位）
- Purple Seal：弃牌时生成塔罗牌（需槽位）——触发文本 wiki-单源

### FT-CORE-07 基础参数 ✅代码+wiki（get_starting_params）
手牌上限 8；出牌 4 次/回合；弃牌 3 次/回合（蓝注及以上 -1 → 2）；小丑槽 5；消耗品槽 2；起始 $4；重掷 $5 起。

### FT-CORE-08 星球-牌型映射 ✅
Pluto→高牌 / Mercury→对子 / Uranus→两对 / Venus→三条 / Saturn→顺子 / Jupiter→同花 / Earth→葫芦 / Mars→四条 / Neptune→同花顺（皇家同花顺共用） / Planet X→五条 / Ceres→同花葫芦 / Eris→同花五条（隐藏三张本局打出过才入池，softlock=true）

## FT-ECO 经济与盲注 ✅ code+wiki（出处：references/economy-blinds.json）

### FT-ECO-01 Ante 1-8 基础筹码 ✅ code+wiki+双锚点
显示底注 N 用表值 `[100, 300, 800, 2000, 5000, 11000, 20000, 35000][N-1]`。
**索引坑裁决**：采集表按 Ante 0..8 列出 9 值并断言「Ante 1=300」，与两条游戏内铁锚矛盾——
① 开局首把小盲 100 分；② Ante 8 Boss = 70000 = 35000×2（通关标志分）。
9 值映射到 Ante 1..9 无法同时满足双锚，映射到 Ante 0..8 则 Ante 8=50000 ⇒ Boss=100000 ✗。
结论：代理系 Lua 数组索引误读；本表映射 Ante 1..8（实现 `anteBases[ante-1]`）。
（Ante 0=100 仅挑战模式用，与 Ante 1 同值不冲突。）

### FT-ECO-02 Ante 9+ 无尽公式 ✅ code+wiki（30/30 级与 wiki 表吻合）
`floor_2sig( 50000 × (1.6 + (0.75×(ante-8))^(1+0.2×(ante-8)))^(ante-8) )`。
**50000 是公式内硬编码常数（假想 Ante 9 表值），不是 Ante 8 基础值 35000**。
锚点：Ante 9=110000、Ante 10=560000、Ante 11=7200000（手算验证一致）。
`floor_2sig(n) = n - n % 10^floor(log10(n)-1)`（2 位有效数字向下取整）。

### FT-ECO-03 盲注倍率 ✅ code+wiki
Small 1x / Big 1.5x / Boss 2x（Luchador/Chicot 关闭 The Wall/Vessel 时回落 2x base）。

### FT-ECO-04 击败奖励 ✅ code+wiki
Small $3 / Big $4 / Boss $5 / **Showdown（Ante 8+ Boss）$8**。
Mr. Bones 拯救无基础奖励；Red Stake+ 无 Small 奖励（Stakes 系统后置）。

### FT-ECO-05 回合末现金结算 ✅ code+wiki（cash_out 顺序）
顺序：**盲注奖励 → 剩余手牌×$1 → 利息 → 小丑回合末效果 → Tag → 汇总**。
- 剩余手牌 $1/张（弃牌 $0；Green Deck 改 $2 手牌 + $1 弃牌，后置）
- 利息 = `min(floor(持有金钱/5), 25/5)` 即每 $5 得 $1 上限 $5；
  **利息口径**：回合内发放的钱（金卡/金印章/lucky）计息；回合末小丑（Golden）不计当回合利息
- 金卡在手回合末 $3；金印章打出计分时 $3（计分管线内，非此处）
- 利息券：Seed Money 上限 $10（cap 50）、Money Tree $20（cap 100）、To the Moon 利息翻倍

### FT-ECO-06 商店经济 ✅ code+wiki
重掷 $5 起步 +$1/次，每进新商店重置；卖价 = **max(1, floor(买价/2))**；
开局 $4；包价 $4/$6/$8（Gros/Buff/Celestial/Standard ×1/2/卡数），商店槽位卡 2（Overstock 3/4）+ 包 2 + 券 1。

### FT-ECO-07 Boss 盲注 ✅ code+wiki
28 个 = 23 常规（mult 2、reward $5、各带 min_ante）+ 5 Showdown（Final Acorn/Leaf/Vessel/Heart/Bell，reward $8，**Vessel mult=6** 其余 2）。
Showdown 出现时机：Ante 8；无尽 8/16/24/32。击败 Ante 8 Showdown 即通关。

## FT-JOKER 小丑 ✅ 结构（出处：references/jokers-common/rare.json）
已确认结构事实（两代理双源一致）：总数 **150** = Common **61** + Uncommon **64** + Rare **20** + Legendary **5**。
- 灌装进度：**55 已实现**（`tests/jokerDefs.test.ts` 快照防漂移），95 待实现（复杂型：blueprint/brainstorm/obelisk/隐形/传奇五张等）
- 数据 schema 坑：retrigger 参数有两种形态——`{retrigger:{target,additional_times}}`（Hanging Chad）与
  `{retrigger_count, target?/ranks?/condition?}`（Mime/Sock/Hack/Dusk）；构建器已兼容
- 效果载体三类：`effects`（计分触发）/ `statMods`（回合资源：Juggler/Stuntman 等 6 个）/
  `rules`（引擎规则：Four Fingers/Shortcut/Pareidolia，经 `collectRules` 在牌型判定前生效）
- 小丑售价为**固定值**（采集 cost.min=max），非区间；卖价走 FT-ECO-06 公式

## FT-CONS 消耗牌与牌组（出处：references/consumables-decks.json）

### FT-CONS-01 数量 ✅wiki（任务简报预期已修正）
塔罗 **22**（非 32）；星球 **12**（9 常规 + 3 隐藏专属）；幻灵 **18**；牌组 **15**（另有 20 挑战牌组不在基础范围）。

### FT-CONS-02 售价
塔罗 $3；星球 $3；幻灵 $4（0.9.3g 后现行值）。

### FT-CONS-03 幻灵采集期修正项 ✅（以数据为准）
- Black Hole：所有牌型 **+1 级**（非 3 级；三源仲裁）
- Temperance：卖出小丑得 $（ min 3, max 50 按小丑卖价总和）——**无 $3 保底**（无小丑得 $0）
- Immolate：摧毁手中 5 张（非 2 张），得 $20

### FT-CONS-04 出现权重（商店/包）✅high_secondary
- 商店卡牌槽基础权重：小丑 20 / 塔罗 4 / 星球 4 / 幻灵 2（仅 Ghost Deck）
- 优惠券修正：Tarot Merchant 塔罗 ×2、Tarot Tycoon ×4、Planet Merchant 星球 ×2、Planet Tycoon ×4
- 包内特殊 roll：Omen Globe 后 Arcana 包 20%/卡替换为幻灵；The Soul 0.3%/卡；Black Hole 0.3%/卡
- booster 包商店权重与容量：见 references/consumables-decks.json appearance_weights 节

### FT-CONS-05 牌组差异（15 个）✅
Red 弃牌+1 / Blue 手牌+1 / Yellow 起始+$10 / Green 剩余出牌$2+弃牌$1、无利息 / Black 小丑槽+1 手牌-1 / Magic 起始 Crystal Ball+2 张 The Fool / Nebula 起始 Telescope、消耗品槽-1 / Ghost 幻灵入商店、起始 Hex / Abandoned 无人头牌 / Checkered 26 黑桃+26 红桃 / Zodiac 起始 Tarot+Planet Merchant+Overstock / Painted 手牌+2 小丑槽-1 / Anaglyph 每击败 Boss 得 Double Tag / Plasma 计分平衡 chips 与 mult（均值）、盲注 ×2 / Erratic 起始牌组随机化。
（全量明细见 references/consumables-decks.json decks 节）

## FT-JUICE 手感/UI 时序
（阶段 D 前采集）

## 附则
- 附录（全量目录逐条 + 出处）由 `scripts/build-fact-table.ts` 从 references/*.json 生成 → `docs/fact-table-appendix.md`
- golden tests 只断言置信度 ≥ wiki-单源 的条目；低置信条目进 coverage TODO
