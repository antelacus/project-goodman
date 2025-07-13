'use client';
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { FaGithub, FaEnvelope } from "react-icons/fa6";
import { useState } from "react";

const navItems = [
  { name: "首页", href: "/" },
  { name: "财务信息提取", href: "/data-extract" },
  { name: "财务指标分析", href: "/financial-analysis" },
  { name: "财务合规指导", href: "/guidance-chat" },
  { name: "文档管理", href: "/documents" },
  { name: "案例演示", href: "/showcase" },
  { name: "关于/帮助", href: "/about" },
];

const socialLinks = [
  { icon: <FaGithub className="inline" />, label: "GitHub", url: "https://github.com/antelacus" },
  { icon: <FaEnvelope className="inline" />, label: "send email", url: "mailto:me@antelacus.com" },
];

export default function Navbar() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [isOpening, setIsOpening] = useState(false);

  const handleOpenMenu = () => {
    setMenuOpen(true);
    setIsOpening(true);
    // 打开动画开始后立即设置为false，让菜单滑入
    setTimeout(() => {
      setIsOpening(false);
    }, 10); // 很短的延迟，让初始状态生效
  };

  const handleCloseMenu = () => {
    setIsClosing(true);
    setTimeout(() => {
      setMenuOpen(false);
      setIsClosing(false);
    }, 300); // 动画持续时间
  };

  const handleMenuItemClick = () => {
    // 点击菜单项时直接关闭，不需要动画
    setMenuOpen(false);
    setIsClosing(false);
    setIsOpening(false);
  };

  return (
    <nav className="w-full bg-[#222] text-white border-b border-neutral-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto flex items-center h-16 px-6">
        <Link href="/" className="flex items-center mr-10 select-none">
          <Image src="/logo.png" alt="Project Goodman Logo" width={44} height={44} priority className="rounded-none" />
        </Link>
        {/* 汉堡菜单按钮，仅在小屏显示 */}
        <button
          className="md:hidden ml-auto p-2 focus:outline-none"
          aria-label="打开菜单"
          onClick={handleOpenMenu}
        >
          <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        {/* 导航项：大屏显示，md 及以上 */}
        <ul className="hidden md:flex space-x-2 md:space-x-6 font-medium text-base">
          {navItems.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`relative px-2 py-1 transition-colors duration-200
                    ${isActive ? "text-yellow-400" : "text-white hover:text-yellow-300"}
                  `}
                >
                  <span
                    className={`pb-1 border-b-2 transition-all duration-200
                      ${isActive ? "border-yellow-400" : "border-transparent group-hover:border-yellow-300"}
                    `}
                  >
                    {item.name}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
        <div className="hidden md:flex items-center space-x-4 ml-auto">
          {socialLinks.map((item) => (
            <a
              key={item.label}
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-full hover:bg-neutral-700 transition"
              title={item.label}
            >
              {item.icon}
            </a>
          ))}
        </div>
        {/* 移动端菜单抽屉 */}
        {menuOpen && (
          <div className="fixed inset-0 z-50 flex justify-end">
            {/* 遮罩层 - 半透明，点击可关闭 */}
            <div 
              className={`fixed inset-0 bg-black transition-opacity duration-300 ${
                isClosing ? 'opacity-0' : isOpening ? 'opacity-0' : 'opacity-50'
              }`}
              onClick={handleCloseMenu}
            />
            {/* 右侧菜单 */}
            <div className={`relative bg-[#222] w-64 max-w-[80vw] h-full shadow-lg transform transition-transform duration-300 ease-in-out ${
              isClosing ? 'translate-x-full' : isOpening ? 'translate-x-full' : 'translate-x-0'
            }`}>
              <button
                className="absolute top-4 right-4 p-2 focus:outline-none text-white hover:text-yellow-300"
                aria-label="关闭菜单"
                onClick={handleCloseMenu}
              >
                <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <ul className="flex flex-col space-y-4 mt-16 px-6 font-medium text-lg">
                {navItems.map((item) => {
                  const isActive =
                    item.href === "/"
                      ? pathname === "/"
                      : pathname.startsWith(item.href);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={`block px-2 py-1 transition-colors duration-200
                          ${isActive ? "text-yellow-400" : "text-white hover:text-yellow-300"}
                        `}
                        onClick={handleMenuItemClick}
                      >
                        {item.name}
                      </Link>
                    </li>
                  );
                })}
              </ul>
              <div className="flex items-center space-x-4 px-6 mt-8">
                {socialLinks.map((item) => (
                  <a
                    key={item.label}
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-full hover:bg-neutral-700 transition"
                    title={item.label}
                  >
                    {item.icon}
                  </a>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
} 