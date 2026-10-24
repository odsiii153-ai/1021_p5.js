const NAME_STORAGE_KEY = "classroom-draw-names";
const MAX_NUMBER_RANGE = 10000;

let confetti = [];
let app;
let statusMessage;
let lastResults = [];
let historyEntries = [];
let drawnItems = new Set();
let isDrawing = false;
let animationInterval = null;
let animationTimeout = null;
let audioContext = null;
let audioUnavailable = false;

function setup() {
  const canvas = createCanvas(windowWidth, windowHeight);
  canvas.addClass("confetti-canvas");
  pixelDensity(1);
  buildInterface();
  loadSavedNames();
  refreshAvailability();
}

function draw() {
  clear();
  if (confetti.length === 0) return;

  noStroke();
  for (let index = confetti.length - 1; index >= 0; index -= 1) {
    const particle = confetti[index];
    particle.x += particle.vx;
    particle.y += particle.vy;
    particle.vy += 0.11;
    particle.rotation += particle.spin;
    particle.life -= 1;

    push();
    translate(particle.x, particle.y);
    rotate(particle.rotation);
    fill(particle.color);
    rectMode(CENTER);
    rect(0, 0, particle.size, particle.size * 0.62, 2);
    pop();

    if (particle.life <= 0 || particle.y > height + 30) {
      confetti.splice(index, 1);
    }
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

function buildInterface() {
  app = createDiv("");
  app.addClass("app-shell");
  app.elt.innerHTML = `
    <header class="topbar">
      <div class="brand">
        <span class="brand-mark" aria-hidden="true">✦</span>
        <span>CLASSROOM DRAW</span>
      </div>
      <span class="topbar-note">公平・簡單・每一次都充滿期待</span>
    </header>

    <main class="main-layout">
      <section class="draw-panel" aria-labelledby="page-title">
        <div class="eyebrow"><span class="live-dot"></span> CLASSROOM RANDOM PICKER</div>
        <h1 id="page-title">課堂抽籤機</h1>
        <p class="intro">今天，幸運會落在誰身上？</p>

        <div class="result-stage" aria-live="polite" aria-atomic="true">
          <div class="result-kicker" id="result-kicker">準備好開始了嗎？</div>
          <div class="result-display" id="result-display">?</div>
          <div class="result-caption" id="result-caption">設定名單後，按下抽籤吧</div>
        </div>

        <div class="draw-controls">
          <label class="quantity-control" for="draw-count">
            <span>抽出人數</span>
            <span class="quantity-stepper">
              <button class="step-button" id="decrease-count" type="button" aria-label="減少抽出人數">−</button>
              <input id="draw-count" type="number" min="1" value="1" inputmode="numeric" aria-label="抽出人數">
              <button class="step-button" id="increase-count" type="button" aria-label="增加抽出人數">＋</button>
            </span>
          </label>
          <button class="draw-button" id="draw-button" type="button">
            <span aria-hidden="true">✦</span> 開始抽籤
          </button>
        </div>
        <p class="status-message" id="status-message" role="status"></p>
      </section>

      <aside class="setup-panel" aria-label="抽籤設定">
        <div class="panel-heading">
          <div>
            <span class="section-label">SETUP</span>
            <h2>抽籤設定</h2>
          </div>
          <span class="setup-icon" aria-hidden="true">⚙</span>
        </div>

        <div class="mode-switch" role="tablist" aria-label="名單模式">
          <button class="mode-tab active" id="number-mode-tab" type="button" role="tab" aria-selected="true">號碼模式</button>
          <button class="mode-tab" id="name-mode-tab" type="button" role="tab" aria-selected="false">姓名模式</button>
        </div>

        <div class="mode-content" id="number-mode-content">
          <div class="range-fields">
            <label class="field-label" for="range-start">起始號碼
              <input id="range-start" type="number" value="1" inputmode="numeric">
            </label>
            <span class="range-separator" aria-hidden="true">～</span>
            <label class="field-label" for="range-end">結束號碼
              <input id="range-end" type="number" value="30" inputmode="numeric">
            </label>
          </div>
          <p class="field-hint">包含起始與結束號碼</p>
        </div>

        <div class="mode-content hidden" id="name-mode-content">
          <label class="field-label" for="name-list">班級名單
            <textarea id="name-list" rows="5" placeholder="王小明&#10;李小華&#10;陳同學" spellcheck="false"></textarea>
          </label>
          <p class="field-hint">每行一位同學，名單會自動儲存在這台裝置</p>
        </div>

        <div class="settings-divider"></div>
        <label class="toggle-row" for="no-repeat">
          <span class="toggle-copy">
            <strong>不重複抽籤</strong>
            <small>抽過的人不會再次出現</small>
          </span>
          <span class="switch">
            <input id="no-repeat" type="checkbox">
            <span class="switch-track"></span>
          </span>
        </label>
        <div class="remaining-box">
          <span>剩餘可抽</span>
          <strong id="remaining-count">—</strong>
          <span>人</span>
        </div>

        <div class="settings-divider"></div>
        <label class="field-label" for="exclude-list">排除名單
          <input id="exclude-list" type="text" placeholder="例如：5, 12 或請假同學">
        </label>
        <p class="field-hint">用逗號或空白分隔號碼／姓名</p>
      </aside>

      <section class="history-panel" aria-labelledby="history-title">
        <div class="history-heading">
          <div>
            <span class="section-label">DRAW HISTORY</span>
            <h2 id="history-title">抽籤紀錄 <span class="history-total" id="history-total">0</span></h2>
          </div>
          <button class="reset-button" id="reset-button" type="button">↻ 重置紀錄</button>
        </div>
        <div class="history-list" id="history-list">
          <p class="empty-history">還沒有抽籤紀錄，試試手氣吧！</p>
        </div>
      </section>
    </main>
    <footer class="footer-note">TIP：按 Enter 也可以快速抽籤</footer>
  `;

  statusMessage = select("#status-message");
  select("#number-mode-tab").mousePressed(() => setMode("number"));
  select("#name-mode-tab").mousePressed(() => setMode("name"));
  select("#draw-button").mousePressed(startDraw);
  select("#reset-button").mousePressed(resetDraws);
  select("#decrease-count").mousePressed(() => adjustDrawCount(-1));
  select("#increase-count").mousePressed(() => adjustDrawCount(1));

  [
    "#range-start",
    "#range-end",
    "#exclude-list",
    "#no-repeat",
    "#draw-count",
  ].forEach((selector) => {
    select(selector).input(refreshAvailability);
    select(selector).changed(refreshAvailability);
  });

  select("#name-list").input(() => {
    try {
      localStorage.setItem(NAME_STORAGE_KEY, select("#name-list").value());
      clearStatus();
    } catch (error) {
      showStatus("無法儲存名單，請檢查瀏覽器的儲存空間設定。", true);
    }
    refreshAvailability();
  });

  select("#draw-count").elt.addEventListener("keydown", (event) => {
    if (event.key === "Enter") startDraw();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && event.target.tagName !== "TEXTAREA" && event.target.id !== "draw-count") {
      if (!isDrawing && !event.target.closest("button")) startDraw();
    }
  });
}

function loadSavedNames() {
  try {
    const savedNames = localStorage.getItem(NAME_STORAGE_KEY);
    if (savedNames !== null) select("#name-list").value(savedNames);
  } catch (error) {
    showStatus("無法讀取已儲存名單，請檢查瀏覽器的儲存空間設定。", true);
  }
}

function setMode(mode) {
  const numberMode = mode === "number";
  select("#number-mode-tab").removeClass("active");
  select("#name-mode-tab").removeClass("active");
  select(numberMode ? "#number-mode-tab" : "#name-mode-tab").addClass("active");
  select("#number-mode-tab").elt.setAttribute("aria-selected", String(numberMode));
  select("#name-mode-tab").elt.setAttribute("aria-selected", String(!numberMode));
  select("#number-mode-content").elt.classList.toggle("hidden", !numberMode);
  select("#name-mode-content").elt.classList.toggle("hidden", numberMode);
  clearStatus();
  refreshAvailability();
}

function getCurrentMode() {
  return select("#number-mode-tab").hasClass("active") ? "number" : "name";
}

function getRoster() {
  if (getCurrentMode() === "number") {
    const start = Number(select("#range-start").value());
    const end = Number(select("#range-end").value());
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end)) {
      return { error: "請輸入有效的整數起訖號碼。" };
    }
    if (start > end) return { error: "起始號碼不可大於結束號碼，請調整範圍。" };
    const count = end - start + 1;
    if (!Number.isSafeInteger(count) || count > MAX_NUMBER_RANGE) {
      return { error: `號碼範圍最多可設定 ${MAX_NUMBER_RANGE} 人，請縮小範圍。` };
    }
    return { items: Array.from({ length: count }, (_, index) => String(start + index)) };
  }

  const names = select("#name-list").value()
    .split(/\r?\n/)
    .map((name) => name.trim())
    .filter(Boolean);
  return { items: Array.from(new Set(names)) };
}

