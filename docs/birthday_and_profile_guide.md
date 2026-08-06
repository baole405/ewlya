# 🎂 Birthday Announcement & Profile Privacy Guide

Tài liệu chi tiết về luồng Cập nhật thông tin ngày sinh (Birthdate), Cài đặt Quyền riêng tư (Profile Privacy), và Tính năng Tự động chúc mừng sinh nhật của Liza Bot.

---

## 1. ⚙️ Hướng dẫn Thành viên Cập nhật Sinh nhật & Privacy

Thành viên trong Clan có thể tự cập nhật ngày sinh và quyền riêng tư thông qua Bảng điều khiển Liza:

1. Vào kênh **`╏🧹╏・liza-workspaces`**.
2. Tìm bảng điều khiển **Welcome to the DarkStar Hub!** và bấm nút **Edit Profile**.
3. Chọn nút **`🔒 Edit Birthdate & Privacy`**.
4. Điền các trường thông tin:
   - **Birth Date (DD/MM)**: Ngày/tháng sinh. Chấp nhận các dạng gõ linh hoạt: `15/08`, `5/8`, `15/8`, `15/08/2005`. (Nếu bỏ trống = Không nhận lời chúc sinh nhật).
   - **Birth Year (YYYY)**: Năm sinh (Không bắt buộc. Nếu để trống sẽ được ẩn).
   - **Privacy (PUBLIC / OFFICIAL / PRIVATE)**: Cài đặt mức độ riêng tư của hồ sơ:
     - `PUBLIC`: Tất cả mọi người trong server đều có thể xem thông tin cơ bản.
     - `OFFICIAL`: Chỉ các thành viên Clan chính thức (`OFFICIAL`) mới có thể xem.
     - `PRIVATE`: Chỉ bản thân thành viên và Admin mới xem được.
5. Nhấn **Submit** và chọn **`👁️ Refresh Profile`** để kiểm tra thẻ hồ sơ đã được cập nhật.

---

## 2. 🤖 Luồng tự động Chúc mừng Sinh nhật của Liza (Birthday Service)

- **Thời gian chạy**: Cronjob chạy tự động vào **9:00 AM hàng ngày** (`CronExpression.EVERY_DAY_AT_9AM`).
- **Kênh thông báo**: Kênh có `BIRTHDAY_CHANNEL_ID` (mặc định: `1370483716362731630`).
- **Điều kiện chúc mừng**:
  1. Thành viên có ngày sinh trùng với Ngày / Tháng hiện tại.
  2. Thành viên có trạng thái trong Clan DB là `status: 'OFFICIAL'`.

### 🎨 Tùy chỉnh Lời chúc, Hình ảnh & Sticker

Bạn có thể tùy chỉnh hình ảnh banner hoặc đính kèm Discord Sticker cho bài viết chúc mừng sinh nhật của Liza bằng các biến môi trường trong `.env`:

```env
# Link hình ảnh / GIF banner chúc mừng sinh nhật
BIRTHDAY_IMAGE_URL="https://media.giphy.com/media/g5R6Ix5ix2lUY/giphy.gif"

# ID của Discord Sticker trên Server (nếu muốn gửi kèm Sticker)
BIRTHDAY_STICKER_ID="123456789012345678"
```

---

## 🧪 Lệnh thử nghiệm dành cho Dev / Admin

- Admin có thể kiểm tra danh sách sinh nhật hôm nay bằng lệnh Slash command:
  `/check-birthday` (chỉ chạy trong kênh test).
