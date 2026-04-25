# 🏗️ DarkStar Clan - System Architecture Overview

Tài liệu này mô tả sơ đồ triển khai và quy trình vận hành hệ thống DarkStar phiên bản **Standalone (Decoupled)**.

## 1. Sơ Đồ Kiến Trúc Hệ Thống (System Architecture Diagram)

```mermaid
graph TD
    %% Định dạng màu sắc
    classDef cloud fill:#f9f9f9,stroke:#333,stroke-width:2px;
    classDef local fill:#ffebee,stroke:#c62828,stroke-width:2px,stroke-dasharray: 5 5;
    classDef db fill:#e3f2fd,stroke:#1565c0,stroke-width:2px;
    classDef web fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px;
    classDef bot fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px;

    %% Khu vực Laptop Của Bạn
    subgraph Local_Computer [💻 Local Development]
        direction TB
        Dev([👤 Developer]) -->|Push FE| RepoFE[🐙 ewlya-fe]
        Dev -->|Push BE| RepoBE[🐙 ewlya]
    end
    class Local_Computer local;

    %% Khu vực Triển khai
    subgraph Cloud_Environment [☁️ Deployment Environment]
        direction TB
        
        %% Database
        DB[(🐘 PostgreSQL\nDocker / Cloud)]
        class DB db;

        %% Backend Hub
        subgraph Backend_Hub [🚀 Backend Hub (ewlya)]
            API[🌐 NestJS API]
            Bot[🤖 Discord Bot]
        end
        class API web;
        class Bot bot;
        
        %% Frontend
        FE[🌍 Angular Frontend\newlya-fe]
        class FE web;

        %% Kết nối
        API ==>|Prisma| DB
        Bot ==>|Prisma| DB
        FE -.->|HTTP/REST| API
    end
    class Cloud_Environment cloud;

    %% Tương tác
    Discord{🛡️ Discord Server} <==>|Gateway| Bot
```

## 2. Các Thành Phần Công Nghệ (Tech Stack)

Hệ thống hiện tại được chia làm 2 repository độc lập hoàn toàn:

| Thành phần | Công nghệ | Repository |
| :--- | :--- | :--- |
| **Frontend** | Angular 21, Tailwind CSS | `baole405/ewlya-fe` |
| **Backend Hub** | NestJS, Node.js, Discord.js | `baole405/ewlya` |
| **Database** | PostgreSQL, Prisma | Nằm trong `ewlya` (Docker) |

## 3. Quy Trình Vận Hành (Workflow)

1. **Backend Hub**: Chứa cả API và Bot. Chúng chia sẻ chung file cấu hình Database và Prisma Schema, nhưng có thể chạy ở 2 tiến trình (process) khác nhau trong Docker.
2. **Frontend**: Là một ứng dụng Angular độc lập, giao tiếp với Backend thông qua các REST API.
3. **Database**: Dùng chung cho cả Website và Bot để đảm bảo dữ liệu (điểm số, thông tin thành viên) luôn đồng bộ.

## 4. Dockerization

Toàn bộ Backend Hub đã được Docker hóa để đảm bảo có thể chạy ở bất cứ đâu (Local, VPS, Cloud) mà không cần cài đặt môi trường phức tạp. Chỉ cần `docker-compose up` là cả DB, API và Bot sẽ tự động kết nối với nhau.
