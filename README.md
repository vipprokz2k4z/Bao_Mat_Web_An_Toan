## 1. Giới thiệu

Demo “Mass Assignment Attack” mô phỏng cách một API cập nhật profile bị lỗi cho phép hacker tự nâng quyền (role) lên admin. Dự án bao gồm:

- Backend Express + MySQL quản lý user và hai phiên bản API `/api/profile/v1` (unsafe) & `/v2` (safe).
- Frontend React + Vite + Tailwind giúp thao tác đăng ký, đăng nhập và demo attack trực quan để làm rõ cơ chế phòng thủ.

## 2. Công nghệ sử dụng

| Thành phần             | Công nghệ                               |
| ---------------------- | --------------------------------------- |
| Ngôn ngữ backend       | Node.js (Express)                       |
| CSDL                   | MySQL 8.x (hoặc MariaDB tương thích)    |
| Thư viện backend chính | express, mysql2, bcryptjs, cors, dotenv |
| Frontend               | React 19, Vite 7, Tailwind CSS 3        |
| Dev tooling            | Nodemon, ESLint                         |

## 3. Cấu trúc thư mục

```
Bao_Mat_Web/
├── src/
│   └── server.js          # Toàn bộ logic API, kết nối DB và seed dữ liệu
├── frontend/
│   ├── src/               # App React (form auth + playground mass assignment)
│   ├── public/            # Asset tĩnh của frontend
│   ├── package.json       # Script và packages frontend
│   └── tailwind.config.js # Config Tailwind
├── node_modules/          # Packages backend
├── package.json           # Script/backend deps
├── .env.example           # Khuyến nghị cấu hình (tạo thủ công từ mục 5.2)
└── README.md              # Tài liệu này
```

## 4. Yêu cầu môi trường

- Node.js >= 20 (khuyến nghị LTS)
- npm >= 10
- MySQL Server (hoặc MariaDB) đang chạy và có tài khoản quản trị (ví dụ `root`)

## 5. Cài đặt & chạy chương trình

### 5.1 Clone & cài đặt backend

```bash
git clone <repo>
cd Bao_Mat_Web
npm install
```

### 5.2 Import / khởi tạo database

Không cần import thủ công: khi chạy server lần đầu, `server.js` sẽ:

1. Tự tạo database `mass_assignment_demo` (nếu chưa có).
2. Sinh bảng `users`.
3. Seed user demo với mật khẩu `Password123!`.

Nếu cần tự import, chỉ cần tạo DB rồi chạy script SQL tương đương trong `server.js`.

### 5.3 Chạy backend

```bash
npm run dev   # dùng Nodemon trong quá trình phát triển
# hoặc
npm start
```

Backend lắng nghe ở `http://localhost:3000` (tùy biến qua biến môi trường `PORT`).

### 5.44 Cài đặt & chạy frontend

```bash
cd frontend
npm install
npm run dev   # http://localhost:5173
```

#### 5.5.1 Cấu hình API cho frontend

Tùy chọn tạo `frontend/.env`:

```
VITE_API_URL=http://localhost:3000
```

(Nếu không, mặc định đã dùng URL trên.)

## 6. Tài khoản demo

| Vai trò             | Email                | Password                                  |
| ------------------- | -------------------- | ----------------------------------------- |
| Seed User (ban đầu) | `demo@example.com`   | `Password123!`                            |
| Người dùng đăng ký  | Email do bạn đăng ký | Password do bạn đặt (luôn có role `user`) |

> Gợi ý demo: dùng tab “Admin & Mass Assignment” để gửi request tới `/api/profile/v1` với `role: "admin"` và quan sát danh sách user bị nâng quyền; sau đó gọi `/api/profile/v2` để thấy bản fix không chấp nhận field lạ. Nút “Reset database…” sẽ xoá hết user và seed lại dữ liệu chuẩn.

## 7. Kết quả & hình ảnh minh họa

Đặt các screenshot vào `docs/screenshots/` (tạo thư mục nếu chưa có) và cập nhật đúng tên file:

1. Trang đăng nhập
<img width="1401" height="769" alt="Ảnh chụp màn hình 2025-11-20 230257" src="https://github.com/user-attachments/assets/a2d5e310-01f3-49b3-a034-e49a35a5ae07" />
3. Form đăng ký
<img width="1402" height="767" alt="Ảnh chụp màn hình 2025-11-20 230442" src="https://github.com/user-attachments/assets/8c8d57dc-89e9-40ed-b5f4-f6e87202cec5" />
5. Playground mass assignment
<img width="1004" height="813" alt="Ảnh chụp màn hình 2025-11-20 231211" src="https://github.com/user-attachments/assets/22d2d37c-147b-455d-8fb4-fffd44217930" />

## 8. Phụ lục lệnh nhanh (PowerShell)

- Tấn công API lỗi:  
  `Invoke-RestMethod -Uri http://localhost:3000/api/profile/v1 -Method POST -Headers @{ "Content-Type" = "application/json" } -Body '{"userId":1,"displayName":"Hacker","role":"admin"}'`
- Kiểm tra danh sách user:  
  `Invoke-RestMethod http://localhost:3000/api/users`
- Thử bản fix (role sẽ không bị đổi):  
  `Invoke-RestMethod -Uri http://localhost:3000/api/profile/v2 -Method POST -Headers @{ "Content-Type" = "application/json" } -Body '{"userId":1,"displayName":"Legit User","role":"admin"}'`
- Reset dữ liệu:  
  `Invoke-RestMethod -Uri http://localhost:3000/api/reset -Method POST`
