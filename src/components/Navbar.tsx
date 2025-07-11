'use client';
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { FaGithub, FaEnvelope } from "react-icons/fa6";

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
  return (
    <nav className="w-full bg-[#222] text-white border-b border-neutral-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto flex items-center h-16 px-6">
        <Link href="/" className="flex items-center mr-10 select-none">
          <Image src="/logo.png" alt="Project Goodman Logo" width={44} height={44} priority className="rounded-none" />
        </Link>
        <ul className="flex space-x-2 md:space-x-6 font-medium text-base">
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
        <div className="flex items-center space-x-4 ml-auto">
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
    </nav>
  );
} 