---
name: miaoyu-agent-test
description: 测试妙语购票 Agent 对话链路（gateway + agent-service + ticket-service）。触发条件：用户要求"测试agent"、"测试对话"、"agent联调"、"验证agent接口"、"对话测试"、"test agent"、"测试AI购票"，或修改 agent-service / ticket-service 的 /internal 接口后需要验证。自动生成 JWT、创建会话、发送消息、解析 SSE 事件。包含前置检查（ticket-service 是否在线、/internal 接口是否可达）。
---

# 妙语购票 Agent 对话测试

## 架构概览

```
用户 → gateway-service (:9000) → agent-service (:8081) → DeepSeek LLM
                                │                        → ticket-service (:8080) /internal/*
                                │                           → MySQL / Redis / MongoDB
                                └→ ticket-service (:8080) /api/v1/**
```

- **gateway-service** 端口 9000，Spring Cloud Gateway，统一 JWT 校验并注入 `X-User-Id`/`X-User-Type` header
  - 路由：`/api/v1/chat/**` → agent-service:8081，其余 `/api/v1/**` → ticket-service:8080
- **agent-service** 端口 8081，提供 `/api/v1/chat/sessions` 和 `/api/v1/chat/sessions/{id}/messages`（SSE）
  - 通过 `X-User-Id` header 获取用户 ID（由网关注入）
  - 调用 ticket-service `/internal/*` 时需携带 `X-Internal-Token` header
- **ticket-service** 端口 8080，`/internal/*` 供 agent 调用
  - `InternalTokenInterceptor` 拦截 `/internal/**`，校验 `X-Internal-Token`（值：`miaoyu-internal-token-2026`）

## 前置条件

1. gateway-service 运行在 `localhost:9000`
2. ticket-service 运行在 `localhost:8080`
3. agent-service 运行在 `localhost:8081`
4. 三个服务都已连接 Redis、MongoDB、MySQL

## 快速测试

运行内置测试脚本（自动生成 JWT、创建会话、发送消息、解析 SSE）：

```bash
# 默认测试：影片 → 影院 → 订单
node C:\Users\86139\.codely-cli\skills\miaoyu-agent-test\scripts\test_agent.cjs

# 自定义消息
node C:\Users\86139\.codely-cli\skills\miaoyu-agent-test\scripts\test_agent.cjs "我想看个喜剧电影" "有什么影院推荐"

# 自定义 JWT（默认用 .env 中的 JWT_CURRENT_SECRET 生成 userId=1 的 user token）
$env:AGENT_TOKEN="your-jwt-here"; node ...\test_agent.cjs "查看我的订单"
```

脚本通过网关 (9000) 调用 agent-service，前置检查直连 ticket-service (8080) 并带 `X-Internal-Token` header。

## SSE 事件类型

| event | 含义 | data 示例 |
|-------|------|-----------|
| `card` | 工具调用产生的卡片数据 | `{"cardType":"movie_list","cardData":{"movies":[...]}}` |
| `message` | AI 文本回复 | `{"content":"目前正在上映的影片..."}` |
| `done` | 对话轮次结束 | `{"sessionId":"...","intent":"","slots":{}}` |
| `error` | 错误 | `{"message":"服务异常","code":"500"}` |

## 已知坑点（历史 bug 记录）

1. **`extractRows` 字段名**：`PageResult` 的列表字段是 `records`，不是 `"movies"` / `"cinemas"` / `"sessions"`
2. **`/internal` 接口参数名**：agent 的 `TicketServiceClient` 和 ticket-service 的 `InternalXxxController` 参数名必须一致。场次日期参数为 `date`。
3. **`MovieRow` / `CinemaRow` / `SessionRow` 字段**：必须包含后端 VO 的所有 JSON 字段，否则 Jackson `convertValue` 抛 `UnrecognizedPropertyException`（已在 ObjectMapper 中全局关闭 `FAIL_ON_UNKNOWN_PROPERTIES`）
4. **`LocalDateTime` 序列化**：不要用 `objectMapper.convertValue(entity, Map.class)` 再写 MongoDB，直接传实体对象给 `MongoTemplate`，否则日期格式不兼容
5. **MongoDB 密码特殊字符**：密码含 `@` 时不能用 URI 模式，改用独立属性（host/port/username/password）
6. **DeepSeek base-url**：必须是 `https://api.deepseek.com/v1`（带 `/v1` 后缀）
7. **Java 26 + Lombok 不兼容**：agent-service 必须用 Java 21 编译（`C:\Users\86139\.jdks\ms-21.0.10`），Java 26 运行时可以但 Lombok 编译期会报错
8. **网关后测试脚本必须走 9000**：直连 8081 会缺 `X-User-Id` header 导致 400
9. **`/internal/**` 需 X-Internal-Token**：ticket-service 的 `InternalTokenInterceptor` 校验 `X-Internal-Token` header（值 `miaoyu-internal-token-2026`），RestClient 已在 `RestClientConfig` 中配置 `defaultHeader`

## /internal 接口清单

| 方法 | 路径 | 参数 |
|------|------|------|
| GET | `/internal/movies` | keyword, type, **cinemaId**, **date** |
| GET | `/internal/movies/{id}` | — |
| GET | `/internal/cinemas` | keyword, facilities, **movieId** |
| GET | `/internal/cinemas/{id}` | — |
| GET | `/internal/sessions` | movieId, cinemaId, date |
| GET | `/internal/sessions/{id}` | — |
| GET | `/internal/sessions/{id}/seats` | — |
| GET | `/internal/orders` | userId, keyword, status, dateFrom, dateTo |
| GET | `/internal/orders/{id}` | userId |
| POST | `/internal/orders/lock-seat` | body: InternalLockSeatDTO |
| POST | `/internal/orders/{id}/pay` | userId, requestId |
| POST | `/internal/orders/{id}/cancel` | userId, requestId |
| POST | `/internal/orders/{id}/refund` | userId, requestId |

**新增参数说明：**
- `GET /internal/movies` 新增 `cinemaId`（按影院过滤影片）和 `date`（按日期过滤影片），均为可选。仅返回有在售场次的影片。
- `GET /internal/cinemas` 新增 `movieId`（按影片过滤影院），可选。

## Agent @Tool 清单

| Tool | 触发场景 |
|------|---------|
| `searchMovies(keyword, type)` | 用户想看电影 / 模糊推荐 |
| `searchCinemas(keyword, facilities)` | 用户问影院 |
| `querySessions(movieId, cinemaId, date)` | 用户查场次 |
| `getSeatMap(scheduleId)` | 用户选座 |
| `queryOrders(status)` | 用户查订单 |
| `queryOrderDetail(orderId)` | 用户查具体订单 |
| `lockAndCreateOrder(scheduleId, seatIds, ticketCount, requestId)` | 锁座下单 |
| `payOrder(orderId, requestId)` | 支付订单 |
| `cancelOrder(orderId, requestId)` | 取消订单 |
| `refundOrder(orderId, requestId)` | 退票 |
