/**
 * The project's only door to the AI SDK (DESIGN §2.1, §4).
 *
 * Four functions, each with its own success rule; anything short of success
 * throws AIUnavailableError, so callers handle exactly one AI error. Truncated,
 * refused, filtered or blank output is a failure, never a partial result.
 * A system prompt is required on every call: without one the relay injects its
 * own coding-agent prompt (DESIGN §8).
 */

import OpenAI from 'openai';
import { zodResponseFormat, zodTextFormat } from 'openai/helpers/zod';
import { z, type ZodType } from 'zod';
import { getClient } from './client';
import { MODEL, PURPOSES, type AIPurpose } from './config';
import { getPromptContent } from './prompts';

export type { AIPurpose } from './config';
export { AI_FAILURE_TEXT } from './failure-text';
export type ChatMessage = OpenAI.Chat.ChatCompletionMessageParam;
export type ToolDefinition = OpenAI.Chat.ChatCompletionTool;

export interface ToolCall {
  id: string;
  name: string;
  args: Record<string, unknown>;
}

export interface FileInput {
  fileName: string;
  mimeType: string;
  base64: string;
}

export type AIFailureReason =
  | 'error'
  | 'timeout'
  | 'truncated'
  | 'refused'
  | 'filtered'
  | 'blank'
  | 'invalid_output';

export class AIUnavailableError extends Error {
  constructor(
    readonly purpose: AIPurpose,
    readonly reason: AIFailureReason,
    options?: { cause?: unknown }
  ) {
    super(`AI call for ${purpose} failed: ${reason}`, options);
    this.name = 'AIUnavailableError';
  }
}

export async function generateText(req: {
  purpose: AIPurpose;
  system: string;
  prompt: string;
}): Promise<string> {
  const body = chatBody(req.purpose, req.system, [{ role: 'user', content: req.prompt }]);
  const completion = await send(req.purpose, opts => getClient().chat.completions.create(body, opts));
  return chatOutcome(req.purpose, completion, false).text;
}

/**
 * An object schema is sent as a strict JSON schema; any other schema (e.g. a
 * free-form record) falls back to JSON mode and is checked after parsing.
 * With an attachment the call goes through the Responses API, the one that
 * accepts PDF input.
 */
export async function generateJSON<T>(req: {
  purpose: AIPurpose;
  system: string;
  prompt: string;
  schema: ZodType<T>;
  attachment?: FileInput;
}): Promise<T> {
  const { purpose, system, prompt, schema, attachment } = req;
  const strict = schema instanceof z.ZodObject;
  let raw: string;

  if (attachment) {
    const body = {
      ...responsesBody(purpose, system, prompt, attachment),
      text: { format: strict ? zodTextFormat(schema, purpose) : { type: 'json_object' as const } },
    };
    const response = await send(purpose, opts => getClient().responses.create(body, opts));
    raw = responsesOutcome(purpose, response);
  } else {
    const body = {
      ...chatBody(purpose, system, [{ role: 'user', content: prompt }]),
      response_format: strict ? zodResponseFormat(schema, purpose) : { type: 'json_object' as const },
    };
    const completion = await send(purpose, opts => getClient().chat.completions.create(body, opts));
    raw = chatOutcome(purpose, completion, false).text;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    throw fail(purpose, 'invalid_output', e);
  }
  const result = schema.safeParse(parsed);
  if (!result.success) throw fail(purpose, 'invalid_output', result.error);
  return result.data;
}

/** One agent turn. An empty `tools` list asks for a final answer with no tools offered. */
export async function chatWithTools(req: {
  system: string;
  messages: ChatMessage[];
  tools: ToolDefinition[];
}): Promise<{ text: string; toolCalls: ToolCall[] }> {
  const offered = req.tools.length > 0;
  const base = chatBody('chat', req.system, req.messages);
  const body = offered ? { ...base, tools: req.tools, tool_choice: 'auto' as const } : base;
  const completion = await send('chat', opts => getClient().chat.completions.create(body, opts));
  // With no tools offered a tool call is not an answer.
  return chatOutcome('chat', completion, offered);
}

/** Text of a scanned PDF or an image. */
export async function readDocumentText(file: FileInput): Promise<string> {
  const body = responsesBody('ocr', getPromptContent('pdf-extract.md'), '提取这份文档中的全部文字。', file);
  const response = await send('ocr', opts => getClient().responses.create(body, opts));
  return responsesOutcome('ocr', response);
}

// ---------------------------------------------------------------------------

function requireSystem(system: string): string {
  if (!system.trim()) throw new Error('AI calls require a non-empty system prompt');
  return system;
}

