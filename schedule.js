// ============================================================
// RBTC 教練行事曆 Widget — 前端邏輯
// ============================================================

// ▼ 部署 GAS 後填入 Script ID
const GAS_URL = 'https://script.google.com/macros/s/AKfycbwot0J4a2J1VtszAHGpodNLChAknij8-9WTMS54OIt1OzrGLzVAtu5eThZEizpM-pwo/exec';

const COACH_CONFIG = {
  Victor: { color: '#039BE5', label: 'Victor 教練' },
  Apo:    { color: '#F6BF26', label: 'Apo 教練' },
  Morgan: { color: '#8E24AA', label: 'Morgan 教練' },
  Adam:   { color: '#D50000', label: 'Adam 教練' },
  Rick:   { color: '#616161', label: 'Rick 教練' },
  Verna:  { color: '#E67C73', label: 'Verna 教練' }
};

// 09:00–22:00，每 30 分鐘一格，共 26 格
const HOUR_START = 9;
const HOUR_END   = 22;
const SLOTS      = (HOUR_END - HOUR_START) * 2; // 26

let currentCoach      = 'Victor';
let currentWeekOffset = 0;
let weekStartDate     = null;
let busyCells         = new Set();  // 'dayIdx-slotIdx'

// ============================================================
// 初始化
// ============================================================
function init() {
  const params = new URLSearchParams(window.location.search);
  currentCoach = params.get('coach') || 'Victor';

  const config = COACH_CONFIG[currentCoach];
  if (!config) {
    document.body.innerHTML = `<div style="padding:40px;text-align:center;color:#888">找不到教練：${currentCoach}</div>`;
    return;
  }

  document.documentElement.style.setProperty('--coach-color', config.color);
  document.getElementById('coach-name').textContent = config.label;

  document.getElementById('btn-prev').addEventListener('click', prevWeek);
  document.getElementById('btn-next').addEventListener('click', nextWeek);
  document.getElementById('calendar-grid').addEventListener('click', onGridClick);
  document.getElementById('modal-overlay').addEventListener('click', onOverlayClick);

  loadEvents();
}

// ============================================================
// 資料載入（JSONP 跨域）
// ============================================================
function loadEvents() {
  updateWeekLabel();
  document.getElementById('calendar-grid').innerHTML =
    '<div class="grid-msg">載入中…</div>';

  // 清除舊 script tag
  const old = document.getElementById('jsonp-script');
  if (old) old.remove();

  const cbName = 'rbtcCb_' + Date.now();
  window[cbName] = function (data) {
    delete window[cbName];
    const el = document.getElementById('jsonp-script');
    if (el) el.remove();
    renderCalendar(data);
  };

  const script = document.createElement('script');
  script.id  = 'jsonp-script';
  script.src = `${GAS_URL}?action=events&coach=${currentCoach}&week=${currentWeekOffset}&callback=${cbName}`;
  script.onerror = function () {
    document.getElementById('calendar-grid').innerHTML =
      '<div class="grid-msg">⚠️ 載入失敗，請重新整理</div>';
  };
  document.head.appendChild(script);
}

function prevWeek() {
  if (currentWeekOffset <= 0) return;
  currentWeekOffset--;
  loadEvents();
}

function nextWeek() {
  if (currentWeekOffset >= 3) return;
  currentWeekOffset++;
  loadEvents();
}

function updateWeekLabel() {
  const now    = new Date();
  const dow    = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - (dow === 0 ? 6 : dow - 1) + currentWeekOffset * 7);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const fmt = d => `${d.getMonth() + 1}/${d.getDate()}`;
  let label;
  if      (currentWeekOffset === 0) label = `本週  ${fmt(monday)} – ${fmt(sunday)}`;
  else if (currentWeekOffset === 1) label = `下週  ${fmt(monday)} – ${fmt(sunday)}`;
  else                               label = `${fmt(monday)} – ${fmt(sunday)}`;

  document.getElementById('week-label').textContent = label;
  document.getElementById('btn-prev').disabled = currentWeekOffset <= 0;
  document.getElementById('btn-next').disabled = currentWeekOffset >= 3;
}

