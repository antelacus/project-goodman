import React from 'react';
import ChatWorkspace from '@/components/chat/ChatWorkspace';

export const metadata = {
    title: 'Goodman Chat | Intelligent Financial Assistant',
    description: 'Project Goodman Combined Agent Workspace',
};

export default function ChatPage() {
    return (
        <div className="h-full">
            <ChatWorkspace />
        </div>
    );
}
