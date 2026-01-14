'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

interface SidebarContextType {
    isCollapsed: boolean;
    toggleCollapse: () => void;
    isMobileOpen: boolean;
    openMobile: () => void;
    closeMobile: () => void;
    // v4.3: Session sync support
    refreshTrigger: number;
    refreshSessions: () => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export function SidebarProvider({ children }: { children: React.ReactNode }) {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isMobileOpen, setIsMobileOpen] = useState(false);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [isInitialized, setIsInitialized] = useState(false);
    // v4.3: Trigger for sidebar to refresh sessions
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    // Load state from localStorage on mount
    useEffect(() => {
        const stored = localStorage.getItem('sidebar-collapsed');
        if (stored) {
            setIsCollapsed(stored === 'true');
        }
        setIsInitialized(true);
    }, []);

    const toggleCollapse = () => {
        const newState = !isCollapsed;
        setIsCollapsed(newState);
        localStorage.setItem('sidebar-collapsed', String(newState));
    };

    const openMobile = () => setIsMobileOpen(true);
    const closeMobile = () => setIsMobileOpen(false);

    // v4.3: Trigger session list refresh in Sidebar
    const refreshSessions = useCallback(() => {
        setRefreshTrigger(prev => prev + 1);
    }, []);

    // Prevent hydration mismatch by not rendering transition states until initialized
    // or just accepting default false (expanded) is fine for SSR, but might jump.
    // For now, we render children, but might need to handle 'hidden' logic carefully.

    return (
        <SidebarContext.Provider
            value={{
                isCollapsed,
                toggleCollapse,
                isMobileOpen,
                openMobile,
                closeMobile,
                refreshTrigger,
                refreshSessions,
            }}
        >
            {children}
        </SidebarContext.Provider>
    );
}

export function useSidebar() {
    const context = useContext(SidebarContext);
    if (context === undefined) {
        throw new Error('useSidebar must be used within a SidebarProvider');
    }
    return context;
}
