

## Codely Structured Memories

### User

### Feedback

### Project
- [2026-08-08 19:13:56] Streamdown (chat markdown renderer) uses shadcn/ui design tokens internally. Three fixes needed: (1) Add corresponding `--color-*` vars in `@theme` and `.dark` (foreground, background, sidebar, primary, primary-foreground, muted-foreground). (2) Tailwind v4 cannot detect classes in Streamdown's compiled JS — `@source` and `@source inline("...")` both fail for variant classes (hover:, disabled:, /80 opacity). Solution: `src/streamdown-classes.tsx` — a hidden `<div>` with all Streamdown class names in a `className` prop; Tailwind scans `.tsx` files in `src/` correctly. (3) `--color-muted` conflict: project uses it as text color (#6b6375, 110+ `text-muted` refs), Streamdown's `bg-muted` needs light bg. Resolution: scoped override `[data-streamdown] { --color-muted: ... }` since Streamdown uses `text-muted-foreground` for text. **Why:** transparent popup/overlay backgrounds, non-functional fullscreen button. **How to apply:** when upgrading Streamdown, re-check `node_modules/streamdown/dist/chunk-*.js` for new utility classes and update `src/streamdown-classes.tsx`.
- [2026-08-09 23:01:13] LangChain4j 1.18.1 API 注意事项：ChatMemoryProvider 在 dev.langchain4j.memory.chat 包（非 dev.langchain4j.memory）；@AiService 在 dev.langchain4j.service.spring.AiService（Spring Boot4 Starter jar 内）；@ToolMemoryId 在 dev.langchain4j.agent.tool.ToolMemoryId（langchain4j-core jar 内）；@V 在 dev.langchain4j.service.V（langchain4j core jar 内）。@ToolMemoryId 可将 @MemoryId 值自动注入到 @Tool 方法参数（LLM 不可见），适用于单例 Bean 工具类需按 session 隔离状态的场景。流式响应的工具调用在 HTTP 客户端线程执行，ThreadLocal 不可见，必须用 @ToolMemoryId + ConcurrentHashMap 替代。AiServiceFactory（1.18.1-beta28）不暴露 systemMessageProvider 装配（无对应字段/setter），动态系统提示词须用 @SystemMessage("{{var}}") + @V("var") 透传，调用方传入 promptService.getSystemPrompt()。LangChain4jAutoConfiguration 不注册默认 ChatMemoryProvider，须自定义 @Bean；注册 ChatMemory（非 Provider）会导致所有会话共享单例记忆，破坏隔离。OpenAI 配置前缀：langchain4j.open-ai.streaming-chat-model.*。@AiService 的 wiringMode=EXPLICIT 可选择性装配组件：只需在注解属性中指定 Bean 名称（如 chatModel = "openAiChatModel"），未指定的组件跳过装配。OpenAiAutoConfiguration 注册的 Bean 名称：ChatModel → "openAiChatModel"，StreamingChatModel → "openAiStreamingChatModel"。无状态单次调用的 AiService（如标题生成、意图识别）用 EXPLICIT + 仅 chatModel，避免自动装配 ChatMemoryProvider 和 @Tool Bean。@SystemMessage 注解可直接用 Java 21 text block 写静态提示词；含运行时拼接的提示词（如 IntentEnum.toPromptList()）用 @SystemMessage("{{systemPrompt}}") + @V("systemPrompt") 透传。


- [2026-08-10 00:11:44] agent-service 架构：ChatService（org.dherhf.agent.service.agent 包）是实际使用的类（ChatController 依赖它）。流水线：①IntentService（意图识别，非流式 ChatModel，在 processDialogue 中调用，仅传入当前消息不含历史）②ChatAssistant（主对话+工具调用，流式 StreamingChatModel，@AiService 声明式，org.dherhf.agent.service.assistant 包）③主 Agent 输出末尾仍用 <<<META>>>JSON 分隔符提取 slots（SlotState POJO），ID 类槽位（scheduleId/seatIds）由工具回填。用户偏好（UserPreferenceDocument）写入上下文提示词（buildContextPrompt 方法）。前端不传 seatIds/scheduleId/ticketCount，全部由 LLM 工具调用提取。包结构：service/agent/（ChatService, IntentService, TitleService）、service/assistant/（ChatAssistant, IntentAssistant, TitleAssistant）。TitleAssistant/IntentAssistant 用 @AiService EXPLICIT 模式仅装配 chatModel，无 ChatMemory。





### Reference

