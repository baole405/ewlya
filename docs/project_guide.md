# 📁 Ewlya Backend Hub — Project Structure & Developer Guide

Tài liệu này đã được cập nhật cho cấu trúc Standalone (đã loại bỏ Nx Monorepo).

## 1. Prerequisites

| Tool    | Version  | Install                              |
| :------ | :------- | :----------------------------------- |
| Node.js | >= 20    | https://nodejs.org                   |
| npm     | >= 10    | Included with Node.js                |
| Docker  | Latest   | https://docker.com (for Containerization) |

## 2. Getting Started

```bash
# 1. Clone the repository
git clone https://github.com/baole405/ewlya.git && cd ewlya

# 2. Install dependencies
npm install

# 3. Setup environment
cp .env.example .env
# -> Fill in DISCORD_TOKEN, DATABASE_URL, etc.

# 4. Start infrastructure & App via Docker
docker-compose up --build -d

# 5. (Optional) Run locally without Docker
# Make sure you have a Postgres DB running
npx prisma generate
npm run start:dev:api  # For API
npm run start:dev:bot  # For Bot
```

## 3. Running Applications

Dự án hiện có 2 entry points chính:

### 🔧 Backend API (NestJS) — Port 3000
- **Lệnh chạy**: `npm run start:dev:api`
- **Swagger Docs**: http://localhost:3000/api/docs

### 🤖 Discord Bot (Standalone process)
- **Lệnh chạy**: `npm run start:dev:bot`
- **Mô tả**: Chạy bot Discord sử dụng discord.js, kết nối trực tiếp vào Database dùng chung với API.

## 4. Project Folder Structure

```text
ewlya/
├── src/
│   ├── main.ts            # Entry point cho API (NestJS)
│   ├── bot/               # Toàn bộ logic Discord Bot
│   │   ├── main.ts        # Entry point cho Bot
│   │   ├── events/        # Event handlers (message, interaction, etc.)
│   │   └── services/      # Bot specific services (point calculator)
│   ├── database/          # Prisma client & Database utilities
│   ├── modules/           # NestJS Modules (Auth, Members, etc.)
│   └── shared/            # Code dùng chung (Models, Utils)
├── prisma/
│   └── schema.prisma      # Single Source of Truth cho Database
├── docs/                  # Tài liệu hướng dẫn
├── Dockerfile             # Docker build cho Backend Hub
├── docker-compose.yml     # Quản lý DB, API và Bot containers
└── package.json           # Dependencies & Scripts
```

## 5. Deployment

Hệ thống được thiết kế để chạy tốt trên Docker:
- **Build**: `docker-compose build`
- **Run**: `docker-compose up -d`

Các biến môi trường quan trọng cần có trong `.env`:
- `DATABASE_URL`: Kết nối PostgreSQL.
- `DISCORD_TOKEN`: Token của bot Discord.
- `JWT_SECRET`: Khóa bí mật cho xác thực API.
