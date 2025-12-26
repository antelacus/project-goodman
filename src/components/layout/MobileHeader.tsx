'use client';

import { Menu } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useSidebar } from './SidebarProvider';

export default function MobileHeader() {
    const { openMobile } = useSidebar();

    return (
        <header className="flex h-14 items-center justify-between border-b border-neutral-800 bg-[#222] px-4 md:hidden">
            <Link href="/" className="flex items-center">
                <Image
                    src="/logo.png"
                    alt="Goodman"
                    width={32}
                    height={32}
                    className="rounded-sm"
                />
                <span className="ml-2 text-lg font-semibold text-white">Goodman</span>
            </Link>
            <button
                onClick={openMobile}
                className="p-2 text-neutral-400 hover:text-white focus:outline-none"
                aria-label="Open menu"
            >
                <Menu size={24} />
            </button>
        </header>
    );
}
