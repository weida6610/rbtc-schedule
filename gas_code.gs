// ============================================================
// RBTC 教練行事曆 Widget — GAS 後端
// ============================================================

// ▼▼▼ 設定區 ▼▼▼
const TZ = 'Asia/Taipei';

// 每位教練的預設工作時段
// default: [開始時, 結束時]
// overrides: { JS_weekday: [開始時, 結束時] }  0=週日, 1=週一 … 6=週六
// 若當天有全日「休」事件，整天封鎖（優先於此設定）
const COACH_SHIFTS = {
  Victor: { default: [11, 23], overrides: { 0: [9, 12] } }, // 週日 09-12
  Apo:    { default: [12, 23], overrides: {} },
  Morgan: { default: [12, 23], overrides: {} },
  Adam:   { default: [9,  17], overrides: {} },
  Rick:   { default: [12, 23], overrides: {} },
  Verna:  { default: [12, 23], overrides: {} }
};

const COACHES = {
  Victor: {
    calId:  'd19afa6761b939a9ff45acd5f4a9dc1f42238a1d338d3530a7c1a05970baf6a9@group.calendar.google.com',
    color:  '#039BE5',
    chatId: '8070387925'
  },
  Apo: {
    calId:  'dcd0d704b901e65b875f149dfe8e31dea56ab72e32788927d462030640a77f1a@group.calendar.google.com',
    color:  '#F6BF26',
    chatId: '7690324930'
  },
  Morgan: {
    calId:  '138c489f2d7c44a5fbd64d8c57dc547b697cd04a563f5a705189af86154e8661@group.calendar.google.com',
    color:  '#8E24AA',
    chatId: '8128986259'
  },
  Adam: {
    calId:  '82e49fc86f03a950244618bffd72a1f68f6e65f9362ea0e1c9a7b6dfbc2bc82b@group.calendar.google.com',
    color:  '#D50000',
    chatId: ''  // 待補
  },
  Rick: {
    calId:  '0d50ea30e88a99dc14346921ecd6a777c1d1ccd55c7e92dd36d670197bde43ea@group.calendar.google.com',
    color:  '#616161',
    chatId: '5023002298'
  },
  Verna: {
    calId:  '08a8dc28276cd20019d57850bee4b70a864493f8caf7e27973acf6927523ffc5@group.calendar.google.com',
    color:  '#E67C73',
    chatId: '8648923419'
  }
};

const TG_BOT_TOKEN     = '8724846224:AAEdQXHVMpO352x-JAduOQoc3BMuEY7WEHA';
const TG_GROUP_CHAT_ID = '-5123933467';

// ▲▲▲ 設定區結束 ▲▲▲


