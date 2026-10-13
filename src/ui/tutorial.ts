/**
 * 游戏内教程：分步引导 + 常驻帮助入口。
 * 首次进入自动显示（localStorage 记忆），之后随时点「📖 教程」回看。
 */

interface Step {
  title: string;
  body: string; // HTML
}

const STEPS: Step[] = [
  {
    title: "🎯 目标：打穿 8 个底注",
    body: `
      <p>每个<b>底注（Ante）</b>有 3 个盲注关卡：<b>小盲注 → 大盲注 → Boss 盲注</b>。</p>
      <p>每个盲注有一个<b>分数需求</b>（顶栏红色数字）。在一回合内（限 4 次出牌）把分数累计到需求以上，就能通过。</p>
      <p>打穿底注 8 的 Boss 盲注即<b>通关</b>；任一回合用完出牌次数还没过线，游戏结束。</p>
    `,
  },
  {
    title: "🃏 出牌计分：筹码 × 倍率",
    body: `
      <p>点击手牌选中 1-5 张（最多 5 张），点「<b>出牌</b>」计分。</p>
      <p><b>分数 = 筹码 × 倍率</b>，顶栏计分板实时显示。</p>
      <p>两个来源叠加：</p>
      <p>① <b>牌型</b>给基础筹码和倍率——高牌 5×1 最弱，<b>对子 10×2</b>、两对、三条（30×3）、顺子、同花（35×4）…越稀有越强；</p>
      <p>② <b>每张牌面点数</b>加筹码——数字牌加面值，J/Q/K/10 各 +10，A +11。</p>
      <p>例：一对 A = 牌型 10 筹码 + 11 + 11 = 32 筹码，× 倍率 2 = <b>64 分</b>。</p>
    `,
  },
  {
    title: "🤹 小丑牌：得分引擎",
    body: `
      <p>最多装备 <b>5 个小丑</b>（顶部一排）。出牌计分时它们依次触发效果：</p>
      <p>· <b>+筹码 / +倍率</b>：如「每张钻石牌 +3 倍率」「手牌含对子时 +8 倍率」；</p>
      <p>· <b>×倍率</b>：成倍放大，后期主要靠它；</p>
      <p>· <b>给钱 / 重触发</b>：回合末给钱、让某张牌多计一次分。</p>
      <p>计分日志（消息区）会逐条显示触发顺序，顺序与摆放位置有关——<b>排列小丑也是策略</b>。</p>
      <p>小丑只能从商店获得，各有稀有度（蓝=普通 / 绿=罕见 / 红=稀有）。</p>
    `,
  },
  {
    title: "🗑️ 弃牌：换掉不要的牌",
    body: `
      <p>每回合有 <b>3 次弃牌</b>：选 1-5 张牌点「弃牌」，直接换新牌（不消耗出牌次数）。</p>
      <p>用途：凑对子/顺子/同花。手牌上限 8 张，弃掉 2 张会立即补 2 张。</p>
      <p>提示：弃牌不加分也不给钱，但能把烂手换成强牌型——通常更划算。</p>
    `,
  },
  {
    title: "💰 结算：过线后拿钱",
    body: `
      <p>分数过线后出现「<b>结算 💰</b>」按钮，点它领取本回合收入：</p>
      <p>· <b>盲注奖励</b>：小盲 $3 / 大盲 $4 / Boss $5（底注 8 的 Boss 给 $8）；</p>
      <p>· <b>剩余出牌次数 × $1</b>：省着点用，剩 4 次出牌 = 白拿 $4；</p>
      <p>· <b>利息</b>：每持有 $5 得 $1，单回合上限 $5（有 $25 就拿满）——所以<b>存钱也有收益</b>；</p>
      <p>· <b>金卡</b>：手牌里带「金」标签的牌留到回合末，每张 $3。</p>
      <p>开局只有 $4，一切 expansions 靠钱推动。</p>
    `,
  },
  {
    title: "🛒 商店：花钱变强",
    body: `
      <p>每次结算后进入商店：</p>
      <p>· <b>购买</b>小丑（价格各异，买了立即装备）；</p>
      <p>· <b>重掷</b>：刷新货架，$5 起步，每局商店里每掷一次 +$1；</p>
      <p>· <b>卖小丑</b>：点顶部的小丑卡（显示卖价 = 半价），腾槽位或换钱。</p>
      <p>点「下一盲注 ▶」继续。难度随底注陡增：底注 1 总需求约 450 分，底注 8 的 Boss 要 70000 分——<b>小丑组合就是你的成长曲线</b>。</p>
    `,
  },
  {
    title: "💡 新手建议",
    body: `
      <p>· 第一局目标先求「对子」，看到两张同点数就出；</p>
      <p>· <b>倍率小丑优先</b>于筹码小丑（乘法增长快）；</p>
      <p>· Boss 盲注有特殊规则（会在对局里逐步遇到），打不过就存钱+重掷找对策；</p>
      <p>· 牌上的小标签是<b>强化</b>：金=给钱、钢铁=留手中时 ×1.5 倍率、玻璃=×2 倍率但可能碎、幸运=概率加成；</p>
      <p>· 顶栏「种子」是本局随机数种子——同种子同样操作必然同结果。</p>
      <p>祝早日通关！随时点右上「📖 教程」回看本教程。</p>
    `,
  },
];

