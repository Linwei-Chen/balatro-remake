/**
 * 最小可玩版 UI（阶段 D 前置）：纯 DOM 驱动核心引擎，渲染与逻辑分离。
 * 流程：盲注 → 出牌/弃牌 → 过线结算（cash out）→ 商店 → 下一盲注 → …
 * PixiJS 精细渲染后续替换本文件的视图部分，引擎调用保持不变。
 */
import {
  newRun, beginBlind, settleRound, failRound, type RunState,
} from "../core/run.js";
import {
  startRound, attemptPlay, discardCards, roundStatus, collectRules,
} from "../core/roundFlow.js";
import { drawCards, type DeckState } from "../core/deck.js";
import { standardDeck, type PlayingCard } from "../core/cards.js";
import { Rng } from "../core/rng.js";
import { REAL_ECONOMY } from "../content/economy.js";
import { REAL_VALUES } from "../content/values.js";
import { buildAllJokerDefs } from "../content/jokerDefs.js";
import { JOKER_RECORDS, type ContentJokerRecord } from "../content/jokers.data.js";
import { initialHandLevels } from "../core/hands.js";
import { sellValue } from "../core/economy.js";
import { maybeShowTutorial, showTutorial } from "./tutorial.js";

const { defs, implemented } = buildAllJokerDefs();
const recordOf = new Map<string, ContentJokerRecord>(JOKER_RECORDS.map((r) => [r.key, r]));

// ---------- 游戏状态 ----------
let seed = Math.random().toString(36).slice(2, 8).toUpperCase();
let run: RunState;
let deck: DeckState;
let selected = new Set<string>();
let shopStock: { key: string; cost: number }[] = [];
let rerollCount = 0;
let lastScoring: { chips: number; mult: number; score: number } | null = null;

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const btn = (id: string) => document.getElementById(id) as HTMLButtonElement;

function newGame(): void {
  run = newRun(
    standardDeck(),
    {
      seed, economy: REAL_ECONOMY,
      handSize: 8, handsPerRound: 4, discardsPerRound: 3,
      jokerSlots: 5, consumableSlots: 2,
    },
    new Rng(seed),
  );
  selected.clear();
  shopStock = [];
  rerollCount = 0;
  lastScoring = null;
  // newRun 已 beginBlind（playing），开局直接发牌
  deck = startRound(run, run.rng);
  render();
}

function rerollShop(): void {
  const rng = run.rng.fork("shop");
  const pool = [...implemented].sort(() => rng.next() - 0.5);
  shopStock = pool.slice(0, 2).map((key) => ({
    key, cost: recordOf.get(key)?.cost ?? 4,
  }));
}

function jokerDesc(key: string): string {
  const rec = recordOf.get(key);
  if (rec) return rec.effect;
  return defs.get(key)?.effects.map((e) => e.description).join("；") ?? key;
}

function goldInHand(): number {
  return deck.hand.filter((c) => c.enhancement === "gold").length;
}

// ---------- 动作 ----------
function onPlay(): void {
  if (selected.size === 0) return;
  const res = attemptPlay({
    run, deckState: deck, selectedIds: [...selected], jokers: run.jokers, defs,
    values: REAL_VALUES, handLevels: run.handLevels,
  });
  run = res.run;
  selected.clear();
  lastScoring = res.scoring;
  const lines = res.scoring.log.slice(-6).map((l) => `· ${l.detail}`);
  log(`【${handTypeName(res.scoring.handType)}】${res.scoring.chips} × ${res.scoring.mult} = +${res.scoring.score} 分\n${lines.join("\n")}`);
  checkRoundEnd();
  render();
}

function onDiscard(): void {
  if (selected.size === 0) return;
  const res = discardCards({ run, deckState: deck, ids: [...selected] });
  run = res.run;
  drawCards(deck, run.handSize - deck.hand.length, run.rng);
  selected.clear();
  log(`弃掉 ${res.discarded.length} 张，补抽至手牌上限。`);
  render();
}

function checkRoundEnd(): void {
  const st = roundStatus(run);
  if (st === "won") {
    $("cashBtn").classList.remove("hidden");
  } else if (st === "lost") {
    run = failRound(run);
    showOver(false);
  }
}

function onCashOut(): void {
  $("cashBtn").classList.add("hidden");
  const hands = run.handsLeft;
  const gold = goldInHand();
  const before = run.money;
  run = settleRound(run, gold, hands);
  const inc = run.lastIncome!;
  log(`结算：盲注奖励 $${inc.base} + 剩余手牌 $${inc.hands} + 利息 $${inc.interest} + 金卡 $${inc.gold} = $${inc.total}（$${before} → $${run.money}）`);
  if (run.phase === "won") { showOver(true); return; }
  rerollCount = 0;
  rerollShop();
  $("shop").classList.remove("hidden");
  render();
}

