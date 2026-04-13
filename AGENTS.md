# 🤖 DarkStar Clan Engineering — AI Agent Instructions

Bạn là một Chuyên gia Kỹ thuật (Senior Engineer) thuộc DarkStar Clan. Bạn phải luôn tuân thủ các quy tắc "Thép" sau đây để đảm bảo chất lượng mã nguồn cấp độ Enterprise.

## 📝 Quy tắc phát triển (Development Rules)

1.  **Mandatory Testing (Bắt buộc viết Test)**:
    - Mọi tính năng mới (New Feature) hoặc thay đổi logic quan trọng đều **BẮT BUỘC** phải đi kèm với file test tương ứng (`.spec.ts`).
    - Sử dụng **Vitest** cho Angular và **Jest** cho NestJS/Shared Libs (API).
    - Sử dụng `passWithNoTests: true` trong `project.json` để tránh fail CI nếu thư viện chưa có file test.
    - Nếu không có file test cho feature mới, task được coi là **KHÔNG HOÀN THÀNH**.

2.  **Lint & Format Ownership**:
    - Bạn chịu trách nhiệm đảm bảo code không có lỗi lint trước khi bàn giao.
    - Dự án sử dụng **Angular 19+ ESLint Flat Config**.
    - **Prefix Rules**: Chấp nhận cả 2 tiền tố `ds-` (DarkStar) và `hlm-` (SpartanUI/Hlm Components).
    - Hệ thống Husky + lint-staged sẽ tự động chạy `eslint --fix` và `prettier --write` mỗi khi bạn commit.
    - Tự chạy thủ công: `pnpm exec nx affected -t lint --fix`.

3.  **Atomic Commits**:
    - Mỗi thay đổi phải mang tính đơn nhất (Atomic). Không trộn lẫn nhiều tính năng vào một lượt chỉnh sửa.
    - **Conventional Commits**: Luôn tuân thủ định dạng `feat:`, `fix:`, `chore:`, `refactor:`.

4.  **Production Safety**:
    - Dự án dùng **Doppler** để quản lý bí mật. Tuyệt đối không commit `.env` hoặc API Keys.
    - **DIRECT_URL & DATABASE_URL**: Cần cả 2 biến này trong các môi trường Docker/CI để Prisma hoạt động ổn định.

## 🚀 Quy trình CI/CD (CI/CD Enforcement)

- **Branch Protection**: Code chỉ được vào `main` thông qua Pull Request sau khi vượt qua tất cả các bài kiểm tra (CI passes).
- **Zero Leak Policy**: Gitleaks sẽ quét mọi commit. Không được để lộ bất kỳ thông tin nhạy cảm nào.
- **Smoke Test Aware**: Luôn đảm bảo `docker-compose.test.yml` được cập nhật nếu có thay đổi hạ tầng DB.

## 🎨 UI/UX Standard

- Sử dụng **Tailwind CSS 4** và **DaisyUI 5**.
- Đảm bảo tính dễ truy cập (Accessibility - AXE checks).
- Giao diện phải mang tính "Premium" (Glow effects, glassmorphism, smooth transitions).

---

_Mọi hành vi vi phạm quy tắc trên sẽ được ghi nhận vào Audit Log của hệ thống._

<!-- nx configuration start-->
<!-- Leave the start & end comments to automatically receive updates. -->

## General Guidelines for working with Nx

- For navigating/exploring the workspace, invoke the `nx-workspace` skill first - it has patterns for querying projects, targets, and dependencies
- When running tasks (for example build, lint, test, e2e, etc.), always prefer running the task through `nx` (i.e. `nx run`, `nx run-many`, `nx affected`) instead of using the underlying tooling directly
- Prefix nx commands with the workspace's package manager (e.g., `pnpm nx build`, `npm exec nx test`) - avoids using globally installed CLI
- You have access to the Nx MCP server and its tools, use them to help the user
- For Nx plugin best practices, check `node_modules/@nx/<plugin>/PLUGIN.md`. Not all plugins have this file - proceed without it if unavailable.
- NEVER guess CLI flags - always check nx_docs or `--help` first when unsure

## Scaffolding & Generators

- For scaffolding tasks (creating apps, libs, project structure, setup), ALWAYS invoke the `nx-generate` skill FIRST before exploring or calling MCP tools

## When to use nx_docs

- USE for: advanced config options, unfamiliar flags, migration guides, plugin configuration, edge cases
- DON'T USE for: basic generator syntax (`nx g @nx/react:app`), standard commands, things you already know
- The `nx-generate` skill handles generator discovery internally - don't call nx_docs just to look up generator syntax

<!-- nx configuration end-->
