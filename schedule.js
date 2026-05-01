// ============================================================
// RBTC 教練行事曆 Widget — 前端邏輯
// ============================================================

const GAS_URL = 'https://script.google.com/macros/s/AKfycbwLjltlY_ueiQqmix6CFMvsRhuKHLZqM1xk4jZMxvLQSDVb5QXe32Y1X2UBg5SzdskJ/exec';

// ▼ 填入狂牛體能官方 LINE 網址
const LINE_OFFICIAL_URL = 'https://line.me/R/ti/p/@djt6282z';

const COACH_CONFIG = {
  Victor: { color: '#039BE5', label: 'Victor 教練', maxClassesPerDay: 8 },
  Apo:    { color: '#F6BF26', label: 'Apo 教練' },
  Morgan: { color: '#8E24AA', label: 'Morgan 教練' },
  Adam:   { color: '#D50000', label: 'Adam 教練' },
  Rick:   { color: '#616161', label: 'Rick 教練' },
  Verna:  { color: '#E67C73', label: 'Verna 教練' }
};

const HOUR_START = 9;
const HOUR_END   = 23;
const SLOT_MINUTES = 30;
const SLOTS      = ((HOUR_END - HOUR_START) * 60) / SLOT_MINUTES; // 28

let currentCoach      = 'Victor';
let currentWeekOffset = 0;
let weekStartDate     = null;
let busyCells         = new Set();
let busyEventCountPerDay = {};

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
  document.getElementById('calendar-grid').addEventListener('mouseover', onGridHover);
  document.getElementById('calendar-grid').addEventListener('mouseleave', clearGridHover);
  document.getElementById('modal-overlay').addEventListener('click', onOverlayClick);

  loadEvents();
}

// ============================================================
// 資料載入（JSONP）
// ============================================================
function loadEvents() {
  updateWeekLabel();
  document.getElementById('calendar-grid').innerHTML = '<div class="grid-msg">載入中…</div>';

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
  script.id    = 'jsonp-script';
  script.src   = `${GAS_URL}?action=events&coach=${currentCoach}&week=${currentWeekOffset}&callback=${cbName}`;
  script.onerror = () => {
    document.getElementById('calendar-grid').innerHTML = '<div class="grid-msg">⚠️ 載入失敗，請重新整理</div>';
  };
  document.head.appendChild(script);
}

function prevWeek() { if (currentWeekOffset > 0) { currentWeekOffset--; loadEvents(); } }
function nextWeek() { if (currentWeekOffset < 3)  { currentWeekOffset++; loadEvents(); } }

function updateWeekLabel() {
  const now    = new Date();
  const dow    = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - (dow === 0 ? 6 : dow - 1) + currentWeekOffset * 7);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const fmt = d => `${d.getMonth() + 1}/${d.getDate()}`;
  const label = currentWeekOffset === 0 ? `本週  ${fmt(monday)} – ${fmt(sunday)}`
              : currentWeekOffset === 1 ? `下週  ${fmt(monday)} – ${fmt(sunday)}`
              : `${fmt(monday)} – ${fmt(sunday)}`;

  document.getElementById('week-label').textContent   = label;
  document.getElementById('btn-prev').disabled = currentWeekOffset <= 0;
  document.getElementById('btn-next').disabled = currentWeekOffset >= 3;
}

// ============================================================
// 繪製行事曆
// ============================================================
function renderCalendar(data) {
  if (data.error) {
    document.getElementById('calendar-grid').innerHTML = `<div class="grid-msg">⚠️ ${data.error}</div>`;
    return;
  }

  weekStartDate = new Date(data.weekStart);
  const now     = new Date();

  busyCells = new Set();
  busyEventCountPerDay = {};
  (data.events || []).forEach(ev => {
    const start = new Date(ev.start);
    const end   = new Date(ev.end);
    const eventDay = dayIndex(start);
    if (eventDay >= 0 && eventDay <= 6) {
      busyEventCountPerDay[eventDay] = (busyEventCountPerDay[eventDay] || 0) + 1;
    }

    for (let di = 0; di < 7; di++) {
      for (let si = 0; si < SLOTS; si++) {
        const cellStart = cellDateTime(di, si);
        const cellEnd = new Date(cellStart.getTime() + SLOT_MINUTES * 60000);
        if (start < cellEnd && end > cellStart) busyCells.add(`${di}-${si}`);
      }
    }
  });

  renderGrid(new Set(data.dayOffs || []), data.shifts || {}, now);
}