const STORAGE_KEY = "balatro-remake-tutorial-seen";

let stepIndex = 0;

function renderStep(box: HTMLElement): void {
  const step = STEPS[stepIndex]!;
  box.querySelector(".tut-title")!.innerHTML = step.title;
  box.querySelector(".tut-body")!.innerHTML = step.body;
  box.querySelector(".tut-progress")!.textContent = `${stepIndex + 1} / ${STEPS.length}`;
  const prev = box.querySelector<HTMLButtonElement>(".tut-prev")!;
  prev.disabled = stepIndex === 0;
  const next = box.querySelector<HTMLButtonElement>(".tut-next")!;
  next.textContent = stepIndex === STEPS.length - 1 ? "开始游戏 ▶" : "下一步 ▶";
}

export function showTutorial(): void {
  document.getElementById("tutorial")?.remove();
  const overlay = document.createElement("div");
  overlay.id = "tutorial";
  overlay.style.cssText =
    "position:fixed;inset:0;background:#000b;display:flex;align-items:center;justify-content:center;z-index:100;";
  overlay.innerHTML = `
    <div style="background:#26263a;border-radius:14px;max-width:560px;width:92%;max-height:86vh;overflow-y:auto;padding:22px 26px;box-shadow:0 8px 40px #000a;">
      <div class="tut-title" style="font-size:20px;font-weight:800;margin-bottom:12px;color:#ffd866;"></div>
      <div class="tut-body" style="font-size:14px;line-height:1.75;color:#ddd;"></div>
      <div style="display:flex;align-items:center;gap:10px;margin-top:18px;">
        <button class="tut-prev" style="padding:8px 16px;">◀ 上一步</button>
        <span class="tut-progress" style="color:#999;font-size:13px;flex:1;text-align:center;"></span>
        <button class="tut-skip" style="padding:8px 14px;background:#444;">跳过教程</button>
        <button class="tut-next" style="padding:8px 20px;background:#1d7a3f;"></button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  const box = overlay.firstElementChild as HTMLElement;

  box.querySelector(".tut-prev")!.addEventListener("click", () => {
    if (stepIndex > 0) { stepIndex--; renderStep(box); }
  });
  box.querySelector(".tut-next")!.addEventListener("click", () => {
    if (stepIndex < STEPS.length - 1) { stepIndex++; renderStep(box); }
    else close();
  });
  box.querySelector(".tut-skip")!.addEventListener("click", close);

  function close(): void {
    localStorage.setItem(STORAGE_KEY, "1");
    overlay.remove();
  }

  renderStep(box);
}

/** 首次进入自动弹出；返回是否弹出了 */
export function maybeShowTutorial(): boolean {
  if (localStorage.getItem(STORAGE_KEY)) return false;
  showTutorial();
  return true;
}
