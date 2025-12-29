'use client';

import MobileHeader from '@/components/layout/MobileHeader';
import Sidebar from '@/components/layout/Sidebar';
import { SidebarProvider, useSidebar } from '@/components/layout/SidebarProvider';
import { cn } from '@/lib/utils';

function WorkspaceLayoutContent({ children }: { children: React.ReactNode }) {
    const { isCollapsed } = useSidebar();

    return (
        <div className="flex min-h-screen flex-col bg-neutral-50 md:flex-row">
            {/* Mobile Header - Visible only on mobile */}
            <MobileHeader />

            {/* Sidebar - Handles its own responsive visibility */}
            <Sidebar />

            {/* Main Content Area */}
            <main
                className={cn(
                    "flex-1 overflow-auto transition-all duration-300 ease-in-out",
                    // Desktop margins based on sidebar state
                    isCollapsed ? "md:ml-[60px]" : "md:ml-[240px]",
                    // Mobile: no margin (header is top, sidebar is overlay)
                    "ml-0"
                )}
            >
                {children}
            </main>
        </div>
    );
}

export default function WorkspaceLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <SidebarProvider>
            <WorkspaceLayoutContent>{children}</WorkspaceLayoutContent>
        </SidebarProvider>
    );
}
