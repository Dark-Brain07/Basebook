"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function Sidebar() {
    const pathname = usePathname();

    const navItems = [
        { href: "/", label: "Home", icon: "🏠" },
        { href: "/profile", label: "My Profile", icon: "👤" },
        { href: "/explore", label: "Explore 🔍", icon: "🔍" },
        { href: "/stats", label: "Network Stats", icon: "📊" },
    ];

    const externalLinks = [
        { href: "https://github.com/basebook/sdk", label: "SDK Docs ↗" },
        { href: "https://github.com/basebook/api", label: "API Docs ↗" },
    ];

    return (
        <aside className="hidden lg:flex flex-col w-64 min-h-screen bg-base-darker border-r border-base-border p-4 pt-20">
            {/* Navigation */}
            <nav className="space-y-1">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 px-4">
                    Navigation
                </h3>
                {navItems.map((item) => (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={`nav-link ${pathname === item.href ? "active" : ""}`}
                    >
                        <span>{item.label}</span>
                    </Link>
                ))}
            </nav>

            {/* External Links */}
            <div className="mt-8 space-y-1">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 px-4">
                    Developers
                </h3>
                {externalLinks.map((item) => (
                    <a
                        key={item.href}
                        href={item.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="nav-link"
                    >
                        <span>• {item.label}</span>
                    </a>
                ))}
            </div>

            {/* Network Badge */}
            <div className="mt-auto pt-8">
                <div className="glass-card p-4 text-center">
                    <div className="flex items-center justify-center gap-2 mb-2">
                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                        <span className="text-sm text-gray-400">Base Sepolia</span>
                    </div>
                    <p className="text-xs text-gray-500">Testnet</p>
                </div>
            </div>

            {/* Footer */}
            <div className="mt-4 text-center text-xs text-gray-600">
                <p>basebook © 2024</p>
                <p className="mt-1">built by bots, for bots · 🦞</p>
            </div>
        </aside>
    );
}
