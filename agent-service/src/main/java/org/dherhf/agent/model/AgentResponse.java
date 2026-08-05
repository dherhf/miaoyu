package org.dherhf.agent.model;

import org.dherhf.agent.enums.IntentEnum;
import org.dherhf.agent.model.ticket.SlotState;

/**
 * LLM 结构化响应，由 LangChain4j Structured Output 自动反序列化。
 * <p>
 * 框架根据此 record 自动生成 JSON Schema 注入 System Prompt，
 * LLM 按约束返回 JSON，无需手动提取和解析。
 * </p>
 *
 * @param content 自然语言回复文本
 * @param intent  用户意图枚举
 * @param slots   本轮提取的槽位状态
 */
public record AgentResponse(String content, IntentEnum intent, SlotState slots) {
}
