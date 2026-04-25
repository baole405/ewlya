# 🚀 Hướng Dẫn Deploy DarkStar Platform (Step-by-Step)

## Tổng Quan

Sau khi hoàn thành hướng dẫn này, hệ thống của bạn sẽ:
- ✅ Bot Discord **online 24/7** dù máy bạn tắt
- ✅ Website **public trên Internet** với tốc độ CDN toàn cầu
- ✅ Database **lưu trữ vĩnh viễn** trên Cloud, không mất data
- ✅ API Server **chạy liên tục** phục vụ cả web lẫn bot

---

## Bước 6: Tạo Database trên Supabase (5 phút)

### 6.1 Đăng ký tài khoản
1. Truy cập https://supabase.com → **Start your project** → Đăng nhập bằng GitHub.
2. Bấm **New Project**.
3. Điền thông tin:
   - **Name**: `darkstar-db`
   - **Database Password**: Tạo mật khẩu mạnh (lưu lại cẩn thận!)
   - **Region**: `Southeast Asia (Singapore)` ← gần Việt Nam nhất
4. Bấm **Create new project**, đợi 1-2 phút.

### 6.2 Lấy Connection String
1. Vào **Project Settings** (biểu tượng bánh răng) → **Database**.
2. Kéo xuống mục **Connection string** → chọn tab **URI**.
3. Bạn sẽ thấy 2 loại URL:
   - **Transaction (Port 6543)**: Dùng cho `DATABASE_URL` (connection pooling qua pgbouncer)
   - **Session (Port 5432)**: Dùng cho `DIRECT_URL` (chạy migration)

### 6.3 Cập nhật file `.env` trên máy bạn
```bash
# Mở file .env và thay thế dòng DATABASE_URL:
DATABASE_URL="postgresql://postgres.[YOUR_REF]:[YOUR_PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.[YOUR_REF]:[YOUR_PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres"
```

### 6.4 Push Schema lên Supabase
```bash
npx prisma db push --schema=libs/shared/db/prisma/schema.prisma
```
Nếu thành công, bạn sẽ thấy message: `Your database is now in sync with your Prisma schema.`

---

## Bước 7: Deploy Frontend lên Cloudflare Pages (5 phút)

### 7.1 Đăng ký tài khoản
1. Truy cập https://dash.cloudflare.com → đăng ký (miễn phí).
2. Vào **Workers & Pages** → **Create** → **Pages** → **Connect to Git**.
3. Chọn repo GitHub `ewlya`.

### 7.2 Cấu hình Build
Điền các thông tin sau:

| Setting              | Value                                         |
| :------------------- | :-------------------------------------------- |
| **Framework preset** | `None`                                        |
| **Build command**    | `pnpm exec nx build ds-website`               |
| **Build output**     | `dist/ds-website/browser`                     |
| **Root directory**   | `/` (để trống hoặc `/`)                       |

### 7.3 Environment Variables (trên Cloudflare)
Thêm các biến môi trường sau trong phần **Settings → Environment Variables**:
```
NODE_VERSION = 20
```

Nếu FE cần gọi API:
```
API_URL = https://your-api-on-render.onrender.com
```

### 7.4 Bấm Deploy
Cloudflare sẽ tự build và cho bạn một URL như: `darkstar-clan.pages.dev`.
Từ giờ mỗi lần `git push`, Cloudflare tự build lại.

---

## Bước 8: Deploy API + Bot lên Render (10 phút)

> 💡 **Kiến trúc**: API Server và Discord Bot chạy **chung 1 process** (NestJS). Khi NestJS khởi động, nó đồng thời login Bot vào Discord. Chỉ cần **1 Free Web Service** duy nhất — **$0/tháng**.

### 8.1 Đăng ký Render
1. Truy cập https://render.com → đăng ký bằng GitHub.
2. Cài Render GitHub App: https://github.com/apps/render/installations/new → chọn repo `baole405/Ewlya`.

### 8.2 Deploy Web Service (API + Bot)
1. Bấm **New** → **Web Service** → chọn repo `ewlya`.
2. Cấu hình:

| Setting            | Value                                                                                              |
| :----------------- | :------------------------------------------------------------------------------------------------- |
| **Name**           | `darkstar-api`                                                                                     |
| **Language**       | `Node`                                                                                             |
| **Branch**         | `main`                                                                                             |
| **Region**         | `Singapore (Southeast Asia)`                                                                       |
| **Root Directory** | (để trống)                                                                                          |
| **Build Command**  | `pnpm install --frozen-lockfile && npx prisma generate --schema=libs/shared/db/prisma/schema.prisma && pnpm exec nx build api` |
| **Start Command**  | `node dist/apps/api/main.js`                                                                       |
| **Instance Type**  | `Free`                                                                                             |

