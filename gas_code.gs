// ============================================================
// RBTC 教練行事曆 Widget — GAS 後端
// ============================================================

// ▼▼▼ 設定區 ▼▼▼
const TZ = 'Asia/Taipei';

const COACHES = {
  Victor: {
    calId: 'd19afa6761b939a9ff45acd5f4a9dc1f42238a1d338d3530a7c1a05970baf6a9@group.calendar.google.com',
    color: '#039BE5',
    chatId: '8070387925'
  },
  Apo: {
    calId: 'dcd0d704b901e65b875f149dfe8e31dea56ab72e32788927d462030640a77f1a@group.calendar.google.com',
    color: '#F6BF26',
    chatId: '7690324930'
  },
  Morgan: {
    calId: '138c489f2d7c44a5fbd64d8c57dc547b697cd04a563f5a705189af86154e8661@group.calendar.google.com',
    color: '#8E24AA',
    chatId: '8128986259'
  },
  Adam: {
    calId: '82e49fc86f03a950244618bffd72a1f68f6e65f9362ea0e1c9a7b6dfbc2bc82b@group.calendar.google.com',
    color: '#D50000',
    chatId: ''  // 待補
  },
  Rick: {
    calId: '0d50ea30e88a99dc14346921ecd6a777c1d1ccd55c7e92dd36d670197bde43ea@group.calendar.google.com',
    color: '#616161',
    chatId: '5023002298'
  },
  Verna: {
    calId: '08a8dc28276cd20019d57850bee4b70a864493f8caf7e27973acf6927523ffc5@group.calendar.google.com',
    color: '#E67C73',
    chatId: '8648923419'
  }
};

const TG_BOT_TOKEN    = '8724846224:AAEdQXHVMpO352x-JAduOQoc3BMuEY7WEHA';
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

  if (action === 'events') {
    const coach      = params.coach || '';
    const weekOffset = parseInt(params.week || '0');
    result = getCoachEvents(coach, weekOffset);
  } else if (action === 'book') {
    result = handleBooking(params);
  } else {
    result = { status: 'ok' };
  }

  const json = JSON.stringify(result);

  // JSONP 支援（前端用 script tag 呼叫時帶 callback 參數）
  if (callback) {
    return ContentService
      .createTextOutput(`${callback}(${json})`)
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService
    .createTextOutput(json)
    .setMimeType(ContentService.MimeType.JSON);
}


// ============================================================
// 讀取教練行事曆事件
// ============================================================
function getCoachEvents(coachName, weekOffset) {
  const coach = COACHES[coachName];
  if (!coach) return { error: '找不到教練：' + coachName, events: [] };

  try {
    const now      = new Date();
    const dow      = now.getDay(); // 0=Sun
    const monday   = new Date(now);
    monday.setDate(now.getDate() - (dow === 0 ? 6 : dow - 1) + weekOffset * 7);
    monday.setHours(0, 0, 0, 0);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    const cal = CalendarApp.getCalendarById(coach.calId);
    if (!cal) return { error: '無法存取行事曆', events: [] };

    const events = cal.getEvents(monday, sunday)
      .filter(ev => !ev.isAllDayEvent())
      .map(ev => ({
        start: ev.getStartTime().getTime(),
        end:   ev.getEndTime().getTime()
      }));

    return {
      coach:     coachName,
      color:     coach.color,
      weekStart: monday.getTime(),
      events:    events
    };
  } catch (err) {
    Logger.log('getCoachEvents error: ' + err.message);
    return { error: err.message, events: [] };
  }
}


// ============================================================
// 處理預約表單 → 送 Telegram
// ============================================================
function handleBooking(p) {
  try {
    const coachName    = p.coach        || '';
    const name         = p.name         || '';
    const phone        = p.phone        || '';
    const datetime     = p.datetime     || '';
    const injury       = p.injury       || '否';
    const injuryDetail = p.injuryDetail || '';
    const strength     = p.strength     || '否';
    const exercise     = p.exercise     || '無';
    const exDetail     = p.exDetail     || '';
    const goal         = p.goal         || '未填寫';
    const notes        = p.notes        || '';

    const injuryText  = injury   === '有' ? `有（${injuryDetail}）` : '無';
    const exerciseText = exercise === '有' ? `有（${exDetail}）`     : '無';

    const msg =
      `📅 <b>新體驗課預約</b>\n\n` +
      `👤 ${name}・${phone}\n` +
      `🏋️ 預約教練：${coachName}\n` +
      `📆 時間：${datetime}\n\n` +
      `🩹 舊傷/痠緊痛：${injuryText}\n` +
      `💪 肌力訓練經驗：${strength}\n` +
      `🏃 運動習慣：${exerciseText}\n` +
      `🎯 目標：${goal}` +
      (notes ? `\n\n💬 備註：${notes}` : '');

    const coach   = COACHES[coachName];
    const targets = new Set();

    // 優先送到群組
    if (TG_GROUP_CHAT_ID) targets.add(TG_GROUP_CHAT_ID);
    // 同時送到個別教練（群組未設定時也能收到）
    if (coach && coach.chatId) targets.add(coach.chatId);

    const tgUrl = `https://api.telegram.org/bot${TG_BOT_TOKEN}/sendMessage`;
    targets.forEach(chatId => {
      UrlFetchApp.fetch(tgUrl, {
        method:      'post',
        contentType: 'application/json',
        payload:     JSON.stringify({ chat_id: chatId, text: msg, parse_mode: 'HTML' }),
        muteHttpExceptions: true
      });
    });

    Logger.log(`Booking sent: ${name} → ${coachName} ${datetime}`);
    return { status: 'ok' };
  } catch (err) {
    Logger.log('handleBooking error: ' + err.message);
    return { status: 'error', msg: err.message };
  }
}
