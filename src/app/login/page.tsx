"use client";
import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lock, User, ArrowLeft, AlertCircle, Loader2 } from "lucide-react";
import { requestSubmitOnEnter } from "@/lib/dom/request-submit-on-enter";

export default function LoginPage() {
    const router = useRouter();
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [retryAfter, setRetryAfter] = useState<number | null>(null);
    const formRef = useRef<HTMLFormElement>(null);

    // Check if already logged in
    useEffect(() => {
        const checkSession = async () => {
            try {
                const res = await fetch("/api/auth/session");
                const data = await res.json();
                if (data.authenticated && data.user?.role === "admin") {
                    router.push("/chat");
                }
            } catch {
                // Ignore errors
            }
        };
        checkSession();
    }, [router]);

    // Countdown for lockout
    useEffect(() => {
        if (retryAfter === null || retryAfter <= 0) return;

        const timer = setInterval(() => {
            setRetryAfter((prev) => {
                if (prev === null || prev <= 1) {
                    clearInterval(timer);
                    return null;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [retryAfter]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setIsLoading(true);

        try {
            const res = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, password }),
            });

            const data = await res.json();

            if (!res.ok) {
                if (res.status === 429 && data.retryAfter) {
                    setRetryAfter(data.retryAfter);
                }
                setError(data.error || "登录失败");
                setIsLoading(false);
                return;
            }

            if (data.success) {
                router.push("/chat");
            } else {
                setError(data.error || "登录失败");
            }
        } catch {
            setError("网络错误，请重试");
        } finally {
            setIsLoading(false);
        }
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return mins > 0 ? `${mins}分${secs}秒` : `${secs}秒`;
    };

    const isLocked = retryAfter !== null && retryAfter > 0;
    const submitDisabled = isLoading || isLocked || !username || !password;

    return (
        <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-neutral-100 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Logo & Title */}
                <div className="text-center mb-8">
                    <Link href="/" className="inline-block mb-6">
                        <Image
                            src="/logo.png"
                            alt="Goodman Logo"
                            width={80}
                            height={80}
                            className="rounded-xl shadow-lg mx-auto"
                        />
                    </Link>
                    <h1 className="text-2xl font-bold text-gray-900">管理员登录</h1>
                    <p className="mt-2 text-gray-500">仅限管理员使用，暂不开放注册</p>
                </div>

                {/* Login Form */}
                <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
                    <form
                        ref={formRef}
                        onSubmit={handleSubmit}
                        onKeyDown={(e) => {
                            requestSubmitOnEnter(e, formRef.current, { disabled: submitDisabled });
                        }}
                        className="space-y-6"
                    >
                        {/* Error Message */}
                        {error && (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-red-700 text-sm">{error}</p>
                                    {isLocked && (
                                        <p className="text-red-600 text-xs mt-1">
                                            请等待 {formatTime(retryAfter)} 后重试
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Username Field */}
                        <div>
                            <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                                用户名
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <User className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    id="username"
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="block w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all text-gray-900 placeholder-gray-400"
                                    placeholder="请输入用户名"
                                    required
                                    disabled={isLoading || isLocked}
                                    autoComplete="username"
                                />
                            </div>
                        </div>

                        {/* Password Field */}
                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                                密码
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Lock className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    id="password"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="block w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all text-gray-900 placeholder-gray-400"
                                    placeholder="请输入密码"
                                    required
                                    disabled={isLoading || isLocked}
                                    autoComplete="current-password"
                                />
                            </div>
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={submitDisabled}
                            className="w-full bg-neutral-900 hover:bg-neutral-800 disabled:bg-neutral-400 text-white font-semibold py-3 px-4 rounded-lg transition-all flex items-center justify-center gap-2"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    登录中...
                                </>
                            ) : isLocked ? (
                                <>等待 {formatTime(retryAfter)} 后重试</>
                            ) : (
                                "登录"
                            )}
                        </button>
                    </form>

                    {/* Back Link */}
                    <div className="mt-6 text-center">
                        <Link
                            href="/"
                            className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            返回首页
                        </Link>
                    </div>
                </div>

                {/* Footer Note */}
                <p className="text-center mt-8 text-xs text-gray-400">
                    访客无需登录即可使用基础功能
                </p>
            </div>
        </div>
    );
}
