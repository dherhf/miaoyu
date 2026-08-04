---
name: miaoyu-agent-test
description: 测试妙语购票 Agent 对话链路（ticket-service + agent-service）。触发条件：用户要求"测试agent"、"测试对话"、"agent联调"、"验证agent接口"、"对话测试"、"test agent"、"测试AI购票"，或修改 agent-service / ticket-service 的 /internal 接口后需要验证。自动生成 JWT、创建会话、发送消息、解析 SSE 事件。包含前置检查（ticket-service 是否在线、/internal 接口是否可达）。
---

# 妙语购票 Agent 对话测试

## 架构概览

```
用户 → agent-service (:8081) → DeepSeek LLM
                              → ticket-service (:8080) /internal/*
                                 → MySQL / Redis / MongoDB
```

- agent-service 端口 8081，提供 `/api/v1/chat/sessions` 和 `/api/v1/chat/sessions/{id}/messages`（SSE）
- ticket-service 端口 8080，提供 `/internal/*` 接口供 agent 调用
- Agent 调 ticket-service 不需要 JWT（`/internal/**` 不被 AuthInterceptor 拦截）
- 用户调 agent-service 需要 JWT（agent 用与 ticket-service 相同的 JWT 密钥验证）

## 前置条件

1. ticket-service 运行在 `localhost:8080`
2. agent-service 运行在 `localhost:8081`
3. 两个服务都已连接 Redis、MongoDB、MySQL

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

脚本会自动：
1. 检查 ticket-service 是否在线（GET /internal/movies）
2. 生成用户 JWT（userId=1, type=user, 24h 有效期）
3. 创建对话会话（POST /api/v1/chat/sessions）
4. 逐条发送消息，实时解析 SSE 事件（card / message / done / error）

## SSE 事件类型

| event | 含义 | data 示例 |
|-------|------|-----------|
| `card` | 工具调用产生的卡片数据 | `{"cardType":"movie_list","cardData":{"movies":[...]}}` |
| `message` | AI 文本回复 | `{"content":"目前正在上映的影片..."}` |
| `done` | 对话轮次结束 | `{"sessionId":"...","intent":"","slots":{}}` |
| `error` | 错误 | `{"message":"服务异常","code":"500"}` |

## 已知坑点（历史 bug 记录）

以下问题已在 2026-08-04 修复，但若 agent 开发者修改代码后出现新问题，可参考排查：

1. **`extractRows` 字段名**：`PageResult` 的列表字段是 `records`，不是 `"movies"` / `"cinemas"` / `"sessions"`
2. **`/internal` 接口参数名**：agent 的 `TicketServiceClient` 和 ticket-service 的 `InternalXxxController` 参数名必须一致
3. **`MovieRow` / `CinemaRow` / `SessionRow` 字段**：必须包含后端 VO 的所有 JSON 字段，否则 Jackson `convertValue` 抛 `UnrecognizedPropertyException`（已在 ObjectMapper 中全局关闭 `FAIL_ON_UNKNOWN_PROPERTIES`）
4. **`LocalDateTime` 序列化**：不要用 `objectMapper.convertValue(entity, Map.class)` 再写 MongoDB，直接传实体对象给 `MongoTemplate`，否则日期格式不兼容
5. **MongoDB 密码特殊字符**：密码含 `@` 时不能用 URI 模式，改用独立属性（host/port/username/password）
6. **DeepSeek base-url**：必须是 `https://api.deepseek.com/v1`（带 `/v1` 后缀）
7. **Java 26 + Lombok 不兼容**：agent-service 必须用 Java 21 编译（`C:\Users\86139\.jdks\ms-21.0.10`），Java 26 运行时可以但 Lombok 编译期会报错

## /internal 接口清单

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/internal/movies` | 影片列表（keyword, type） |
| GET | `/internal/movies/{id}` | 影片详情 |
| GET | `/internal/cinemas` | 影院列表（keyword, facilities） |
| GET | `/internal/cinemas/{id}` | 影院详情 |
| GET | `/internal/sessions` | 场次列表（movieId, cinemaId, date） |
| GET | `/internal/sessions/{id}` | 场次详情 |
| GET | `/internal/sessions/{id}/seats` | 座位图 |
| GET | `/internal/orders` | 订单列表（userId, keyword, status, dateFrom, dateTo） |
| GET | `/internal/orders/{id}` | 订单详情（userId） |
| POST | `/internal/orders/lock-seat` | 锁座下单 |
| POST | `/internal/orders/{id}/pay` | 支付订单 |
| POST | `/internal/orders/{id}/cancel` | 取消订单 |
| POST | `/internal/orders/{id}/refund` | 退票 |

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
