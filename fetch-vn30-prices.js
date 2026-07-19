// fetch-vn30-prices.js
// Lấy giá đóng cửa (hoặc giá khớp gần nhất) của 30 mã VN30 từ API công khai
// của VNDirect — không cần API key. Ghi kết quả ra vn30-prices.json.
//
// Chạy: node fetch-vn30-prices.js
// Yêu cầu: Node.js 18+ (đã có fetch() sẵn, không cần cài thêm package nào).

const fs = require('fs');
const path = require('path');

const VN30_SYMBOLS = [
  'ACB', 'BCM', 'BID', 'BVH', 'CTG', 'FPT', 'GAS', 'GVR', 'HDB', 'HPG',
  'MBB', 'MSN', 'MWG', 'PLX', 'POW', 'SAB', 'SHB', 'SSB', 'SSI', 'STB',
  'TCB', 'TPB', 'VCB', 'VHM', 'VIB', 'VIC', 'VJC', 'VNM', 'VPB', 'VRE'
];

const API_BASE = 'https://finfo-api.vndirect.com.vn/v4/stock_prices';

function formatDate(d) {
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

// Lấy 10 ngày gần nhất để chắc chắn có ít nhất 2 phiên giao dịch
// (đề phòng cuối tuần / ngày lễ không có dữ liệu).
function buildUrl(symbol) {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 12);
  const q = `code:${symbol}~date:gte:${formatDate(start)}~date:lte:${formatDate(end)}`;
  return `${API_BASE}?sort=date&q=${encodeURIComponent(q)}&size=10&page=1`;
}

async function fetchSymbol(symbol) {
  const url = buildUrl(symbol);
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; vn30-price-updater/1.0)'
      }
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const json = await res.json();
    const rows = json.data || [];
    if (!rows.length) throw new Error('Không có dữ liệu');

    // API trả về mới nhất trước (sort=date, mặc định giảm dần theo các ví dụ
    // đã khảo sát). Phòng trường hợp thứ tự khác, tự sắp xếp lại cho chắc.
    rows.sort((a, b) => new Date(b.date) - new Date(a.date));
    const latest = rows[0];

    // Giá trong API tính theo đơn vị nghìn đồng (ví dụ 84.5 = 84.500đ)
    const price = Math.round(latest.close * 1000);
    const changeAbs = latest.change != null ? latest.change * 1000 : 0;
    const prevClose = price - changeAbs;
    const changePct = prevClose ? (changeAbs / prevClose) * 100 : 0;

    return {
      sym: symbol,
      price,
      change: Math.round(changePct * 100) / 100,
      date: latest.date
    };
  } catch (err) {
    console.warn(`[${symbol}] Lỗi lấy giá:`, err.message);
    return null; // bỏ qua mã lỗi, giữ nguyên dữ liệu cũ ở phía website
  }
}

async function main() {
  const results = [];
  // Gọi tuần tự với độ trễ nhỏ để tránh bị coi là spam request
  for (const sym of VN30_SYMBOLS) {
    const data = await fetchSymbol(sym);
    if (data) results.push(data);
    await new Promise(r => setTimeout(r, 300));
  }

  if (!results.length) {
    console.error('Không lấy được mã nào — giữ nguyên file cũ, không ghi đè.');
    process.exit(1);
  }

  const outPath = path.join(__dirname, 'vn30-prices.json');
  fs.writeFileSync(outPath, JSON.stringify(results, null, 2), 'utf8');
  console.log(`Đã ghi ${results.length}/${VN30_SYMBOLS.length} mã vào ${outPath}`);
}

main();
