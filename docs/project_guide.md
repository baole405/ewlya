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

### 🤖 Discord Bot

```bash
nx serve discord-bot
```

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
│   ├── api/                       # NestJS backend API server
│   │   └── src/
│   │       ├── main.ts            # Bootstrap + Swagger setup
│   │       └── app/
│   │           ├── app.module.ts   # Root module → imports libs/api/*
│   │           ├── app.controller.ts
│   │           └── app.service.ts
│   │
│   ├── api-e2e/                   # End-to-end tests for API
│   │
│   └── discord-bot/               # Discord.js bot worker
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
│   │   └── data-access/           # MemberService (HTTP calls to API)
│   │
│   ├── api/                       # [BACKEND ONLY] NestJS libraries
│   │   └── feature-members/       # Members CRUD controller + service
│   │
│   └── bot/                       # [BOT ONLY] Discord command handlers
│       └── (future)
│
├── docs/                          # Project documentation
│   ├── architecture_overview.md   # System architecture diagram
│   └── DarkStar_Clan_Profile.md   # Clan profile
│
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

## 6. Boundary Rules (ENFORCED)

```
web/  → CAN import from shared/    ✅
web/  → CANNOT import from api/    ❌
web/  → CANNOT import from bot/    ❌
api/  → CAN import from shared/    ✅
api/  → CANNOT import from web/    ❌
bot/  → CAN import from shared/    ✅
bot/  → CANNOT import from web/    ❌
```

## 7. Common Nx Commands

| Command                                          | Description                                |
| :----------------------------------------------- | :----------------------------------------- |
| `nx serve ds-website`                            | Start frontend dev server (port 4200)      |
| `nx serve api`                                   | Start backend API server (port 3000)       |
| `nx run-many -t serve -p ds-website api --parallel` | Start FE + BE simultaneously            |
| `nx build ds-website`                            | Production build of frontend               |
| `nx build api`                                   | Production build of backend                |
| `nx lint ds-website`                             | Lint frontend code                         |
| `nx test ds-website`                             | Run frontend unit tests                    |
| `nx graph`                                       | Open interactive project dependency graph  |
| `nx affected -t test`                            | Only test projects affected by your changes|

## 8. Deployment Targets

| Service          | Platform              | Build Command        | Output                    |
| :--------------- | :-------------------- | :------------------- | :------------------------ |
| Frontend (Web)   | Cloudflare Pages      | `nx build ds-website`| `dist/ds-website/browser` |
| Backend (API)    | Render / Railway      | `nx build api`       | `dist/apps/api/main.js`   |
| Discord Bot      | Render / Railway      | `nx build discord-bot`| `dist/apps/discord-bot`  |
| Database         | Supabase / Aiven      | N/A (Managed)        | N/A                       |
| Secrets          | Doppler               | N/A                  | N/A                       |
