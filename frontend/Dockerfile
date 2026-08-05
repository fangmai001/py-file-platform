FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
# npm ci 而非 install：image 是建過就重複使用的，要跟根目錄 Dockerfile 與 frontend-ci.yml
# 一樣完全照 lockfile 安裝，否則 dev image 會慢慢漂到與 CI／正式環境不同的依賴版本。
RUN npm ci

COPY . .

EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host"]
