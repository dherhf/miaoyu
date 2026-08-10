package org.dherhf.agent.service.assistant;

import dev.langchain4j.service.SystemMessage;
import dev.langchain4j.service.UserMessage;
import dev.langchain4j.service.spring.AiService;
import dev.langchain4j.service.spring.AiServiceWiringMode;

/**
 * 标题生成 Agent —— 声明式 AiService，使用非流式 ChatModel。
 * <p>
 * {@code wiringMode = EXPLICIT} 仅装配 {@code chatModel}，
 * 不引入 ChatMemoryProvider（标题生成是无状态单次调用）。
 * </p>
 */
@AiService(wiringMode = AiServiceWiringMode.EXPLICIT, chatModel = "openAiChatModel")
public interface TitleAssistant {

    @SystemMessage("""
            你是妙语购票的对话标题助手。根据用户的第一条消息，生成一个不超过 20 字的中文标题，概括其核心需求。
            只输出标题本身，不要任何解释、引号或标点符号。
            示例：用户说"我想买两张流浪地球3的票" → 输出"购买流浪地球3电影票"
            示例：用户说"查一下我的订单" → 输出"查询订单"
            """)
    String generateTitle(@UserMessage String userMessage);
}
