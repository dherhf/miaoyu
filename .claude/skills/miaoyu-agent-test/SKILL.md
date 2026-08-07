---
name: miaoyu-agent-test
description: >
  测试妙语购票 Agent 对话链路（gateway + agent-service + ticket-service）。
  触发条件：用户要求"测试agent"、"测试对话"、"agent联调"、"验证agent接口"、"对话测试"、"test agent"、"测试AI购票"，
  或修改 agent-service / ticket-service 的 /internal 接口后需要验证。
  自动生成 JWT、创建会话、发送消息、解析 SSE 事件。包含前置检查（ticket-service 是否在线、/internal 接口是否可达）。
  测试通过后可继续提交 PR（git commit → rename branch → push → create PR）。
---

# 妙语购票 Agent 对话测试 + 提交 PR

## 架构概览

```
用户 → gateway-service (:9000) → agent-service (:8081) → DeepSeek LLM
                                │                        → ticket-service (:8080) /internal/*
                                │                           → MySQL / Redis / MongoDB
                                └→ ticket-service (:8080) /api/v1/**
```

- **gateway-service** 端口 9000，Spring Cloud Gateway，统一 JWT 校验并注入 `X-User-Id`/`X-User-Type` header
  - 路由：`/api/v1/chat/**` → agent-service:8081，其余 `/api/v1/**` → ticket-service:8080
- **agent-service** 端口 8081，`/api/v1/chat/sessions` 和 `/api/v1/chat/sessions/{id}/messages`（SSE）
  - 通过 `X-User-Id` header 获取用户 ID（由网关注入）
  - 调用 ticket-service `/internal/*` 时需携带 `X-Internal-Token` header
- **ticket-service** 端口 8080，`/internal/*` 供 agent 调用（需 `X-Internal-Token`，无需 JWT）
  - `InternalTokenInterceptor` 拦截 `/internal/**`，校验 `X-Internal-Token`（值：`miaoyu-internal-token-2026`）
- **common 模块**（`org.dherhf.common`）：JacksonConfig + Result，两个服务共享
- **Jackson 3.x**（`tools.jackson`）：两个服务统一使用，注解仍用 `com.fasterxml.jackson.annotation`
- **日期格式**（蚂蚁规范）：LocalDateTime→`yyyy-MM-dd HH:mm:ss`，LocalDate→`yyyy-MM-dd`，LocalTime→`HH:mm:ss`

## 前置条件

1. gateway-service 运行在 `localhost:9000`
2. ticket-service 运行在 `localhost:8080`
3. agent-service 运行在 `localhost:8081`
4. 三个服务都已连接 Redis、MongoDB、MySQL

## 快速测试

```bash
# 默认测试
node C:\Users\86139\.codely-cli\skills\miaoyu-agent-test\scripts\test_agent.cjs

# 自定义消息（多条多轮对话）
node C:\Users\86139\.codely-cli\skills\miaoyu-agent-test\scripts\test_agent.cjs "有哪些上映的电影" "我想看科幻电影" "帮我查星际穿越2明天长沙学院的场次"
```

脚本自动：检查 ticket-service（带 X-Internal-Token）→ 生成 JWT → 经网关创建会话 → 发送消息 → 解析 SSE（card/message/done/error）

**注意**：测试脚本通过网关 (9000) 调用 agent-service，不直连 8081。前置检查直连 ticket-service (8080) 并带 `X-Internal-Token` header。

## 推荐测试对话用例

### 购票链路

| # | 消息 | 预期 Tool | 预期卡片 |
|---|------|-----------|---------|
| 1 | "有哪些上映的电影" | searchMovies | movie_list |
| 2 | "我想看星际穿越2" | searchMovies → searchCinemas(movieId) | cinema_list（只推有排片的影院） |
| 3 | "帮我查长沙学院明天的场次" | querySessions | session_list |
| 4 | "1张" | — | —（追问选座） |
| 5 | "帮我看座位图选座" | getSeatMap | seat_map（含 price） |
| 6 | "我要A5座位" | lockAndCreateOrder | order_confirm |

### 行程规划链路

| # | 消息 | 预期 Tool | 预期卡片 |
|---|------|-----------|---------|
| 1 | "从湖南大学到长沙学院怎么走" | planRoute | route_info |
| 2 | "长沙学院附近有什么吃的" | searchNearby | nearby_poi |
| 3 | "明天长沙天气怎么样" | getWeather | weather_info |

### 模糊推荐链路

