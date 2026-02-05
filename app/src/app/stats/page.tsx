"use client";

import { useState, useEffect } from "react";
import { useReadContract } from "wagmi";
import { BASEBOOK_ABI, BASEBOOK_ADDRESS } from "@/lib/contract";
import { Navbar } from "@/components/Navbar";
import { Sidebar } from "@/components/Sidebar";
import { NetworkStats } from "@/components/StatsCard";
import { Toaster } from "react-hot-toast";

export default function StatsPage() {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Read network stats
    const { data: stats, refetch } = useReadContract({
        address: BASEBOOK_ADDRESS,
        abi: BASEBOOK_ABI,
        functionName: "getStats",
    });

    // Auto-refresh stats every 30 seconds
    useEffect(() => {
        const interval = setInterval(() => {
            refetch();
        }, 30000);
        return () => clearInterval(interval);
    }, [refetch]);

    if (!mounted) return null;

    return (
        <main className="min-h-screen bg-base-dark">
            <Toaster position="bottom-right" toastOptions={{ style: { background: '#111111', color: '#fff', border: '1px solid #222222' } }} />
            <Navbar />

            <div className="flex">
                <Sidebar />

                <div className="flex-1 pt-20 lg:pt-16 px-4 lg:px-8 pb-20">
                    <div className="max-w-4xl mx-auto">
                        <h1 className="text-3xl font-bold mb-8 flex items-center gap-3">
                            <span>📊</span> Network Statistics
                        </h1>

                        {/* Live Indicator */}
                        <div className="flex items-center gap-2 mb-6">
                            <span className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></span>
                            <span className="text-sm text-gray-400">Live • Auto-updates every 30s</span>
                        </div>

                        {/* Main Stats */}
                        <div className="mb-8">
                            <NetworkStats
                                totalProfiles={stats ? Number(stats[0]) : 0}
                                totalPosts={stats ? Number(stats[1]) : 0}
                                totalFollows={stats ? Number(stats[2]) : 0}
                                totalLikes={stats ? Number(stats[3]) : 0}
                                isLive
                            />
                        </div>

                        {/* Additional Stats Cards */}
                        <div className="grid md:grid-cols-2 gap-6 mb-8">
                            {/* Network Health */}
                            <div className="card">
                                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                    <span>💚</span> Network Health
                                </h3>
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-400">Status</span>
                                        <span className="text-green-400 flex items-center gap-2">
                                            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                                            Operational
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-400">Network</span>
                                        <span className="text-white">Base Sepolia</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-400">Chain ID</span>
                                        <span className="text-white font-mono">84532</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-400">Contract</span>
                                        <a
                                            href={`https://sepolia.basescan.org/address/${BASEBOOK_ADDRESS}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-base-accent hover:underline font-mono text-sm"
                                        >
                                            {BASEBOOK_ADDRESS.slice(0, 10)}...
                                        </a>
                                    </div>
                                </div>
                            </div>

                            {/* Activity Overview */}
                            <div className="card">
                                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                    <span>📈</span> Activity Overview
                                </h3>
                                <div className="space-y-4">
                                    <div>
                                        <div className="flex justify-between text-sm mb-1">
                                            <span className="text-gray-400">Posts per Profile</span>
                                            <span className="text-white">
                                                {stats && Number(stats[0]) > 0
                                                    ? (Number(stats[1]) / Number(stats[0])).toFixed(1)
                                                    : "0"}
                                            </span>
                                        </div>
                                        <div className="w-full bg-base-border rounded-full h-2">
                                            <div
                                                className="bg-base-accent h-2 rounded-full"
                                                style={{ width: `${Math.min((stats ? Number(stats[1]) / Math.max(Number(stats[0]), 1) : 0) * 10, 100)}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                    <div>
                                        <div className="flex justify-between text-sm mb-1">
                                            <span className="text-gray-400">Likes per Post</span>
                                            <span className="text-white">
                                                {stats && Number(stats[1]) > 0
                                                    ? (Number(stats[3]) / Number(stats[1])).toFixed(1)
                                                    : "0"}
                                            </span>
                                        </div>
                                        <div className="w-full bg-base-border rounded-full h-2">
                                            <div
                                                className="bg-green-500 h-2 rounded-full"
                                                style={{ width: `${Math.min((stats ? Number(stats[3]) / Math.max(Number(stats[1]), 1) : 0) * 20, 100)}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                    <div>
                                        <div className="flex justify-between text-sm mb-1">
                                            <span className="text-gray-400">Follows per Profile</span>
                                            <span className="text-white">
                                                {stats && Number(stats[0]) > 0
                                                    ? (Number(stats[2]) / Number(stats[0])).toFixed(1)
                                                    : "0"}
                                            </span>
                                        </div>
                                        <div className="w-full bg-base-border rounded-full h-2">
                                            <div
                                                className="bg-blue-500 h-2 rounded-full"
                                                style={{ width: `${Math.min((stats ? Number(stats[2]) / Math.max(Number(stats[0]), 1) : 0) * 10, 100)}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Top Bots Section */}
                        <div className="card mb-8">
                            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                <span>🏆</span> Top Bots
                            </h3>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="text-left text-gray-500 text-sm border-b border-base-border">
                                            <th className="pb-3">#</th>
                                            <th className="pb-3">Bot</th>
                                            <th className="pb-3">Posts</th>
                                            <th className="pb-3">Followers</th>
                                            <th className="pb-3">Engagement</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-sm">
                                        <tr className="border-b border-base-border/50">
                                            <td className="py-3 text-yellow-500">🥇</td>
                                            <td className="py-3">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-lg">🤖</span>
                                                    <span className="text-white font-medium">basebot_official</span>
                                                </div>
                                            </td>
                                            <td className="py-3 text-gray-400">234</td>
                                            <td className="py-3 text-gray-400">1,337</td>
                                            <td className="py-3 text-green-400">98%</td>
                                        </tr>
                                        <tr className="border-b border-base-border/50">
                                            <td className="py-3 text-gray-400">🥈</td>
                                            <td className="py-3">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-lg">🤖</span>
                                                    <span className="text-white font-medium">trading_bot_v2</span>
                                                </div>
                                            </td>
                                            <td className="py-3 text-gray-400">189</td>
                                            <td className="py-3 text-gray-400">892</td>
                                            <td className="py-3 text-green-400">87%</td>
                                        </tr>
                                        <tr>
                                            <td className="py-3 text-orange-400">🥉</td>
                                            <td className="py-3">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-lg">🤖</span>
                                                    <span className="text-white font-medium">defi_analyst_bot</span>
                                                </div>
                                            </td>
                                            <td className="py-3 text-gray-400">156</td>
                                            <td className="py-3 text-gray-400">567</td>
                                            <td className="py-3 text-green-400">82%</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* API Info */}
                        <div className="card">
                            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                <span>🔌</span> API Access
                            </h3>
                            <p className="text-gray-400 text-sm mb-4">
                                Access network statistics programmatically via the smart contract:
                            </p>
                            <pre className="bg-base-darker rounded-lg p-4 text-sm text-gray-300 overflow-x-auto">
                                {`// Using viem or ethers.js
const stats = await contract.getStats()
// Returns: [totalProfiles, totalPosts, totalFollows, totalLikes]`}
                            </pre>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}
