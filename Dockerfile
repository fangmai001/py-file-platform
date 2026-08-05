# 正式環境 image：前端在這裡建置，並由後端本身提供，因此一次部署就只有這個 image 加上
# postgres——沒有另外的 nginx，也不必記得先在 host 上重新建置 frontend/dist/。build context
# 是 repo 根目錄，因為 backend/ 與 frontend/ 兩邊都會用到。
#
# 開發用的組態（docker-compose.yml）不會用到這個檔案，它走的是 frontend/Dockerfile 的 Vite
# 開發伺服器。注意那套並沒有掛 source volume，程式碼是 COPY 進 image 的，所以改了要重跑
# build 才會生效——想要即時重載請用原生開發模式，見 README。

FROM node:22-alpine AS frontend-build
WORKDIR /build
# 先複製 package 檔案，這樣只有原始碼變動時，npm ci 這層仍能命中快取
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
# 刻意不設定 VITE_API_BASE_URL：API client 會退回使用相對的 /api/... 路徑，
# 而同 origin 提供服務要的正是這個。
RUN npm run build

FROM python:3.12-slim
WORKDIR /app
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/ .
COPY --from=frontend-build /build/dist ./static

# 放在最後烙印，這樣調整版號時不會讓上方的 pip／npm 各層失效。
#
# 這個環境變數刻意**不**叫 APP_VERSION：docker-compose.prod.yml 給了 app `env_file: .env`，
# 而 env_file 的值會蓋掉 image 的 ENV——同名的話，GET /health 只會把部署者在 .env 裡打的東西
# 原樣吐回來，而不是實際建置出來的版本。換一個名字，建置戳記就不會被遮蔽，
# 而「能透過 HTTP 驗證執行中的版本」正是這件事的全部意義。
ARG APP_VERSION=dev
ENV APP_BUILD_VERSION=${APP_VERSION}
LABEL org.opencontainers.image.version=${APP_VERSION}

CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000"]