| # | 消息 | 预期 Tool | 预期卡片 |
|---|------|-----------|---------|
| 1 | "想看个喜剧" | searchMovies(type=喜剧) | movie_list |
| 2 | "周末看什么" | searchMovies | movie_list |

### 订单查询链路

| # | 消息 | 预期 Tool | 预期卡片 |
|---|------|-----------|---------|
| 1 | "查看我的订单" | queryOrders | order_list |
| 2 | "查一下最近那个订单" | queryOrderDetail | order_success |

### 一键测试命令

```bash
# 购票全链路（选电影→选影院→选场次→选座→下单）
node C:\Users\86139\.codely-cli\skills\miaoyu-agent-test\scripts\test_agent.cjs "有哪些上映的电影" "我想看星际穿越2" "帮我查长沙学院明天的场次" "1张" "帮我看座位图选座"

# 行程规划全链路（路线→周边→天气）
node C:\Users\86139\.codely-cli\skills\miaoyu-agent-test\scripts\test_agent.cjs "从湖南大学到长沙学院怎么走" "长沙学院附近有什么吃的" "明天长沙天气怎么样"

# 模糊推荐
node C:\Users\86139\.codely-cli\skills\miaoyu-agent-test\scripts\test_agent.cjs "想看个喜剧" "周末看什么"

# 订单查询
node C:\Users\86139\.codely-cli\skills\miaoyu-agent-test\scripts\test_agent.cjs "查看我的订单"
```

### 全链路场景（购票 + 行程规划 + 订单）

以下场景模拟真实用户从选电影到看完电影的全流程，**需在同一会话中顺序发送**：

#### 场景 A：完整购票 + 出行规划

| 轮次 | 消息 | 预期 Tool | 预期卡片 | 验证点 |
|------|------|-----------|---------|--------|
| 1 | "有哪些上映的电影" | searchMovies | movie_list | 返回 7 部影片 |
| 2 | "我想看星际穿越2" | searchMovies → searchCinemas(movieId) | cinema_list | 只推有排片的影院（长沙学院） |
| 3 | "帮我查长沙学院明天的场次" | querySessions | session_list | 返回场次含票价/余座 |
| 4 | "1张" | — | — | 追问选座 |
| 5 | "帮我看座位图选座" | getSeatMap | seat_map | 座位标签正确（A1~H12），含 price |
| 6 | "我要A6座位" | lockAndCreateOrder | order_confirm | 订单创建，seatInfo=A6 |
| 7 | "从湖南大学到长沙学院怎么走" | planRoute | route_info | 返回距离/时间 |
| 8 | "长沙学院附近有什么吃的" | searchNearby | nearby_poi | 返回周边餐厅 |
| 9 | "明天长沙天气怎么样" | getWeather | weather_info | 返回天气/温度 |

```bash
node C:\Users\86139\.codely-cli\skills\miaoyu-agent-test\scripts\test_agent.cjs "有哪些上映的电影" "我想看星际穿越2" "帮我查长沙学院明天的场次" "1张" "帮我看座位图选座" "我要A6座位" "从湖南大学到长沙学院怎么走" "长沙学院附近有什么吃的" "明天长沙天气怎么样"
```

#### 场景 B：模糊推荐 + 购票 + 行程规划

| 轮次 | 消息 | 预期 Tool | 预期卡片 | 验证点 |
|------|------|-----------|---------|--------|
| 1 | "周末想看个轻松的喜剧" | searchMovies(type=喜剧) | movie_list | 按类型过滤，返回喜剧片 |
| 2 | "帮我查笑傲江湖3在长沙学院的场次" | querySessions | session_list | 场次列表 |
| 3 | "2张" | — | — | 追问选座 |
| 4 | "帮我看座位图" | getSeatMap | seat_map | 含 price 字段 |
| 5 | "选B3和B4" | lockAndCreateOrder | order_confirm | 2 张票，seatInfo=B3,B4 |
| 6 | "怎么去长沙学院" | planRoute | route_info | 路线规划 |
| 7 | "附近有停车场吗" | searchNearby(keywords=停车场) | nearby_poi | 停车场列表 |

```bash
node C:\Users\86139\.codely-cli\skills\miaoyu-agent-test\scripts\test_agent.cjs "周末想看个轻松的喜剧" "帮我查笑傲江湖3在长沙学院的场次" "2张" "帮我看座位图" "选B3和B4" "怎么去长沙学院" "附近有停车场吗"
```

#### 场景 C：订单查询 + 支付 + 退票

