# ====== 构建 user-web ======
FROM node:22-alpine AS user-web-builder

WORKDIR /build
COPY user-web/package*.json ./
RUN npm ci
COPY user-web/ .
RUN npm run build

# ====== 构建 admin-web ======
FROM node:22-alpine AS admin-builder

WORKDIR /build
COPY admin-web/package*.json ./
RUN npm ci
COPY admin-web/ .
RUN npm run build

# ====== Nginx 运行阶段 ======
FROM nginx:1.27-alpine

# 复制前端构建产物
COPY --from=user-web-builder /build/dist /usr/share/nginx/html/user-web
COPY --from=admin-builder /build/dist /usr/share/nginx/html/admin

# 生成自签 SSL 证书
RUN apk add --no-cache openssl && \
    mkdir -p /etc/nginx/ssl && \
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
      -keyout /etc/nginx/ssl/selfsigned.key \
      -out /etc/nginx/ssl/selfsigned.crt \
      -subj "/CN=47.99.152.56" \
      -addext "subjectAltName=IP:47.99.152.56" && \
    apk del openssl

# 复制 Nginx 配置
COPY nginx/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80 443
