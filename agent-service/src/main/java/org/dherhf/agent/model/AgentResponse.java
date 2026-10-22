package org.dherhf.agent.model;

import org.dherhf.agent.enums.IntentEnum;
import org.dherhf.agent.model.ticket.SlotState;

/**
 * LLM 结构化响应（预留）。
 * <p>
 * 当前对话链路仍以提示词约定输出元数据块，再由 ChatService 解析；
 * 如需改为 Spring AI Structured Output，可通过
 * {@code ChatClient.call().entity(AgentResponse.class)} 自动反序列化。
 * </p>
 *
 * @param content 自然语言回复文本
 * @param intent  用户意图枚举
 * @param slots   本轮提取的槽位状态
 */
public record AgentResponse(String content, IntentEnum intent, SlotState slots) {
}
