/**
 * Session Title Generator
 *
 * Generates concise Chinese titles for conversation sessions based on the first user message.
 */

import OpenAI from "openai";

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: process.env.OPENAI_BASE_URL,
});

/**
 * Generates a short Chinese session title based on the user's first message.
 * @param firstMessage The first user message in the conversation
 * @returns A short title (max ~20 chars) in Chinese
 */
export async function generateSessionTitle(firstMessage: string): Promise<string> {
    // If message is very short, just use it directly
    if (firstMessage.length <= 15) {
        return firstMessage;
    }

    try {
        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "system",
                    content: `你是一个会话标题生成器。根据用户的第一条消息，生成一个简短的中文标题（最多15个字）。
标题应该：
- 概括对话的主题或目的
- 使用简洁的中文表达
- 不要使用引号或标点符号
- 只输出标题，不要其他内容

示例：
用户消息："请帮我查看2024年第三季度的存货周转率"
输出：2024Q3存货周转分析

用户消息："公司的流动比率是多少"
输出：流动比率查询

用户消息："帮我提取这份财务报表里的关键数据"
输出：财务报表数据提取`
                },
                {
                    role: "user",
                    content: firstMessage
                }
            ],
            temperature: 0.3,
            max_tokens: 50,
        });

        const title = completion.choices[0]?.message?.content?.trim();

        if (title && title.length > 0) {
            // Ensure title isn't too long (truncate if necessary)
            return title.length > 20 ? title.substring(0, 20) : title;
        }
    } catch (error) {
        console.error("Error generating session title:", error);
    }

    // Fallback: truncate the first message
    return firstMessage.length > 15
        ? firstMessage.substring(0, 15) + "..."
        : firstMessage;
}
