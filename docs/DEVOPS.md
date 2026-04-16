# 🛠️ DarkStar DevOps — Operations Guide

Tài liệu này hướng dẫn cách quản lý bí mật (Secrets), vận hành hệ thống CI/CD và kết nối giữa Doppler, Supabase và GitHub Actions.

---

## 🔐 Secrets Management — [Doppler]

Dự án không lưu trữ bất kỳ file `.env` nào trong mã nguồn. Toàn bộ cấu hình được đồng bộ qua **Doppler**.

### 1. Cài đặt Docker/Local Doppler
Cài đặt Doppler CLI tại: [doppler.com/install](https://docs.doppler.com/docs/install-cli)

### 2. Định nghĩa Config
Hệ thống sử dụng các config chính:
- `stg` (Staging): Dùng cho môi trường Staging.
- `prd` (Production): Chứa `DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET`, `DISCORD_TOKEN`. 👈 **Chọn config này khi liên kết với Supabase.**
- `prd_fe` (Production Front-end): Chứa `SUPABASE_URL` và `SUPABASE_ANON_KEY`.

---

## 🏗️ CI/CD Pipeline Overview

Hệ thống CI/CD được chia làm 4 workflow chính:

### 1. `ci.yml` — Mã Vàng (Verify)
Chạy trên tất cả các PR.
- **Lint**: Kiểm tra ESLint.
- **Test**: Chạy Jest/Vitest cho toàn bộ Nx project.

### 2. `ephemeral-staging.yml` — Mã Xanh (Ephemeral)
Tự động dựng database giả lập và API container để chạy Smoke Test:
- Chạy `postgres:alpine` (PostgreSQL).
- Đẩy `DATABASE_URL` và `DIRECT_URL` nội bộ.
- Chạy `npx prisma db push` để tạo schema.
- Kiểm tra sức khỏe `/api/members`.

### 3. `local-sync.yml` — Mã Tím (Sync)
Tự động đồng bộ mã nguồn về máy chủ Local Sync (`DARKSTAR-DATA-PC`) sau khi PR được merge vào `main`.

---

## 🔗 Supabase Integration — [Doppler Link]

Để đồng bộ Doppler và Supabase tự động:
1. Vào [Supabase Account Tokens](https://supabase.com/dashboard/account/tokens) và tạo một access token.
2. Tại Doppler Dashboard, chọn tab **Integrations** -> **Add Integration** -> **Supabase**.
3. Dán Token vào và chọn Project `darkstar-db`.
4. Ánh xạ config `prd` của Doppler vào Supabase.

---

## 🤖 Self-hosted Runner (`DARKSTAR-DATA-PC`)

Máy chủ Local dùng để tự động đồng bộ (Sync) mã nguồn.
- Đảm bảo `actions-runner` được restart định kỳ.
- Pipeline `local-sync` sẽ tự quản lý việc `git pull` và update môi trường.

---

## 🕒 Background Workers & Cron Jobs

Hệ thống sử dụng `@nestjs/schedule` để thực thi các tác vụ định kỳ. Khi vận hành trên Production:
- **Render/VPS**: Đảm bảo dịch vụ Backend không bị đưa về chế độ sleep (Idle) để các hàm `@Cron` chạy đúng giờ.
- **Monitoring**: Các lỗi trong quá trình chạy Cron (như Cleanup hoặc Discord Report) sẽ được log vào hệ thống Logging của Render.
- **Biến môi trường**: Đảm bảo `DISCORD_TOKEN` luôn hợp lệ để tránh fail các tác vụ báo cáo tự động.

---
*Developed with 🩸 by DarkStar Clan Engineering Team.*
