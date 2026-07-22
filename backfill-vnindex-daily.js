// backfill-vnindex-daily.js
// ==========================================================
// CHẠY 1 LẦN DUY NHẤT để nạp dữ liệu LỊCH SỬ VN-Index theo ngày
// (giá đóng cửa mỗi phiên, ~2 năm gần nhất) vào file vnindex-history.json,
// giúp biểu đồ có "chiều sâu" dài hạn giống TradingView/S&P500 ngay lập tức,
// thay vì phải chờ vài tháng để tích lũy từ fetch-vnindex-history.js.
//
// Dùng API "DailyIndex" của SSI FastConnect (khác với IntradayOhlc):
//   GET /api/v2/Market/DailyIndex?indexId=VNINDEX&fromDate=...&toDate=...
//
// Sau khi chạy xong, file vnindex-history.json sẽ có:
//   - Các điểm LỊCH SỬ (mỗi ngày 1 điểm, time = "15:00:00" = giờ đóng cửa)
//   - Nối tiếp bởi các điểm TRONG NGÀY hôm nay đã có sẵn (nếu có), do
//     fetch-vnindex-history.js ghi ra mỗi 15 phút.
//
// Chạy: node backfill-vnindex-daily.js
// Yêu cầu: Node.js 18+ và 2 biến môi trường SSI_CONSUMER_ID / SSI_CONSUMER_SECRET
// ==========================================================

const fs = require('fs');
const path = require('path');

const CONSUMER_ID = process.env.SSI_CONSUMER_ID;
const CONSUMER_SECRET = process.env.SSI_CONSUMER_SECRET;

const BASE_URL = 'https://fc-data.ssi.com.vn/api/v2/Market';
const INDEX_ID = 'VNINDEX';
const OUT_FILE = path.join(__dirname, 'vnindex-history.json');

// Lấy tối đa bao nhiêu ngày về trước (giữ đồng bộ với MAX_AGE_DAYS trong fetch-vnindex-history.js)
const BACKFILL_DAYS = 730; // ~2 năm

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

// Gọi DailyIndex, tự động phân trang nếu số bản ghi > pageSize
async function fetchDailyIndexHistory(token, fromDate, toDate) {
  const pageSize = 1000; // tối đa cho phép
  let pageIndex = 1;
  let all = [];

  while (true) {
    const params = new URLSearchParams({
      indexId: INDEX_ID,
      fromDate,
      toDate,
      pageIndex: String(pageIndex),
      pageSize: String(pageSize),
      ascending: 'true'
    });

    const res = await fetch(`${BASE_URL}/DailyIndex?${params}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const json = await res.json();
    const rows = json.data || [];
    all = all.concat(rows);

    const total = Number(json.totalRecord || rows.length);
    console.log(`  Trang ${pageIndex}: lấy được ${rows.length} dòng (tổng ${total})`);

    if (all.length >= total || rows.length === 0 || pageIndex >= 10) break;
    pageIndex++;
  }

  return all;
}

function loadHistory() {
  if (!fs.existsSync(OUT_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(OUT_FILE, 'utf8'));
  } catch {
    return [];
  }
}

async function main() {
  const today = new Date();
  const fromDateObj = new Date(today.getTime() - BACKFILL_DAYS * 24 * 60 * 60 * 1000);
  const fromDate = formatDateDMY(fromDateObj);
  const toDate = formatDateDMY(today);

  console.log('Đang lấy access token từ SSI...');
  const token = await getAccessToken();
  console.log('Lấy access token thành công.');

  console.log(`Đang lấy dữ liệu VN-Index theo ngày từ ${fromDate} đến ${toDate}...`);
  const rows = await fetchDailyIndexHistory(token, fromDate, toDate);

  if (!rows.length) {
    throw new Error('Không lấy được dữ liệu lịch sử nào. Kiểm tra lại quyền truy cập DailyIndex trên tài khoản SSI.');
  }

  // Chuyển thành định dạng giống fetch-vnindex-history.js: { date, time, value }
  // time = "15:00:00" để biểu thị giá đóng cửa cuối ngày, tránh trùng giờ với
  // các điểm intraday (thường có giờ lẻ như 14:45:10) của cùng 1 ngày.
  const dailyPoints = rows
    .map(r => ({
      date: r.TradingDate,
      time: '15:00:00',
      value: parseFloat(r.IndexValue)
    }))
    .filter(p => p.date && !Number.isNaN(p.value));

  console.log(`Đã chuyển đổi ${dailyPoints.length} điểm dữ liệu lịch sử.`);

  const existing = loadHistory();

  // Gộp: điểm lịch sử (theo ngày) + điểm đã có sẵn trong file (intraday hôm nay...),
  // loại trùng theo cặp (date, time), rồi sắp xếp lại theo thời gian tăng dần.
  const merged = [...dailyPoints, ...existing];
  const seen = new Set();
  const deduped = merged.filter(p => {
    const key = `${p.date} ${p.time}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const toTimestamp = (p) => {
    const [d, m, y] = p.date.split('/').map(Number);
    const [h, min, s] = (p.time || '00:00:00').split(':').map(Number);
    return new Date(y, m - 1, d, h, min, s || 0).getTime();
  };
  deduped.sort((a, b) => toTimestamp(a) - toTimestamp(b));

  fs.writeFileSync(OUT_FILE, JSON.stringify(deduped, null, 2), 'utf8');
  console.log(`\nHOÀN TẤT. File ${OUT_FILE} hiện có ${deduped.length} điểm dữ liệu`
    + ` (từ ${deduped[0].date} đến ${deduped[deduped.length - 1].date}).`);
}

main().catch(err => {
  console.error('Lỗi:', err.message);
  process.exit(1);
});
