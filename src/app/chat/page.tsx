import React from 'react';
import ChatWorkspace from '@/components/chat/ChatWorkspace';

export const metadata = {
    title: 'Goodman Chat | Intelligent Financial Assistant',
    description: 'Project Goodman Combined Agent Workspace',
};

export default function ChatPage() {
    return (
        <main className="min-h-screen pt-16">
            {/* pt-16 to account for fixed navbar if it exists, checking layout... 
          Navbar seems to be in flow but sticky? I'll check Navbar styles later. 
          Assuming standard layout behavior for now. */}
            <ChatWorkspace />
        </main>
    );
}
