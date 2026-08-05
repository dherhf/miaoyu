# ====== 构建 user-web ======
FROM node:22-alpine AS user-web-builder

WORKDIR /build
COPY user-web/package*.json ./
RUN npm ci
COPY user-web/ .
RUN npm run build

# ====== 构建 web-admin-front ======
FROM node:22-alpine AS admin-builder

WORKDIR /build
COPY web-admin-front/package*.json ./
RUN npm ci
COPY web-admin-front/ .
RUN npm run build

# ====== Nginx 运行阶段 ======
FROM nginx:1.27-alpine

# 复制前端构建产物
COPY --from=user-web-builder /build/dist /usr/share/nginx/html/user-web
COPY --from=admin-builder /build/dist /usr/share/nginx/html/admin

# 复制 Nginx 配置
COPY nginx/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
