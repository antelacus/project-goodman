import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

interface RichTextRendererProps {
    content: string;
    onCitationClick?: (index: number) => void;
    onCalculationClick?: (metricName: string) => void;
    onSourceClick?: (sourceName: string) => void;
    className?: string;
}

/**
 * Renders markdown content with support for custom interactive markers:
 * - [[citation:index]] -> Clickable citation number [n]
 * - [[calculation:metric_name]] -> Clickable metric name
 * - [[source:doc_name]] -> Clickable source document name
 */
const RichTextRenderer: React.FC<RichTextRendererProps> = ({
    content,
    onCitationClick,
    onCalculationClick,
    onSourceClick,
    className = '',
}) => {
    // Pre-process content to convert custom markers into markdown links with special protocols
    // This allows us to use ReactMarkdown's standard link handling to render them as interactive elements
    const processedContent = content
        // Citation: [[citation:1]] -> [1](citation:1)
        .replace(/\[\[citation:(\d+)\]\]/g, '[$1](citation:$1)')
        // Calculation: [[calculation:metric]] -> [metric](calculation:metric)
        // We capture the metric name as the link text for display, or we could use a fixed icon
        .replace(/\[\[calculation:([^\]]+)\]\]/g, (match, metric) => `[${metric}](calculation:${metric})`)
        // Source: [[source:doc]] -> [doc](source:doc)
        .replace(/\[\[source:([^\]]+)\]\]/g, (match, doc) => `[${doc}](source:${doc})`);

    return (
        <div className={`prose prose-sm max-w-none ${className}`}>
            <ReactMarkdown
                remarkPlugins={[remarkMath]}
                rehypePlugins={[rehypeKatex]}
                components={{
                    a: ({ node, href, children, ...props }) => {
                        if (!href) return <a {...props}>{children}</a>;

                        // Handle Citation
                        if (href.startsWith('citation:')) {
                            const index = parseInt(href.replace('citation:', ''), 10);
                            return (
                                <button
                                    onClick={(e) => {
                                        e.preventDefault();
                                        onCitationClick?.(index);
                                    }}
                                    className="inline-flex items-center justify-center w-5 h-5 ml-1 text-xs font-bold text-blue-600 bg-blue-100 rounded-full hover:bg-blue-200 transition-colors align-top cursor-pointer"
                                    title="点击查看引用来源"
                                >
                                    {children}
                                </button>
                            );
                        }

                        // Handle Calculation
                        if (href.startsWith('calculation:')) {
                            const metric = href.replace('calculation:', '');
                            return (
                                <button
                                    onClick={(e) => {
                                        e.preventDefault();
                                        onCalculationClick?.(metric);
                                    }}
                                    className="inline-flex items-center gap-1 px-1.5 py-0.5 mx-1 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100 transition-colors cursor-pointer align-baseline"
                                    title="点击查看计算过程"
                                >
                                    <span>ƒ</span>
                                    <span className="underline decoration-dotted underline-offset-2">{children}</span>
                                </button>
                            );
                        }

                        // Handle Source
                        if (href.startsWith('source:')) {
                            const source = href.replace('source:', '');
                            return (
                                <button
                                    onClick={(e) => {
                                        e.preventDefault();
                                        onSourceClick?.(source);
                                    }}
                                    className="inline-flex items-center gap-1 px-1.5 py-0.5 mx-1 text-xs font-medium text-gray-600 bg-gray-100 border border-gray-200 rounded hover:bg-gray-200 transition-colors cursor-pointer align-baseline"
                                    title="点击查看来源文档"
                                >
                                    <span>📄</span>
                                    <span>{children}</span>
                                </button>
                            );
                        }

                        // Default link
                        return (
                            <a href={href} className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer" {...props}>
                                {children}
                            </a>
                        );
                    },
                    // Style other elements if needed
                    p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed text-gray-800">{children}</p>,
                    ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>,
                    ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>,
                    li: ({ children }) => <li className="text-gray-800">{children}</li>,
                    h1: ({ children }) => <h1 className="text-xl font-bold mb-2 mt-4">{children}</h1>,
                    h2: ({ children }) => <h2 className="text-lg font-bold mb-2 mt-3">{children}</h2>,
                    h3: ({ children }) => <h3 className="text-md font-bold mb-1 mt-2">{children}</h3>,
                    blockquote: ({ children }) => <blockquote className="border-l-4 border-gray-300 pl-4 italic text-gray-600 my-2">{children}</blockquote>,
                    code: ({ className, children, ...props }: any) => {
                        const match = /language-(\w+)/.exec(className || '');
                        const isInline = !match && !String(children).includes('\n');
                        return isInline ? (
                            <code className="bg-gray-100 text-red-500 px-1 py-0.5 rounded text-sm font-mono" {...props}>
                                {children}
                            </code>
                        ) : (
                            <code className={className} {...props}>
                                {children}
                            </code>
                        );
                    }
                }}
            >
                {processedContent}
            </ReactMarkdown>
        </div>
    );
};

export default RichTextRenderer;
