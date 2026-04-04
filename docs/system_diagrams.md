# 🏗️ System Diagrams — DarkStar Platform

> Tài liệu này chứa các sơ đồ kỹ thuật mô tả cách hệ thống DarkStar vận hành.
> Sử dụng **C4 Model** (Context → Container → Component) và **Sequence Diagrams**.

---

## 1. System Context Diagram (C4 Level 1)

> *"Ai sử dụng hệ thống và hệ thống kết nối với gì?"*

```mermaid
graph TB
    subgraph Users
        V["👤 Visitor<br/>(Xem web)"]
        M["👤 Member<br/>(Thành viên clan)"]
        A["👑 Admin<br/>(Chủ clan)"]
    end

    subgraph DarkStar Platform
        WEB["🌐 Website<br/>(Angular)"]
        API["⚙️ API Server<br/>(NestJS)"]
        BOT["🤖 Discord Bot<br/>(discord.js)"]
    end

    subgraph External Services
        DB[("🐘 PostgreSQL<br/>(Supabase)")]
        DC["💬 Discord API"]
        CF["☁️ Cloudflare CDN"]
    end

    V -->|Truy cập web| WEB
    M -->|Xem điểm, HoF| WEB
    M -->|Gõ slash command| DC
    A -->|Quản lý| WEB
    A -->|Quản lý| DC

    WEB -->|HTTP requests| API
    BOT -->|HTTP requests| API
    BOT <-->|WebSocket| DC
    API -->|Prisma ORM| DB
    WEB -->|Hosted on| CF
```

---

## 2. Container Diagram (C4 Level 2)

> *"Hệ thống gồm những 'hộp' nào, mỗi hộp chạy ở đâu?"*

```mermaid
graph TB
    subgraph Cloudflare Pages
        WEB["🌐 ds-website<br/>──────────<br/>Angular 20<br/>DaisyUI + Tailwind<br/>──────────<br/>Static SPA<br/>Port: N/A (CDN)"]
    end

    subgraph Render - Web Service
        API["⚙️ api<br/>──────────<br/>NestJS 11<br/>Swagger UI<br/>──────────<br/>Port: 3000<br/>Node.js Runtime"]
    end

    subgraph Render - Background Worker
        BOT["🤖 discord-bot<br/>──────────<br/>Discord.js 14<br/>Slash Commands<br/>──────────<br/>Always-on Worker"]
    end

    subgraph Supabase - Singapore
        DB[("🐘 PostgreSQL 16<br/>──────────<br/>3 Tables:<br/>Member, Submission, Season<br/>──────────<br/>Connection Pooling<br/>(pgbouncer)")]
    end

    subgraph Doppler ["Doppler (Planned)"]
        SEC["🔐 Secrets Manager<br/>──────────<br/>DATABASE_URL<br/>DISCORD_TOKEN<br/>API_KEYS"]
    end

    WEB -->|"GET /api/members<br/>GET /api/seasons"| API
    BOT -->|"POST /api/members<br/>POST /api/submissions"| API
    API -->|"Prisma Client<br/>(Transaction Pool :6543)"| DB
    API -.->|"Migration<br/>(Direct :5432)"| DB
    SEC -.->|"Sync env vars"| API
    SEC -.->|"Sync env vars"| BOT
```

---

## 3. Component Diagram (C4 Level 3) — API Server

> *"Bên trong cái hộp API có gì?"*

```mermaid
graph TB
    subgraph API Server - NestJS
        MAIN["main.ts<br/>(Bootstrap + Swagger)"]

        subgraph AppModule
            AC["AppController<br/>/api → Hello API"]
            AS["AppService"]
        end

        subgraph FeatureMembersModule ["libs/api/feature-members"]
            MC["MembersController<br/>/api/members"]
            MS["MembersService<br/>(Business Logic)"]
        end

        subgraph Future ["Planned Modules"]
            SC["SubmissionsController<br/>/api/submissions"]
            SEC2["SeasonsController<br/>/api/seasons"]
            AUTH["AuthGuard<br/>(JWT Validation)"]
        end
    end

    subgraph Shared Libraries
        PRISMA["libs/shared/db<br/>(Prisma Client)"]
        MODELS["libs/shared/models<br/>(TypeScript Interfaces)"]
    end

    MAIN --> AppModule
    MAIN --> FeatureMembersModule
    MC --> MS
    MS --> PRISMA
    MS --> MODELS
    MC -.-> AUTH
```

---

## 4. Component Diagram (C4 Level 3) — Website

> *"Bên trong cái hộp Website có gì?"*

