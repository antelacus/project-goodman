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
  ToOpenAIOptions,
  OpenAIParameterSchema,
} from "./types";
import { isFinancialTool } from "./types";

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
  toOpenAIFunctionDefs(options?: ToOpenAIOptions): ChatCompletionTool[] {
    let tools = this.getAll();

    // Filter by category if specified
    if (options?.category) {
      tools = tools.filter((tool) => tool.category === options.category);
    }

    return tools.map((tool) =>
      this.toolToOpenAIFormat(tool, options)
    );
  }

  /**
   * Convert a single tool to OpenAI format
   */
  private toolToOpenAIFormat(
    tool: Tool,
    options?: ToOpenAIOptions
  ): ChatCompletionTool {
    // Check for parameter overrides
    if (options?.parameterOverrides?.[tool.name]) {
      return {
        type: "function",
        function: {
          name: tool.name,
          description: this.buildDescription(tool, options),
          parameters: options.parameterOverrides[tool.name],
        },
      };
    }

    // Build parameters from Zod schema
    const parameters = this.zodSchemaToOpenAI(tool.inputSchema);

    return {
      type: "function",
      function: {
        name: tool.name,
        description: this.buildDescription(tool, options),
        parameters,
      },
    };
  }

  /**
   * Build tool description for OpenAI
   */
  private buildDescription(tool: Tool, options?: ToOpenAIOptions): string {
    if (!options?.detailed) {
      return tool.description;
    }

    // For detailed mode, include additional context
    const parts = [tool.description];

    if (isFinancialTool(tool)) {
      const meta = tool.metadata.financial;
      parts.push(`需要的数据：${meta.requiredInputs.join("、")}。`);
      parts.push(`公式：${meta.formulaDisplay}`);
    }

    return parts.join(" ");
  }

  /**
   * Convert Zod schema to OpenAI parameter format
   * This is a simplified implementation - handles common cases
   */
  private zodSchemaToOpenAI(schema: unknown): OpenAIParameterSchema {
    // Default schema for unknown types
    const defaultSchema: OpenAIParameterSchema = {
      type: "object",
      properties: {},
      required: [],
    };

    // Try to extract shape from Zod object schema
    if (schema && typeof schema === "object" && "_def" in schema) {
      // REASON: Accessing Zod internal _def property for runtime schema introspection.
      // Required for converting Zod schemas to OpenAI function parameters. No public API exists.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const def = (schema as any)._def;

      if (def.typeName === "ZodObject" && def.shape) {
        const properties: OpenAIParameterSchema["properties"] = {};
        const required: string[] = [];

        const shape =
          typeof def.shape === "function" ? def.shape() : def.shape;

        for (const [key, value] of Object.entries(shape)) {
          // REASON: Accessing Zod internal _def for field type introspection. No public API exists.
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const fieldDef = (value as any)?._def;
          if (!fieldDef) continue;

          // Determine field type
          let fieldType = "string";
          let fieldDescription = fieldDef.description || "";
          let isOptional = false;

          // Handle optional wrapper
          if (fieldDef.typeName === "ZodOptional") {
            isOptional = true;
            const innerDef = fieldDef.innerType?._def;
            if (innerDef) {
              fieldType = this.getZodType(innerDef.typeName);
              fieldDescription = innerDef.description || fieldDescription;
            }
          } else {
            fieldType = this.getZodType(fieldDef.typeName);
          }

          properties[key] = {
            type: fieldType,
            ...(fieldDescription && { description: fieldDescription }),
          };

          // Handle arrays
          if (fieldType === "array") {
            properties[key].items = { type: "string" };
          }

          if (!isOptional) {
            required.push(key);
          }
        }

        return {
          type: "object",
          properties,
          ...(required.length > 0 && { required }),
        };
      }
    }

    return defaultSchema;
  }

  /**
   * Map Zod type names to JSON Schema types
   */
  private getZodType(typeName: string): string {
    const typeMap: Record<string, string> = {
      ZodString: "string",
      ZodNumber: "number",
      ZodBoolean: "boolean",
      ZodArray: "array",
      ZodObject: "object",
      ZodRecord: "object", // z.record() maps to object type
    };
    return typeMap[typeName] || "string";
  }

  // ==========================================================================
  // Tool Execution
  // ==========================================================================

  /**
   * Execute a tool by name with input validation
   */
  async execute<TOutput = unknown>(
    name: string,
    input: unknown
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
        };
      }

      // Execute tool
      const result = await tool.execute(validationResult.data);
      return result as ToolExecutionResult<TOutput>;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Execute a tool and validate output
   */
  async executeWithValidation<TInput, TOutput>(
    name: string,
    input: TInput
  ): Promise<ToolExecutionResult<TOutput>> {
    const tool = this.get<TInput, TOutput>(name);

    if (!tool) {
      return {
        success: false,
        error: `Tool "${name}" not found`,
      };
    }

    const result = await this.execute<TOutput>(name, input);

    if (result.success && result.data) {
      // Validate output
      const outputValidation = tool.outputSchema.safeParse(result.data);
      if (!outputValidation.success) {
        return {
          success: false,
          error: `Output validation failed: ${outputValidation.error.message}`,
        };
      }
    }

    return result;
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