function renderGrid(dayOffs, shifts, now) {
  const DAY_LABELS = ['週一','週二','週三','週四','週五','週六','週日'];
  const dateLabels = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStartDate);
    d.setDate(weekStartDate.getDate() + i);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  });

  const maxPerDay = COACH_CONFIG[currentCoach]?.maxClassesPerDay || null;

  let html = '<div class="grid-container">';

  // 標頭列
  html += '<div class="grid-cell time-header"></div>';
  DAY_LABELS.forEach((lbl, di) => {
    const d = new Date(weekStartDate);
    d.setDate(weekStartDate.getDate() + di);
    const isToday  = d.toDateString() === now.toDateString();
    const isDayOff = dayOffs.has(di);
    html += `<div class="grid-cell day-header${isToday ? ' today' : ''}${isDayOff ? ' is-dayoff' : ''}">`
          + `${lbl}<br><span class="date-num">${dateLabels[di]}</span>`
          + (isDayOff ? '<br><span class="badge-off">排休</span>' : '')
          + `</div>`;
  });

  // 時段列
  for (let si = 0; si < SLOTS; si++) {
    const { hour, minute } = slotParts(si);
    const timeClass = minute === 0 ? ' hour-mark' : ' half-mark';
    const rowClass = minute === 0 ? ' hour-row' : ' half-row';
    const slotAttr = ` data-slot="${si}"`;
    html += `<div class="grid-cell time-label${timeClass}${rowClass}"${slotAttr}>${formatTime(hour, minute)}</div>`;

    for (let di = 0; di < 7; di++) {
      if (dayOffs.has(di)) {
        html += `<div class="grid-cell dayoff-cell${rowClass}"${slotAttr}></div>`;
        continue;
      }

      const key      = `${di}-${si}`;

      // 有事件時，不管是否在班表內，都顯示忙碌
      if (busyCells.has(key)) {
        html += `<div class="grid-cell busy-cell${rowClass}"${slotAttr}></div>`;
        continue;
      }

      const shift = shifts[String(di)];
      if (shift) {
        const [s, e] = shift;
        const cellMinutes = hour * 60 + minute;
        if (cellMinutes < s * 60 || cellMinutes >= e * 60) {
          html += `<div class="grid-cell nonwork-cell${rowClass}"${slotAttr}></div>`;
          continue;
        }
      }

      const cellDate = cellDateTime(di, si);

      if (cellDate <= now) html += `<div class="grid-cell past-cell${rowClass}"${slotAttr}></div>`;
      else if (maxPerDay && (busyEventCountPerDay[di] || 0) >= maxPerDay) html += `<div class="grid-cell full-cell${rowClass}"${slotAttr}></div>`;
      else html += `<div class="grid-cell free-cell${rowClass}"${slotAttr} data-dt="${formatDt(cellDate)}"></div>`;
    }
  }

  html += '</div>';
  document.getElementById('calendar-grid').innerHTML = html;
}

function dayIndex(date)  { return (date.getDay() + 6) % 7; }
function slotParts(si) {
  const totalMinutes = HOUR_START * 60 + si * SLOT_MINUTES;
  return {
    hour: Math.floor(totalMinutes / 60),
    minute: totalMinutes % 60
  };
}

function formatTime(hour, minute) {
  return `${String(hour).padStart(2,'0')}:${String(minute).padStart(2,'0')}`;
}

function cellDateTime(di, si) {
  const d = new Date(weekStartDate);
  const { hour, minute } = slotParts(si);
  d.setDate(weekStartDate.getDate() + di);
  d.setHours(hour, minute, 0, 0);
  return d;
}

function formatDt(date) {
  const DOW = ['日','一','二','三','四','五','六'];
  return `${date.getMonth()+1}/${date.getDate()}（週${DOW[date.getDay()]}）${formatTime(date.getHours(), date.getMinutes())}`;
}

// ── 格子點擊 ──
function onGridClick(e) {
  const free    = e.target.closest('.free-cell');
  const nonwork = e.target.closest('.nonwork-cell');
  const full    = e.target.closest('.full-cell');
  if (free)    { openBookingModal(free.dataset.dt); return; }
  if (nonwork) { openContactModal(false); return; }
  if (full)    { openContactModal(true);  return; }
}

let highlightedSlot = null;

function onGridHover(e) {
  const cell = e.target.closest('[data-slot]');
  if (!cell) {
    clearGridHover();
    return;
  }

  const slot = cell.dataset.slot;
  if (slot === highlightedSlot) return;

  clearGridHover();
  highlightedSlot = slot;
  document.querySelectorAll(`#calendar-grid [data-slot="${slot}"]`)
    .forEach(el => el.classList.add('row-hover'));
}

function clearGridHover() {
  if (highlightedSlot === null) return;
  document.querySelectorAll('#calendar-grid .row-hover')
    .forEach(el => el.classList.remove('row-hover'));
  highlightedSlot = null;
}

function onOverlayClick(e) {
  if (e.target === document.getElementById('modal-overlay')) closeModal();
}

