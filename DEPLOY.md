### 配置环境变量

```bash
cp .env.docker.example .env.docker
vim .env.docker
```
### 构建并启动

```bash
docker compose --env-file .env.docker up -d --build
```

首次构建需要 5-10 分钟（下载依赖 + 编译），后续构建会利用缓存。

### 检查状态

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

### 更新代码后重新部署

```bash
cd /miaoyu
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
