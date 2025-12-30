import React, { Suspense } from 'react';
import ChatWorkspace from '@/components/chat/ChatWorkspace';

export const metadata = {
    title: 'Goodman Chat | Intelligent Financial Assistant',
    description: 'Project Goodman Combined Agent Workspace',
};

export default function ChatPage() {
    return (
        <div className="h-full">
            <Suspense fallback={
                <div className="flex items-center justify-center h-full text-neutral-400">
                    加载中...
                </div>
            }>
                <ChatWorkspace />
            </Suspense>
        </div>
    );
}
