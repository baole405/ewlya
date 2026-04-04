# 📋 Software Requirements Specification (SRS)

## DarkStar Clan Platform

---

| Field            | Value                                      |
| :--------------- | :----------------------------------------- |
| **Document ID**  | SRS-DARKSTAR-001                           |
| **Version**      | 1.0.0                                      |
| **Status**       | 🟢 Active                                 |
| **Author**       | DarkStar Engineering Team                  |
| **Created**      | 2026-04-05                                 |
| **Last Updated** | 2026-04-05                                 |
| **Methodology**  | IEEE 830 + EARS Syntax + MoSCoW Priority   |

---

## 1. Introduction

### 1.1 Purpose

Tài liệu này định nghĩa **TOÀN BỘ** yêu cầu chức năng và phi chức năng của hệ thống DarkStar Clan Platform. Đối tượng đọc bao gồm:

- **Product Owner / Clan Admin**: Hiểu scope và priority của từng tính năng.
- **Developers**: Biết chính xác input/output/behavior của mỗi chức năng.
- **QA/Testers**: Viết test case dựa trên acceptance criteria.

> 📝 **Living Document**: Tài liệu này được version-controlled trên Git và cập nhật liên tục mỗi Sprint. Mỗi thay đổi phải được ghi vào Section 8 (Change Log).

### 1.2 Product Vision

> *"Xây dựng một nền tảng quản lý clan gaming end-to-end, nơi thành viên có thể theo dõi thành tích, cạnh tranh qua các mùa giải, và kết nối cộng đồng — tất cả thông qua Website, API và Discord Bot hoạt động liền mạch 24/7."*

### 1.3 Scope

#### In-Scope (Phase 1)

| Module               | Mô tả                                          |
| :------------------- | :---------------------------------------------- |
| Website (Frontend)   | Trang chủ, Bảng xếp hạng Hall of Flame         |
| API Server (Backend) | RESTful API CRUD Members, Submissions, Seasons  |
| Discord Bot          | Các lệnh slash: register, points, leaderboard   |
| Database             | PostgreSQL Cloud (Supabase) qua Prisma ORM      |

#### Out-of-Scope (Phase 1)

- ❌ OAuth login / Discord SSO trên Website
- ❌ Admin Dashboard (web-based)
- ❌ Multi-clan / multi-game support
- ❌ Real-time WebSocket notifications
- ❌ Payment / donation integration

### 1.4 Glossary

| Thuật ngữ      | Định nghĩa                                                |
| :------------- | :--------------------------------------------------------- |
| **Member**     | Thành viên clan DarkStar, được liên kết qua Discord ID    |
| **Season**     | Mùa giải có thời gian bắt đầu/kết thúc, thành viên thi đua điểm |
| **Submission** | Bài nộp điểm: ghi nhận thành tích của member cho 1 mission |
| **HoF**        | Hall of Flame — Bảng vinh danh xếp hạng theo điểm         |
| **IGN**        | In-Game Name — Tên nhân vật trong game                     |
| **GS Code**    | GunShip Code — Mã định danh người chơi trong game          |
| **Points**     | Điểm tích lũy, được cộng dồn qua các submission           |
| **Moderator**  | Người có quyền duyệt submission và ghi điểm               |

### 1.5 References

| Tài liệu                  | Link                               |
| :------------------------- | :--------------------------------- |
| Architecture Overview      | `docs/architecture_overview.md`    |
| Project Guide              | `docs/project_guide.md`           |
| Deployment Guide           | `docs/deployment_guide.md`        |
| Supabase Guide             | `docs/supabase_guide.md`          |
| Nx Documentation           | https://nx.dev                     |
| Angular Documentation      | https://angular.dev                |
| NestJS Documentation       | https://docs.nestjs.com            |
| Prisma Documentation       | https://www.prisma.io/docs         |

---

## 2. System Overview

### 2.1 Architecture Diagram

