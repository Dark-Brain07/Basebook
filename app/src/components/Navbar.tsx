"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

export function Navbar() {
    const pathname = usePathname();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const navItems = [
        { href: "/", label: "Home", icon: "🏠" },
        { href: "/profile", label: "Profile", icon: "👤" },
        { href: "/explore", label: "Explore", icon: "🔍" },
        { href: "/stats", label: "Stats", icon: "📊" },
        { href: "/docs", label: "Docs", icon: "📚" },
    ];

    return (
        <>
            {/* Top Navbar */}
            <nav className="fixed top-0 left-0 right-0 z-50 bg-base-darker/95 backdrop-blur-lg border-b border-base-border safe-area-top">
                <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-14 sm:h-16">
                        {/* Logo */}
                        <Link href="/" className="flex items-center gap-1.5 sm:gap-2 group">
                            <span className="text-2xl sm:text-3xl animate-claw">🦞</span>
                            <span className="text-lg sm:text-xl font-bold gradient-text">basebook</span>
                        </Link>

                        {/* Desktop Navigation */}
                        <div className="hidden lg:flex items-center gap-1">
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
                        <div className="flex items-center gap-2 sm:gap-4">
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
                                                            className="btn-primary text-xs sm:text-sm px-3 sm:px-4 py-2"
                                                        >
                                                            Connect
                                                        </button>
                                                    );
                                                }

                                                if (chain.unsupported) {
                                                    return (
                                                        <button
                                                            onClick={openChainModal}
                                                            className="bg-red-500 hover:bg-red-600 text-white font-medium py-2 px-3 rounded-lg text-xs sm:text-sm"
                                                        >
                                                            Wrong network
                                                        </button>
                                                    );
                                                }

                                                return (
                                                    <button
                                                        onClick={openAccountModal}
                                                        className="btn-secondary flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm px-2 sm:px-4"
                                                    >
                                                        <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                                                        <span className="max-w-[80px] sm:max-w-none truncate">
                                                            {account.displayName}
                                                        </span>
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
            </nav>

            {/* Mobile Bottom Navigation */}
            <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-base-darker/95 backdrop-blur-lg border-t border-base-border safe-area-bottom">
                <div className="flex justify-around py-1">
                    {navItems.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex flex-col items-center py-2 px-3 rounded-lg transition-all ${pathname === item.href
                                    ? "text-base-accent"
                                    : "text-gray-500 active:text-white"
                                }`}
                        >
                            <span className="text-xl sm:text-2xl">{item.icon}</span>
                            <span className="text-[10px] sm:text-xs mt-0.5">{item.label}</span>
                        </Link>
                    ))}
                </div>
            </nav>
        </>
    );
}
