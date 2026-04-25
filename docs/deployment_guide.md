# 🚀 Hướng Dẫn Deploy DarkStar Platform (Standalone)

Tài liệu này hướng dẫn cách deploy hệ thống sau khi đã tách thành 2 repo độc lập.

## 1. Deploy Backend Hub (ewlya)

Backend Hub chứa cả API và Discord Bot. Cách tốt nhất để deploy là sử dụng **Docker**.

### 1.1 Chuẩn bị
1. Đảm bảo file `.env` đã có đầy đủ các biến:
   - `DATABASE_URL`
   - `DISCORD_TOKEN`
   - `JWT_SECRET`
2. Đảm bảo `prisma/schema.prisma` đã được cập nhật.

### 1.2 Triển khai với Docker
```bash
# Build và chạy các service (DB, API, Bot)
docker-compose up --build -d
```

### 1.3 Triển khai lên Cloud (Render/VPS)
- **Render**: Bạn có thể chọn repo `ewlya`.
- **Build Command**: `npm install && npx prisma generate && npm run build`
- **Start Command (API)**: `npm run start:prod:api`
- **Start Command (Bot)**: `npm run start:prod:bot`

## 2. Deploy Frontend (ewlya-fe)

Frontend là ứng dụng Angular 21 độc lập.

### 2.1 Cấu hình Proxy
Đảm bảo file `proxy.conf.json` trỏ đúng vào địa chỉ API của bạn (ví dụ: `http://localhost:3000` cho local hoặc URL API thật khi deploy).

### 2.2 Triển khai lên Cloudflare Pages / Vercel
- **Build Command**: `npm install && npm run build`
- **Output Directory**: `dist/fe/browser`

## 3. Quản lý Database

Sử dụng Prisma để quản lý schema:
- **Tạo migration mới**: `npx prisma migrate dev`
- **Cập nhật DB thật**: `npx prisma db push`
- **Xem dữ liệu**: `npx prisma studio`

---
*Lưu ý: Luôn đảm bảo `DISCORD_TOKEN` được bảo mật và không bao giờ commit file `.env` lên GitHub.*