// ============================================================
// 預約 Modal
// ============================================================
function openBookingModal(datetime) {
  ['f-name','f-phone','f-line','f-inj-detail','f-ex-detail','f-goal-other','f-notes']
    .forEach(id => { document.getElementById(id).value = ''; });
  document.getElementById('f-injury').value   = '否';
  document.getElementById('f-strength').value = '否';
  document.getElementById('f-exercise').value = '無';
  document.getElementById('f-inj-wrap').style.display = 'none';
  document.getElementById('f-ex-wrap').style.display  = 'none';
  document.querySelectorAll('.goal-chip').forEach(c => c.classList.remove('selected'));
  document.getElementById('booking-error').textContent = '';
  document.getElementById('btn-submit').disabled    = false;
  document.getElementById('btn-submit').textContent = '送出預約';

  document.getElementById('f-datetime').value = datetime;

  // 切換到預約模式
  document.getElementById('modal-booking').style.display = 'block';
  document.getElementById('modal-contact').style.display = 'none';
  document.getElementById('booking-success').style.display = 'none';
  document.getElementById('modal-title').textContent    = '體驗課預約';
  document.getElementById('modal-datetime').textContent =
    `${COACH_CONFIG[currentCoach]?.label || currentCoach}・${datetime}`;

  document.getElementById('modal-overlay').classList.add('active');
}

// ============================================================
// 官方 LINE 聯繫 Modal（點非工作時間格 或 當天已滿）
// ============================================================
function openContactModal(isDayFull) {
  document.getElementById('modal-booking').style.display  = 'none';
  document.getElementById('booking-success').style.display = 'none';
  document.getElementById('modal-contact').style.display  = 'block';
  document.getElementById('modal-overlay').classList.add('active');

  if (isDayFull) {
    document.getElementById('modal-title').textContent     = '今日預約已滿';
    document.getElementById('modal-datetime').textContent  = '';
    document.querySelector('.contact-icon').textContent    = '📅';
    document.querySelector('.contact-title').textContent   = '今日預約名額已滿';
    document.querySelector('.contact-msg').innerHTML       =
      '若您仍希望預約此日，歡迎透過官方 LINE 詢問候補或其他可用時段，<br>將有專人為您服務！';
  } else {
    document.getElementById('modal-title').textContent     = '非工作時段';
    document.getElementById('modal-datetime').textContent  = '';
    document.querySelector('.contact-icon').textContent    = '🕐';
    document.querySelector('.contact-title').textContent   = '此時段為非工作時間';
    document.querySelector('.contact-msg').innerHTML       =
      '若您希望預約此時段，或有其他課程相關問題，<br>歡迎透過官方 LINE 聯繫我們，將有專人為您服務！';
  }
}

function closeModal() {
  document.getElementById('modal-overlay').classList.remove('active');
}

// ── 表單連動 ──
window.toggleInjury   = () => {
  document.getElementById('f-inj-wrap').style.display =
    document.getElementById('f-injury').value === '有' ? 'block' : 'none';
};
window.toggleExercise = () => {
  document.getElementById('f-ex-wrap').style.display =
    document.getElementById('f-exercise').value === '有' ? 'block' : 'none';
};
window.toggleGoalChip = el => el.classList.toggle('selected');

// ── 送出預約 ──
window.submitBooking = function () {
  const name   = document.getElementById('f-name').value.trim();
  const phone  = document.getElementById('f-phone').value.trim();
  const lineId = document.getElementById('f-line').value.trim();

  if (!name || !phone || !lineId) {
    document.getElementById('booking-error').textContent = '請填寫姓名、電話及 LINE ID';
    return;
  }

  const goals    = [...document.querySelectorAll('.goal-chip.selected')].map(c => c.dataset.value);
  const goalOther = document.getElementById('f-goal-other').value.trim();
  if (goalOther) goals.push(goalOther);

  const params = new URLSearchParams({
    action: 'book', coach: currentCoach,
    datetime: document.getElementById('f-datetime').value,
    name, phone, lineId,
    injury:       document.getElementById('f-injury').value,
    injuryDetail: document.getElementById('f-inj-detail').value.trim(),
    strength:     document.getElementById('f-strength').value,
    exercise:     document.getElementById('f-exercise').value,
    exDetail:     document.getElementById('f-ex-detail').value.trim(),
    goal:         goals.join('、') || '未填寫',
    notes:        document.getElementById('f-notes').value.trim()
  });

  const btn = document.getElementById('btn-submit');
  btn.disabled = true; btn.textContent = '送出中…';

  fetch(`${GAS_URL}?${params}`, { mode: 'no-cors' })
    .then(showSuccess).catch(showSuccess);
};

function showSuccess() {
  document.getElementById('modal-booking').style.display  = 'none';
  document.getElementById('booking-success').style.display = 'block';
}

window.closeModal = closeModal;
document.addEventListener('DOMContentLoaded', init);
