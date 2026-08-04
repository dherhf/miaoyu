

## Codely Structured Memories

### User

### Feedback
- [2026-08-04 17:23:54] Git 提交策略：保持线性历史（linear history），禁止 merge commit，使用 rebase 策略。
### Project
- [2026-08-04 22:41:19] user-web 前端项目从 antd-mobile 迁移到 antd，已完成全量迁移（2026-08-04）。关键决策：①全局 message 通过 shared/globalMessage.ts 注入（参考 web-admin-front 模式）；②导航栏从自定义 NavBar 演进为 layouts/Header.tsx（固定标题，合并通知/用户/AI对话）；③tsconfig.app.json 移除 baseUrl（TS7 不支持），paths 改为相对路径 ./src/*；④typescript 版本从 ~6.0.2 修正为 ^7.0.2（6.0.2 不存在，latest 为 7.0.2）；⑤响应式布局：page-content 随断点递增 padding + ≥1024px 居中限宽，card-grid 1→2→3 列，form-container 居中 max-width 400px。 - [2026-08-04 21:42:00] user-web 已完成 Tailwind CSS v4 迁移（@tailwindcss/vite 插件）。设计令牌通过 @theme 定义（--color-muted/heading/surface/border/accent/accent-soft/accent-line/surface-alt/rating/danger），暗色模式通过 @media(prefers-color-scheme:dark) 覆写 :root 变量。base 样式放入 @layer base 以便 Tailwind 工具类覆盖。所有 BEM 类名已移除，内联样式已转为 Tailwind 工具类（antd 组件覆盖用 !important 后缀）。仅保留动画 keyframes（chat-bubble-enter/typing-dot/skeleton-pulse）在 index.css 中。ChatListPage 的 antd Button 仍用 inline style 因 antd CSS-in-JS 优先级高于 @layer。

- [2026-08-04 22:41:13] user-web 导航栏持久化架构（2026-08-04，参考 web-admin-front/src/layouts 模式，无侧边栏）：src/layouts/MainLayout.tsx（h-svh 容器：Header + 独立滚动 main + footer）为路由父 layout。Header.tsx 合并原 NavBar+NavBarRight，固定标题「妙语购票」，已登录时显示通知铃铛/用户菜单/AI对话按钮。navBarStore.ts（layouts/）提供 useHeaderBack(showBack, backPath?) 配置返回按钮（外部 store + useSyncExternalStore，仅存原始值）。旧文件已删除：shared/Layout.tsx、shared/NavBar.tsx、shared/NavBarRight.tsx、shared/navBarStore.ts。
- [2026-08-04 23:45:29] agent-service 使用 Jackson 3.x（tools.jackson 包），通过 Spring Boot 4.1.0 的 spring-boot-starter-jackson 传递依赖引入。关键：Jackson 3.x 注解模块仍保留在 com.fasterxml.jackson.annotation 包（JsonInclude/JsonFormat 等），而 ObjectMapper/TypeReference 迁移至 tools.jackson.databind/tools.jackson.core。JsonProcessingException 在 3.x 中改为 JacksonException（unchecked），无需 throws 声明。MongoConfig 中已移除手动 new ObjectMapper() 的 @Bean，改用 Spring Boot 自动配置的 ObjectMapper。

### Reference

