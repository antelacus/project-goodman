import React from 'react';
import { RiBrainLine } from 'react-icons/ri';
import { BiLoaderAlt } from 'react-icons/bi';

interface ThinkingIndicatorProps {
    currentNode?: string | null;
}

const ThinkingIndicator: React.FC<ThinkingIndicatorProps> = ({ currentNode }) => {
    if (!currentNode) return null;

    const getStatusText = (node: string) => {
        switch (node) {
            case 'compliance_search': return 'Browsing regulations...';
            case 'extract_data': return 'Extracting information...';
            case 'finance_analysis': return 'Analyzing financial metrics...';
            case '__start__': return 'Initializing agent...';
            case 'generate_response': return 'Synthesizing response...';
            default: return `Thinking (${node})...`;
        }
    };

    return (
        <div className="flex items-center space-x-3 text-sm text-indigo-600 bg-indigo-50/50 px-4 py-2 rounded-full border border-indigo-100 w-fit animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="relative">
                <RiBrainLine className="w-4 h-4" />
                <span className="absolute -top-1 -right-1 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                </span>
            </div>
            <span className="font-medium">{getStatusText(currentNode)}</span>
            <BiLoaderAlt className="w-3 h-3 animate-spin text-indigo-400" />
        </div>
    );
};

export default ThinkingIndicator;
