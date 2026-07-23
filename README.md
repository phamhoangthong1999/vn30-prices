# Hướng dẫn thêm Blog vào chungkhoanontrend.com

## Việc này làm gì?
Thêm 1 khu vực `/blog/` được build bằng Eleventy, mỗi bài viết ra 1 trang
HTML thật (URL riêng, tốt cho SEO). Viết bài qua giao diện `/admin`
(Decap CMS) — không cần sửa code. `index.html` hiện tại giữ nguyên,
chỉ sửa 1 chỗ nhỏ (xem Bước 2).

## Cấu trúc file trong bộ này
```
├── index.html            ← ĐÃ CÓ, không đổi nội dung (chỉ đổi 1 dòng, xem Bước 2)
├── package.json          ← MỚI
├── .eleventy.js           ← MỚI (cấu hình Eleventy)
├── .eleventyignore        ← MỚI
├── netlify.toml           ← MỚI (cấu hình build cho Netlify)
├── assets/
│   ├── css/site.css       ← MỚI (CSS gốc trích ra từ index.html)
│   └── css/blog.css       ← MỚI (CSS riêng cho bài viết chi tiết)
├── admin/
│   ├── index.html         ← MỚI (trang đăng nhập viết bài)
│   └── config.yml          ← MỚI (cấu hình các trường khi viết bài)
└── src/
    ├── _includes/layouts/base.njk   ← MỚI (khung header/footer chung)
    ├── _includes/layouts/post.njk   ← MỚI (khung 1 bài viết)
    └── blog/
        ├── index.njk                ← MỚI (trang danh sách /blog/)
        └── posts/
            ├── posts.json           ← MỚI (áp dụng layout chung)
            └── phan-tich-vnindex-vung-ho-tro.md  ← bài viết MẪU, xoá sau khi test xong
```

## Bước 1 — Đưa các file này vào repo GitHub của website
Copy toàn bộ các file/thư mục trên vào đúng vị trí gốc của repo chứa
`index.html` hiện tại (repo đang được Netlify deploy), rồi commit + push.

## Bước 2 — Sửa 1 chỗ trong index.html (bắt buộc)
Mở `index.html`, tìm khối:
```html
<style>
  ... (khoảng 1400 dòng CSS) ...
</style>
```
Xoá toàn bộ khối đó, thay bằng:
```html
<link rel="stylesheet" href="/assets/css/site.css">
```
(Chính là nội dung y hệt đã được trích ra file `assets/css/site.css` —
giao diện sẽ không đổi gì, chỉ là chuyển CSS ra file riêng để blog
dùng chung được.)

Đồng thời, trong menu điều hướng của `index.html`, tìm dòng:
```html
<a href="#" onclick="showPage('blog'); setActive(this)">Blog</a>
```
đổi thành:
```html
<a href="/blog/">Blog</a>
```
(và tương tự ở phần Footer) — để bấm vào "Blog" sẽ dẫn sang trang blog
thật thay vì mục ẩn/hiện cũ trong trang chủ. Bạn có thể xoá hẳn khối
`<div id="page-blog">...</div>` cũ trong `index.html` vì không cần
dùng nữa (không bắt buộc, để đó cũng không sao).

## Bước 3 — Bật Decap CMS trên Netlify (để bạn của bạn viết bài không cần code)
1. Vào **Netlify → chọn site chungkhoanontrend.com → Identity → Enable Identity**.
2. Trong **Identity → Settings → Registration**, chọn **Invite only**
   (để không ai ngoài bạn mời được tự đăng ký).
3. Vẫn trong Identity → mục **Services → Git Gateway → Enable Git Gateway**
   (bước này cho phép Decap CMS commit bài viết thẳng vào GitHub repo
   thay mặt người dùng, mà không cần họ có tài khoản GitHub).
4. Qua tab **Identity** của site, bấm **Invite users** → nhập email của
   bạn bạn ấy. Họ sẽ nhận email, bấm vào, đặt mật khẩu là xong.
5. Từ đó, bạn ấy chỉ cần vào `chungkhoanontrend.com/admin`, đăng nhập
   bằng email/mật khẩu đó, và viết bài trên giao diện — bấm "Publish"
   là bài lên thẳng web (Netlify tự build lại sau ~1 phút).

## Bước 4 — Deploy
Push code lên GitHub là xong — Netlify đã có `netlify.toml` nên sẽ tự
chạy `npm install && npx @11ty/eleventy` và deploy thư mục `_site`.

## Kiểm tra
- `chungkhoanontrend.com` — vẫn y hệt như cũ.
- `chungkhoanontrend.com/blog/` — trang danh sách bài viết (có sẵn 1 bài mẫu).
- `chungkhoanontrend.com/blog/phan-tich-vnindex-vung-ho-tro/` — trang bài viết mẫu.
- `chungkhoanontrend.com/admin` — trang đăng nhập viết bài (cần làm Bước 3 trước).

Sau khi test xong, xoá file
`src/blog/posts/phan-tich-vnindex-vung-ho-tro.md` (bài mẫu) hoặc để
người viết bài đầu tiên chỉnh sửa lại cho đúng nội dung thật.
