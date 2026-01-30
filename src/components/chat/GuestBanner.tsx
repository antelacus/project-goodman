"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { AlertCircle, X, MessageSquare, Upload, FileText, FileBarChart } from "lucide-react";
import { resolveSessionRole, type SessionRole } from "@/lib/security/session-client";

interface RateLimits {
    message: { remaining: number; limit: number };
    upload: { remaining: number; limit: number };
    extract: { remaining: number; limit: number };
    report: { remaining: number; limit: number };
}

interface SessionInfo {
    authenticated: boolean;
    role: SessionRole;
    limits?: RateLimits;
}

export default function GuestBanner() {
    const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
    const [dismissed, setDismissed] = useState(false);
    const [loading, setLoading] = useState(true);
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [detailTop, setDetailTop] = useState<number>(0);
    const bannerRef = useRef<HTMLDivElement | null>(null);

    const checkSession = useCallback(async () => {
        try {
            const res = await fetch("/api/auth/session");
            const data = await res.json();
            setSessionInfo({
                authenticated: Boolean(data?.authenticated),
                role: resolveSessionRole(data),
                limits: data?.limits,
            });
        } catch {
            // Assume guest if failed
            setSessionInfo({ authenticated: false, role: "guest" });
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        checkSession();

        const interval = setInterval(checkSession, 30000);
        const handleGuestRateUpdate = () => checkSession();
        window.addEventListener('guest-rate-update', handleGuestRateUpdate);

        return () => {
            clearInterval(interval);
            window.removeEventListener('guest-rate-update', handleGuestRateUpdate);
        };
    }, [checkSession]);

    useEffect(() => {
        if (!isDetailOpen) return;

        const updatePosition = () => {
            if (window.innerWidth >= 640) {
                setIsDetailOpen(false);
                return;
            }
            if (!bannerRef.current) {
                setDetailTop(72);
                return;
            }
            const rect = bannerRef.current.getBoundingClientRect();
            setDetailTop(rect.bottom + 8);
        };

        updatePosition();
        window.addEventListener('resize', updatePosition);
        window.addEventListener('scroll', updatePosition, true);
        return () => {
            window.removeEventListener('resize', updatePosition);
            window.removeEventListener('scroll', updatePosition, true);
        };
    }, [isDetailOpen]);

    // Don't show if loading, dismissed, or admin
    if (loading || dismissed) return null;
    if (sessionInfo?.role !== "guest") return null;

    const limits = sessionInfo?.limits;

    return (
        <div className="bg-yellow-50 border-b border-yellow-100">
            <div ref={bannerRef} className="px-4 py-2 flex items-center justify-between max-w-4xl mx-auto">
                <div className="flex items-center gap-3 text-sm min-w-0">
                    <AlertCircle className="w-4 h-4 text-yellow-600 flex-shrink-0" />
                    <span className="text-yellow-800">访客模式</span>
                    <span className="text-yellow-600 text-xs hidden lg:inline">· 闲置1小时后数据清除，每小时限额：</span>

                    <button
                        type="button"
                        className="text-xs text-yellow-700 hover:text-yellow-800 underline underline-offset-2 sm:hidden"
                        onClick={() => setIsDetailOpen(true)}
                        aria-expanded={isDetailOpen}
                        aria-controls="guest-limit-detail"
                    >
                        限额详情
                    </button>

                    {/* Rate limit indicators - show on larger screens */}
                    <div className="hidden sm:flex items-center gap-2 text-xs">
                        <LimitBadge
                            icon={<MessageSquare className="w-3 h-3" />}
                            remaining={limits?.message.remaining ?? 20}
                            limit={limits?.message.limit ?? 20}
                            label="发送消息"
                            showLabel
                        />
                        <LimitBadge
                            icon={<Upload className="w-3 h-3" />}
                            remaining={limits?.upload.remaining ?? 2}
                            limit={limits?.upload.limit ?? 2}
                            label="上传文件"
                            showLabel
                        />
                        <LimitBadge
                            icon={<FileText className="w-3 h-3" />}
                            remaining={limits?.extract.remaining ?? 2}
                            limit={limits?.extract.limit ?? 2}
                            label="提取信息"
                            showLabel
                        />
                        <LimitBadge
                            icon={<FileBarChart className="w-3 h-3" />}
                            remaining={limits?.report.remaining ?? 1}
                            limit={limits?.report.limit ?? 1}
                            label="生成报告"
                            showLabel
                        />
                    </div>

                </div>

                <div className="flex items-center gap-2">
                    <Link
                        href="/login"
                        className="text-xs px-3 py-1 bg-yellow-500 text-black rounded-full hover:bg-yellow-600 transition-colors"
                    >
                        登录
                    </Link>
                    <button
                        onClick={() => {
                            setIsDetailOpen(false);
                            setDismissed(true);
                        }}
                        className="p-1 text-yellow-500 hover:text-yellow-700"
                        title="关闭"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {isDetailOpen && (
                <div className="fixed inset-0 z-40 sm:hidden">
                    <button
                        type="button"
                        className="absolute inset-0 bg-black/10"
                        onClick={() => setIsDetailOpen(false)}
                        aria-label="关闭限额详情"
                    />
                    <div className="absolute left-0 right-0 px-4" style={{ top: detailTop }}>
                        <div
                            id="guest-limit-detail"
                            className="max-w-4xl mx-auto rounded-xl border border-yellow-200 bg-white shadow-lg p-4"
                        >
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-sm font-medium text-yellow-800">访客每小时限额详情</span>
                                <button
                                    type="button"
                                    className="text-xs text-yellow-600 hover:text-yellow-800"
                                    onClick={() => setIsDetailOpen(false)}
                                >
                                    收起
                                </button>
                            </div>
                            <p className="text-xs text-yellow-600 mb-3">闲置1小时后数据清除</p>
                            <div className="flex flex-wrap gap-2 text-xs">
                                <LimitBadge
                                    icon={<MessageSquare className="w-3 h-3" />}
                                    remaining={limits?.message.remaining ?? 20}
                                    limit={limits?.message.limit ?? 20}
                                    label="发送消息"
                                    showLabel
                                />
                                <LimitBadge
                                    icon={<Upload className="w-3 h-3" />}
                                    remaining={limits?.upload.remaining ?? 2}
                                    limit={limits?.upload.limit ?? 2}
                                    label="上传文件"
                                    showLabel
                                />
                                <LimitBadge
                                    icon={<FileText className="w-3 h-3" />}
                                    remaining={limits?.extract.remaining ?? 2}
                                    limit={limits?.extract.limit ?? 2}
                                    label="提取信息"
                                    showLabel
                                />
                                <LimitBadge
                                    icon={<FileBarChart className="w-3 h-3" />}
                                    remaining={limits?.report.remaining ?? 1}
                                    limit={limits?.report.limit ?? 1}
                                    label="生成报告"
                                    showLabel
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function LimitBadge({
    icon,
    remaining,
    limit,
    label,
    showLabel = false,
}: {
    icon: React.ReactNode;
    remaining: number;
    limit: number;
    label: string;
    showLabel?: boolean;
}) {
    const percentage = (remaining / limit) * 100;
    const colorClass =
        percentage > 50
            ? "text-gray-700 bg-gray-100"
            : percentage > 20
                ? "text-yellow-700 bg-yellow-50"
                : "text-red-600 bg-red-50";

    return (
        <div
            className={`flex items-center gap-1 px-2 py-0.5 rounded-full ${colorClass}`}
            title={`${label}: 剩余 ${remaining}/${limit}`}
        >
            {icon}
            {showLabel && <span className="font-medium">{label}</span>}
            <span>
                {remaining}/{limit}
            </span>
        </div>
    );
}