function getExcludedItems() {
  return new Set(
    select("#exclude-list").value()
      .split(/[,\uFF0C\u3001;\s]+/)
      .map((item) => item.trim())
      .filter(Boolean),
  );
}

function getEligibleItems() {
  const roster = getRoster();
  if (roster.error) return roster;
  const excluded = getExcludedItems();
  const noRepeat = select("#no-repeat").checked();
  const items = roster.items.filter((item) => {
    return !excluded.has(item) && (!noRepeat || !drawnItems.has(item));
  });
  return { items };
}

function refreshAvailability() {
  if (!app || isDrawing) return;
  const result = getEligibleItems();
  select("#remaining-count").html(result.error ? "—" : String(result.items.length));
  const drawButton = select("#draw-button");
  const countInput = select("#draw-count");
  const requested = Number(countInput.value());
  const canDraw = !result.error && Number.isInteger(requested) && requested > 0 && requested <= result.items.length;
  drawButton.elt.disabled = !canDraw;
  drawButton.elt.title = result.error || (result.items.length === 0 ? "沒有可抽取的對象" : "");
  if (result.error) showStatus(result.error, true);
  else if (!Number.isInteger(requested) || requested < 1) {
    showStatus("請輸入至少 1 位抽籤人數。", true);
  }
  else if (Number.isInteger(requested) && requested > result.items.length) {
    showStatus(`可抽人數不足：目前只有 ${result.items.length} 人可抽，無法抽出 ${requested} 人。`, true);
  }
  else if (statusMessage && statusMessage.elt.dataset.error === "true") clearStatus();
}

