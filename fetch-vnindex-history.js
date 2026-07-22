// fetch-vnindex-history.js
// ==========================================================
// Lấy giá trị VN-Index MỚI NHẤT (trong phiên) từ API chính thức của SSI,
// rồi CỘNG DỒN vào file vnindex-history.json (không xóa dữ liệu cũ).
// Dùng để vẽ biểu đồ xu hướng dài hạn (nhiều ngày/tháng nối tiếp).
//
// Chạy: node fetch-vnindex-history.js
// Yêu cầu: Node.js 18+ (đã có fetch() sẵn)
//
// CONSUMER_ID / CONSUMER_SECRET không được gõ thẳng vào file này nữa.
// Thay vào đó, đặt 2 biến môi trường sau (xem hướng dẫn GitHub Secrets):
//   SSI_CONSUMER_ID
//   SSI_CONSUMER_SECRET
// ==========================================================

const fs = require('fs');
const path = require('path');

const CONSUMER_ID = process.env.SSI_CONSUMER_ID;
const CONSUMER_SECRET = process.env.SSI_CONSUMER_SECRET;

const BASE_URL = 'https://fc-data.ssi.com.vn/api/v2/Market';
const INDEX_SYMBOL = 'VNINDEX';
const OUT_FILE = path.join(__dirname, 'vnindex-history.json');

// Giữ tối đa 2 năm dữ liệu trong file, để file không phình to mãi
const MAX_AGE_DAYS = 730;

function formatDateDMY(d) {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

async function getAccessToken() {
  if (!CONSUMER_ID || !CONSUMER_SECRET) {
    throw new Error('Thiếu SSI_CONSUMER_ID hoặc SSI_CONSUMER_SECRET (biến môi trường).');
  }
  const res = await fetch(`${BASE_URL}/AccessToken`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      consumerID: CONSUMER_ID,
      consumerSecret: CONSUMER_SECRET
    })
  });
  const json = await res.json();
  if (!res.ok || !json.data || !json.data.accessToken) {
    throw new Error('Không lấy được access token: ' + JSON.stringify(json));
  }
  return json.data.accessToken;
}

// Lấy 1 điểm dữ liệu VN-Index mới nhất trong ngày hôm nay
async function fetchLatestPoint(token) {
  const today = formatDateDMY(new Date());
  const params = new URLSearchParams({
    symbol: INDEX_SYMBOL,
    fromDate: today,
    toDate: today,
    pageIndex: '1',
    pageSize: '1',
    ascending: 'false' // false = mới nhất trước
  });

  const res = await fetch(`${BASE_URL}/IntradayOhlc?${params}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const json = await res.json();
  const rows = json.data || [];
  if (!rows.length) throw new Error('Không có dữ liệu VN-Index hôm nay (có thể ngoài giờ giao dịch).');

  const latest = rows[0];
  return {
    date: latest.TradingDate,   // dd/mm/yyyy
    time: latest.Time,          // hh:mm:ss
    value: parseFloat(latest.Close)
  };
}

function loadHistory() {
  if (!fs.existsSync(OUT_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(OUT_FILE, 'utf8'));
  } catch {
    return [];
  }
}

function trimOldData(history) {
  const cutoff = Date.now() - MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
  return history.filter(pt => {
    const [d, m, y] = pt.date.split('/');
    const t = new Date(`${y}-${m}-${d}`).getTime();
    return t >= cutoff;
  });
}

async function main() {
  console.log('Đang lấy access token từ SSI...');
  const token = await getAccessToken();
  console.log('Lấy access token thành công.');

  const point = await fetchLatestPoint(token);
  console.log('Điểm dữ liệu mới nhất:', point);

  let history = loadHistory();

  // Tránh ghi trùng nếu chạy 2 lần cùng 1 mốc thời gian
  const isDuplicate = history.length > 0 &&
    history[history.length - 1].date === point.date &&
    history[history.length - 1].time === point.time;

  if (isDuplicate) {
    console.log('Điểm dữ liệu này đã có rồi, không ghi thêm.');
    return;
  }

  history.push(point);
  history = trimOldData(history);

  fs.writeFileSync(OUT_FILE, JSON.stringify(history, null, 2), 'utf8');
  console.log(`Đã ghi thêm 1 điểm. Tổng cộng ${history.length} điểm trong ${OUT_FILE}`);
}

main().catch(err => {
  console.error('Lỗi:', err.message);
  process.exit(1);
});
