# 📁 Ewlya Monorepo — Project Structure & Developer Guide

## 1. Prerequisites

| Tool    | Version  | Install                              |
| :------ | :------- | :----------------------------------- |
| Node.js | >= 20    | https://nodejs.org                   |
| pnpm    | >= 9     | `npm install -g pnpm`                |
| Docker  | Latest   | https://docker.com (for local DB)    |
| Nx CLI  | 22.x     | Included via `npx nx` (no global install needed) |

## 2. Getting Started

```bash
# 1. Clone the repository
git clone <repo-url> && cd ewlya

# 2. Install all dependencies (MUST use pnpm, NOT npm)
pnpm install

# 3. Start local PostgreSQL database (Docker required)
docker compose up -d

# 4. Generate Prisma client
npx prisma generate --schema=libs/shared/db/prisma/schema.prisma
```

## 3. Running Applications

### 🌐 Frontend (Angular Website) — Port 4200

```bash
nx serve ds-website
```

Open: http://localhost:4200

### 🔧 Backend API (NestJS + Swagger) — Port 3000

```bash
nx serve api
```

- API Base: http://localhost:3000/api
- Swagger Docs: http://localhost:3000/api/docs

### 🤖 Discord Bot (Embedded in API)

Bot được tích hợp trong API server. Khi chạy `nx serve api` với `DISCORD_TOKEN` trong `.env`, Bot sẽ tự động login.

Nếu chỉ muốn chạy API không có Bot, xóa/comment `DISCORD_TOKEN` trong `.env`.

### 🚀 Run Frontend + Backend simultaneously

```bash
nx run-many -t serve -p ds-website api --parallel
```

## 4. Project Folder Structure

```text
ewlya/
├── apps/                          # Application shells (thin wrappers)
│   ├── ds-website/                # Angular 20 frontend (DaisyUI + Tailwind CSS 4)
│   │   └── src/app/
│   │       ├── app.routes.ts      # Root router → imports from libs/web/*
│   │       ├── app.ts             # Root component (Navbar + RouterOutlet)
│   │       └── app.html           # Root template
│   │
│   ├── api/                       # NestJS backend API + Bot (combined)
│   │   └── src/
│   │       ├── main.ts            # Bootstrap + Swagger + Bot auto-login
│   │       └── app/
│   │           ├── app.module.ts   # Root module → imports api/* + bot/*
│   │           ├── app.controller.ts
│   │           └── app.service.ts
│   │
│   ├── api-e2e/                   # End-to-end tests for API
│   │
│   └── discord-bot/               # (Legacy) Standalone bot — now embedded in API
│
├── libs/                          # Shared libraries (90% of the code lives here)
│   ├── shared/                    # [CROSS-CUTTING] Used by ALL apps
│   │   ├── db/                    # Prisma Client + schema.prisma
│   │   ├── models/                # TypeScript interfaces (Member, Season)
│   │   └── env/                   # Environment config helpers (Doppler)
│   │
│   ├── web/                       # [FRONTEND ONLY] Angular libraries
│   │   ├── feature-home/          # Home page component
│   │   ├── feature-hof/           # Hall of Flame leaderboard component
│   │   ├── feature-admin/         # Admin management (Members, Settings, Progression)
│   │   └── data-access/           # Services (Member, Progression HTTP calls)
│   │
│   ├── api/                       # [BACKEND ONLY] NestJS libraries
│   │   └── feature-members/       # Members CRUD, Progression lifecycle logic
│   │
│   └── bot/                       # [BOT] Discord event handlers
│       └── discord/               # DiscordBotModule + DiscordBotService
│
├── docs/                          # Project documentation
│   ├── SRS.md                     # Software Requirements Specification
│   ├── system_diagrams.md         # C4 + Sequence diagrams (Mermaid)
│   ├── deployment_guide.md        # Step-by-step cloud deployment
│   ├── supabase_guide.md          # Supabase usage guide
│   └── project_guide.md           # This file
│
├── Dockerfile.api                 # Docker build for API (optional)
├── docker-compose.yml             # Local PostgreSQL container
├── nx.json                        # Nx workspace configuration
├── package.json                   # Dependencies (packageManager: pnpm)
├── tsconfig.base.json             # Root TypeScript paths (@ds/* aliases)
└── .env                           # Local environment variables (DO NOT COMMIT)
```

## 5. Import Path Aliases

All libraries are accessible via the `@ds/` prefix. Defined in `tsconfig.base.json`:

| Alias                     | Points to                              |
| :------------------------ | :------------------------------------- |
| `@ds/db`                  | `libs/shared/db/src/index.ts`          |
| `@ds/shared/models`       | `libs/shared/models/src/index.ts`      |
| `@ds/shared/env`          | `libs/shared/env/src/index.ts`         |
| `@ds/web/feature-home`    | `libs/web/feature-home/src/index.ts`   |
| `@ds/web/feature-hof`     | `libs/web/feature-hof/src/index.ts`    |
| `@ds/web/data-access`     | `libs/web/data-access/src/index.ts`    |
| `@ds/api/feature-members` | `libs/api/feature-members/src/index.ts`|
| `@ds/bot/discord`         | `libs/bot/discord/src/index.ts`        |

## 6. Boundary Rules (ENFORCED)

```
web/  → CAN import from shared/    ✅
web/  → CANNOT import from api/    ❌
web/  → CANNOT import from bot/    ❌
api/  → CAN import from shared/    ✅
api/  → CAN import from bot/       ✅  (API hosts the bot)
api/  → CANNOT import from web/    ❌
bot/  → CAN import from shared/    ✅
bot/  → CANNOT import from web/    ❌
```

## 7. Common Nx Commands

| Command                                          | Description                                |
| :----------------------------------------------- | :----------------------------------------- |
| `nx serve ds-website`                            | Start frontend dev server (port 4200)       |
| `nx serve api`                                   | Start API + Bot server (port 3000)          |
| `nx run-many -t serve -p ds-website api --parallel` | Start FE + API+Bot simultaneously        |
| `pnpm exec nx build ds-website`                  | Production build of frontend                |
| `pnpm exec nx build api`                         | Production build of API+Bot                 |
| `nx lint ds-website`                             | Lint frontend code                          |
| `nx test ds-website`                             | Run frontend unit tests                     |
| `nx graph`                                       | Open interactive project dependency graph   |
| `nx affected -t test`                            | Only test projects affected by your changes |

## 8. Deployment Targets

| Service          | Platform              | Build Command                     | Output                    |
| :--------------- | :-------------------- | :-------------------------------- | :------------------------ |
| Frontend (Web)   | Cloudflare Pages      | `pnpm exec nx build ds-website`   | `dist/ds-website/browser` |
| API + Bot        | Render (Free)         | `pnpm exec nx build api`          | `dist/apps/api/main.js`   |
| Database         | Supabase              | N/A (Managed)                     | N/A                       |
| Uptime Monitor   | UptimeRobot           | N/A                               | Ping every 5 min          |
| Secrets          | Doppler               | N/A                               | N/A                       |
