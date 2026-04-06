# 🤝 DarkStar Ewlya — Contribution Guide

Chào mừng bạn gia nhập đội ngũ Engineering của **DarkStar Clan**. Để giữ gìn chất lượng mã nguồn ở mức **Enterprise**, tất cả các thành viên phải tuân thủ các quy chuẩn sau.

---

## 📝 Commit Messages — [Conventional Commits]

Tất cả các commit phải tuân theo chuẩn [Conventional Commits](https://www.conventionalcommits.org/):

```text
<type>(scope): <description>
```

- **`feat`**: Tính năng mới (New feature).
- **`fix`**: Sửa lỗi (Bug fix).
- **`chore`**: Thay đổi cấu hình, cập nhật dependencies (Không ảnh hưởng đến logic/UI).
- **`refactor`**: Thay đổi cấu trúc code (Không thêm tính năng mới hay sửa lỗi).
- **`docs`**: Cập nhật tài liệu (Markdown).
- **`test`**: Thêm/Sửa unit test hoặc e2e test.

---

## 🌳 Branching Strategy — [Git Flow]

Hệ thống CI/CD được cấu hình tự động cho cấu trúc:

*   **`main`**: Mã nguồn ổn định nhất. Đã qua toàn bộ Smoke Test.
*   **`feat/feature-name`**: Nhánh để phát triển tính năng mới.
*   **`fix/bug-name`**: Nhánh để sửa lỗi.
*   **`chore/setup-name`**: Nhánh để thay đổi cấu hình hạ tầng.

> [!IMPORTANT]
> Tuyệt đối không được **Push trực tiếp** vào `main`. Mọi thay đổi phải đi qua Pull Request (PR) và đạt trạng thái **GREEN** 🟢 (CI Pass).

---

## 🛡️ Coding Standards

### 1. TypeScript & Types
- Luôn ưu tiên dùng **Interface/Type** thay vì `any`.
- Shared models phải được đặt trong thư viện `libs/shared/models`.

### 2. Linting & Formatting
- Trước khi commit, hãy tự kiểm tra bằng lệnh: `pnpm nx run-many -t lint --fix`.
- Husky sẽ tự động chặn các commit có lỗi lint nghiêm trọng.

### 3. API Error Handling
- Tất cả các endpoint API phải có chuẩn phản hồi (Response format) nhất quán.
- Sử dụng NestJS `HttpException` để trả lỗi cho Frontend.

---

## 🧪 Testing Policy — [DarkStar Mandate]

- **Frontend**: Chạy Unit Test với Vitest.
- **Backend/Shared**: Chạy Unit Test với Jest.
- **Rules**: Tính năng mới chưa có test = Task chưa hoàn thành.

---
*Developed with 🩸 by DarkStar Clan Engineering Team.*