// ============================================================
// 主入口
// ============================================================
function doGet(e) {
  const params   = e.parameter || {};
  const action   = params.action   || 'events';
  const callback = params.callback || '';

  let result;
  if      (action === 'events') result = getCoachEvents(params.coach || '', parseInt(params.week || '0'));
  else if (action === 'book')   result = handleBooking(params);
  else                           result = { status: 'ok' };

  const json = JSON.stringify(result);
  if (callback) {
    return ContentService.createTextOutput(`${callback}(${json})`)
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(json)
    .setMimeType(ContentService.MimeType.JSON);
}


// ============================================================
// 讀取教練行事曆
// ============================================================
function getCoachEvents(coachName, weekOffset) {
  const coach      = COACHES[coachName];
  const shiftConf  = COACH_SHIFTS[coachName];
  if (!coach) return { error: '找不到教練：' + coachName, events: [] };

  try {
    const now    = new Date();
    const dow    = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - (dow === 0 ? 6 : dow - 1) + weekOffset * 7);
    monday.setHours(0, 0, 0, 0);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    const cal = CalendarApp.getCalendarById(coach.calId);
    if (!cal) return { error: '無法存取行事曆', events: [] };

    const allEvents = cal.getEvents(monday, sunday);

    // 一般課程（有時間的事件）
    const events = allEvents
      .filter(ev => !ev.isAllDayEvent())
      .map(ev => ({
        start: ev.getStartTime().getTime(),
        end:   ev.getEndTime().getTime()
      }));

    // 全日「休」事件 → 排休
    // 用 Utilities.formatDate(TZ) 比對日期字串，避免 UTC vs Asia/Taipei 時區偏移問題
    const dayOffs = [];
    allEvents
      .filter(ev => ev.isAllDayEvent() && ev.getTitle().includes('休'))
      .forEach(ev => {
        const evStr = Utilities.formatDate(ev.getStartTime(), TZ, 'yyyy-MM-dd');
        for (let di = 0; di < 7; di++) {
          const d = new Date(monday);
          d.setDate(monday.getDate() + di);
          if (Utilities.formatDate(d, TZ, 'yyyy-MM-dd') === evStr) {
            const jsDay = (di + 1) % 7; // di:0=Mon..6=Sun → jsDay:1=Mon..0=Sun
            const hasOverride = shiftConf && shiftConf.overrides.hasOwnProperty(jsDay);
            if (!hasOverride) dayOffs.push(di);
            break;
          }
        }
      });

    // 計算每天班別（由 COACH_SHIFTS 決定，排休日跳過）
    const shifts = {};
    for (let di = 0; di < 7; di++) {
      if (dayOffs.includes(di)) continue;

      const jsDay = (di + 1) % 7; // di:0=Mon..6=Sun → jsDay:1=Mon..0=Sun

      if (!shiftConf) continue;
      const shiftHours = (shiftConf.overrides[jsDay] !== undefined)
        ? shiftConf.overrides[jsDay]
        : shiftConf.default;

      shifts[String(di)] = shiftHours;
    }

    return {
      coach:     coachName,
      color:     coach.color,
      weekStart: monday.getTime(),
      events,
      dayOffs,
      shifts
    };

  } catch (err) {
    Logger.log('getCoachEvents error: ' + err.message);
    return { error: err.message, events: [] };
  }
}


// ============================================================
// 處理預約 → 送 Telegram
// ============================================================
function handleBooking(p) {
  try {
    const coachName = p.coach    || '';
    const name      = p.name     || '';
    const phone     = p.phone    || '';
    const lineId    = p.lineId   || '';
    const datetime  = p.datetime || '';
    const injury    = p.injury   || '否';
    const injDetail = p.injuryDetail || '';
    const strength  = p.strength || '否';
    const exercise  = p.exercise || '無';
    const exDetail  = p.exDetail || '';
    const goal      = p.goal     || '未填寫';
    const notes     = p.notes    || '';

    const injuryText   = injury   === '有' ? `有（${injDetail}）` : '無';
    const exerciseText = exercise === '有' ? `有（${exDetail}）`  : '無';

    const msg =
      `📅 <b>新體驗課預約</b>\n\n` +
      `👤 ${name}・${phone}\n` +
      `💬 LINE：${lineId || '未填寫'}\n` +
      `🏋️ 預約教練：${coachName}\n` +
      `📆 時間：${datetime}\n\n` +
      `🩹 舊傷/痠緊痛：${injuryText}\n` +
      `💪 肌力訓練經驗：${strength}\n` +
      `🏃 運動習慣：${exerciseText}\n` +
      `🎯 目標：${goal}` +
      (notes ? `\n\n💬 備註：${notes}` : '');

    const coach   = COACHES[coachName];
    const targets = new Set();
    if (TG_GROUP_CHAT_ID) targets.add(TG_GROUP_CHAT_ID);
    if (coach && coach.chatId) targets.add(coach.chatId);

    const tgUrl = `https://api.telegram.org/bot${TG_BOT_TOKEN}/sendMessage`;
    targets.forEach(chatId => {
      const resp = UrlFetchApp.fetch(tgUrl, {
        method: 'post', contentType: 'application/json',
        payload: JSON.stringify({ chat_id: chatId, text: msg, parse_mode: 'HTML' }),
        muteHttpExceptions: true
      });
      Logger.log(`TG → ${chatId} : ${resp.getResponseCode()} ${resp.getContentText()}`);
    });

    return { status: 'ok' };
  } catch (err) {
    Logger.log('handleBooking error: ' + err.message);
    return { status: 'error', msg: err.message };
  }
}
