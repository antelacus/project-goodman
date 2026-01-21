"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { AlertCircle, X, MessageSquare, Upload, FileText } from "lucide-react";

interface RateLimits {
    message: { remaining: number; limit: number };
    upload: { remaining: number; limit: number };
    extract: { remaining: number; limit: number };
}

interface SessionInfo {
    authenticated: boolean;
    role: "admin" | "guest";
    limits?: RateLimits;
}

export default function GuestBanner() {
    const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
    const [dismissed, setDismissed] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkSession = async () => {
            try {
                const res = await fetch("/api/auth/session");
                const data = await res.json();
                setSessionInfo(data);
            } catch {
                // Assume guest if failed
                setSessionInfo({ authenticated: false, role: "guest" });
            } finally {
                setLoading(false);
            }
        };
        checkSession();

        // Refresh session info every 30 seconds
        const interval = setInterval(checkSession, 30000);
        return () => clearInterval(interval);
    }, []);

    // Don't show if loading, dismissed, or admin
    if (loading || dismissed) return null;
    if (sessionInfo?.role === "admin") return null;

    const limits = sessionInfo?.limits;
    const hasLowLimits =
        limits &&
        (limits.message.remaining < 5 ||
            limits.upload.remaining < 2 ||
            limits.extract.remaining < 3);

    return (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100">
            <div className="px-4 py-2 flex items-center justify-between max-w-4xl mx-auto">
                <div className="flex items-center gap-3 text-sm">
                    <AlertCircle className="w-4 h-4 text-blue-500 flex-shrink-0" />
                    <span className="text-blue-700">访客模式</span>

                    {/* Rate limit indicators - always visible */}
                    <div className="flex items-center gap-2 text-xs">
                        <LimitBadge
                            icon={<MessageSquare className="w-3 h-3" />}
                            remaining={limits?.message.remaining ?? 20}
                            limit={limits?.message.limit ?? 20}
                            label="消息"
                        />
                        <LimitBadge
                            icon={<Upload className="w-3 h-3" />}
                            remaining={limits?.upload.remaining ?? 5}
                            limit={limits?.upload.limit ?? 5}
                            label="上传"
                        />
                        <LimitBadge
                            icon={<FileText className="w-3 h-3" />}
                            remaining={limits?.extract.remaining ?? 10}
                            limit={limits?.extract.limit ?? 10}
                            label="提取"
                        />
                    </div>

                    {hasLowLimits && (
                        <span className="text-orange-600 text-xs hidden sm:inline">
                            限额即将用尽
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    <Link
                        href="/login"
                        className="text-xs px-3 py-1 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors"
                    >
                        登录
                    </Link>
                    <button
                        onClick={() => setDismissed(true)}
                        className="p-1 text-blue-400 hover:text-blue-600"
                        title="关闭"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}

function LimitBadge({
    icon,
    remaining,
    limit,
    label,
}: {
    icon: React.ReactNode;
    remaining: number;
    limit: number;
    label: string;
}) {
    const percentage = (remaining / limit) * 100;
    const colorClass =
        percentage > 50
            ? "text-green-600 bg-green-50"
            : percentage > 20
            ? "text-yellow-600 bg-yellow-50"
            : "text-red-600 bg-red-50";

    return (
        <div
            className={`flex items-center gap-1 px-2 py-0.5 rounded-full ${colorClass}`}
            title={`${label}: 剩余 ${remaining}/${limit}`}
        >
            {icon}
            <span>
                {remaining}/{limit}
            </span>
        </div>
    );
}
