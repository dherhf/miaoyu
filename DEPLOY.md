# 妙语购票 — 云服务器部署指南

> 适用环境：阿里云 ECS（2核4G）、Ubuntu 22.04/24.04
> MySQL / Redis / MongoDB 已独立部署（公网访问）

## 架构概览

```
Internet → Nginx(:80) → gateway-service(:9000) → ticket-service(:8080)
                    ↘                              → agent-service(:8081)
                    ↘ user-web 静态文件 (/)
                    ↘ admin-front 静态文件 (/admin/)

外部基础设施（已独立部署）：MySQL / Redis / MongoDB（公网地址）
```

Docker Compose 仅包含 4 个容器：ticket-service、agent-service、gateway-service、nginx。
仅 Nginx 的 80 端口对外暴露。

## 一、服务器初始化

### 1.1 创建交换空间（2核4G 必做）

构建 Java 镜像时内存消耗较大，4G 内存可能不足，需创建 2G swap：

```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### 1.2 安装 Docker

```bash
sudo apt update && sudo apt upgrade -y
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
newgrp docker

# 验证
docker --version
docker compose version
```

### 1.3 安全组配置

在阿里云控制台 → ECS → 安全组，开放以下端口：

| 端口 | 协议 | 说明 |
|---|---|---|
| 22 | TCP | SSH |
| 80 | TCP | HTTP |
| 443 | TCP | HTTPS（如配置 SSL） |

## 二、部署项目

### 2.1 上传代码

```bash
cd /opt
git clone <你的仓库地址> miaoyu
cd miaoyu
```

或使用 scp（在本地执行）：

```bash
scp -r ./* root@<服务器IP>:/opt/miaoyu/
```

### 2.2 初始化数据库

确保外部 MySQL 中已执行建表脚本：

```bash
mysql -h <MySQL公网IP> -u root -p < miaoyu数据库> < resources/sql/miaoyu_init.sql
```

确保 MongoDB 中已创建 `agent` 数据库和应用账号。

### 2.3 配置环境变量

```bash
cp .env.docker.example .env.docker
vim .env.docker
```

**必须修改的项：**

| 变量 | 说明 |
|---|---|
| `MYSQL_HOST` / `MYSQL_PASSWORD` | MySQL 公网地址和密码 |
| `REDIS_HOST` / `REDIS_PASSWORD` | Redis 公网地址和密码 |
| `MONGODB_HOST` / `MONGODB_PASSWORD` | MongoDB 公网地址和密码 |
| `JWT_CURRENT_SECRET` | JWT 签名密钥，至少 32 字符 |
| `CRYPTO_AES_KEY` | AES 密钥，运行 `openssl rand -base64 32` 生成 |
| `DEEPSEEK_API_KEY` | DeepSeek API Key |
| `OSS_*` | 阿里云 OSS 配置 |

> **安全提醒**：MySQL/Redis/MongoDB 通过公网地址访问，请确保数据库实例已配置 IP 白名单，仅允许 ECS 公网 IP 连接，避免数据库暴露在公网。

### 2.4 构建并启动

```bash
docker compose --env-file .env.docker up -d --build
```

首次构建需要 5-10 分钟（下载依赖 + 编译），后续构建会利用缓存。

### 2.5 检查状态

```bash
# 查看所有容器状态
docker compose ps

# 查看某服务日志
docker compose logs -f ticket-service
docker compose logs -f agent-service
docker compose logs -f gateway-service
docker compose logs -f nginx
```

正常状态：

```
NAME              STATUS
miaoyu-ticket     Up
miaoyu-agent      Up
miaoyu-gateway    Up
miaoyu-nginx      Up
```

### 2.6 验证访问

```bash
# 用户端首页
curl http://localhost/

# 管理端首页
curl http://localhost/admin/

# API 健康检查
curl http://localhost/api/v1/movies
```

## 三、域名与 SSL（可选但推荐）

### 3.1 域名解析

在域名服务商处添加 A 记录，指向 ECS 公网 IP。

### 3.2 配置 SSL

修改 `nginx/nginx.conf`：

```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name your-domain.com;

    ssl_certificate     /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;

    # ... 其余 location 配置不变 ...
}
```

在 `docker-compose.yml` 的 nginx 服务中挂载证书并开放 443 端口：

```yaml
nginx:
  ports:
    - "80:80"
    - "443:443"
  volumes:
    - /etc/letsencrypt/live/your-domain.com:/etc/nginx/ssl:ro
```

推荐使用 Let's Encrypt 免费证书：

```bash
sudo apt install certbot
sudo certbot certonly --standalone -d your-domain.com
```

## 四、日常运维

### 更新代码后重新部署

```bash
cd /opt/miaoyu
git pull
docker compose --env-file .env.docker up -d --build
```

### 查看日志

```bash
# 实时跟踪所有服务日志
docker compose logs -f

# 最近 100 行某服务日志
docker compose logs --tail 100 ticket-service
```

### 重启单个服务

```bash
docker compose restart ticket-service
```

### 停止/启动全部

```bash
docker compose down
docker compose --env-file .env.docker up -d
```

## 五、内存分配（2核4G）

| 容器 | 限制 | JVM 堆 |
|---|---|---|
| ticket-service | 500MB | 300MB |
| agent-service | 500MB | 300MB |
| gateway-service | 350MB | 200MB |
| Nginx | 64MB | — |
| **合计** | **~1.4GB** | |

剩余 ~2.6GB 供 OS + Docker daemon + 编译缓存使用。如服务器升级到 4核8G，可移除 `mem_limit` 限制。

## 六、故障排查

### 容器反复重启

```bash
docker compose logs --tail 50 <服务名>
```

常见原因：
- **MySQL 连接失败**：确认 `.env.docker` 中 `MYSQL_HOST` / `MYSQL_PASSWORD` 正确，数据库 IP 白名单已放行 ECS IP
- **Redis 连接失败**：确认 `REDIS_HOST` / `REDIS_PASSWORD` 正确
- **MongoDB 认证失败**：确认 `MONGODB_USERNAME` / `MONGODB_PASSWORD` 与已部署实例一致
- **JWT 密钥未设置**：检查 `.env.docker` 中 `JWT_CURRENT_SECRET`

### Nginx 返回 502

gateway-service 未就绪，等待几秒后重试。如持续 502：

```bash
docker compose logs gateway-service
```

### 前端页面空白

```bash
# 检查 Nginx 是否正常
docker compose logs nginx
# 检查前端构建产物是否存在
docker exec miaoyu-nginx ls /usr/share/nginx/html/user-web
docker exec miaoyu-nginx ls /usr/share/nginx/html/admin
```

### 构建时内存不足（OOM Killed）

```bash
# 确认 swap 已启用
free -h
# 如无 swap，参考步骤 1.1 创建
```