function adjustDrawCount(amount) {
  const input = select("#draw-count");
  const current = Number(input.value()) || 1;
  const maximum = Math.max(1, getEligibleItems().items ? getEligibleItems().items.length : 1);
  input.value(String(Math.max(1, Math.min(maximum, current + amount))));
  refreshAvailability();
}

function startDraw() {
  if (isDrawing) return;
  const eligibleResult = getEligibleItems();
  if (eligibleResult.error) {
    showStatus(eligibleResult.error, true);
    return;
  }
  const requested = Number(select("#draw-count").value());
  if (!Number.isInteger(requested) || requested < 1) {
    showStatus("請輸入至少 1 位抽籤人數。", true);
    return;
  }
  if (requested > eligibleResult.items.length) {
    showStatus(`可抽人數不足：目前只有 ${eligibleResult.items.length} 人可抽，無法抽出 ${requested} 人。`, true);
    return;
  }

  clearStatus();
  prepareAudio();
  isDrawing = true;
  select("#draw-button").elt.disabled = true;
  select("#draw-button").html('<span aria-hidden="true">✦</span> 抽籤中…');
  select("#result-kicker").html("LUCKY MOMENT");
  select("#result-caption").html("正在為你揭曉幸運名單");
  const display = select("#result-display");
  display.removeClass("result-pop");

  const pool = eligibleResult.items.slice();
  const winners = [];
  animationInterval = window.setInterval(() => {
    display.html(escapeHtml(pool[Math.floor(Math.random() * pool.length)]));
  }, 75);

  animationTimeout = window.setTimeout(() => {
    window.clearInterval(animationInterval);
    animationInterval = null;
    animationTimeout = null;
    for (let index = 0; index < requested; index += 1) {
      const winnerIndex = Math.floor(Math.random() * pool.length);
      winners.push(pool.splice(winnerIndex, 1)[0]);
    }
    lastResults = winners;
    winners.forEach((winner) => drawnItems.add(winner));
    display.html(winners.map(escapeHtml).join('<span class="winner-separator">・</span>'));
    display.addClass("result-pop");
    select("#result-kicker").html("CONGRATULATIONS!");
    select("#result-caption").html(winners.length === 1 ? "恭喜這位幸運同學！" : `恭喜這 ${winners.length} 位幸運同學！`);
    addHistory(winners);
    launchConfetti();
    playWinSound();
    isDrawing = false;
    select("#draw-button").html('<span aria-hidden="true">✦</span> 再抽一次');
    refreshAvailability();
  }, 2000);
}