function onNextBlind(): void {
  $("shop").classList.add("hidden");
  run = beginBlind(run);
  // 回合资源修正：基于基础值每回合重算，不累积（Stuntman/Juggler/Burglar 等）
  let handSize = run.handSizeBase;
  let hands = run.handsPerRound;
  let discards = run.discardsPerRound;
  let handsGain = 0;
  let discardsSet: number | undefined;
  for (const j of run.jokers) {
    const mods = defs.get(j.key)?.statMods;
    if (!mods) continue;
    if (mods.handSize) handSize += mods.handSize;
    if (mods.handsPerRound) hands += mods.handsPerRound;
    if (mods.discards) discards += mods.discards;
    if (mods.blindStartHandsGain) handsGain += mods.blindStartHandsGain;
    if (mods.blindStartDiscardsSetTo !== undefined) discardsSet = mods.blindStartDiscardsSetTo;
  }
  run = {
    ...run,
    handSize: Math.max(1, handSize),
    handsLeft: Math.max(1, hands + handsGain),
    discardsLeft: discardsSet ?? Math.max(0, discards),
  };
  deck = startRound(run, run.rng);
  selected.clear();
  lastScoring = null;
  log(`进入 ${blindLabel()}，需求 ${run.requirement} 分。`);
  if (run.round === 1) log("💡 试着先选出两张点数相同的牌打出（对子最稳）。");
  render();
}

function onBuy(key: string, cost: number): void {
  if (run.money < cost) { log("钱不够！"); return; }
  if (run.jokers.length >= run.jokerSlots) { log("小丑槽已满！"); return; }
  run = { ...run, money: run.money - cost, jokers: [...run.jokers, { key, counters: {}, edition: "base" as const }] };
  shopStock = shopStock.filter((s) => s.key !== key);
  log(`买入 ${recordOf.get(key)?.name ?? key}（-$${cost}）。`);
  render();
}

function onSell(key: string): void {
  const rec = recordOf.get(key);
  const cost = rec?.cost ?? 4;
  const price = sellValue(cost, REAL_ECONOMY);
  if (!window.confirm(`卖出 ${rec?.name ?? key}？得 $${price}`)) return;
  const idx = run.jokers.findIndex((j) => j.key === key);
  if (idx === -1) return;
  const jokers = [...run.jokers];
  jokers.splice(idx, 1);
  run = { ...run, money: run.money + price, jokers };
  log(`卖出 ${rec?.name ?? key}（+$${price}）。`);
  render();
}

function onReroll(): void {
  const cost = REAL_ECONOMY.rerollBase + rerollCount * REAL_ECONOMY.rerollIncrement;
  if (run.money < cost) { log("重掷钱不够！"); return; }
  run = { ...run, money: run.money - cost };
  rerollCount++;
  rerollShop();
  log(`重掷商店（-$${cost}）。`);
  renderShop();
  renderHud();
}

// ---------- 渲染 ----------
const SUIT_CHAR: Record<string, string> = { S: "♠", H: "♥", C: "♣", D: "♦" };
const RANK_STR: Record<number, string> = { 11: "J", 12: "Q", 13: "K", 14: "A" };
const ENH_TAG: Record<string, string> = {
  bonus: " bonus", mult: " mult", glass: " 玻璃", steel: " 钢铁", gold: " 金", lucky: " 幸运", stone: " 石",
};

function rankStr(rank: number): string {
  return RANK_STR[rank] ?? String(rank);
}

function blindLabel(): string {
  return run.blindKind === "small" ? "小盲注" : run.blindKind === "big" ? "大盲注" : "Boss 盲注";
}

function handTypeName(t: string): string {
  const names: Record<string, string> = {
    HIGH_CARD: "高牌", PAIR: "对子", TWO_PAIR: "两对", THREE_OF_A_KIND: "三条",
    STRAIGHT: "顺子", FLUSH: "同花", FULL_HOUSE: "葫芦", FOUR_OF_A_KIND: "四条",
    STRAIGHT_FLUSH: "同花顺", ROYAL_FLUSH: "皇家同花顺", FIVE_OF_A_KIND: "五条",
    FLUSH_HOUSE: "同花葫芦", FLUSH_FIVE: "同花五条",
  };
  return names[t] ?? t;
}

function cardEl(c: PlayingCard): HTMLElement {
  const div = document.createElement("div");
  const red = c.suit === "H" || c.suit === "D";
  div.className = `card ${red ? "red" : "black"} ${c.enhancement !== "none" ? `enh-${c.enhancement}` : ""}${selected.has(c.id) ? " sel" : ""}`;
  const isStone = c.enhancement === "stone";
  div.innerHTML = isStone
    ? `<span class="suit">🪨</span><span>石</span>`
    : `<span>${rankStr(c.rank)}</span><span class="suit">${SUIT_CHAR[c.suit]}</span>${c.enhancement !== "none" ? `<span class="enh">${ENH_TAG[c.enhancement]}</span>` : ""}`;
  div.onclick = () => {
    if (run.phase !== "playing") return;
    if (selected.has(c.id)) selected.delete(c.id);
    else if (selected.size < 5) selected.add(c.id);
    render();
  };
  return div;
}

