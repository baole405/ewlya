# 🐘 Supabase — Hướng Dẫn Sử Dụng Cho DarkStar

## 1. Tổng Quan

**Supabase** là nền tảng Cloud Database (PostgreSQL) miễn phí mà dự án DarkStar dùng để lưu trữ dữ liệu thành viên, điểm số, và mùa giải. Nó thay thế hoàn toàn cái Docker PostgreSQL chạy trên máy cá nhân.

| Thông tin          | Giá trị                                      |
| :----------------- | :-------------------------------------------- |
| **Project**        | `darkstar-db`                                 |
| **Region**         | Southeast Asia (Singapore)                    |
| **Plan**           | Free (500MB storage, 2 projects)              |
| **Dashboard**      | https://supabase.com/dashboard                |

---

## 2. Cách Lấy Connection String (Cho Prisma)

### Bước 1: Vào Dashboard
1. Đăng nhập https://supabase.com/dashboard
2. Chọn project `darkstar-db`

### Bước 2: Lấy URL
1. Bấm nút **Connect** (xanh lá, góc trên) hoặc vào **Project Settings** → **Database**
2. Chọn tab **ORM** hoặc **Direct**
3. Bạn sẽ thấy 2 loại Connection String:

**Transaction Mode (Port 6543)** — Dùng cho `DATABASE_URL`:
```
postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true
```

**Session Mode (Port 5432)** — Dùng cho `DIRECT_URL`:
```
postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres
```

### Bước 3: Cập nhật file `.env`
```env
DATABASE_URL="postgresql://postgres.owddgp...:[PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.owddgp...:[PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres"
```

### Bước 4: Đẩy Schema lên Supabase
```bash
npx prisma db push --schema=libs/shared/db/prisma/schema.prisma
```

Kết quả mong đợi:
```
Your database is now in sync with your Prisma schema.
```

---

## 3. Xem Dữ Liệu Trên Dashboard

### Table Editor (Giao diện bảng — Giống Excel)
1. Thanh menu bên trái → biểu tượng **Table Editor** (hình bảng).
2. Sau khi `prisma db push`, bạn sẽ thấy 6 bảng chính:
   - `Member` — Danh sách thành viên
   - `Submission` — Bài nộp điểm
   - `Season` — Các mùa giải
   - `ProgressionCheck` — Đợt kiểm tra tiến độ (mới)
   - `MemberProgressionStatus` — Trạng thái chi tiết thành viên (mới)
   - `ProgressionTitle` — Danh mục tên các đợt check (mới)
3. Bấm vào bảng để xem/sửa/xóa dữ liệu trực tiếp (giống phpMyAdmin).

### SQL Editor (Chạy query thủ công)
1. Thanh menu bên trái → biểu tượng **SQL Editor**.
2. Gõ SQL trực tiếp, ví dụ:
```sql
-- Xem tất cả thành viên, sắp theo điểm giảm dần
SELECT nickname, points FROM "Member" ORDER BY points DESC;

-- Đếm tổng thành viên
SELECT COUNT(*) FROM "Member";

-- Xem top 3
SELECT nickname, points FROM "Member" ORDER BY points DESC LIMIT 3;
```
3. Bấm **Run** (hoặc Ctrl+Enter) để thực thi.

---

## 4. Backup & Restore

### Tự động Backup (Chỉ có ở Pro Plan)
- Free plan **KHÔNG** có auto backup.
- Nhưng dữ liệu trên Supabase Cloud không bao giờ mất trừ khi bạn tự xóa.

### Backup thủ công (Miễn phí)
Chạy lệnh sau trên Terminal để xuất toàn bộ DB ra file:
```bash
pg_dump "postgresql://postgres.[REF]:[PASS]@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres" > backup_$(date +%Y%m%d).sql
```

### Restore từ file backup
```bash
psql "postgresql://postgres.[REF]:[PASS]@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres" < backup_20260405.sql
```

---

## 5. Giới Hạn Free Plan

| Tài nguyên             | Giới hạn Free    | Đủ cho DarkStar?   |
| :--------------------- | :--------------- | :------------------ |
| Storage                | 500 MB           | ✅ Dư sức (text data rất nhẹ) |
| Bandwidth              | 5 GB / tháng     | ✅ Đủ cho clan 100-500 người |
| Số project             | 2                | ✅ Chỉ cần 1        |
| API Requests           | Unlimited        | ✅                   |
| Realtime connections   | 200 concurrent   | ✅                   |
| Auto Backup            | ❌ Không có      | Backup tay bằng pg_dump |
| Pause after inactivity | 7 ngày           | ⚠️ Xem mục 6 bên dưới |

---

## 6. Lưu Ý Quan Trọng: Pause Policy

> ⚠️ Supabase Free Plan sẽ **tạm dừng (Pause)** database nếu **không có kết nối nào** trong vòng **7 ngày liên tục**.

**Cách phòng tránh:**
- Nếu Discord Bot chạy 24/7 trên Render và liên tục đọc/ghi DB → Database **không bao giờ bị Pause** vì luôn có kết nối.
- Nếu Bot bị tắt lâu ngày → Vào Dashboard bấm **Restore** để bật lại (data vẫn còn nguyên, không mất).

---

## 7. Chuyển Đổi Giữa Local DB và Supabase

### Dùng Local Docker (Development)
```env
DATABASE_URL="postgresql://ds_user:ds_password@127.0.0.1:5488/darkstar_db?schema=public"
DIRECT_URL="postgresql://ds_user:ds_password@127.0.0.1:5488/darkstar_db?schema=public"
```

### Dùng Supabase Cloud (Production)
```env
DATABASE_URL="postgresql://postgres.[REF]:[PASS]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.[REF]:[PASS]@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres"
```

Chỉ cần đổi 2 dòng trong file `.env`, không cần sửa code. Prisma tự động đọc từ biến môi trường.

---

## 8. Prisma Studio (Xem DB bằng GUI trên máy)

Ngoài Supabase Dashboard, bạn cũng có thể xem/sửa data bằng Prisma Studio ngay trên máy:

```bash
npx prisma studio --schema=libs/shared/db/prisma/schema.prisma
```

Mở trình duyệt tại http://localhost:5555 — Giao diện đẹp, kéo thả sửa record trực tiếp.

---

*Tài liệu được tạo bởi DarkStar Engineering Team.*