```
                    ┌──────────────────────────────┐
                    │         End Users             │
                    │   (Members & Visitors)        │
                    └──────┬──────────────┬─────────┘
                           │              │
                  ┌────────▼─────┐  ┌─────▼──────────┐
                  │  ds-website  │  │  Discord App   │
                  │  (Angular)   │  │  (discord.js)  │
                  │  Cloudflare  │  │  Render        │
                  └────────┬─────┘  └─────┬──────────┘
                           │              │
                    ┌──────▼──────────────▼──────┐
                    │        API Server          │
                    │        (NestJS)            │
                    │     Render / Railway       │
                    │   Swagger: /api/docs       │
                    └────────────┬───────────────┘
                                 │
                    ┌────────────▼───────────────┐
                    │      PostgreSQL             │
                    │    Supabase Cloud           │
                    │    Singapore Region         │
                    └────────────────────────────┘
```

### 2.2 User Roles & Permissions

| Role            | Website Access          | API Access              | Bot Access              |
| :-------------- | :---------------------- | :---------------------- | :---------------------- |
| **Visitor**     | Xem trang chủ, HoF     | `GET` endpoints only    | N/A                     |
| **Member**      | Xem profile cá nhân    | `GET` endpoints only    | `/points`, `/leaderboard` |
| **Moderator**   | Xem tất cả             | `GET` + `POST` submit  | `/submit`, `/verify`    |
| **Admin**       | Full access             | Full CRUD               | All commands + `/season` |

### 2.3 Tech Stack

| Layer           | Technology                     | Version   |
| :-------------- | :----------------------------- | :-------- |
| Frontend        | Angular + DaisyUI + Tailwind   | 20 / 5 / 4 |
| Backend         | NestJS + Express               | 11        |
| ORM             | Prisma                          | 6         |
| Database        | PostgreSQL (Supabase)          | 16        |
| Bot Framework   | Discord.js                      | 14        |
| Monorepo        | Nx                              | 22        |
| Package Manager | pnpm                            | 9         |
| CI/CD           | GitHub Actions                  | —         |
| Hosting (FE)    | Cloudflare Pages                | —         |
| Hosting (BE)    | Render / Railway                | —         |
| Secrets         | Doppler (planned)               | —         |

### 2.4 Constraints

| ID    | Constraint                                                        |
| :---- | :---------------------------------------------------------------- |
| C-001 | Supabase Free tier: 500MB storage, pause after 7 days inactivity  |
| C-002 | Render Free tier: service sleeps after 15 min idle                |
| C-003 | Discord API rate limit: 50 req/sec per bot                        |
| C-004 | Website must comply with WCAG 2.1 Level AA                       |
| C-005 | All secrets MUST NOT be committed to Git                          |

### 2.5 Assumptions

| ID    | Assumption                                                       |
| :---- | :--------------------------------------------------------------- |
| A-001 | All clan members have an active Discord account                  |
| A-002 | Active member count stays below 500                              |
| A-003 | Data is primarily text-based (no large file uploads)             |
| A-004 | Internet connectivity is stable for all users                    |

---

## 3. Functional Requirements — Website

> **Format**: EARS Syntax — *"When [trigger], the system shall [response]."*
> **Priority**: MoSCoW — **M**ust / **S**hould / **C**ould / **W**on't (this phase)

### FR-001: Home Page

| Field            | Value                                                    |
| :--------------- | :------------------------------------------------------- |
| **ID**           | FR-001                                                   |
| **Priority**     | 🔴 Must Have                                            |
| **Status**       | ✅ Done                                                  |
| **Module**       | `libs/web/feature-home`                                  |

**Description:**
When a visitor opens the website root URL, the system shall display:
1. A hero banner with clan name "DarkStar" and tagline.
2. Two CTA buttons: "Join Discord" and "View Hall of Flame".
3. A leaderboard preview card showing the top 3 members by points.