// ============================================================
// 繪製行事曆格線
// ============================================================
function renderCalendar(data) {
  if (data.error) {
    document.getElementById('calendar-grid').innerHTML =
      `<div class="grid-msg">⚠️ ${data.error}</div>`;
    return;
  }

  weekStartDate = new Date(data.weekStart);
  const now     = new Date();

  // 建立忙碌格集合
  busyCells = new Set();
  (data.events || []).forEach(ev => {
    const start  = new Date(ev.start);
    const end    = new Date(ev.end);
    const cursor = new Date(start);
    while (cursor < end) {
      const di = dayIndex(cursor);
      const si = slotIndex(cursor);
      if (di >= 0 && di <= 6 && si >= 0 && si < SLOTS) {
        busyCells.add(`${di}-${si}`);
      }
      cursor.setMinutes(cursor.getMinutes() + 30);
    }
  });

  // 產生格線 HTML
  const DAY_LABELS  = ['週一','週二','週三','週四','週五','週六','週日'];
  const dateLabels  = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStartDate);
    d.setDate(weekStartDate.getDate() + i);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  });

  let html = '<div class="grid-container">';

  // 標頭列
  html += '<div class="grid-cell time-header"></div>';
  DAY_LABELS.forEach((lbl, i) => {
    const d = new Date(weekStartDate);
    d.setDate(weekStartDate.getDate() + i);
    const isToday = d.toDateString() === now.toDateString();
    html += `<div class="grid-cell day-header${isToday ? ' today' : ''}">${lbl}<br><span class="date-num">${dateLabels[i]}</span></div>`;
  });

  // 時段列
  for (let si = 0; si < SLOTS; si++) {
    const totalMin = HOUR_START * 60 + si * 30;
    const hh = String(Math.floor(totalMin / 60)).padStart(2, '0');
    const mm = String(totalMin % 60).padStart(2, '0');
    const showLabel = si % 2 === 0;

    html += `<div class="grid-cell time-label">${showLabel ? `${hh}:${mm}` : ''}</div>`;

    for (let di = 0; di < 7; di++) {
      const cellDate = cellDateTime(di, si);
      const key      = `${di}-${si}`;

      if (busyCells.has(key)) {
        html += `<div class="grid-cell busy-cell"></div>`;
      } else if (cellDate <= now) {
        html += `<div class="grid-cell past-cell"></div>`;
      } else {
        html += `<div class="grid-cell free-cell" data-dt="${formatDt(cellDate)}"></div>`;
      }
    }
  }

  html += '</div>';
  document.getElementById('calendar-grid').innerHTML = html;
}

// ── 工具函式 ──
function dayIndex(date) {
  const d = date.getDay();
  return d === 0 ? 6 : d - 1; // 0=Mon, 6=Sun
}

function slotIndex(date) {
  const totalMin = date.getHours() * 60 + date.getMinutes();
  return Math.floor((totalMin - HOUR_START * 60) / 30);
}

function cellDateTime(di, si) {
  const d = new Date(weekStartDate);
  d.setDate(weekStartDate.getDate() + di);
  const totalMin = HOUR_START * 60 + si * 30;
  d.setHours(Math.floor(totalMin / 60), totalMin % 60, 0, 0);
  return d;
}

function formatDt(date) {
  const DOW = ['日','一','二','三','四','五','六'];
  const m   = date.getMonth() + 1;
  const d   = date.getDate();
  const dow = DOW[date.getDay()];
  const hh  = String(date.getHours()).padStart(2, '0');
  const mm  = String(date.getMinutes()).padStart(2, '0');
  return `${m}/${d}（週${dow}）${hh}:${mm}`;
}

