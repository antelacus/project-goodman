/**
 * Session Title Generator
 *
 * Generates concise Chinese titles for conversation sessions based on the first user message.
 */

import { generateText } from "@/lib/ai";
import { getPromptContent } from "@/lib/ai/prompts";

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
        const title = (
            await generateText({ purpose: "title", system: SESSION_TITLE_PROMPT, prompt: firstMessage })
        ).trim();
        // Ensure title isn't too long (truncate if necessary)
        return title.length > 20 ? title.substring(0, 20) : title;
    } catch (error) {
        console.error("Error generating session title:", error);
    }

    // Fallback: truncate the first message
    return firstMessage.length > 15
        ? firstMessage.substring(0, 15) + "..."
        : firstMessage;
}