function jokerEl(key: string, sellable: boolean): HTMLElement {
  const rec = recordOf.get(key);
  const div = document.createElement("div");
  div.className = `joker-card ${rec?.rarity ?? "common"}`;
  div.innerHTML = `<div class="jname">${rec?.name ?? key}</div><div class="jdesc">${jokerDesc(key)}</div>${sellable ? `<div class="sell">卖 $${sellValue(rec?.cost ?? 4, REAL_ECONOMY)}</div>` : ""}`;
  if (sellable) div.onclick = () => onSell(key);
  return div;
}

function renderHud(): void {
  $("money").textContent = `$${run.money}`;
  $("ante").textContent = String(run.ante);
  $("roundScore").textContent = String(run.roundScore);
  $("hands").textContent = String(run.handsLeft);
  $("discards").textContent = String(run.discardsLeft);
  $("handSize").textContent = String(run.handSize);
  $("seedTag").textContent = seed;
  $("blindInfo").innerHTML = `${blindLabel()} 需求 <span class="req">${run.requirement}</span>`;
}

function renderJokers(): void {
  const box = $("jokers");
  box.innerHTML = "";
  for (const j of run.jokers) box.appendChild(jokerEl(j.key, true));
}

function renderHand(): void {
  const box = $("hand");
  box.innerHTML = "";
  if (run.phase !== "playing") { return; }
  for (const c of deck.hand) box.appendChild(cardEl(c));
}

function renderScoreboard(): void {
  const s = lastScoring;
  $("sbChips").textContent = s ? String(s.chips) : "0";
  $("sbMult").textContent = s ? String(s.mult) : "0";
  $("sbScore").textContent = s ? String(s.score) : "0";
}

function renderShop(): void {
  const shop = $("shop");
  if (shop.classList.contains("hidden")) return;
  const row = $("shopRow");
  row.innerHTML = "";
  for (const s of shopStock) {
    const item = document.createElement("div");
    item.className = "shop-item";
    item.appendChild(jokerEl(s.key, false));
    const price = document.createElement("div");
    price.className = "price";
    price.textContent = `$${s.cost}`;
    const buy = document.createElement("button");
    buy.textContent = "购买";
    buy.disabled = run.money < s.cost || run.jokers.length >= run.jokerSlots;
    buy.onclick = () => onBuy(s.key, s.cost);
    item.appendChild(price);
    item.appendChild(buy);
    row.appendChild(item);
  }
  const rc = REAL_ECONOMY.rerollBase + rerollCount * REAL_ECONOMY.rerollIncrement;
  btn("rerollBtn").textContent = `重掷 $${rc}`;
  btn("rerollBtn").disabled = run.money < rc;
}

function renderActions(): void {
  const playing = run.phase === "playing";
  const play = btn("playBtn");
  const disc = btn("discardBtn");
  play.classList.toggle("hidden", !playing);
  disc.classList.toggle("hidden", !playing);
  play.disabled = selected.size === 0 || run.handsLeft <= 0;
  disc.disabled = selected.size === 0 || run.discardsLeft <= 0;
  btn("nextBlindBtn").classList.toggle("hidden", run.phase !== "blind_select");
}

function render(): void {
  renderHud();
  renderJokers();
  renderHand();
  renderScoreboard();
  renderShop();
  renderActions();
}

function log(msg: string): void {
  const box = $("msg");
  box.textContent = msg + "\n" + box.textContent;
}

function showOver(won: boolean): void {
  $("overTitle").textContent = won ? "🏆 通关！" : "💀 游戏结束";
  $("overSub").textContent = won
    ? `底注 ${run.ante} 打穿！种子 ${seed}`
    : `止步于底注 ${run.ante} ${blindLabel()}（需求 ${run.requirement}，当前 ${run.roundScore}）`;
  $("overlay").classList.remove("hidden");
}

// ---------- 事件绑定 ----------
$("playBtn").onclick = onPlay;
$("discardBtn").onclick = onDiscard;
$("cashBtn").onclick = onCashOut;
$("nextBlindBtn").onclick = onNextBlind;
$("rerollBtn").onclick = onReroll;
$("restartBtn").onclick = () => {
  seed = Math.random().toString(36).slice(2, 8).toUpperCase();
  $("overlay").classList.add("hidden");
  $("msg").textContent = "";
  // 教程：首次进入自动弹出，之后可从顶栏「📖 教程」回看
btn("helpBtn").onclick = () => showTutorial();
newGame();
maybeShowTutorial();
};

// 教程：首次进入自动弹出，之后可从顶栏「📖 教程」回看
btn("helpBtn").onclick = () => showTutorial();
newGame();
maybeShowTutorial();
