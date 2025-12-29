import React from 'react';

export interface StructureAnalysis {
    quality: 'good' | 'moderate' | 'basic';
    hasToc: boolean;
    sectionCount: number;
    sections?: Array<{ title: string; level: number }>;
    suggestions?: string[];
}

interface UploadFeedbackProps {
    analysis: StructureAnalysis;
    onClose?: () => void;
}

export const UploadFeedback: React.FC<UploadFeedbackProps> = ({ analysis, onClose }) => {
    const isGood = analysis.quality === 'good';
    const isModerate = analysis.quality === 'moderate';

    return (
        <div className={`rounded-lg p-4 mb-4 border ${isGood ? 'bg-green-50 border-green-200' :
                isModerate ? 'bg-yellow-50 border-yellow-200' :
                    'bg-gray-50 border-gray-200'
            }`}>
            <div className="flex justify-between items-start">
                <h4 className={`font-bold mb-2 ${isGood ? 'text-green-800' :
                        isModerate ? 'text-yellow-800' :
                            'text-gray-800'
                    }`}>
                    文档结构分析报告
                </h4>
                {onClose && (
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">&times;</button>
                )}
            </div>

            <div className="flex items-center gap-4 text-sm mb-3">
                <div className="flex flex-col">
                    <span className="text-gray-500 text-xs uppercase tracking-wider">结构质量</span>
                    <span className={`font-semibold ${isGood ? 'text-green-600' :
                            isModerate ? 'text-yellow-600' :
                                'text-gray-600'
                        }`}>
                        {isGood ? '优秀 (Good)' : isModerate ? '一般 (Moderate)' : '基础 (Basic)'}
                    </span>
                </div>

                <div className="w-px h-8 bg-black/5"></div>

                <div className="flex flex-col">
                    <span className="text-gray-500 text-xs uppercase tracking-wider">识别章节</span>
                    <span className="font-semibold text-gray-800">{analysis.sectionCount} 个</span>
                </div>

                <div className="w-px h-8 bg-black/5"></div>

                <div className="flex flex-col">
                    <span className="text-gray-500 text-xs uppercase tracking-wider">目录检测</span>
                    <span className="font-semibold text-gray-800">{analysis.hasToc ? '已检测到' : '未检测到'}</span>
                </div>
            </div>

            {analysis.suggestions && analysis.suggestions.length > 0 && (
                <div className="text-sm mt-3 pt-3 border-t border-black/5">
                    <div className="font-semibold text-gray-700 mb-1">建议优化：</div>
                    <ul className="list-disc list-inside text-gray-600 space-y-1">
                        {analysis.suggestions.map((s, i) => (
                            <li key={i}>{s}</li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};

export default UploadFeedback;
