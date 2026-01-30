/**
 * Session Title Generator
 *
 * Generates concise Chinese titles for conversation sessions based on the first user message.
 */

import OpenAI from "openai";
import { AI_CONFIG } from "@/lib/ai/config";
import { getPromptContent } from "@/lib/ai/prompts";

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: process.env.OPENAI_BASE_URL,
});

const SESSION_TITLE_PROMPT = getPromptContent('session-title.md');

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
            model: AI_CONFIG.models.title,
            messages: [
                {
                    role: "system",
                    content: SESSION_TITLE_PROMPT
                },
                {
                    role: "user",
                    content: firstMessage
                }
            ],
            temperature: AI_CONFIG.params.title.temperature,
            max_tokens: AI_CONFIG.params.title.maxTokens,
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