function chatBody(purpose: AIPurpose, system: string, messages: ChatMessage[]) {
  return {
    model: MODEL,
    messages: [{ role: 'system' as const, content: requireSystem(system) }, ...messages],
    max_completion_tokens: PURPOSES[purpose].outputBudget,
  };
}

function responsesBody(purpose: AIPurpose, system: string, prompt: string, file: FileInput) {
  return {
    model: MODEL,
    instructions: requireSystem(system),
    max_output_tokens: PURPOSES[purpose].outputBudget,
    input: [
      {
        role: 'user' as const,
        content: [{ type: 'input_text' as const, text: prompt }, fileContent(file)],
      },
    ],
  };
}

function fileContent(file: FileInput): OpenAI.Responses.ResponseInputContent {
  const dataUrl = `data:${file.mimeType};base64,${file.base64}`;
  if (file.mimeType === 'application/pdf') {
    return { type: 'input_file', filename: file.fileName, file_data: dataUrl };
  }
  if (file.mimeType.startsWith('image/')) {
    return { type: 'input_image', image_url: dataUrl, detail: 'high' };
  }
  throw new Error(`Unsupported attachment type: ${file.mimeType}`);
}

/**
 * Runs one SDK call under the purpose's time limit. The limit covers the retry
 * too: the SDK's own timeout is per attempt and its wait before a retry ignores
 * the abort signal, so the call races the limit rather than relying on the SDK
 * to notice. Anything the call throws is the relay's doing (the request body is
 * built before it), including a 200 whose body is cut off.
 */
async function send<T>(
  purpose: AIPurpose,
  call: (opts: OpenAI.RequestOptions) => Promise<T>
): Promise<T> {
  const { timeoutMs } = PURPOSES[purpose];
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const limit = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(fail(purpose, 'timeout'));
    }, timeoutMs);
  });
  try {
    return await Promise.race([call({ timeout: timeoutMs, signal: controller.signal }), limit]);
  } catch (e) {
    if (e instanceof AIUnavailableError) throw e;
    throw fail(purpose, controller.signal.aborted ? 'timeout' : 'error', e);
  } finally {
    clearTimeout(timer);
  }
}

function chatOutcome(
  purpose: AIPurpose,
  completion: OpenAI.Chat.ChatCompletion,
  allowToolCalls: boolean
): { text: string; toolCalls: ToolCall[] } {
  const choice = completion?.choices?.[0];
  if (!choice?.message) throw fail(purpose, 'blank');
  const { message, finish_reason: finish } = choice;

  if (message.refusal) throw fail(purpose, 'refused');
  if (finish === 'length') throw fail(purpose, 'truncated');
  if (finish === 'content_filter') throw fail(purpose, 'filtered');

  const rawCalls = message.tool_calls ?? [];
  if (allowToolCalls && rawCalls.length > 0 && (finish === 'tool_calls' || finish === 'stop')) {
    const toolCalls = rawCalls.map(tc => ({
      id: tc.id,
      name: tc.function.name,
      args: parseToolArgs(purpose, tc.function.arguments),
    }));
    return { text: message.content ?? '', toolCalls };
  }

  if (finish !== 'stop') throw fail(purpose, 'invalid_output');
  const text = message.content ?? '';
  if (!text.trim()) throw fail(purpose, 'blank');
  return { text, toolCalls: [] };
}

function parseToolArgs(purpose: AIPurpose, raw: string): Record<string, unknown> {
  let args: unknown;
  try {
    args = JSON.parse(raw);
  } catch (e) {
    throw fail(purpose, 'invalid_output', e);
  }
  if (typeof args !== 'object' || args === null || Array.isArray(args)) {
    throw fail(purpose, 'invalid_output');
  }
  return args as Record<string, unknown>;
}

function responsesOutcome(purpose: AIPurpose, response: OpenAI.Responses.Response): string {
  if (response.status !== 'completed') {
    const reason = response.incomplete_details?.reason;
    throw fail(purpose, reason === 'content_filter' ? 'filtered' : reason ? 'truncated' : 'error');
  }
  const messages = (response.output ?? []).filter(item => item.type === 'message');
  if (messages.some(m => m.content.some(c => c.type === 'refusal'))) throw fail(purpose, 'refused');
  // A message can be cut off inside a response that reports itself completed.
  if (messages.some(m => m.status === 'incomplete' || m.status === 'in_progress')) throw fail(purpose, 'truncated');
  const text = response.output_text ?? '';
  if (!text.trim()) throw fail(purpose, 'blank');
  return text;
}

function fail(purpose: AIPurpose, reason: AIFailureReason, cause?: unknown): AIUnavailableError {
  console.error(`[ai] ${purpose} failed: ${reason}`, cause ?? '');
  return new AIUnavailableError(purpose, reason, { cause });
}
