import "./globals.css";
import Navbar from "../components/Navbar";
import { ClientOnlyProvider } from "../components/ClientOnlyProvider";

export const metadata = {
  title: "Goodman is the new kind of accounting.",
  description: "Goodman 是一款面向财务与合规领域的智能 AI 助手，支持财务信息提取、财务指标分析、财务合规指导等核心功能。",
  keywords: "财务分析, AI助手, 合规指导, 财务信息提取, 会计准则, 财务报表",
  authors: [{ name: "Goodman Team" }],
  robots: "index, follow",
  icons: {
    icon: '/logo.png',
    shortcut: '/logo.png',
    apple: '/logo.png',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh">
      <body className="bg-white text-black">
        <Navbar />
        <ClientOnlyProvider>{children}</ClientOnlyProvider>
      </body>
    </html>
  );
}