```mermaid
graph TB
    subgraph Angular App - ds-website
        APP["app.ts<br/>(Root Component + Navbar)"]
        ROUTER["app.routes.ts<br/>(Router Config)"]
    end

    subgraph Feature Libraries
        HOME["libs/web/feature-home<br/>──────────<br/>HomeComponent<br/>Hero + Top 3 Preview"]

        HOF["libs/web/feature-hof<br/>──────────<br/>LeaderboardComponent<br/>Full Ranking + Search"]

        PROFILE["libs/web/feature-member-profile<br/>──────────<br/>(Planned)<br/>Member Detail Page"]
    end

    subgraph Data Access
        DA["libs/web/data-access<br/>──────────<br/>MemberService<br/>HTTP calls to API"]
    end

    subgraph Shared
        MODELS["libs/shared/models<br/>──────────<br/>Member, Season<br/>Interfaces"]
    end

    APP --> ROUTER
    ROUTER -->|"/"| HOME
    ROUTER -->|"/hall-of-flame"| HOF
    ROUTER -->|"/members/:id"| PROFILE

    HOME --> DA
    HOF --> DA
    DA --> MODELS
    DA -->|"HTTP GET"| API_EXT["⚙️ API Server"]
```

---

## 5. Sequence Diagram — User Xem Bảng Xếp Hạng

> *"Khi user mở trang Hall of Flame, chuyện gì xảy ra từng bước?"*

```mermaid
sequenceDiagram
    actor User as 👤 Visitor
    participant CF as ☁️ Cloudflare
    participant WEB as 🌐 Angular App
    participant API as ⚙️ NestJS API
    participant DB as 🐘 Supabase DB

    User->>CF: GET /hall-of-flame
    CF->>WEB: Serve static HTML/JS
    WEB->>WEB: Render LeaderboardComponent
    WEB->>API: GET /api/members?sort=points&order=desc
    API->>DB: SELECT * FROM "Member" ORDER BY points DESC
    DB-->>API: [Member rows]
    API-->>WEB: 200 OK [{id, nickname, points, ...}]
    WEB->>WEB: Display table with rank badges
    WEB-->>User: Rendered Hall of Flame page
```

---

## 6. Sequence Diagram — Mod Submit Điểm Qua Bot

> *"Khi Moderator gõ /submit trên Discord, flow đi như thế nào?"*

```mermaid
sequenceDiagram
    actor Mod as 👑 Moderator
    participant DC as 💬 Discord
    participant BOT as 🤖 Discord Bot
    participant API as ⚙️ NestJS API
    participant DB as 🐘 Supabase DB

    Mod->>DC: /submit @Grimex "Boss Kill" rank:1 points:100
    DC->>BOT: Interaction event (slash command)
    BOT->>BOT: Parse command arguments
    BOT->>API: POST /api/submissions {memberId, mission, rank, points, seasonId}

    API->>DB: INSERT INTO "Submission" (...)
    API->>DB: UPDATE "Member" SET points = points + 100 WHERE id = memberId
    DB-->>API: OK

    API-->>BOT: 201 Created {submission, updatedMember}

    BOT->>DC: Reply embed "✅ 100 points added to Grimex (Total: 2500)"
    BOT->>DC: Log to #contribute-logs channel
    DC-->>Mod: See confirmation embed
```

---

## 7. Deployment Diagram

> *"Cái gì được deploy ở đâu? Dùng domain / port nào?"*

```mermaid
graph LR
    subgraph Internet
        USER["🌍 Users"]
    end

    subgraph Cloudflare ["☁️ Cloudflare Pages"]
        FE["🌐 ds-website<br/>darkstar.pages.dev<br/>──────────<br/>CDN Edge Nodes<br/>Static Files (HTML/JS/CSS)"]
    end

    subgraph Render ["🟣 Render - Singapore"]
        BE["⚙️ darkstar-api<br/>darkstar-api.onrender.com<br/>──────────<br/>Web Service (Node.js)<br/>Port 3000"]

        BOTDEP["🤖 darkstar-bot<br/>──────────<br/>Background Worker<br/>Always-on Process"]
    end

    subgraph Supabase ["🟢 Supabase - Singapore"]
        DBDEP[("🐘 darkstar-db<br/>PostgreSQL 16<br/>──────────<br/>Pooler: :6543<br/>Direct: :5432")]
    end

    subgraph GitHub ["🐙 GitHub"]
        REPO["baole405/Ewlya<br/>──────────<br/>git push → auto deploy"]
    end

    USER -->|HTTPS| FE
    USER -->|Discord| BOTDEP
    FE -->|API calls| BE
    BOTDEP -->|API calls| BE
    BE -->|Prisma| DBDEP
    REPO -->|"CI/CD"| FE
    REPO -->|"CI/CD"| BE
    REPO -->|"CI/CD"| BOTDEP
```

---

## 8. Data Flow Diagram (DFD Level 0)

> *"Dữ liệu chảy từ đâu đến đâu?"*

```mermaid
graph LR
    MOD["👑 Moderator"] -->|"/submit points"| BOT["🤖 Bot"]
    BOT -->|"POST submission"| API["⚙️ API"]
    API -->|"Write"| DB[("🐘 Database")]
    DB -->|"Read"| API
    API -->|"GET members"| WEB["🌐 Website"]
    WEB -->|"Display leaderboard"| USER["👤 Visitor"]

    ADMIN["👑 Admin"] -->|"CRUD seasons"| API
    MEMBER["👤 Member"] -->|"/register, /points"| BOT
```

---

*Tất cả sơ đồ sử dụng Mermaid.js — render trực tiếp trên GitHub, Notion, và VS Code.*
*Cập nhật lần cuối: 2026-04-05*
