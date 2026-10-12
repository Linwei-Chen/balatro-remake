# fact-table 附录（自动生成，勿手改）

> 由 scripts/build-fact-table.ts 从 references/*.json 生成。每条来源与置信度见 references/ 原文件。

# 来源文件：references/consumables-decks.json

版本：数值锚定 Balatro v1.0.x 稳定线（balatrowiki.org 现行数值）。消耗牌售价为 0.9.3g 后现行值：塔罗 $3、星球 $3、幻灵 $4。本机无原版，全部数值来自社区 Wiki（其概率页由反编译得出），属高置信二手数据，非实测。

## tarots（22 条）

| key | 名称 | 稀有度 | 售价 | 效果（转述） | 置信度 |
|---|---|---|---|---|---|
| c_fool | The Fool | - | $3 | 生成一张本局上次使用过的塔罗或星球牌（The Fool 除外）；需消耗牌槽位 | high |
| c_magician | The Magician | - | $3 | 将 2 张选中的手牌强化为 Lucky Card | high |
| c_high_priestess | The High Priestess | - | $3 | 生成至多 2 张随机星球牌；需消耗牌槽位 | high |
| c_empress | The Empress | - | $3 | 将 2 张选中的手牌强化为 Mult Card | high |
| c_emperor | The Emperor | - | $3 | 生成至多 2 张随机塔罗牌；需消耗牌槽位 | high |
| c_hierophant | The Hierophant | - | $3 | 将 2 张选中的手牌强化为 Bonus Card | high |
| c_lovers | The Lovers | - | $3 | 将 1 张选中的手牌强化为 Wild Card | high |
| c_chariot | The Chariot | - | $3 | 将 1 张选中的手牌强化为 Steel Card | high |
| c_justice | Justice | - | $3 | 将 1 张选中的手牌强化为 Glass Card | high |
| c_hermit | The Hermit | - | $3 | 当前金钱翻倍，本卡收益上限 $20 | high |
| c_wheel_of_fortune | The Wheel of Fortune | - | $3 | 1/4 概率为一张随机小丑添加 Foil / Holographic / Polychrome 版本之一 | high |
| c_strength | Strength | - | $3 | 将至多 2 张选中手牌的点数提升 1 级 | high |
| c_hanged_man | The Hanged Man | - | $3 | 摧毁至多 2 张选中的手牌 | high |
| c_death | Death | - | $3 | 选中 2 张手牌，将左边的牌变为与右边相同（可拖动调整顺序） | high |
| c_temperance | Temperance | - | $3 | 获得当前所有小丑的卖值总和，上限 $50；无最低保底（无小丑时得 $0） | high |
| c_devil | The Devil | - | $3 | 将 1 张选中的手牌强化为 Gold Card | high |
| c_tower | The Tower | - | $3 | 将 1 张选中的手牌强化为 Stone Card | high |
| c_star | The Star | - | $3 | 将至多 3 张选中手牌转换为方块 | high |
| c_moon | The Moon | - | $3 | 将至多 3 张选中手牌转换为梅花 | high |
| c_sun | The Sun | - | $3 | 将至多 3 张选中手牌转换为红桃 | high |
| c_judgement | Judgement | - | $3 | 生成一张随机小丑；需小丑槽位 | high |
| c_world | The World | - | $3 | 将至多 3 张选中手牌转换为黑桃 | high |

## planets（12 条）

| key | 名称 | 稀有度 | 售价 | 效果（转述） | 置信度 |
|---|---|---|---|---|---|
| c_pluto | Pluto | - | $3 | High Card（高牌）等级 +1（chips/mult 增量见 core-scoring 数据，此处不重复） | high |
| c_mercury | Mercury | - | $3 | Pair（对子）等级 +1 | high |
| c_uranus | Uranus | - | $3 | Two Pair（两对）等级 +1 | high |
| c_venus | Venus | - | $3 | Three of a Kind（三条）等级 +1 | high |
| c_saturn | Saturn | - | $3 | Straight（顺子）等级 +1 | high |
| c_jupiter | Jupiter | - | $3 | Flush（同花）等级 +1 | high |
| c_earth | Earth | - | $3 | Full House（葫芦）等级 +1 | high |
| c_mars | Mars | - | $3 | Four of a Kind（四条）等级 +1 | high |
| c_neptune | Neptune | - | $3 | Straight Flush（同花顺）等级 +1；Royal Flush（皇家同花顺）共用此升级、无专属星球牌 | high |
| c_planet_x | Planet X | - | $3 | Five of a Kind（五条，隐藏牌型）等级 +1；仅在本局打出过该牌型后的商店/卡包中出现 | high |
| c_ceres | Ceres | - | $3 | Flush House（葫芦同花，隐藏牌型）等级 +1；仅在本局打出过该牌型后出现 | high |
| c_eris | Eris | - | $3 | Flush Five（同花五条，隐藏牌型）等级 +1；仅在本局打出过该牌型后出现 | high |

## spectrals（18 条）

| key | 名称 | 稀有度 | 售价 | 效果（转述） | 置信度 |
|---|---|---|---|---|---|
| c_familiar | Familiar | - | $4 | 摧毁手中 1 张随机牌，向手中加入 3 张随机强化的人头牌（J/Q/K） | high |
| c_grim | Grim | - | $4 | 摧毁手中 1 张随机牌，向手中加入 2 张随机强化的 A | high |
| c_incantation | Incantation | - | $4 | 摧毁手中 1 张随机牌，向手中加入 4 张随机强化的数字牌（2–10） | high |
| c_talisman | Talisman | - | $4 | 为 1 张选中的手牌添加 Gold Seal（金色封印：打出时得 $3） | high |
| c_aura | Aura | - | $4 | 为 1 张选中的手牌添加 Foil / Holographic / Polychrome 版本之一 | high |
| c_wraith | Wraith | - | $4 | 生成 1 张随机稀有（Rare）小丑（需槽位），并将当前金钱设为 $0 | high |
| c_sigil | Sigil | - | $4 | 将手中所有牌转换为同一随机花色 | high |
| c_ouija | Ouija | - | $4 | 将手中所有牌转换为同一随机点数；手牌上限 -1（本场对局永久） | high |
| c_ectoplasm | Ectoplasm | - | $4 | 为 1 张随机小丑添加 Negative 版本；手牌上限 -1（本场对局永久） | high |
| c_immolate | Immolate | - | $4 | 摧毁手中 5 张随机牌，获得 $20 | high |
| c_ankh | Ankh | - | $4 | 复制 1 张随机小丑（若原卡为 Negative，副本失去 Negative），摧毁其余所有小丑 | high |
| c_deja_vu | Deja Vu | - | $4 | 为 1 张选中的手牌添加 Red Seal（红色封印：重抽该牌） | high |
| c_hex | Hex | - | $4 | 为 1 张随机小丑添加 Polychrome 版本，摧毁其余所有小丑 | high |
| c_trance | Trance | - | $4 | 为 1 张选中的手牌添加 Blue Seal（蓝色封印：回合结束留牌生成对应星球牌） | high |
| c_medium | Medium | - | $4 | 为 1 张选中的手牌添加 Purple Seal（紫色封印：弃牌时生成对应塔罗牌） | high |
| c_cryptid | Cryptid | - | $4 | 为选中的 1 张手牌创建 2 份副本 | high |
| c_soul | The Soul | - | $4 | 生成 1 张传说（Legendary）小丑（需槽位）；是获得 5 张传说小丑的唯一途径 | high |
| c_black_hole | Black Hole | - | $4 | 所有扑克牌型等级 +1（含尚未发现与隐藏牌型） | high |

## decks（15 条）

| key | 名称 | 稀有度 | 售价 | 效果（转述） | 置信度 |
|---|---|---|---|---|---|
| d_red | Red Deck | - | $0 | 每回合弃牌次数 +1 | high |
| d_blue | Blue Deck | - | $0 | 每回合手牌上限 +1 | high_secondary |
| d_yellow | Yellow Deck | - | $0 | 起始资金 +$10 | high_secondary |
| d_green | Green Deck | - | $0 | 回合结束时：每剩余出牌次数得 $2、每剩余弃牌次数得 $1；无利息 | high_secondary |
| d_black | Black Deck | - | $0 | 小丑槽 +1；每回合手牌上限 -1 | high_secondary |
| d_magic | Magic Deck | - | $0 | 起始拥有 Crystal Ball（水晶球）优惠券和 2 张 The Fool 塔罗牌 | high |
| d_nebula | Nebula Deck | - | $0 | 起始拥有 Telescope 优惠券；消耗牌槽 -1 | high |
| d_ghost | Ghost Deck | - | $0 | 幻灵牌可出现在商店（商店幻灵权重 2）；起始携带 1 张 Hex | high |
| d_abandoned | Abandoned Deck | - | $0 | 起始牌组中无人头牌（J/Q/K） | high |
| d_checkered | Checkered Deck | - | $0 | 起始牌组为 26 张黑桃 + 26 张红桃 | high |
| d_zodiac | Zodiac Deck | - | $0 | 起始拥有 Tarot Merchant、Planet Merchant、Overstock 三张优惠券 | high |
| d_painted | Painted Deck | - | $0 | 手牌上限 +2；小丑槽 -1 | high |
| d_anaglyph | Anaglyph Deck | - | $0 | 每击败一个 Boss 盲注后获得 1 张 Double Tag | high |
| d_plasma | Plasma Deck | - | $0 | 计分时将 Chips 与 Mult 平衡（取两者之和的一半）；基础盲注 ×2 | high |
| d_erratic | Erratic Deck | - | $0 | 起始牌组所有牌的点数与花色随机化 | high |

# 来源文件：references/core-scoring.json

版本：balatrowiki.org 标注对应游戏版本 1.0.1o-FULL；GitHub 原版 Lua dump（GladdonT/balatro-source-code，version.jkr）同为 1.0.1o-FULL。所有核心数值已用 wiki + 原版代码双重验证。

## editions（4 条）

| key | 名称 | 稀有度 | 售价 | 效果（转述） | 置信度 |
|---|---|---|---|---|---|
| Foil | - | - | - | +50 Chips | wiki-多源一致 |
| Holographic | - | - | - | +10 Mult | wiki-多源一致 |
| Polychrome | - | - | - | ×1.5 Mult | wiki-多源一致 |
| Negative | - | - | - | +1 小丑槽（对消耗品则 +1 消耗品槽） | wiki-多源一致 |

## enhancements（8 条）

| key | 名称 | 稀有度 | 售价 | 效果（转述） | 置信度 |
|---|---|---|---|---|---|
| Bonus | - | - | - | +30 Chips | wiki-多源一致 |
| Mult | - | - | - | +4 Mult | wiki-多源一致 |
| Wild | - | - | - | 可作为任意花色 | wiki-单源 |
| Glass | - | - | - | ×2 Mult；1/4 概率销毁该牌 | wiki-多源一致 |
| Steel | - | - | - | 手中（held in hand）时 ×1.5 Mult | wiki-多源一致 |
| Stone | - | - | - | +50 Chips；无点数无花色 | wiki-多源一致 |
| Gold | - | - | - | 回合结束时若此牌在手（held in hand）得 $3 | wiki-多源一致 |
| Lucky | - | - | - | 1/5 概率 +20 Mult；1/15 概率得 $20 | wiki-多源一致 |

## seals（4 条）

| key | 名称 | 稀有度 | 售价 | 效果（转述） | 置信度 |
|---|---|---|---|---|---|
| Gold | - | - | - | 此牌被打出并计分时得 $3 | wiki-多源一致 |
| Red | - | - | - | 重触发此牌 1 次 | wiki-多源一致 |
| Blue | - | - | - | 若回合末在手：生成本回合最后打出牌型对应的星球牌（需有空位） | wiki-多源一致 |
| Purple | - | - | - | 弃牌时生成一张塔罗牌（需有空位） | wiki-多源一致 |

## sources（3 条）

| key | 名称 | 稀有度 | 售价 | 效果（转述） | 置信度 |
|---|---|---|---|---|---|
| - | Balatro Wiki (balatrowiki.org) | - | - |  | - |
| - | 原版游戏 Lua dump（GitHub 公开仓库） | - | - |  | - |
| - | Fandom 旧 wiki（交叉验证尝试） | - | - |  | - |
