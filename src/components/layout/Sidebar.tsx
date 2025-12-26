'use client';

import { cn } from '@/lib/utils';
import {
    ChevronsLeft,
    ChevronsRight,
    FileSpreadsheet,
    FolderOpen,
    HelpCircle,
    Info,
    Mail,
    Plus,
    X,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useSidebar } from './SidebarProvider';

// Define navigation items
const navItems = [
    { name: '文档管理', href: '/documents', icon: FolderOpen },
    { name: '使用指南', href: '/help', icon: HelpCircle },
    { name: '关于', href: '/about', icon: Info },
];

export default function Sidebar() {
    const {
        isCollapsed,
        toggleCollapse,
        isMobileOpen,
        closeMobile,
    } = useSidebar();
    const pathname = usePathname();
    const router = useRouter();

    // Handle "New Chat" - for now, just reload /chat or push to /chat if elsewhere
    const handleNewChat = () => {
        // Logic: If on /chat, we might want to trigger a reset. 
        // Since we don't have a sophisticated event bus yet, we can force a navigation to /chat 
        // which usually re-mounts if we key it, or we rely on the user manually resetting.
        // For V3.7 Phase 1, we will just navigate to /chat. 
        // If already on /chat, a full reload might be needed to clear state if it's not managed via URL.
        if (pathname === '/chat') {
            window.location.reload();
        } else {
            router.push('/chat');
        }
        if (isMobileOpen) closeMobile();
    };

    const handleNavigation = () => {
        if (isMobileOpen) closeMobile();
    }

    return (
        <>
            {/* Mobile Overlay */}
            {isMobileOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/50 md:hidden"
                    onClick={closeMobile}
                />
            )}

            {/* Sidebar Container */}
            <aside
                className={cn(
                    'fixed inset-y-0 left-0 z-50 flex flex-col bg-neutral-900 shadow-xl transition-all duration-300 md:shadow-none',
                    // Mobile: transform off-screen
                    !isMobileOpen && '-translate-x-full md:translate-x-0',
                    // Desktop: width change based on collapsed state
                    isCollapsed ? 'md:w-[60px]' : 'md:w-[240px]',
                    // Mobile: fixed width when open
                    isMobileOpen && 'w-[280px] translate-x-0'
                )}
            >
                {/* Header (Logo + Toggle) */}
                <div className="flex h-14 items-center justify-between px-3 md:h-16">
                    <Link href="/" className={cn("flex items-center overflow-hidden whitespace-nowrap", isCollapsed && "md:justify-center md:px-0")} onClick={handleNavigation}>
                        <Image
                            src="/logo.png"
                            alt="Goodman"
                            width={isCollapsed ? 32 : 36}
                            height={isCollapsed ? 32 : 36}
                            className="rounded-sm flex-shrink-0"
                        />
                        <span
                            className={cn(
                                'ml-3 text-lg font-bold text-white transition-opacity duration-200',
                                isCollapsed ? 'md:hidden md:opacity-0' : 'opacity-100'
                            )}
                        >
                            Goodman
                        </span>
                    </Link>

                    {/* Desktop Toggle Button */}
                    <button
                        onClick={toggleCollapse}
                        className="hidden p-1.5 text-neutral-400 hover:bg-neutral-800 hover:text-white rounded-md md:block"
                        title={isCollapsed ? 'Expand' : 'Collapse'}
                    >
                        {isCollapsed ? <ChevronsRight size={18} /> : <ChevronsLeft size={18} />}
                    </button>

                    {/* Mobile Close Button */}
                    <button
                        onClick={closeMobile}
                        className="block p-1 text-neutral-400 hover:text-white md:hidden"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex flex-1 flex-col gap-4 px-3 py-4">

                    {/* New Chat Button */}
                    <button
                        onClick={handleNewChat}
                        className={cn(
                            "flex items-center justify-center rounded-lg bg-yellow-500 font-medium text-black hover:bg-yellow-400 transition-all",
                            isCollapsed ? "h-10 w-10 p-0" : "h-10 px-4 w-full"
                        )}
                        title="New Chat"
                    >
                        {isCollapsed ? <Plus size={20} /> : (
                            <>
                                <Plus size={18} className="mr-2" />
                                <span>新建对话</span>
                            </>
                        )}
                    </button>

                    {/* Quick Tools Section */}
                    <div className="mt-2">
                        {!isCollapsed && (
                            <div className="mb-2 px-2 text-xs font-semibold uppercase text-neutral-500">
                                工具
                            </div>
                        )}

                        <button
                            className={cn(
                                "flex w-full items-center rounded-lg p-2 text-neutral-300 hover:bg-neutral-800 hover:text-white transition-colors",
                                isCollapsed && "justify-center"
                            )}
                            title="财务信息提取"
                            // Placeholder for Quick Tool trigger
                            onClick={() => {
                                // TODO: Open modal
                                alert("财务信息提取功能正在迁移中...");
                                if (isMobileOpen) closeMobile();
                            }}
                        >
                            <FileSpreadsheet size={20} className={cn(!isCollapsed && "mr-3")} />
                            {!isCollapsed && <span>信息提取</span>}
                        </button>
                    </div>

                    <div className="my-1 h-px bg-neutral-800" />

                    {/* Navigation Links */}
                    <nav className="flex flex-col gap-1">
                        {navItems.map((item) => {
                            const isActive = pathname.startsWith(item.href);
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={handleNavigation}
                                    className={cn(
                                        "flex items-center rounded-lg p-2 transition-colors",
                                        isActive
                                            ? "bg-neutral-800 text-yellow-400 border-l-2 border-yellow-500"
                                            : "text-neutral-300 hover:bg-neutral-800 hover:text-white",
                                        isCollapsed && "justify-center",
                                        // Adjustment for border-l-2 taking space if not handled carefully, usually okay with p-2
                                        isActive && isCollapsed && "border-l-0 bg-neutral-800" // Simplify for collapsed
                                    )}
                                    title={item.name}
                                >
                                    <item.icon size={20} className={cn(!isCollapsed && "mr-3")} />
                                    {!isCollapsed && <span>{item.name}</span>}
                                </Link>
                            )
                        })}
                    </nav>
                </div>

                {/* Footer / User Section */}
                <div className="border-t border-neutral-800 p-3">
                    <a
                        href="mailto:me@antelacus.com"
                        className={cn(
                            "flex items-center rounded-lg p-2 text-neutral-400 hover:bg-neutral-800 hover:text-white transition-colors",
                            isCollapsed && "justify-center"
                        )}
                        title="Contact"
                    >
                        <Mail size={20} className={cn(!isCollapsed && "mr-3")} />
                        {!isCollapsed && <span>联系我</span>}
                    </a>
                </div>
            </aside>
        </>
    );
}