**Acceptance Criteria:**
```gherkin
Given I am a visitor
When I navigate to "/"
Then I see a hero section with "DarkStar Clan" heading
And I see the top 3 members with nickname, IGN, avatar, and points
And each member card displays a rank badge
And the "View Hall of Flame" button navigates to "/hall-of-flame"
```

---

### FR-002: Hall of Flame (Leaderboard)

| Field            | Value                                                    |
| :--------------- | :------------------------------------------------------- |
| **ID**           | FR-002                                                   |
| **Priority**     | 🔴 Must Have                                            |
| **Status**       | ✅ Done                                                  |
| **Module**       | `libs/web/feature-hof`                                   |

**Description:**
When a visitor navigates to "/hall-of-flame", the system shall display:
1. Season stats cards (Current Season, Total Members, Global Points).
2. A searchable table of ALL members ranked by points (descending).
3. Top 3 members shall have colored rank badges (gold, silver, bronze).

**Acceptance Criteria:**
```gherkin
Given I am on the "/hall-of-flame" page
When the page loads
Then I see 3 stat cards showing season info
And I see a table with columns: Rank, Member, GS Code, Points
And the top 3 rows have colored badges

Given I am on the "/hall-of-flame" page
When I type "Grimex" in the search input
Then the table filters to show only members matching "Grimex"
And filtering happens in real-time (no page reload)
```

---

### FR-003: Member Profile Page

| Field            | Value                                                    |
| :--------------- | :------------------------------------------------------- |
| **ID**           | FR-003                                                   |
| **Priority**     | 🟡 Should Have                                          |
| **Status**       | ⬜ Not Started                                          |
| **Module**       | `libs/web/feature-member-profile` (planned)              |

**Description:**
When a visitor navigates to "/members/:id", the system shall display:
1. Member profile card (avatar, nickname, IGN, GS Code, total points).
2. Submission history table (mission, points earned, date, verified by).
3. Points trend chart across seasons.

**Acceptance Criteria:**
```gherkin
Given I am on "/members/abc123"
When the page loads
Then I see the member's profile with avatar, nickname, and total points
And I see a table of their submission history
And I see a line chart showing points earned per season
```

---

### FR-004: Responsive Design

| Field            | Value                                                    |
| :--------------- | :------------------------------------------------------- |
| **ID**           | FR-004                                                   |
| **Priority**     | 🔴 Must Have                                            |
| **Status**       | ✅ Done                                                  |

**Description:**
The website shall render correctly on:
- Mobile (320px - 767px)
- Tablet (768px - 1023px)
- Desktop (1024px+)

---

## 4. Functional Requirements — API

> **Base URL**: `https://<host>/api`
> **Auth**: Bearer Token (JWT) for write operations
> **Docs**: Swagger UI at `/api/docs`

### FR-010: GET /api/members

| Field            | Value                                                    |
| :--------------- | :------------------------------------------------------- |
| **ID**           | FR-010                                                   |
| **Priority**     | 🔴 Must Have                                            |
| **Status**       | 🟡 Mock Data                                           |
| **Module**       | `libs/api/feature-members`                               |

**Request:** `GET /api/members?search=&sort=points&order=desc`

**Response (200):**
```json
[
  {
    "id": "clx123...",
    "discordId": "123456789",
    "nickname": "Grimex",
    "ign": "Grimex GS",
    "gsCode": "GS-1234",
    "points": 2500,
    "avatarUrl": "https://...",
    "rank": 1
  }
]
```

**Error Responses:**
| Status | Description              |
| :----- | :----------------------- |
| 500    | Internal Server Error    |

---

### FR-011: GET /api/members/:id

| Field            | Value                                                    |
| :--------------- | :------------------------------------------------------- |
| **ID**           | FR-011                                                   |
| **Priority**     | 🟡 Should Have                                          |
| **Status**       | ⬜ Not Started                                          |