| 轮次 | 消息 | 预期 Tool | 预期卡片 | 验证点 |
|------|------|-----------|---------|--------|
| 1 | "查看我的订单" | queryOrders | order_list | 返回订单列表 |
| 2 | "帮我查第一个订单详情" | queryOrderDetail | order_success | 订单详情含取票码 |
| 3 | "帮我支付待支付的那个订单" | queryOrders → payOrder | order_success | 支付成功，返回取票码 |
| 4 | "帮我退票" | queryOrders → refundOrder | order_success | 退票成功 |

```bash
node C:\Users\86139\.codely-cli\skills\miaoyu-agent-test\scripts\test_agent.cjs "查看我的订单" "帮我查第一个订单详情" "帮我支付待支付的那个订单" "帮我退票"
```

#### 场景 D：选影院后主动提示行程规划

| 轮次 | 消息 | 预期 Tool | 预期卡片 | 验证点 |
|------|------|-----------|---------|--------|
| 1 | "我想看星际穿越2" | searchMovies → searchCinemas | cinema_list | 回复末尾提示"需要规划路线吗" |
| 2 | "是的，从长沙南站怎么去" | planRoute | route_info | 路线规划 |
| 3 | "到了附近有什么逛的" | searchNearby | nearby_poi | 周边景点 |

```bash
node C:\Users\86139\.codely-cli\skills\miaoyu-agent-test\scripts\test_agent.cjs "我想看星际穿越2" "是的，从长沙南站怎么去" "到了附近有什么逛的"
```

## SSE 事件类型

| event | 含义 |
|-------|------|
| `card` | 工具调用产生的卡片数据 |
| `message` | AI 文本回复 |
| `done` | 对话轮次结束 |
| `error` | 错误 |

## 卡片类型

| cardType | 数据来源 | 说明 |
|----------|---------|------|
| `movie_list` | searchMovies | 影片列表 |
| `cinema_list` | searchCinemas | 影院列表 |
| `session_list` | querySessions | 场次列表 |
| `seat_map` | getSeatMap | 座位图（含 price 字段） |
| `order_confirm` | lockAndCreateOrder | 锁座下单确认 |
| `order_success` | payOrder/queryOrderDetail/cancelOrder/refundOrder | 订单详情/支付成功 |
| `order_list` | queryOrders | 订单列表 |
| `route_info` | planRoute | 路线规划结果 |
| `nearby_poi` | searchNearby | 周边POI搜索结果 |
| `weather_info` | getWeather | 天气查询结果 |

## 已知坑点（已修复，供排查参考）

1. **`extractRows` 字段名**：`PageResult` 列表字段是 `records`，不是 `"movies"` / `"cinemas"` / `"sessions"`
2. **`/internal` 参数名必须一致**：如场次日期参数为 `date`（不是 `showDate`）
3. **`MovieRow`/`CinemaRow`/`SessionRow`**：字段名必须与 VO 的 JSON 字段一致；Jackson 全局已关闭 `FAIL_ON_UNKNOWN_PROPERTIES`
4. **`LocalDateTime` 序列化**：不要 `convertValue(entity, Map.class)` 再写 MongoDB，直接传实体对象给 `MongoTemplate`
5. **MongoDB 密码含 `@`**：不能用 URI 模式，改用独立属性（host/port/username/password）
6. **DeepSeek base-url**：必须是 `https://api.deepseek.com/v1`
7. **Java 26 + Lombok 不兼容**：编译用 Java 21（`C:\Users\86139\.jdks\ms-21.0.10`）
8. **movie types 存中文值**：DB 存 `["爱情"]`，agent `@P` 注解传中文枚举值（科幻/动作/喜剧/爱情/悬疑/动画/纪录片/其他），前端 MOVIE_TYPES value 也为中文。**注意：合并后可能丢失复发，需同步检查 DB 值、前端 MOVIE_TYPES、agent TicketTools @P 注解三处。**
9. **Tool 纯透传模式**：TicketTools 所有 @Tool 参数和返回值均为 String，不做格式化/转换。日期解析（今天/明天→YYYY-MM-DD）由 LLM 完成，不再有 resolveRelativeDate 方法。LLM 返回结构化 JSON（AgentResponse: content/intent/slots），由 LangChain4j Structured Output 自动反序列化。
10. **Jackson 3.x 注解包名**：注解仍用 `com.fasterxml.jackson.annotation`（不是 `tools.jackson.annotation`），只有 core/databind 改到 `tools.jackson`
11. **common 模块编译**：需先 `mvn install -pl common -am` 再编译子模块
12. **AgentApplication 扫描**：需 `@ComponentScan(basePackages={"org.dherhf"})` 扫描 common 模块
13. **网关后测试脚本必须走 9000**：直连 8081 会缺 `X-User-Id` header 导致 400
14. **`/internal/**` 需 X-Internal-Token**：ticket-service 的 `InternalTokenInterceptor` 校验 `X-Internal-Token` header（值 `miaoyu-internal-token-2026`），FeignConfig 全局注入

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

