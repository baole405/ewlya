# 📂 Nx Monorepo Knowledge Base — DarkStar Clan

Tài liệu này tổng hợp toàn bộ các kiến thức quan trọng về cấu trúc Nx Monorepo của dự án **Ewlya**, nhằm giúp các kỹ sư sau này nắm bắt nhanh bối cảnh và quy trình vận hành.

---

## 🏗️ 1. Kiến trúc Monorepo (Apps vs Libs)

Hệ thống được chia thành hai phần chính:

### 🚀 Applications (`apps/`)
Đây là các thực thể có thể chạy độc lập (Entry Points) và có thể deploy được.
- **`ds-website`**: Frontend Angular (Single Page Application).
- **`api`**: Backend NestJS (REST API + Prisma).
- **`discord-bot`**: Ứng dụng Bot Discord.
- **`api-e2e`**: Bộ kiểm thử tích hợp (End-to-End).

### 📦 Libraries (`libs/`)
Đây là nơi chứa code chia sẻ. Quy tắc: **Apps tiêu thụ Libs, Libs không bao giờ tiêu thụ Apps.**
- **`shared/`**: Các tài nguyên dùng chung cho cả FE và BE (Models, Env, Prisma DB Client).
- **`api/`**: Các logic chỉ dành cho Backend (Auth, Feature-Members).
- **`web/`**: Các thành phần chỉ dành cho Frontend (UI Components, Features).

---

## ⚡ 2. Cơ chế Discovery & Plugins (Nx 19+)

Dự án sử dụng cơ chế **Project Crystal (Task Inference)** của Nx 18/19+:
- **Tự động tìm kiếm**: Nx sẽ tự động phát hiện mọi folder có chứa file `project.json` hoặc `package.json` và coi đó là một Project.
- **Task Inference**: Các lệnh như `build`, `test`, `lint` được suy luận tự động từ các file cấu hình (như `jest.config.ts`, `eslint.config.mjs`) thông qua danh sách `plugins` trong `nx.json`.

---

## 🛠️ 3. Lọc dự án trong IDE (Nx Console)

Để tránh bị ngợp bởi hàng chục thư viện nhỏ lẻ khi chạy lệnh `Nx: run` (Command Palette), chúng tôi áp dụng cơ chế lọc:

1.  **Sử dụng Tags**: Các thư viện "nội bộ" được gán tag `internal` trong file `project.json` của chúng.
2.  **Cấu hình Filter**: Trong `.vscode/settings.json`, chúng ta sử dụng:
    ```json
    "nxConsole.projectFilter": "tag:!internal"
    ```
    *Lệnh này giúp ẩn toàn bộ project có tag `internal` khỏi danh sách gợi ý.*

---

## 🗄️ 4. Kết nối Database (Xác nhận Quan trọng)

Một đặc điểm quan trọng cần lưu ý khi phát triển local:
- **Dependency**: Dự án `ds-website` được cấu hình để phụ thuộc vào `api`. Khi bạn chạy `nx serve ds-website`, hệ thống sẽ tự động gọi lệnh chạy `api`.
- **Database**: Backend `api` kết nối với Database thông qua Prisma.
- **Production Safety**: Nếu biến môi trường của bạn (thông qua Doppler hoặc file `.env`) đang trỏ tới **Database thật (Prod)**, thì việc bạn thao tác trên `localhost:4200` **SẼ TÁC ĐỘNG TRỰC TIẾP** tới dữ liệu thật.

---

## 📜 5. Các lệnh thường dùng

- `pnpm nx run-many -t lint`: Chạy lint cho toàn bộ dự án.
- `pnpm nx graph`: Xem sơ đồ phụ thuộc giữa các project (Visual Graph).
- `pnpm nx show projects`: Hiển thị danh sách project mà Nx đang nhận diện.

---

> [!NOTE]
> Mọi thay đổi về cấu trúc project hoặc gán tag mới cần được cập nhật vào file này để duy trì tính minh bạch của Knowledge Base.
