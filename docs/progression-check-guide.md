# 📈 Hướng Dẫn Sử Dụng: Hệ Thống Kiểm Tra Tiến Độ (Progression Check)

Tài liệu này hướng dẫn cách Admin quản lý và theo dõi tiến độ hoàn thành các nhiệm vụ/hoạt động của thành viên Clan (ví dụ: cày Raid, đóng phí, tham gia sự kiện).

---

## 1. Vòng Đời Của Một Đợt Check (Lifecycle)

Hệ thống quản lý đợt check qua 3 trạng thái chính:

*   **🟢 Đang chạy (Active)**: Các đợt check nằm trong khoảng thời gian từ `Ngày bắt đầu` đến `Ngày kết thúc`. Xuất hiện tại tab "Đang chạy".
*   **🏁 Đã kết thúc (Ended)**: Các đợt check đã qua `Ngày kết thúc` hoặc được Admin chủ động **Chốt sớm (Force End)**. Xuất hiện tại tab "Đã kết thúc".
*   **🗑️ Thùng rác (Trash)**: Các đợt check bị xóa sẽ tạm thời chuyển vào đây. 
    *   *Lưu ý: Hệ thống sẽ tự động xóa vĩnh viễn các mục trong thùng rác sau **30 ngày**.*

---

## 2. Hệ Thống Cờ Hiệu (Status Flags)

Mỗi thành viên trong một đợt check sẽ có một "Lá cờ" biểu thị trạng thái hoàn thành dựa trên thời gian:

| Màu Cờ | Ý Nghĩa | Điều Kiện |
| :--- | :--- | :--- |
| 🟢 **Xanh** | **Đúng hạn** | Hoàn thành trước hoặc đúng ngày kết thúc. |
| 🟡 **Vàng** | **Hoàn thành trễ** | Hoàn thành nhưng ngày nộp sau ngày kết thúc. |
| 🔴 **Đỏ** | **Quá hạn / Chưa xong** | Đã qua ngày kết thúc mà vẫn chưa tích chọn hoàn thành. |
| ⚪ **Xám** | **Đang chờ** | Chưa hoàn thành nhưng vẫn còn trong thời hạn đợt check. |

---

## 3. Các Thao Tác Quản Lý

### 3.1 Tạo Đợt Check Mới
*   **Tiêu đề**: Bạn có thể gõ tên mới hoặc chọn từ danh sách gợi ý các tên đã từng sử dụng.
*   **Thời gian**: Cần thiết lập `Ngày bắt đầu` và `Ngày kết thúc (Dự kiến)`.

### 3.2 Chốt Đợt Check Sớm (Force End)
*   Sử dụng khi đợt check đã hoàn tất mục tiêu trước thời hạn. 
*   Hệ thống sẽ cập nhật `Ngày kết thúc` về thời điểm hiện tại và chuyển đợt check sang tab **Đã kết thúc**.

### 3.3 Khôi phục từ Thùng rác (Restore)
*   Nếu lỡ tay xóa, bạn có thể vào tab **Thùng rác** và nhấn nút **Khôi phục** (icon xoay vòng) để đưa đợt check trở lại vị trí cũ.

---

## 4. Cơ Chế Tự Động Hóa (Automation)

Hệ thống hoạt động ngầm 24/7 để hỗ trợ Admin:

1.  **Báo cáo Discord (9:00 hàng ngày)**: 
    *   Quét các đợt check vừa kết thúc trong vòng 24h qua.
    *   Tự động gửi danh sách **Cờ Đỏ (Red Flags)** — những thành viên chưa hoàn thành — vào channel Discord của Clan.
2.  **Tự động dọn dẹp (00:00 hàng ngày)**:
    *   Kiểm tra tab Thùng rác.
    *   Xóa vĩnh viễn các dữ liệu đã nằm trong thùng rác quá 30 ngày để tiết kiệm bộ nhớ.

---

## 5. Mẹo Cho Admin

*   **Ghi chú**: Sử dụng ô "Ghi chú" cho từng thành viên để lưu lại lý do (ví dụ: "Thiếu 50 điểm", "Xin nộp trễ").
*   **Theo dõi nhanh**: Tỷ lệ phần trăm (%) lớn ở góc phải chi tiết đợt check giúp bạn nắm bắt nhanh tốc độ hoàn thành của toàn Clan.

---
*Tài liệu thuộc hệ thống DarkStar Clan Platform — Biên soạn bởi DarkStar Engineering Team.*
