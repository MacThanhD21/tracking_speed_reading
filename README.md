# Tracking Speed Reading

Web app theo dõi tốc độ đọc và kiểm tra hiểu bài:
- Đăng ký/đăng nhập, phân quyền admin
- Người dùng tự nhập Gemini API key
- Đo tốc độ đọc theo WPM
- Sinh câu hỏi 5W1H và chấm câu trả lời

## 1) Chạy local

### Chuẩn bị
1. Tạo file `server/.env` từ `server/.env.example`
2. Điền tối thiểu:
   - `MONGODB_URI`
   - `JWT_SECRET`
   - `CORS_ORIGIN=http://localhost:5174`
   - `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME`

### Cài dependencies
```bash
cd server && npm install
cd ../client && npm install
cd .. && npm install
```

### Tạo admin (lần đầu)
```bash
cd server
npm run seed:admin
```

### Chạy app
```bash
cd ..
npm run dev
```

- Frontend: `http://localhost:5174`
- Backend: `http://localhost:5050`

---

## 2) Deploy Production

Kiến trúc deploy:
- **Frontend**: Vercel
- **Backend**: Render
- **Database**: MongoDB Atlas

### 2.1 Deploy Backend lên Render

1. Push project lên GitHub.
2. Vào Render → **New +** → **Web Service**.
3. Chọn repo, cấu hình:
   - **Root Directory**: `server`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
4. Thêm Environment Variables (Render):
   - `MONGODB_URI`
   - `JWT_SECRET`
   - `JWT_EXPIRE=7d`
   - `ENCRYPTION_KEY` (khuyến nghị)
   - `NODE_ENV=production`
   - `PORT=5050` (Render vẫn set được, app dùng `process.env.PORT`)
   - `CORS_ORIGIN=https://<your-vercel-domain>.vercel.app`
   - `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME`
5. Deploy xong, lấy URL backend, ví dụ:
   - `https://tracking-speed-reading-api.onrender.com`
6. Test health check:
   - `https://tracking-speed-reading-api.onrender.com/api/health`

> Gợi ý: sau deploy backend lần đầu, mở Render Shell hoặc chạy local để chạy `npm run seed:admin` với đúng biến môi trường production.

### 2.2 Deploy Frontend lên Vercel

1. Vào Vercel → **Add New Project** → import cùng repo.
2. Cấu hình:
   - **Root Directory**: `client`
   - Framework: Vite (Vercel tự nhận diện)
3. Thêm Environment Variable:
   - `VITE_API_BASE_URL=https://<your-render-backend>.onrender.com`
4. Deploy.

Project đã có `client/vercel.json` để rewrite tất cả route về `index.html` (tránh lỗi refresh tại route như `/kiem-tra/:id`).

### 2.3 Cập nhật CORS sau khi có domain thật

Khi Vercel trả domain cuối cùng, cập nhật lại `CORS_ORIGIN` trên Render chính xác theo domain FE:
- Ví dụ: `CORS_ORIGIN=https://tracking-speed-reading.vercel.app`
- Nếu có nhiều domain: phân tách bằng dấu phẩy.

Redeploy backend sau khi đổi env.

---

## 3) Checklist Production

- [ ] FE gọi API đúng Render URL (`VITE_API_BASE_URL`)
- [ ] Backend health check trả `ok: true`
- [ ] Đăng ký / đăng nhập hoạt động
- [ ] Cấu hình Gemini API key hoạt động
- [ ] Tạo phiên đọc, ra WPM (số nguyên)
- [ ] Chuyển sang `/kiem-tra/:sessionId`, sinh câu hỏi và chấm bài thành công
- [ ] CORS không lỗi trên browser console

---

## 4) Notes bảo mật

- Không commit file `.env`.
- `JWT_SECRET` và `ENCRYPTION_KEY` phải đủ mạnh, ổn định.
- Nếu đổi `ENCRYPTION_KEY`/`JWT_SECRET`, các Gemini key đã mã hóa trước đó có thể không giải mã được.
- Model Gemini hiện dùng endpoint `gemini-2.5-flash`.
