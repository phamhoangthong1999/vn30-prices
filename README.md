# Cập nhật giá VN30 tự động (miễn phí, không cần server riêng)

## Nó hoạt động thế nào

1. `fetch-vn30-prices.js` gọi API công khai của VNDirect để lấy giá mới nhất
   của 30 mã VN30, rồi ghi ra `vn30-prices.json`.
2. `.github/workflows/update-vn30.yml` (GitHub Actions) tự chạy script đó
   mỗi ngày lúc **15:15 giờ Việt Nam** (các ngày thứ 2–6), rồi tự commit +
   push file `vn30-prices.json` mới vào repo.
3. Vì việc gọi API xảy ra trên máy chủ của GitHub (không phải trình duyệt
   người xem web), nên **không bị chặn CORS** — đây là lý do cách này hoạt
   động được trong khi gọi thẳng từ trình duyệt thì không.
4. Website của bạn chỉ cần fetch file JSON này qua CDN **jsDelivr** (miễn phí,
   cho phép gọi cross-origin từ bất kỳ domain nào).

## Các bước thiết lập

1. Tạo một **repo GitHub mới** (public), ví dụ tên `vn30-prices`.
2. Upload 3 file trong thư mục này lên đúng cấu trúc:
   ```
   vn30-prices/
   ├── fetch-vn30-prices.js
   └── .github/
       └── workflows/
           └── update-vn30.yml
   ```
3. Vào tab **Actions** của repo → bấm **"I understand my workflows, go ahead
   and enable them"** (GitHub tắt mặc định lần đầu).
4. Chạy thử ngay: vào Actions → chọn workflow "Cập nhật giá VN30" → **Run
   workflow** → chờ ~30 giây → sẽ thấy file `vn30-prices.json` xuất hiện
   trong repo.
5. Lấy URL jsDelivr của file đó (thay `USERNAME` và `vn30-prices` bằng tên
   tài khoản/repo thật của bạn):
   ```
   https://cdn.jsdelivr.net/gh/USERNAME/vn30-prices@main/vn30-prices.json
   ```
6. Dán URL đó vào biến `YOUR_PRICE_API_URL` trong file `index.html` của
   website (mình đã để sẵn chỗ đó — xem phần dưới).

## Lưu ý quan trọng

- **Đây là giá cuối phiên / gần nhất (EOD), không phải real-time từng giây.**
  Vì workflow chỉ chạy 1 lần/ngày lúc 15:15. Muốn cập nhật thường xuyên hơn
  trong phiên (ví dụ mỗi 15 phút từ 9h-15h), chỉ cần thêm dòng cron nữa vào
  phần `schedule:`, ví dụ:
  ```yaml
  - cron: '*/15 2-8 * * 1-5'   # mỗi 15 phút, 9:00-15:00 giờ VN, thứ 2-6
  ```
- jsDelivr cache nội dung khoảng 12-24 giờ theo mặc định cho nhánh `@main`.
  Nếu muốn cache ngắn hơn, dùng URL kèm commit hash thay vì `@main`, hoặc
  dùng dịch vụ khác như Cloudflare Pages / Vercel (không bị cache lâu).
- Nếu VNDirect đổi cấu trúc API hoặc chặn (họ có toàn quyền làm vậy vì đây
  là API nội bộ không chính thức công bố), script sẽ báo lỗi trong log của
  GitHub Actions — vào tab Actions để xem, nhưng file `vn30-prices.json` cũ
  vẫn còn nguyên (không bị xoá), nên website không bị vỡ, chỉ là dữ liệu
  không mới thêm nữa.
