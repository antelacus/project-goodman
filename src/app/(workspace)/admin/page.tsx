"use client";
import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { PageContainer, PageTitle } from "@/components/layout";
import {
    Users,
    Activity,
    RefreshCw,
    Trash2,
    Clock,
    Monitor,
    Database,
    AlertCircle,
    CheckCircle,
    Loader2,
} from "lucide-react";

interface Session {
    sessionId: string;
    role: "admin" | "user" | "guest";
    ip: string;
    userAgent: string;
    createdAt: string;
    expiresAt: string;
    username?: string;
    displayName?: string;
    limits?: {
        messageCount: number;
        uploadCount: number;
        extractCount: number;
    };
}

interface Stats {
    sessions: {
        activeAdmins: number;
        activeGuests: number;
        total: number;
    };
    documents: {
        knowledge: number;
        business: number;
        temp: number;
        total: number;
        pendingCleanup: number;
    };
    users: {
        total: number;
    };
    system: {
        redisConnected: boolean;
        redisCacheSize: number;
    };
}

export default function AdminPage() {
    const router = useRouter();
    const [sessions, setSessions] = useState<Session[]>([]);
    const [stats, setStats] = useState<Stats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [terminatingSession, setTerminatingSession] = useState<string | null>(null);
    const [cleanupRunning, setCleanupRunning] = useState(false);

    const fetchData = useCallback(async () => {
        try {
            setError(null);
            const [sessionsRes, statsRes] = await Promise.all([
                fetch("/api/admin/sessions"),
                fetch("/api/admin/stats"),
            ]);

            if (sessionsRes.status === 401 || statsRes.status === 401) {
                router.push("/login");
                return;
            }

            if (sessionsRes.status === 403 || statsRes.status === 403) {
                setError("权限不足，仅管理员可访问此页面");
                setLoading(false);
                return;
            }

            if (!sessionsRes.ok || !statsRes.ok) {
                throw new Error("获取数据失败");
            }

            const sessionsData = await sessionsRes.json();
            const statsData = await statsRes.json();

            setSessions(sessionsData.sessions || []);
            setStats(statsData);
        } catch (err) {
            setError(err instanceof Error ? err.message : "未知错误");
        } finally {
            setLoading(false);
        }
    }, [router]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleTerminateSession = async (sessionId: string) => {
        if (!confirm("确定要终止此会话吗？")) return;

        setTerminatingSession(sessionId);
        try {
            const res = await fetch("/api/admin/sessions", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ sessionId }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "终止会话失败");
            }

            setSessions((prev) => prev.filter((s) => s.sessionId !== sessionId));
        } catch (err) {
            alert(err instanceof Error ? err.message : "操作失败");
        } finally {
            setTerminatingSession(null);
        }
    };

    const handleForceCleanup = async () => {
        if (!confirm("确定要执行清理任务吗？将删除所有过期的访客文档。")) return;

        setCleanupRunning(true);
        try {
            const res = await fetch("/api/admin/stats", {
                method: "POST",
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "清理失败");
            }

            const result = await res.json();
            alert(`清理完成！\n删除文档: ${result.documentsDeleted}\n影响会话: ${result.sessionsAffected}`);
            fetchData();
        } catch (err) {
            alert(err instanceof Error ? err.message : "清理失败");
        } finally {
            setCleanupRunning(false);
        }
    };

    const formatTime = (isoString: string) => {
        const date = new Date(isoString);
        return date.toLocaleString("zh-CN", {
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const formatUserAgent = (ua: string) => {
        if (ua.includes("Chrome")) return "Chrome";
        if (ua.includes("Firefox")) return "Firefox";
        if (ua.includes("Safari")) return "Safari";
        if (ua.includes("Edge")) return "Edge";
        return "Other";
    };

    if (loading) {
        return (
            <PageContainer maxWidth="4xl">
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                </div>
            </PageContainer>
        );
    }

    if (error) {
        return (
            <PageContainer maxWidth="4xl">
                <div className="flex flex-col items-center justify-center h-64 gap-4">
                    <AlertCircle className="w-12 h-12 text-red-500" />
                    <p className="text-red-600">{error}</p>
                    <button
                        onClick={() => router.push("/login")}
                        className="px-4 py-2 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800"
                    >
                        前往登录
                    </button>
                </div>
            </PageContainer>
        );
    }

    return (
        <PageContainer maxWidth="4xl">
            <div className="flex flex-col gap-8">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <PageTitle>管理面板</PageTitle>
                    <button
                        onClick={fetchData}
                        className="flex items-center gap-2 px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                        <RefreshCw className="w-4 h-4" />
                        刷新
                    </button>
                </div>

                {/* Stats Grid */}
                {stats && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <StatCard
                            icon={<Users className="w-5 h-5" />}
                            label="活跃访客"
                            value={stats.sessions.activeGuests}
                            tone="accent"
                        />
                        <StatCard
                            icon={<Activity className="w-5 h-5" />}
                            label="在线管理员"
                            value={stats.sessions.activeAdmins}
                            tone="neutral"
                        />
                        <StatCard
                            icon={<Database className="w-5 h-5" />}
                            label="知识库文档"
                            value={stats.documents.knowledge}
                            tone="neutral"
                        />
                        <StatCard
                            icon={<Clock className="w-5 h-5" />}
                            label="临时文档"
                            value={stats.documents.temp}
                            subValue={stats.documents.pendingCleanup > 0 ? `(${stats.documents.pendingCleanup} 待清理)` : undefined}
                            tone="neutral"
                        />
                    </div>
                )}

                {/* System Status */}
                {stats && (
                    <div className="bg-white rounded-xl border border-gray-200 p-4">
                        <h2 className="font-semibold text-gray-900 mb-3">系统状态</h2>
                        <div className="flex flex-wrap gap-6 text-sm">
                            <div className="flex items-center gap-2">
                                {stats.system.redisConnected ? (
                                    <CheckCircle className="w-4 h-4 text-yellow-600" />
                                ) : (
                                    <AlertCircle className="w-4 h-4 text-gray-400" />
                                )}
                                <span>Redis: {stats.system.redisConnected ? "已连接" : "使用内存缓存"}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Monitor className="w-4 h-4 text-gray-400" />
                                <span>缓存大小: {stats.system.redisCacheSize}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Users className="w-4 h-4 text-gray-400" />
                                <span>用户总数: {stats.users.total}</span>
                            </div>
                            <button
                                onClick={handleForceCleanup}
                                disabled={cleanupRunning}
                                className="ml-auto flex items-center gap-2 px-3 py-1 text-sm bg-red-50 text-red-600 hover:bg-red-100 rounded-lg disabled:opacity-50"
                            >
                                {cleanupRunning ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Trash2 className="w-4 h-4" />
                                )}
                                手动清理
                            </button>
                        </div>
                    </div>
                )}

                {/* Sessions Table */}
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-200">
                        <h2 className="font-semibold text-gray-900">活跃会话</h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 text-gray-600">
                                <tr>
                                    <th className="px-4 py-3 text-left font-medium">角色</th>
                                    <th className="px-4 py-3 text-left font-medium">用户</th>
                                    <th className="px-4 py-3 text-left font-medium">IP 地址</th>
                                    <th className="px-4 py-3 text-left font-medium">浏览器</th>
                                    <th className="px-4 py-3 text-left font-medium">创建时间</th>
                                    <th className="px-4 py-3 text-left font-medium">使用量</th>
                                    <th className="px-4 py-3 text-center font-medium">操作</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {sessions.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                                            暂无活跃会话
                                        </td>
                                    </tr>
                                ) : (
                                    sessions.map((session) => (
                                        <tr key={session.sessionId} className="hover:bg-gray-50">
                                            <td className="px-4 py-3">
                                                <span
                                                    className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${session.role === "admin"
                                                        ? "bg-yellow-100 text-yellow-800"
                                                        : "bg-gray-100 text-gray-700"
                                                        }`}
                                                >
                                                    {session.role === "admin" ? "管理员" : session.role === "user" ? "用户" : "访客"}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-gray-900">
                                                {session.displayName || session.username || "-"}
                                            </td>
                                            <td className="px-4 py-3 text-gray-600 font-mono text-xs">
                                                {session.ip}
                                            </td>
                                            <td className="px-4 py-3 text-gray-600">
                                                {formatUserAgent(session.userAgent)}
                                            </td>
                                            <td className="px-4 py-3 text-gray-600">
                                                {formatTime(session.createdAt)}
                                            </td>
                                            <td className="px-4 py-3">
                                                {session.limits ? (
                                                    <span className="text-xs text-gray-500">
                                                        消息:{session.limits.messageCount} 上传:{session.limits.uploadCount}
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-gray-400">-</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <button
                                                    onClick={() => handleTerminateSession(session.sessionId)}
                                                    disabled={terminatingSession === session.sessionId}
                                                    className="text-red-500 hover:text-red-700 disabled:opacity-50"
                                                    title="终止会话"
                                                >
                                                    {terminatingSession === session.sessionId ? (
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                    ) : (
                                                        <Trash2 className="w-4 h-4" />
                                                    )}
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </PageContainer>
    );
}

function StatCard({
    icon,
    label,
    value,
    subValue,
    tone,
}: {
    icon: React.ReactNode;
    label: string;
    value: number;
    subValue?: string;
    tone: "accent" | "neutral";
}) {
    const toneClasses = {
        accent: "bg-yellow-50 text-yellow-700",
        neutral: "bg-gray-100 text-gray-700",
    };

    return (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className={`inline-flex p-2 rounded-lg ${toneClasses[tone]} mb-3`}>
                {icon}
            </div>
            <div className="text-2xl font-bold text-gray-900">{value}</div>
            <div className="text-sm text-gray-500">
                {label}
                {subValue && <span className="text-yellow-600 ml-1">{subValue}</span>}
            </div>
        </div>
    );
}