**Response (200):**
```json
{
  "id": "clx123...",
  "nickname": "Grimex",
  "points": 2500,
  "submissions": [
    {
      "id": "sub1",
      "mission": "Weekly Boss Kill",
      "points": 100,
      "rank": 1,
      "verifiedBy": "Admin",
      "createdAt": "2026-04-01T12:00:00Z"
    }
  ]
}
```

**Error Responses:**
| Status | Description              |
| :----- | :----------------------- |
| 404    | Member not found         |

---

### FR-012: POST /api/members

| Field            | Value                                                    |
| :--------------- | :------------------------------------------------------- |
| **ID**           | FR-012                                                   |
| **Priority**     | 🔴 Must Have                                            |
| **Status**       | ⬜ Not Started                                          |
| **Auth**         | 🔒 Bearer Token (Admin / Bot)                          |

**Request Body:**
```json
{
  "discordId": "123456789",       // required, unique
  "nickname": "Grimex",           // required
  "ign": "Grimex GS",            // required
  "gsCode": "GS-1234"            // optional
}
```

**Validation Rules:**
| Field       | Rule                              |
| :---------- | :-------------------------------- |
| `discordId` | Required, string, unique          |
| `nickname`  | Required, string, 2-32 chars      |
| `ign`       | Required, string, 2-32 chars      |
| `gsCode`    | Optional, string, format: GS-XXXX |

**Response:** `201 Created` — New Member object

**Error Responses:**
| Status | Description                        |
| :----- | :--------------------------------- |
| 400    | Validation failed                  |
| 401    | Unauthorized (missing/invalid token)|
| 409    | Discord ID already registered      |

---

### FR-013: PATCH /api/members/:id

| Field            | Value                                                    |
| :--------------- | :------------------------------------------------------- |
| **ID**           | FR-013                                                   |
| **Priority**     | 🟡 Should Have                                          |
| **Status**       | ⬜ Not Started                                          |
| **Auth**         | 🔒 Bearer Token (Admin / Bot)                          |

**Request Body (partial update):**
```json
{
  "nickname": "NewName",    // optional
  "ign": "NewIGN",          // optional
  "gsCode": "GS-9999"       // optional
}
```

---

### FR-014: DELETE /api/members/:id

| Field            | Value                                                    |
| :--------------- | :------------------------------------------------------- |
| **ID**           | FR-014                                                   |
| **Priority**     | 🟢 Could Have                                           |
| **Status**       | ⬜ Not Started                                          |
| **Auth**         | 🔒 Bearer Token (Admin only)                           |

**Response:** `204 No Content`

---

### FR-020: POST /api/submissions

| Field            | Value                                                    |
| :--------------- | :------------------------------------------------------- |
| **ID**           | FR-020                                                   |
| **Priority**     | 🔴 Must Have                                            |
| **Status**       | ⬜ Not Started                                          |
| **Auth**         | 🔒 Bearer Token (Moderator / Admin / Bot)              |

**Description:**
When a moderator submits a score, the system shall:
1. Create a new Submission record.
2. Add the submission's points to the member's total points.
3. Return the updated member with new total.

**Request Body:**
```json
{
  "memberId": "clx123...",         // required
  "mission": "Weekly Boss Kill",   // required
  "rank": 1,                       // required, integer >= 1
  "points": 100,                   // required, integer > 0
  "seasonId": "season1..."         // required
}
```

**Acceptance Criteria:**
```gherkin
Given a member has 2400 points
When a moderator submits 100 points for that member
Then the Submission is created with points=100
And the member's total points becomes 2500
And the response includes the updated member
```

---

### FR-030: CRUD /api/seasons

| Field            | Value                                                    |
| :--------------- | :------------------------------------------------------- |
| **ID**           | FR-030                                                   |
| **Priority**     | 🟡 Should Have                                          |
| **Status**       | ⬜ Not Started                                          |
| **Auth**         | 🔒 Bearer Token (Admin only)                           |

