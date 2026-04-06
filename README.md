# 🌌 DarkStar Ewlya — Management Platform

[![🏗️ Ephemeral Staging](https://github.com/baole405/Ewlya/actions/workflows/ephemeral-staging.yml/badge.svg)](https://github.com/baole405/Ewlya/actions/workflows/ephemeral-staging.yml)
[![✅ CI Verify](https://github.com/baole405/Ewlya/actions/workflows/ci.yml/badge.svg)](https://github.com/baole405/Ewlya/actions/workflows/ci.yml)

**Ewlya** là nền tảng quản lý hội viên và tự động hóa vận hành dành riêng cho **DarkStar Clan**. Dự án được xây dựng trên kiến trúc Monorepo hiện đại, tập trung vào hiệu năng cao, bảo mật thắt chặt (Hardening) và trải nghiệm người dùng Premium.

---

## 🛠️ Tech Stack — Standard S-Rank

Hệ thống được phát triển với những công nghệ tiên phong:

*   **Monorepo Architecture**: [Nx](https://nx.dev) — Quản lý nhiều project trong một kho lưu trữ duy nhất.
*   **Web Framework**: [Angular 19+](https://angular.dev) — Với Signals và Hydration tối ưu.
*   **Backend engine**: [NestJS 11](https://nestjs.com) — Kiến trúc Modular chuyên nghiệp.
*   **Database & Auth**: [Supabase](https://supabase.com) — PostgreSQL + Realtime + Auth.
*   **ORM**: [Prisma](https://prisma.io) — Type-safe Database client.
*   **Styling**: [Tailwind CSS 4](https://tailwindcss.com) + [DaisyUI 5](https://daisyui.com).
*   **Secrets Management**: [Doppler](https://doppler.com).

---

## 🧊 Dự án Monorepo Structure

```text
ewlya/
├── apps/
│   ├── ds-website/       # 🌐 Angular App (Frontend chính)
│   ├── api/             # 🧠 NestJS API (Backend logic)
│   └── discord-bot/     # 🤖 Discord Bot (Tương tác cộng đồng)
├── libs/
│   ├── shared/
│   │   ├── db/          # 🗄️ Prisma Schema & PostgreSQL Client
│   │   ├── models/      # 📦 Shared Interfaces & Types
│   │   └── env/         # 🔐 Environment validation logic
│   └── web/             # 🧩 UI Components & Features
└── docs/                # 📖 Tài liệu hướng dẫn vận hành
```

---

## 🚀 Quy trình CI/CD — 4 Trụ cột

Dự án áp dụng quy trình kiểm soát chất lượng tự động:

1.  **Vàng (Verify)**: Kiểm tra Lint (ESLint) và Format (Prettier) trên từng commit.
2.  **Đỏ (Test)**: Chạy Unit Test (Vitest/Jest) tự động qua GitHub Actions.
3.  **Xanh (Ephemeral Staging)**: Tự động dựng môi trường Staging tạm thời bằng Docker Compose để chạy Smoke Test trước khi Merge.
4.  **Tím (Sync)**: Đồng bộ mã nguồn lên Production Runner (`DARKSTAR-DATA-PC`) ngay sau khi vào `main`.

---

## 🏃 Getting Started

### ⚡ Quick Start
```bash
# 1. Install dependencies
pnpm install

# 2. Setup environment (Yêu cầu Doppler CLI)
doppler setup

# 3. Run Development
pnpm nx run-many -t serve --parallel=3
```

### 📖 Tài liệu bổ trợ
- [**Hướng dẫn DevOps**](docs/DEVOPS.md) — Cách vận hành Doppler, GitHub Actions và Docker.
- [**Quy chuẩn đóng góp**](docs/CONTRIBUTING.md) — Commit convention và coding standards.
- [**AI Agent Rules**](AGENTS.md) — Hướng dẫn cho các AI trợ lý (Google Deepmind / Antigravity).

---
*Developed with 🩸 by DarkStar Clan Engineering Team.*
