import fs from 'fs';
import path from 'path';
import ReactMarkdown from 'react-markdown';
import React from 'react';

export default async function HelpPage() {
  const readmePath = path.join(process.cwd(), 'README.md');
  let content = "暂无内容";

  try {
    content = await fs.promises.readFile(readmePath, 'utf8');
    // Optional: Filter content if needed, e.g. remove top headers or images
  } catch (error) {
    console.error("Failed to read README.md", error);
    content = "无法加载帮助文档。";
  }

  return (
    <div className="mx-auto max-w-4xl py-10">
      <div className="prose prose-invert max-w-none 
        prose-headings:text-white prose-headings:font-bold
        prose-h1:text-3xl prose-h1:mb-8 prose-h1:border-b prose-h1:border-neutral-800 prose-h1:pb-4
        prose-h2:text-2xl prose-h2:mt-10 prose-h2:text-yellow-500
        prose-p:text-neutral-300 prose-p:leading-relaxed
        prose-a:text-yellow-500 prose-a:no-underline hover:prose-a:underline
        prose-strong:text-white
        prose-ul:text-neutral-300 prose-ul:my-4
        prose-table:text-sm prose-table:text-neutral-300
        prose-th:text-white prose-th:border-b prose-th:border-neutral-700 prose-th:p-2 prose-th:text-left
        prose-td:border-b prose-td:border-neutral-800 prose-td:p-2
        prose-code:text-yellow-200 prose-code:bg-neutral-800 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none
        prose-pre:bg-neutral-900 prose-pre:border prose-pre:border-neutral-800
        ">
        <ReactMarkdown>{content}</ReactMarkdown>
      </div>
    </div>
  );
}