**Endpoints:**
| Method   | Endpoint             | Description            |
| :------- | :------------------- | :--------------------- |
| `GET`    | `/api/seasons`       | List all seasons       |
| `GET`    | `/api/seasons/:id`   | Get season details     |
| `POST`   | `/api/seasons`       | Create new season      |
| `PATCH`  | `/api/seasons/:id`   | Update season          |

---

## 5. Functional Requirements — Discord Bot

### FR-050: /register

| Field            | Value                                                    |
| :--------------- | :------------------------------------------------------- |
| **ID**           | FR-050                                                   |
| **Priority**     | 🔴 Must Have                                            |
| **Status**       | ⬜ Not Started                                          |

**Description:**
When a Discord user types `/register <IGN> <GS Code>`, the bot shall:
1. Call `POST /api/members` with the user's Discord ID, IGN, and GS Code.
2. Reply with an embed message confirming registration.
3. If already registered, reply with error message.

**Acceptance Criteria:**
```gherkin
Given I am not registered
When I type "/register MyIGN GS-1234"
Then the bot creates my account via API
And replies with "✅ Welcome to DarkStar, MyIGN!"

Given I am already registered
When I type "/register MyIGN GS-1234"
Then the bot replies with "⚠️ You are already registered."
```

---

### FR-051: /points

| Field            | Value                                                    |
| :--------------- | :------------------------------------------------------- |
| **ID**           | FR-051                                                   |
| **Priority**     | 🔴 Must Have                                            |
| **Status**       | ⬜ Not Started                                          |

**Description:**
When a member types `/points`, the bot shall display their current points, rank, and season info in an embed.

---

### FR-052: /leaderboard

| Field            | Value                                                    |
| :--------------- | :------------------------------------------------------- |
| **ID**           | FR-052                                                   |
| **Priority**     | 🟡 Should Have                                          |
| **Status**       | ⬜ Not Started                                          |

**Description:**
When any user types `/leaderboard`, the bot shall display the top 10 members in an embed with rank, nickname, and points.

---

### FR-053: /submit (Mod Only)

| Field            | Value                                                    |
| :--------------- | :------------------------------------------------------- |
| **ID**           | FR-053                                                   |
| **Priority**     | 🔴 Must Have                                            |
| **Status**       | ⬜ Not Started                                          |

**Description:**
When a moderator types `/submit @user <mission> <rank> <points>`, the bot shall:
1. Call `POST /api/submissions`.
2. Reply with confirmation embed.
3. Log the submission to the `CONTRIBUTE_LOGS` channel.

---

## 6. Non-Functional Requirements

### NFR-001: Performance

| Metric                    | Target                              |
| :------------------------ | :---------------------------------- |
| Website FCP               | < 1.5 seconds                       |
| Lighthouse Performance    | ≥ 90                                |
| API response time (p95)   | < 500ms                             |
| Database query time (p95) | < 200ms                             |

### NFR-002: Security

| Requirement                                                      | Priority    |
| :--------------------------------------------------------------- | :---------- |
| API write endpoints require Bearer Token authentication          | 🔴 Must    |
| Secrets (tokens, DB credentials) managed via env vars / Doppler  | 🔴 Must    |
| `.env` file MUST be in `.gitignore`                              | 🔴 Must    |
| Input validation on all API endpoints via `class-validator` DTOs | 🔴 Must    |
| Rate limiting on API endpoints                                   | 🟡 Should  |
| CORS configured to allow only trusted origins                    | 🟡 Should  |

### NFR-003: Availability

| Requirement                          | Target         |
| :----------------------------------- | :------------- |
| Website uptime (Cloudflare CDN)      | 99.9%          |
| API uptime                           | 99%            |
| Bot uptime                           | 99% (24/7)     |
| Database availability (Supabase)     | 99.9%          |

### NFR-004: Accessibility (WCAG 2.1 AA)

| Requirement                                               |
| :-------------------------------------------------------- |
| All images have meaningful `alt` text                     |
| All interactive elements are keyboard navigable           |
| Color contrast ratio ≥ 4.5:1 for normal text              |
| Focus indicators visible on all focusable elements        |
| No Axe accessibility violations                           |

