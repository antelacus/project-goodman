import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

export interface PromptMetadata {
  name: string;
  description?: string;
  version?: string;
  variables?: string[];
}

export interface LoadedPrompt {
  metadata: PromptMetadata;
  content: string;
}

const PROMPTS_DIR = path.join(process.cwd(), 'src', 'lib', 'ai', 'prompts');

/**
 * Load a prompt template from .md file with frontmatter
 */
export function loadPrompt(filename: string): LoadedPrompt {
  const filePath = path.join(PROMPTS_DIR, filename);
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const { data, content } = matter(fileContent);

  return {
    metadata: data as PromptMetadata,
    content: content.trim(),
  };
}

/**
 * Load and interpolate a prompt template with variables
 */
export function loadPromptWithVariables(
  filename: string,
  variables: Record<string, string>
): string {
  const { content } = loadPrompt(filename);

  let result = content;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`{{${key}}}`, 'g'), value);
  }

  return result;
}

/**
 * Get raw prompt content without metadata
 */
export function getPromptContent(filename: string): string {
  return loadPrompt(filename).content;
}