// ── 點擊格子 ──
function onGridClick(e) {
  const cell = e.target.closest('.free-cell');
  if (!cell) return;
  openBookingModal(cell.dataset.dt);
}

function onOverlayClick(e) {
  if (e.target === document.getElementById('modal-overlay')) closeModal();
}

// ============================================================
// 預約 Modal
// ============================================================
function openBookingModal(datetime) {
  // 重置表單
  document.getElementById('f-name').value    = '';
  document.getElementById('f-phone').value   = '';
  document.getElementById('f-injury').value  = '否';
  document.getElementById('f-inj-wrap').style.display   = 'none';
  document.getElementById('f-inj-detail').value         = '';
  document.getElementById('f-strength').value = '否';
  document.getElementById('f-exercise').value = '無';
  document.getElementById('f-ex-wrap').style.display    = 'none';
  document.getElementById('f-ex-detail').value          = '';
  document.querySelectorAll('.goal-chip').forEach(c => c.classList.remove('selected'));
  document.getElementById('f-goal-other').value = '';
  document.getElementById('f-notes').value      = '';
  document.getElementById('booking-error').textContent  = '';
  document.getElementById('booking-form').style.display = 'block';
  document.getElementById('booking-success').style.display = 'none';
  document.getElementById('btn-submit').disabled    = false;
  document.getElementById('btn-submit').textContent = '送出預約';

  document.getElementById('f-datetime').value = datetime;
  document.getElementById('modal-datetime').textContent =
    `${COACH_CONFIG[currentCoach]?.label || currentCoach}・${datetime}`;

  document.getElementById('modal-overlay').classList.add('active');
}

function closeModal() {
  document.getElementById('modal-overlay').classList.remove('active');
}

// ── 表單連動 ──
window.toggleInjury = function () {
  const show = document.getElementById('f-injury').value === '有';
  document.getElementById('f-inj-wrap').style.display = show ? 'block' : 'none';
};

window.toggleExercise = function () {
  const show = document.getElementById('f-exercise').value === '有';
  document.getElementById('f-ex-wrap').style.display = show ? 'block' : 'none';
};

window.toggleGoalChip = function (el) {
  el.classList.toggle('selected');
};

// ── 送出 ──
window.submitBooking = function () {
  const name  = document.getElementById('f-name').value.trim();
  const phone = document.getElementById('f-phone').value.trim();

  if (!name || !phone) {
    document.getElementById('booking-error').textContent = '請填寫姓名和電話';
    return;
  }

  const goals = [...document.querySelectorAll('.goal-chip.selected')]
    .map(c => c.dataset.value);
  const goalOther = document.getElementById('f-goal-other').value.trim();
  if (goalOther) goals.push(goalOther);

  const params = new URLSearchParams({
    action:   'book',
    coach:    currentCoach,
    datetime: document.getElementById('f-datetime').value,
    name,
    phone,
    injury:       document.getElementById('f-injury').value,
    injuryDetail: document.getElementById('f-inj-detail').value.trim(),
    strength:     document.getElementById('f-strength').value,
    exercise:     document.getElementById('f-exercise').value,
    exDetail:     document.getElementById('f-ex-detail').value.trim(),
    goal:         goals.join('、') || '未填寫',
    notes:        document.getElementById('f-notes').value.trim()
  });

  const btn = document.getElementById('btn-submit');
  btn.disabled    = true;
  btn.textContent = '送出中…';

  // no-cors：GAS 執行但回傳不可讀，直接顯示成功
  fetch(`${GAS_URL}?${params.toString()}`, { mode: 'no-cors' })
    .then(() => showSuccess())
    .catch(() => showSuccess()); // no-cors 永遠 resolve
};

function showSuccess() {
  document.getElementById('booking-form').style.display    = 'none';
  document.getElementById('booking-success').style.display = 'block';
}

window.closeModal = closeModal;

// ============================================================
document.addEventListener('DOMContentLoaded', init);