## Agent @Tool 清单（13 个）

### 购票工具（10 个）

| Tool | 触发场景 |
|------|---------|
| `searchMovies(keyword, type, cinemaId)` | 用户想看电影 / 模糊推荐 / 按影院查影片 |
| `searchCinemas(movieId, keyword, facilities)` | 用户问影院（movieId 过滤有排片的影院） |
| `querySessions(movieId, cinemaId, date)` | 用户查场次（date 由 LLM 解析为 YYYY-MM-DD） |
| `getSeatMap(scheduleId)` | 用户选座 |
| `queryOrders(status)` | 用户查订单 |
| `queryOrderDetail(orderId)` | 用户查具体订单 |
| `lockAndCreateOrder(scheduleId, seatIds, ticketCount, requestId)` | 锁座下单 |
| `payOrder(orderId, requestId)` | 支付订单 |
| `cancelOrder(orderId, requestId)` | 取消订单 |
| `refundOrder(orderId, requestId)` | 退票 |

### 行程规划工具（3 个，通过高德地图代理 API）

| Tool | 触发场景 | 调用 |
|------|---------|------|
| `planRoute(origin, destination, mode)` | 用户问怎么去影院/导航/路线 | AmapClient.getRoute → 高德路径规划（driving/transit/walking） |
| `searchNearby(location, keywords)` | 用户问影院附近有什么（餐饮/停车/地铁等） | AmapClient.searchNearby → 高德周边POI搜索 |
| `getWeather(city)` | 用户问观影当天天气 | AmapClient.getWeather → 高德天气查询 |

**行程规划架构**：TicketTools 内部通过 `resolveCoordinates(placeName)` 将地名转坐标——先查影院表（有预存 longitude/latitude），未命中再调 `AmapClient.geocode()` 高德地理编码。

## 测试通过后提交 PR

测试通过后，按蚂蚁集团 git 规范提交并创建 PR：

### 1. 编译验证

```bash
$env:JAVA_HOME = "C:\Users\86139\.jdks\ms-21.0.10"
& "D:\Ai\idea\IntelliJ IDEA 2026.1.3\plugins\maven-plugin\lib\maven3\bin\mvn.cmd" clean install -pl common -am -q
& "D:\Ai\idea\IntelliJ IDEA 2026.1.3\plugins\maven-plugin\lib\maven3\bin\mvn.cmd" test -pl agent-service
& "D:\Ai\idea\IntelliJ IDEA 2026.1.3\plugins\maven-plugin\lib\maven3\bin\mvn.cmd" test -pl ticket-service
```

### 2. 提交

```powershell
# PowerShell -m 会破坏中文，必须用 -F <file>
git add -A
git commit -F <commit_msg_file>
Remove-Item <commit_msg_file> -Force
```

### 3. 分支命名（蚂蚁规范：type/brief-description kebab-case）

```bash
git branch -m <old> refactor/<brief-description>
```

### 4. 推送（需 Clash 代理）

```powershell
$env:HTTP_PROXY="http://127.0.0.1:7890"; $env:HTTPS_PROXY="http://127.0.0.1:7890"
git push -u origin <new-branch>
```

### 5. 创建 PR

优先 `gh pr create`，其次 GitHub API（需 GITHUB_TOKEN），最后浏览器：
```
https://github.com/dherhf/miaoyu/pull/new/<branch>
```

PR 描述模板包含：变更概要（分 section 列 bullet）+ 测试结果（测试数 + ✅）。

### 6. 系分文档同步（语雀）

如有 API 变更，同步更新语雀系分文档：
```bash
node C:\Users\86139\.codely-cli\skills\yuque-md-clean\scripts\yuque_api.cjs fetch yuqueyonghuznugvo/zif8xc <slug> -o <output.md>
# 修改后推送
node C:\Users\86139\.codely-cli\skills\yuque-md-clean\scripts\yuque_api.cjs update yuqueyonghuznugvo/zif8xc <slug> <modified.md>
```

后端系分 slug: `qo9yd3gv5y8rxzov` | 前端系分 slug: `lvxcae6nmrvxyawe`