3. Thêm **Environment Variables**:

| Name               | Value                                      |
| :----------------- | :----------------------------------------- |
| `DATABASE_URL`     | (copy từ Supabase Transaction URL)          |
| `DIRECT_URL`       | (copy từ Supabase Session URL)              |
| `PORT`             | `3000`                                      |
| `NODE_VERSION`     | `20`                                        |
| `DISCORD_TOKEN`    | (token thật của bot)                        |
| `DISCORD_CLIENT_ID`| (client id thật)                            |
| `GUILD_ID`         | `1179416079878078616`                       |
| `HOF_CHANNEL_ID`   | `1202984856812781608`                       |
| `TEST_CHANNEL_ID`  | `1424269975698407454`                       |
| `CONTRIBUTE_LOGS_ID`| `1480461099504500849`                      |

4. **Advanced Settings**:
   - **Health Check Path**: `/api`
   - **Auto-Deploy**: `On Commit`

5. Bấm **Deploy Web Service**. Đợi build xong (~3-5 phút).
6. Render cho bạn URL: `https://darkstar-api.onrender.com`
7. Test Swagger: `https://darkstar-api.onrender.com/api/docs`

### 8.3 Thiết lập UptimeRobot (Giữ Bot online 24/7)

Render Free tier tự ngủ sau 15 phút không có request. Dùng UptimeRobot ping miễn phí để đánh thức:

1. Truy cập https://uptimerobot.com → đăng ký miễn phí.
2. Bấm **Add New Monitor**:
   - **Monitor Type**: `HTTP(s)`
   - **Friendly Name**: `DarkStar API`
   - **URL**: `https://darkstar-api.onrender.com/api`
   - **Monitoring Interval**: `5 minutes`
3. Bấm **Create Monitor**.

→ UptimeRobot sẽ ping API mỗi 5 phút → Render không bao giờ ngủ → Bot online 24/7. ✅

---

## Bước 9: Cấu hình Doppler (Tùy chọn - 5 phút)

Doppler giúp bạn quản lý tất cả secrets từ 1 nơi duy nhất thay vì phải copy-paste `.env` khắp nơi.

### 9.1 Đăng ký
1. Truy cập https://doppler.com → đăng ký miễn phí.
2. Tạo **Project**: `darkstar`

### 9.2 Tạo Environments
Tạo 3 môi trường:
- **dev** — chứa biến local (Docker DB, test token)
- **stg** — staging (nếu cần)
- **prd** — production (Supabase URL, real Discord token)

### 9.3 Nhập tất cả biến vào môi trường `prd`
```
DATABASE_URL       = postgresql://postgres...  (Supabase)
DIRECT_URL         = postgresql://postgres...  (Supabase)
DISCORD_TOKEN      = MTQyMTMw...              (Real token)
DISCORD_CLIENT_ID  = 1421301934081708073
GUILD_ID           = 1179416079878078616
...
```

### 9.4 Sync với Render (Tự động)
1. Trong Doppler → **Integrations** → **Render**.
2. Chọn project `darkstar` → environment `prd`.
3. Mapping tới Render service `darkstar-api`.
4. Từ giờ, mỗi lần bạn đổi token ở Doppler → Render tự nhận biến mới, không cần vào từng service sửa tay.

---

## Kiểm Tra Cuối Cùng ✅

Sau khi hoàn thành 4 bước trên, hãy kiểm tra:

| Website online                | Mở `darkstar-clan.pages.dev`                   | Thấy trang Home   |
| API online                    | Mở `darkstar-api.onrender.com/api/docs`        | Thấy Swagger UI   |
| Bot online                    | Gõ lệnh bot trên Discord server                | Bot trả lời       |
| Database có data              | Mở Supabase Dashboard → Table Editor           | Thấy 6 bảng       |
| Tắt máy → Bot vẫn sống       | Tắt laptop, đợi 5 phút, gõ lệnh bot           | Bot vẫn trả lời ✅ |

> [!IMPORTANT]
> Việc thiết lập Uptime Monitor ở Bước 8.3 là BẮT BUỘC để đảm bảo các tính năng tự động (Lifecycle Cleanup, Daily Report) hoạt động đúng giờ.

---

*Tài liệu được tạo bởi DarkStar Engineering Team.*
