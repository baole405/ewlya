# ewlya-bot — DarkStar Clan Discord Bot

Standalone Discord Bot cho DarkStar Clan. Bot này chạy độc lập và trực tiếp kết nối với Database.

## Tech Stack
- **Runtime**: Node.js + TypeScript
- **Discord**: discord.js 14
- **ORM**: Prisma 6 (PostgreSQL) — dùng chung DB với BE
- **Package Manager**: npm

## Prerequisites
- Node.js >= 18
- npm >= 9
- PostgreSQL database (cùng DB với ewlya-be)
- Discord Bot token từ [Discord Developer Portal](https://discord.com/developers/applications)

## Setup

```bash
# 1. Clone repo
git clone <ewlya-bot-remote-url>
cd ewlya-bot

# 2. Cài dependencies
npm install

# 3. Tạo .env từ example
cp .env.example .env
# → Điền DISCORD_TOKEN và DATABASE_URL

# 4. Generate Prisma client
npm run db:generate

# 5. Chạy bot
npm run start:dev
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run start:dev` | Chạy bot với hot reload (tsx watch) |
| `npm start` | Chạy bot (production) |
| `npm run build` | Compile TypeScript |
| `npm run db:generate` | Generate Prisma client |

## Project Structure

```
ewlya-bot/
├── src/
│   ├── main.ts          # Entry point
│   ├── events/          # Discord event handlers
│   │   ├── ready.ts
│   │   ├── messageCreate.ts
│   │   ├── messageReactionAdd.ts
│   │   └── interactionCreate.ts
│   └── database/
│       └── prisma.ts    # Prisma client singleton
├── prisma/
│   └── schema.prisma    # Database schema (copy từ ewlya-be)
├── tsconfig.json
└── .env.example
```

> ⚠️ **Lưu ý về Prisma Schema**: File `prisma/schema.prisma` phải được giữ đồng bộ với file trong `ewlya-be`. Nếu sửa schema ở BE, hãy copy lại sang Bot và chạy `npm run db:generate`.

## Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `DISCORD_TOKEN` | Bot token từ Discord Developer Portal |
| `HOF_CHANNEL_ID` | ID của channel Hall of Fame |
| `TEST_CHANNEL_ID` | ID của channel test |