### NFR-005: Maintainability

| Requirement                                               |
| :-------------------------------------------------------- |
| Code organized in Nx libs with clear boundary rules       |
| Swagger documentation on every API endpoint               |
| All shared types in `libs/shared/models`                  |
| Consistent naming conventions (kebab-case files, PascalCase classes) |

---

## 7. Database Schema

### 7.1 Entity Relationship Diagram

```
┌──────────────────┐       ┌──────────────────┐
│     Member       │       │     Season       │
├──────────────────┤       ├──────────────────┤
│ id         (PK)  │       │ id         (PK)  │
│ discordId  (UQ)  │       │ name       (UQ)  │
│ nickname         │       │ startDate        │
│ ign              │       │ endDate?         │
│ points    [0]    │       │ isActive  [false]│
│ gsCode?          │       └────────┬─────────┘
│ avatarUrl?       │                │
│ createdAt        │                │
│ updatedAt        │                │
└────────┬─────────┘                │
         │ 1:N                      │ 1:N
         │                          │
         │    ┌──────────────────┐  │
         └────┤   Submission     ├──┘
              ├──────────────────┤
              │ id         (PK) │
              │ memberId   (FK) │
              │ seasonId   (FK) │
              │ mission          │
              │ rank             │
              │ points           │
              │ verifiedBy       │
              │ createdAt        │
              └──────────────────┘
```

### 7.2 Schema Location
```
libs/shared/db/prisma/schema.prisma
```

---

## 8. Future Feature Backlog

> 💡 **Khi thêm feature mới:**
> 1. Tạo một FR-xxx mới theo format ở Section 3-5.
> 2. Đánh MoSCoW priority.
> 3. Append vào bảng dưới đây.
> 4. Cập nhật Version + Change Log.

| ID      | Feature                            | Priority       | Estimate   | Dependencies |
| :------ | :--------------------------------- | :------------- | :--------- | :----------- |
| FR-060  | Achievement / Badge system         | 🟢 Could Have | 2 sprints  | FR-020       |
| FR-061  | Clan War event tracking            | 🟡 Should     | 3 sprints  | FR-030       |
| FR-062  | Admin Dashboard (web portal)       | 🟡 Should     | 2 sprints  | FR-010~014   |
| FR-063  | Real-time notifications (WebSocket)| 🟢 Could Have | 2 sprints  | FR-020       |
| FR-064  | Multi-clan support                 | Won't (v1)     | 4 sprints  | —            |
| FR-065  | Discord OAuth login on website     | 🟡 Should     | 1 sprint   | —            |
| FR-066  | Points history chart (Chart.js)    | 🟡 Should     | 1 sprint   | FR-003       |

---

## 9. Traceability Matrix

> Liên kết giữa Requirements → Code Module → Test

| Requirement | Code Module                  | API Endpoint        | Test Status |
| :---------- | :--------------------------- | :------------------ | :---------- |
| FR-001      | `libs/web/feature-home`      | N/A (client-side)   | ⬜          |
| FR-002      | `libs/web/feature-hof`       | N/A (client-side)   | ⬜          |
| FR-010      | `libs/api/feature-members`   | `GET /api/members`  | ⬜          |
| FR-012      | `libs/api/feature-members`   | `POST /api/members` | ⬜          |
| FR-020      | `libs/api/feature-submissions`| `POST /api/submissions` | ⬜      |
| FR-050      | `apps/discord-bot`           | calls FR-012        | ⬜          |

---

## 10. Change Log

| Version | Date       | Author    | Changes                                          |
| :------ | :--------- | :-------- | :----------------------------------------------- |
| 1.0.0   | 2026-04-05 | DarkStar  | Initial SRS — Phase 1 requirements defined       |

---

*Tài liệu tuân thủ IEEE 830-1998, sử dụng EARS syntax cho requirements và MoSCoW cho prioritization.*
*Maintained as a living document in version control.*
