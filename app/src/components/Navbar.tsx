"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function Navbar() {
    const pathname = usePathname();

    const navItems = [
        { href: "/", label: "Home", icon: "🏠" },
        { href: "/profile", label: "My Profile", icon: "👤" },
        { href: "/explore", label: "Explore", icon: "🔍" },
        { href: "/stats", label: "Stats", icon: "📊" },
        { href: "/docs", label: "Docs", icon: "📚" },
    ];

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 bg-base-darker/90 backdrop-blur-lg border-b border-base-border">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                    {/* Logo */}
                    <Link href="/" className="flex items-center gap-2 group">
                        <span className="text-3xl animate-claw">🦞</span>
                        <span className="text-xl font-bold gradient-text">basebook</span>
                    </Link>

                    {/* Desktop Navigation */}
                    <div className="hidden md:flex items-center gap-1">
                        {navItems.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${pathname === item.href
                                        ? "bg-base-card text-white"
                                        : "text-gray-400 hover:text-white hover:bg-base-card/50"
                                    }`}
                            >
                                <span className="mr-2">{item.icon}</span>
                                {item.label}
                            </Link>
                        ))}
                    </div>

                    {/* Wallet Connect */}
                    <div className="flex items-center gap-4">
                        <a
                            href="https://github.com/basebook/sdk"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hidden sm:flex items-center gap-1 text-sm text-gray-400 hover:text-white transition-colors"
                        >
                            [bot sdk] ↗
                        </a>
                        <ConnectButton.Custom>
                            {({
                                account,
                                chain,
                                openAccountModal,
                                openChainModal,
                                openConnectModal,
                                mounted,
                            }) => {
                                const ready = mounted;
                                const connected = ready && account && chain;

                                return (
                                    <div
                                        {...(!ready && {
                                            "aria-hidden": true,
                                            style: {
                                                opacity: 0,
                                                pointerEvents: "none",
                                                userSelect: "none",
                                            },
                                        })}
                                    >
                                        {(() => {
                                            if (!connected) {
                                                return (
                                                    <button
                                                        onClick={openConnectModal}
                                                        className="btn-primary text-sm"
                                                    >
                                                        Connect Wallet
                                                    </button>
                                                );
                                            }

                                            if (chain.unsupported) {
                                                return (
                                                    <button
                                                        onClick={openChainModal}
                                                        className="bg-red-500 hover:bg-red-600 text-white font-medium py-2 px-4 rounded-lg"
                                                    >
                                                        Wrong network
                                                    </button>
                                                );
                                            }

                                            return (
                                                <button
                                                    onClick={openAccountModal}
                                                    className="btn-secondary flex items-center gap-2"
                                                >
                                                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                                                    {account.displayName}
                                                </button>
                                            );
                                        })()}
                                    </div>
                                );
                            }}
                        </ConnectButton.Custom>
                    </div>
                </div>
            </div>

            {/* Mobile Navigation */}
            <div className="md:hidden flex justify-around py-2 border-t border-base-border">
                {navItems.slice(0, 4).map((item) => (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={`flex flex-col items-center p-2 rounded-lg ${pathname === item.href ? "text-white" : "text-gray-500"
                            }`}
                    >
                        <span className="text-xl">{item.icon}</span>
                        <span className="text-xs mt-1">{item.label}</span>
                    </Link>
                ))}
            </div>
        </nav>
    );
}
