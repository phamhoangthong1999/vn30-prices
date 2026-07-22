// fetch-vn30-prices.js  (bản dùng SSI FastConnect Data API)
// ==========================================================
// Lấy giá đóng cửa gần nhất của 30 mã VN30 từ API CHÍNH THỨC của SSI.
// Cần có ConsumerID + ConsumerSecret (lấy từ iBoard SSI sau khi đăng ký
// dịch vụ FastConnect Data — xem README.md).
//
// Chạy: node fetch-vn30-prices.js
// Yêu cầu: Node.js 18+ (đã có fetch() sẵn)
//
// CONSUMER_ID / CONSUMER_SECRET không gõ thẳng vào file này — đặt 2 biến
// môi trường sau (xem hướng dẫn GitHub Secrets, giống fetch-vnindex-history.js):
//   SSI_CONSUMER_ID
//   SSI_CONSUMER_SECRET
// ==========================================================

const fs = require('fs');
const path = require('path');

const CONSUMER_ID = process.env.SSI_CONSUMER_ID;
const CONSUMER_SECRET = process.env.SSI_CONSUMER_SECRET;

const BASE_URL = 'https://fc-data.ssi.com.vn/api/v2/Market';

const VN30_SYMBOLS = [
  'ACB', 'BCM', 'BID', 'BVH', 'CTG', 'FPT', 'GAS', 'GVR', 'HDB', 'HPG',
  'MBB', 'MSN', 'MWG', 'PLX', 'POW', 'SAB', 'SHB', 'SSB', 'SSI', 'STB',
  'TCB', 'TPB', 'VCB', 'VHM', 'VIB', 'VIC', 'VJC', 'VNM', 'VPB', 'VRE'
];

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

async function fetchSymbol(symbol, token, fromDate, toDate) {
  const params = new URLSearchParams({
    symbol,
    fromDate,
    toDate,
    pageIndex: '1',
    pageSize: '5'
  });
  try {
    const res = await fetch(`${BASE_URL}/DailyStockPrice?${params}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const json = await res.json();
    const rows = json.data || [];
    if (!rows.length) throw new Error('Không có dữ liệu');

    // Sắp xếp theo ngày mới nhất trước (API trả dd/mm/yyyy nên parse tay)
    const toTime = (s) => {
      const [d, m, y] = s.TradingDate.split('/');
      return new Date(`${y}-${m}-${d}`).getTime();
    };
    rows.sort((a, b) => toTime(b) - toTime(a));
    const latest = rows[0];

    return {
      sym: symbol,
      price: Math.round(parseFloat(latest.ClosePrice)),
      change: parseFloat(latest.PerPriceChange),
      date: latest.TradingDate
    };
  } catch (err) {
    console.warn(`[${symbol}] Lỗi lấy giá:`, err.message);
    return null;
  }
}

async function main() {
  console.log('Đang lấy access token từ SSI...');
  const token = await getAccessToken();
  console.log('Lấy access token thành công.');

  const today = new Date();
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const fromDate = formatDateDMY(weekAgo);
  const toDate = formatDateDMY(today);

  const results = [];
  for (const sym of VN30_SYMBOLS) {
    const data = await fetchSymbol(sym, token, fromDate, toDate);
    if (data) results.push(data);
    await new Promise(r => setTimeout(r, 200));
  }

  if (!results.length) {
    console.error('Không lấy được mã nào — giữ nguyên file cũ, không ghi đè.');
    process.exit(1);
  }

  const outPath = path.join(__dirname, 'vn30-prices.json');
  fs.writeFileSync(outPath, JSON.stringify(results, null, 2), 'utf8');
  console.log(`Đã ghi ${results.length}/${VN30_SYMBOLS.length} mã vào ${outPath}`);
}

main().catch(err => {
  console.error('Lỗi không xử lý được:', err.message);
  process.exit(1);
});
