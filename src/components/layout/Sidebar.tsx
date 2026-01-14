'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import {
    ChevronsLeft,
    ChevronsRight,
    FileSpreadsheet,
    FolderOpen,
    BookOpen,
    Info,
    Mail,
    Plus,
    X,
    Settings,
    LogIn,
    LogOut,
    MessageSquare,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useSidebar } from './SidebarProvider';
import ExtractionModal from '../quick-actions/ExtractionModal';

interface SessionItem {
    id: string;
    title: string;
    createdAt: string;
    updatedAt: string;
}

// Define navigation items
const navItems = [
    { name: '文档管理', href: '/documents', icon: FolderOpen },
    { name: '使用指南', href: '/help', icon: BookOpen },
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
    const searchParams = useSearchParams();
    const [isExtractionOpen, setIsExtractionOpen] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);
    const [sessions, setSessions] = useState<SessionItem[]>([]);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [sessionsLoading, setSessionsLoading] = useState(true);

    // Get current session ID from URL
    const currentSessionId = searchParams.get('session');

    // Fetch sessions
    const fetchSessions = useCallback(async () => {
        try {
            const res = await fetch('/api/sessions');
            if (res.ok) {
                const data = await res.json();
                setSessions(data.sessions || []);
            }
        } catch {
            // Silently fail
        } finally {
            setSessionsLoading(false);
        }
    }, []);

    // Check admin status and fetch sessions on mount
    useEffect(() => {
        const checkAdmin = async () => {
            try {
                const res = await fetch('/api/auth/session');
                const data = await res.json();
                setIsAdmin(data.authenticated && data.user?.role === 'admin');
            } catch {
                setIsAdmin(false);
            }
        };
        checkAdmin();
        fetchSessions();
    }, [fetchSessions]);

    // Handle "New Chat" - navigate to /chat without session param
    const handleNewChat = () => {
        router.push('/chat');
        if (isMobileOpen) closeMobile();
        // Refresh sessions after a short delay to allow new session to be created
        setTimeout(fetchSessions, 2000);
    };

    // Handle session click
    const handleSessionClick = (sessionId: string) => {
        router.push(`/chat?session=${sessionId}`);
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
                    className="fixed inset-0 z-40 bg-neutral-900/20 backdrop-blur-sm md:hidden"
                    onClick={closeMobile}
                />
            )}

            {/* Sidebar Container */}
            <aside
                className={cn(
                    'fixed inset-y-0 left-0 z-50 flex flex-col bg-white border-r border-neutral-200 shadow-xl transition-all duration-300 md:shadow-none',
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
                                'ml-3 text-lg font-bold text-neutral-900 transition-opacity duration-200',
                                isCollapsed ? 'md:hidden md:opacity-0' : 'opacity-100'
                            )}
                        >
                            Goodman
                        </span>
                    </Link>

                    {/* Desktop Toggle Button */}
                    <button
                        onClick={toggleCollapse}
                        className="hidden p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-900 rounded-md md:block"
                        title={isCollapsed ? 'Expand' : 'Collapse'}
                    >
                        {isCollapsed ? <ChevronsRight size={18} /> : <ChevronsLeft size={18} />}
                    </button>

                    {/* Mobile Close Button */}
                    <button
                        onClick={closeMobile}
                        className="block p-1 text-neutral-400 hover:text-neutral-900 md:hidden"
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
                            "flex items-center justify-center rounded-lg bg-yellow-400 font-medium text-black hover:bg-yellow-500 shadow-sm transition-all",
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

                    {/* Session History Section */}
                    {!isCollapsed && sessions.length > 0 && (
                        <div className="mt-3 flex-1 overflow-y-auto max-h-48">
                            <div className="mb-2 px-2 text-xs font-semibold uppercase text-neutral-400">
                                对话历史
                            </div>
                            <div className="space-y-1">
                                {sessions.slice(0, 10).map((session) => {
                                    const isActive = currentSessionId === session.id ||
                                        (pathname === '/chat' && !currentSessionId && sessions[0]?.id === session.id);
                                    return (
                                        <button
                                            key={session.id}
                                            onClick={() => handleSessionClick(session.id)}
                                            className={cn(
                                                "flex w-full items-center rounded-lg p-2 text-sm transition-colors text-left",
                                                isActive
                                                    ? "bg-yellow-50 text-yellow-700 font-medium"
                                                    : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
                                            )}
                                            title={session.title}
                                        >
                                            <MessageSquare size={16} className="mr-2 flex-shrink-0" />
                                            <span className="truncate">{session.title}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Collapsed Session Indicator */}
                    {isCollapsed && sessions.length > 0 && (
                        <button
                            onClick={() => sessions[0] && handleSessionClick(sessions[0].id)}
                            className={cn(
                                "flex items-center justify-center rounded-lg p-2 text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 transition-colors"
                            )}
                            title="对话历史"
                        >
                            <MessageSquare size={20} />
                        </button>
                    )}

                    {/* Quick Tools Section */}
                    <div className="mt-2">
                        {!isCollapsed && (
                            <div className="mb-2 px-2 text-xs font-semibold uppercase text-neutral-400">
                                工具
                            </div>
                        )}

                        <button
                            className={cn(
                                "flex w-full items-center rounded-lg p-2 text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 transition-colors",
                                isCollapsed && "justify-center"
                            )}
                            title="财务信息提取"
                            onClick={() => {
                                setIsExtractionOpen(true);
                                if (isMobileOpen) closeMobile();
                            }}
                        >
                            <FileSpreadsheet size={20} className={cn(!isCollapsed && "mr-3")} />
                            {!isCollapsed && <span>信息提取</span>}
                        </button>
                    </div>

                    <div className="my-1 h-px bg-neutral-200" />

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
                                            ? "bg-yellow-50 text-yellow-700 font-medium"
                                            : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900",
                                        isCollapsed && "justify-center",
                                        isActive && isCollapsed && "bg-yellow-50"
                                    )}
                                    title={item.name}
                                >
                                    <item.icon size={20} className={cn(!isCollapsed && "mr-3")} />
                                    {!isCollapsed && <span>{item.name}</span>}
                                </Link>
                            )
                        })}

                        {/* Admin Panel Link - Only visible to admins */}
                        {isAdmin && (
                            <Link
                                href="/admin"
                                onClick={handleNavigation}
                                className={cn(
                                    "flex items-center rounded-lg p-2 transition-colors",
                                    pathname.startsWith('/admin')
                                        ? "bg-yellow-50 text-yellow-700 font-medium"
                                        : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900",
                                    isCollapsed && "justify-center",
                                    pathname.startsWith('/admin') && isCollapsed && "bg-yellow-50"
                                )}
                                title="管理面板"
                            >
                                <Settings size={20} className={cn(!isCollapsed && "mr-3")} />
                                {!isCollapsed && <span>管理面板</span>}
                            </Link>
                        )}
                    </nav>
                </div>

                {/* Footer / User Section */}
                <div className="border-t border-neutral-200 p-3 space-y-1">
                    {/* Login/Logout Button */}
                    {isAdmin ? (
                        <button
                            onClick={async () => {
                                try {
                                    await fetch('/api/auth/logout', { method: 'POST' });
                                    setIsAdmin(false);
                                    router.push('/chat');
                                } catch {
                                    // Ignore errors
                                }
                            }}
                            className={cn(
                                "flex w-full items-center rounded-lg p-2 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 transition-colors",
                                isCollapsed && "justify-center"
                            )}
                            title="登出"
                        >
                            <LogOut size={20} className={cn(!isCollapsed && "mr-3")} />
                            {!isCollapsed && <span>登出</span>}
                        </button>
                    ) : (
                        <Link
                            href="/login"
                            onClick={handleNavigation}
                            className={cn(
                                "flex items-center rounded-lg p-2 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 transition-colors",
                                isCollapsed && "justify-center"
                            )}
                            title="管理员登录"
                        >
                            <LogIn size={20} className={cn(!isCollapsed && "mr-3")} />
                            {!isCollapsed && <span>管理员登录</span>}
                        </Link>
                    )}

                    <a
                        href="mailto:me@antelacus.com"
                        className={cn(
                            "flex items-center rounded-lg p-2 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 transition-colors",
                            isCollapsed && "justify-center"
                        )}
                        title="Contact"
                    >
                        <Mail size={20} className={cn(!isCollapsed && "mr-3")} />
                        {!isCollapsed && <span>联系我</span>}
                    </a>
                </div>
            </aside>

            <ExtractionModal
                isOpen={isExtractionOpen}
                onClose={() => setIsExtractionOpen(false)}
            />
        </>
    );
}
