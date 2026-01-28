# Deploy Backend lên Railway

## Bước 1: Chuẩn bị
1. Push code lên GitHub (đã có .gitignore để loại node_modules)
2. Tạo tài khoản tại [railway.app](https://railway.app)

## Bước 2: Tạo Database MongoDB
**Option A: Dùng Railway MongoDB (Đơn giản)**
1. Vào Railway → New Project → Add MongoDB
2. Railway tự động tạo biến `MONGODB_URI`

**Option B: Dùng MongoDB Atlas (Free tier tốt hơn)**
1. Tạo tài khoản tại [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. Tạo cluster miễn phí
3. Lấy connection string: `mongodb+srv://<username>:<password>@cluster.mongodb.net/<dbname>`

## Bước 3: Deploy Backend
1. Railway → New Project → Deploy from GitHub
2. Chọn repository của bạn
3. Chọn thư mục `server/` (hoặc root nếu để riêng repo)
4. Railway tự động detect và deploy

## Bước 4: Cấu hình Environment Variables
Vào Settings → Variables, thêm:
```
PORT=5000
NODE_ENV=production
MONGODB_URI=<your_mongodb_uri>
JWT_SECRET=<tạo_secret_key_mạnh>
CLIENT_URL=<frontend_url>
```

**Tạo JWT_SECRET mạnh:**
```bash
# Option 1: Node.js
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Option 2: Online
https://generate-secret.vercel.app/64
```

## Bước 5: Seed Database (Lần đầu tiên)
Railway → Service → Settings → Add Custom Start Command (tạm thời):
```
npm run seed && npm start
```

Sau khi seed xong, đổi lại:
```
npm start
```

## Bước 6: Test API
Railway sẽ cho bạn URL dạng: `https://your-project.up.railway.app`

Test endpoints:
- `GET /api/tests/iq` - Lấy danh sách test IQ
- `GET /api/tests/eq` - Lấy danh sách test EQ

## Bước 7: Cập nhật Frontend
Trong file `client/src/services/api.js`, đổi baseURL:
```javascript
const api = axios.create({
  baseURL: 'https://your-project.up.railway.app'
})
```

## Troubleshooting

### Database connection failed
- Kiểm tra `MONGODB_URI` có đúng format không
- Nếu dùng Atlas: Whitelist IP `0.0.0.0/0` trong Network Access

### App crash sau deploy
- Xem logs: Railway → Deployments → View Logs
- Kiểm tra tất cả biến môi trường đã được set

### CORS errors
- Đảm bảo `CLIENT_URL` đã set đúng URL frontend
- Kiểm tra file `src/app.js` có config CORS đúng

## Chi phí
- **Railway**: $5 credit miễn phí/tháng
- **MongoDB Atlas**: 512MB free tier
- **Total**: FREE cho testing!

## Auto Deploy
Mỗi lần push code lên GitHub → Railway tự động deploy lại ✨
