/**
 * Tool Registry
 *
 * Centralized registry for all tools in the system.
 * Provides:
 * - Tool registration and retrieval
 * - Category-based filtering
 * - Conversion to OpenAI function definitions
 * - Unified tool execution with validation
 */

import type {
  Tool,
  ToolCategory,
  ToolExecutionResult,
  ChatCompletionTool,
  ToolContext,
} from "./types";
import { z } from "zod";

// ============================================================================
// ToolRegistry Class
// ============================================================================

export class ToolRegistry {
  private tools: Map<string, Tool> = new Map();

  /**
   * Register a tool in the registry
   * @throws Error if tool with same name already exists
   */
  register<TInput, TOutput>(tool: Tool<TInput, TOutput>): void {
    if (this.tools.has(tool.name)) {
      // Already registered, skip
      return;
    }
    this.tools.set(tool.name, tool as Tool);
  }

  /**
   * Register multiple tools at once
   */
  registerAll(tools: Tool[]): void {
    tools.forEach((tool) => this.register(tool));
  }

  /**
   * Get a tool by name
   */
  get<TInput = unknown, TOutput = unknown>(
    name: string
  ): Tool<TInput, TOutput> | undefined {
    return this.tools.get(name) as Tool<TInput, TOutput> | undefined;
  }

  /**
   * Check if a tool exists
   */
  has(name: string): boolean {
    return this.tools.has(name);
  }

  /**
   * Get all registered tools
   */
  getAll(): Tool[] {
    return Array.from(this.tools.values());
  }

  /**
   * Get tools by category
   */
  getByCategory(category: ToolCategory): Tool[] {
    return this.getAll().filter((tool) => tool.category === category);
  }

  /**
   * Get all tool names
   */
  getNames(): string[] {
    return Array.from(this.tools.keys());
  }

  /**
   * Get tool count
   */
  get size(): number {
    return this.tools.size;
  }

  // ==========================================================================
  // OpenAI Integration
  // ==========================================================================

  /**
   * Convert all registered tools to OpenAI function definitions
   */
  toOpenAIFunctionDefs(): ChatCompletionTool[] {
    return this.getAll().map((tool) => ({
      type: "function",
      function: {
        name: tool.name,
        description: tool.description,
        parameters: this.zodSchemaToOpenAI(tool.inputSchema),
      },
    }));
  }

  /**
   * Convert a Zod schema to OpenAI function parameters.
   * io "input": the model writes what the schema parses, so defaulted fields are optional.
   */
  private zodSchemaToOpenAI(schema: z.ZodType): Record<string, unknown> {
    const parameters: Record<string, unknown> = z.toJSONSchema(schema, { io: "input" });
    // The dialect marker is not a parameter; the model would only pay tokens for it.
    delete parameters.$schema;
    return parameters;
  }

  // ==========================================================================
  // Tool Execution
  // ==========================================================================

  /**
   * Execute a tool by name with input validation
   */
  async execute<TOutput = unknown>(
    name: string,
    input: unknown,
    context: ToolContext = {}
  ): Promise<ToolExecutionResult<TOutput>> {
    const tool = this.get(name);

    if (!tool) {
      return {
        success: false,
        error: `Tool "${name}" not found`,
      };
    }

    try {
      // Validate input
      const validationResult = tool.inputSchema.safeParse(input);
      if (!validationResult.success) {
        return {
          success: false,
          error: `Input validation failed: ${validationResult.error.message}`,
          invalidInput: true,
        };
      }

      // Execute tool
      const result = await tool.execute(validationResult.data, context);
      return result as ToolExecutionResult<TOutput>;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // ==========================================================================
  // Utility Methods
  // ==========================================================================

  /**
   * Get tools as a list for display/debugging
   */
  toList(): Array<{
    name: string;
    displayName: string;
    category: ToolCategory;
    description: string;
  }> {
    return this.getAll().map((tool) => ({
      name: tool.name,
      displayName: tool.displayName,
      category: tool.category,
      description: tool.description,
    }));
  }

  /**
   * Generate a human-readable capabilities summary for system prompts
   * Groups tools by category with Chinese descriptions
   */
  generateCapabilitiesSummary(): string {
    const tools = this.getAll();

    // Group tools by category
    const byCategory = new Map<ToolCategory, Tool[]>();
    for (const tool of tools) {
      const list = byCategory.get(tool.category) || [];
      list.push(tool);
      byCategory.set(tool.category, list);
    }

    // Category display names in Chinese
    const categoryNames: Record<ToolCategory, string> = {
      financial: "财务比率计算",
      query: "数据查询与计算",
      search: "文档搜索",
      extraction: "信息提取",
      storage: "存储工具",
      compliance: "法规搜索",
    };

    // Build summary
    const sections: string[] = [];

    // Define category order (only include categories that have tools)
    const categoryOrder: ToolCategory[] = [
      "query",
      "financial",
      "search",
      "compliance",
      "extraction",
    ];

    for (const category of categoryOrder) {
      const categoryTools = byCategory.get(category);
      if (!categoryTools || categoryTools.length === 0) continue;

      const categoryName = categoryNames[category];
      const toolLines = categoryTools.map(
        (t) => `- \`${t.name}\`: ${t.displayName}`
      );

      sections.push(`### ${categoryName}\n${toolLines.join("\n")}`);
    }

    return sections.join("\n\n");
  }

  /**
   * Clear all registered tools (useful for testing)
   */
  clear(): void {
    this.tools.clear();
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

/**
 * Global tool registry instance
 *
 * Use this for application-wide tool registration.
 * Tools should be registered at application startup.
 */
export const toolRegistry = new ToolRegistry();