function addHistory(winners) {
  const now = new Date();
  const time = now.toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit" });
  const record = { winners, time };
  historyEntries.unshift(record);

  const historyList = select("#history-list");
  if (historyEntries.length === 1) historyList.html("");
  const row = createDiv("");
  row.addClass("history-entry");
  row.elt.innerHTML = `
    <span class="history-number">${String(historyEntries.length).padStart(2, "0")}</span>
    <span class="history-winners">${winners.map(escapeHtml).join('<span class="winner-separator">・</span>')}</span>
    <time class="history-time">${time}</time>
  `;
  row.parent(historyList);
  select("#history-total").html(String(historyEntries.length));
}

function resetDraws() {
  window.clearInterval(animationInterval);
  window.clearTimeout(animationTimeout);
  animationInterval = null;
  animationTimeout = null;
  isDrawing = false;
  historyEntries = [];
  drawnItems.clear();
  lastResults = [];
  confetti = [];
  select("#history-list").html('<p class="empty-history">還沒有抽籤紀錄，試試手氣吧！</p>');
  select("#history-total").html("0");
  select("#result-kicker").html("準備好開始了嗎？");
  select("#result-display").html("?");
  select("#result-caption").html("設定名單後，按下抽籤吧");
  select("#result-display").removeClass("result-pop");
  select("#draw-button").html('<span aria-hidden="true">✦</span> 開始抽籤');
  clearStatus();
  refreshAvailability();
}

function launchConfetti() {
  const colors = ["#f6c85f", "#f58b75", "#8bd3c7", "#b4a5f5", "#f3a6c8", "#ffffff"];
  confetti = Array.from({ length: 150 }, () => ({
    x: random(width),
    y: random(-height * 0.65, -20),
    vx: random(-2.8, 2.8),
    vy: random(2, 6),
    size: random(7, 13),
    rotation: random(TWO_PI),
    spin: random(-0.12, 0.12),
    life: random(140, 220),
    color: color(random(colors)),
  }));
}

function playWinSound() {
  try {
    if (!audioContext || audioUnavailable) throw new Error("音效無法播放");
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((frequency, index) => {
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      const startTime = audioContext.currentTime + index * 0.12;
      oscillator.type = "sine";
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, startTime);
      gain.gain.exponentialRampToValueAtTime(0.16, startTime + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.32);
      oscillator.connect(gain);
      gain.connect(audioContext.destination);
      oscillator.start(startTime);
      oscillator.stop(startTime + 0.34);
    });
  } catch (error) {
    showStatus("抽籤完成，但瀏覽器無法播放音效。", false);
  }
}

function prepareAudio() {
  audioUnavailable = false;
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) throw new Error("此瀏覽器不支援 Web Audio API");
    if (!audioContext || audioContext.state === "closed") audioContext = new AudioContextClass();
    if (audioContext.state === "suspended") {
      audioContext.resume().catch(() => {
        audioUnavailable = true;
      });
    }
  } catch (error) {
    audioUnavailable = true;
  }
}

function showStatus(message, isError) {
  if (!statusMessage) return;
  statusMessage.html(escapeHtml(message));
  statusMessage.elt.dataset.error = String(isError);
  statusMessage.elt.classList.toggle("error", isError);
}

function clearStatus() {
  if (!statusMessage) return;
  statusMessage.html("");
  statusMessage.elt.dataset.error = "false";
  statusMessage.elt.classList.remove("error");
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]);
}
