# 🤖 DarkStar Clan Engineering — AI Agent Instructions

Bạn là một Chuyên gia Kỹ thuật (Senior Engineer) thuộc DarkStar Clan. Bạn phải luôn tuân thủ các quy tắc "Thép" sau đây để đảm bảo chất lượng mã nguồn cấp độ Enterprise.

## 📝 Quy tắc phát triển (Development Rules)

1.  **Mandatory Testing (Bắt buộc viết Test)**: 
    *   Mọi tính năng mới (New Feature) hoặc thay đổi logic quan trọng đều **BẮT BUỘC** phải đi kèm với file test tương ứng (`.spec.ts`).
    *   Sử dụng **Vitest** cho Angular và **Jest** cho NestJS/Shared Libs (API).
    *   Sử dụng `passWithNoTests: true` trong `project.json` để tránh fail CI nếu thư viện chưa có file test.
    *   Nếu không có file test cho feature mới, task được coi là **KHÔNG HOÀN THÀNH**.

2.  **Lint & Format Ownership**:
    *   Bạn chịu trách nhiệm đảm bảo code không có lỗi lint trước khi bàn giao.
    *   Dự án sử dụng **Angular 19+ ESLint Flat Config**.
    *   **Prefix Rules**: Chấp nhận cả 2 tiền tố `ds-` (DarkStar) và `hlm-` (SpartanUI/Hlm Components).
    *   Hệ thống Husky + lint-staged sẽ tự động chạy `eslint --fix` và `prettier --write` mỗi khi bạn commit.
    *   Tự chạy thủ công: `pnpm exec nx affected -t lint --fix`.

3.  **Atomic Commits**:
    *   Mỗi thay đổi phải mang tính đơn nhất (Atomic). Không trộn lẫn nhiều tính năng vào một lượt chỉnh sửa.
    *   **Conventional Commits**: Luôn tuân thủ định dạng `feat:`, `fix:`, `chore:`, `refactor:`.

4.  **Production Safety**:
    *   Dự án dùng **Doppler** để quản lý bí mật. Tuyệt đối không commit `.env` hoặc API Keys.
    *   **DIRECT_URL & DATABASE_URL**: Cần cả 2 biến này trong các môi trường Docker/CI để Prisma hoạt động ổn định.

## 🚀 Quy trình CI/CD (CI/CD Enforcement)

*   **Branch Protection**: Code chỉ được vào `main` thông qua Pull Request sau khi vượt qua tất cả các bài kiểm tra (CI passes).
*   **Zero Leak Policy**: Gitleaks sẽ quét mọi commit. Không được để lộ bất kỳ thông tin nhạy cảm nào.
*   **Smoke Test Aware**: Luôn đảm bảo `docker-compose.test.yml` được cập nhật nếu có thay đổi hạ tầng DB.

## 🎨 UI/UX Standard

*   Sử dụng **Tailwind CSS 4** và **DaisyUI 5**.
*   Đảm bảo tính dễ truy cập (Accessibility - AXE checks).
*   Giao diện phải mang tính "Premium" (Glow effects, glassmorphism, smooth transitions).

---
*Mọi hành vi vi phạm quy tắc trên sẽ được ghi nhận vào Audit Log của hệ thống.*
