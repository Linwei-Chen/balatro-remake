# 内容覆盖看板（coverage.md）

> 目标：全量内容 逐条「已实现 / 已验证 / 未实现」。gen-content 灌装后由脚本自动刷新本文件头部计数，人工补勾选状态。

## 汇总计数（采集确认值，出处见 fact-table）
| 类别 | 原版数量（wiki 双源） | 已实现 | 已验证 |
|---|---|---|---|
| 小丑 | 150（Common 61 / Uncommon 64 / Rare 20 / Legendary 5） | 55 | 55（24 个代表场景端到端 + 机制层全量） |
| 塔罗 | 22 | 2 类目标操作（enhance/seal/edition/level_up） | ✅ consumables.test |
| 星球 | 12（含 3 张隐藏牌型星球） | 12（牌型升级表） | ✅ hands.test |
| 幻灵 | 18 | 0（create/destroy 类待 run 集成） | — |
| 优惠券 | 32（待核对） | 0 | — |
| 牌组 | 15 | 0（仅标准牌组） | — |
| Boss 盲注 | 28（23 常规 + 5 Showdown）✅ code+wiki | 数值层 28（倍率/奖励/min_ante） | ✅ economy.test |
| Tag | 24（待灌装核对） | 0 | — |

## 状态说明
- **已实现**：内容注册器中有配置，能在引擎中生效
- **已验证**：有「触发场景 → 期望结果」测试通过
- **未实现**：仅有数据，无注册器配置

## 小丑灌装明细（55/150，快照测试 tests/jokerDefs.test.ts 防漂移）

### 已实现且已验证（代表场景端到端，tests/jokerContent.test.ts 24 例）
j_joker、j_greedy_joker、j_scholar、j_even_steven、j_odd_todd、j_scary_face、j_smiley、
j_ticket、j_jolly、j_half、j_acrobat、j_blackboard、j_flower_pot、j_card_sharp、
j_hanging_chad、j_hack、j_sock_and_buskin、j_dusk、j_mime、j_abstract、j_blue_joker、
j_bull、j_golden、j_misprint、j_pareidolia（+scary 联动）、j_four_fingers、j_stuntman

### 已实现（构建器覆盖，走同族模板逻辑；机制层测试已覆盖模板族）
- per_scored_card 族（12）：j_lusty_joker、j_wrathful_joker、j_gluttenous_joker、j_walkie_talkie、j_business、j_8_ball
- hand_contains 族（10）：j_zany、j_mad、j_crazy、j_droll、j_sly、j_wily、j_clever、j_devious、j_crafty
- 特化（其余）：j_ride_the_bus、j_runner、j_square、j_photograph、j_baseball_card、j_mystic_summit、j_burglar、j_juggler、j_drunkard、j_troubadour、j_merry_andy、j_shortcut

### 未实现（95，待后续会话灌装）
关键复杂型：j_stencil（槽位计算）、j_blueprint、j_brainstorm、j_obelisk、j_invisible、
j_dna、j_baron、j_vagabond、j_perkeo 等；传奇 5：j_canio、j_triboulet、j_yorick、j_chicot、j_perkeo。
完整清单见 `tests/jokerDefs.test.ts` 输出。

## 明细
（塔罗/星球/幻灵/券/Tag 明细待灌装后由脚本生成）
