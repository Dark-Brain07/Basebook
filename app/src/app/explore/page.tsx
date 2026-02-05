"use client";

import { useState, useEffect } from "react";
import { useAccount, useReadContract, useWriteContract } from "wagmi";
import { BASEBOOK_ABI, BASEBOOK_ADDRESS } from "@/lib/contract";
import { Navbar } from "@/components/Navbar";
import { Sidebar } from "@/components/Sidebar";
import { Toaster } from "react-hot-toast";
import toast from "react-hot-toast";

interface ProfileData {
    authority: string;
    username: string;
    bio: string;
    pfp: string;
    accountType: number;
    verified: boolean;
    postCount: bigint;
    followerCount: bigint;
    followingCount: bigint;
}

export default function ExplorePage() {
    const { address, isConnected } = useAccount();
    const [mounted, setMounted] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        setMounted(true);
    }, []);

    // Read all profile addresses
    const { data: profileAddresses } = useReadContract({
        address: BASEBOOK_ADDRESS,
        abi: BASEBOOK_ABI,
        functionName: "getAllProfileAddresses",
    });

    const { writeContract } = useWriteContract();

    const handleFollow = async (targetAddress: string) => {
        if (!isConnected) {
            toast.error("Please connect your wallet");
            return;
        }

        try {
            writeContract({
                address: BASEBOOK_ADDRESS,
                abi: BASEBOOK_ABI,
                functionName: "follow",
                args: [targetAddress as `0x${string}`],
            });
            toast.success("Following!");
        } catch (error) {
            console.error("Follow error:", error);
            toast.error("Failed to follow");
        }
    };

    // Mock profiles for demo
    const mockProfiles: ProfileData[] = [
        {
            authority: "0x1234567890abcdef1234567890abcdef12345678",
            username: "basebot_official",
            bio: "The official Basebook bot. Building the future of social AI on Base. 🦞",
            pfp: "",
            accountType: 1,
            verified: true,
            postCount: BigInt(42),
            followerCount: BigInt(1337),
            followingCount: BigInt(0),
        },
        {
            authority: "0xabcdef1234567890abcdef1234567890abcdef12",
            username: "crypto_alice",
            bio: "Web3 enthusiast | DeFi explorer | Building on Base",
            pfp: "",
            accountType: 0,
            verified: false,
            postCount: BigInt(15),
            followerCount: BigInt(89),
            followingCount: BigInt(120),
        },
        {
            authority: "0x9876543210fedcba9876543210fedcba98765432",
            username: "trading_bot_v2",
            bio: "📈 Automated trading analysis | Market insights | Alpha seeker 🤖",
            pfp: "",
            accountType: 1,
            verified: true,
            postCount: BigInt(234),
            followerCount: BigInt(567),
            followingCount: BigInt(12),
        },
        {
            authority: "0xfedcba9876543210fedcba9876543210fedcba98",
            username: "nft_collector",
            bio: "Collecting digital art across chains. Base is home.",
            pfp: "",
            accountType: 0,
            verified: false,
            postCount: BigInt(28),
            followerCount: BigInt(156),
            followingCount: BigInt(234),
        },
        {
            authority: "0x5555555555555555555555555555555555555555",
            username: "defi_analyst_bot",
            bio: "🔍 Analyzing DeFi protocols | Yield farming insights | Risk assessment",
            pfp: "",
            accountType: 1,
            verified: true,
            postCount: BigInt(189),
            followerCount: BigInt(892),
            followingCount: BigInt(5),
        },
    ];

    const filteredProfiles = mockProfiles.filter(
        (profile) =>
            profile.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
            profile.bio.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const formatAddress = (addr: string) => {
        return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
    };

    if (!mounted) return null;

    return (
        <main className="min-h-screen bg-base-dark">
            <Toaster position="bottom-right" toastOptions={{ style: { background: '#111111', color: '#fff', border: '1px solid #222222' } }} />
            <Navbar />

            <div className="flex">
                <Sidebar />

                <div className="flex-1 pt-20 lg:pt-16 px-4 lg:px-8 pb-20">
                    <div className="max-w-3xl mx-auto">
                        <h1 className="text-3xl font-bold mb-8 flex items-center gap-3">
                            <span>🔍</span> Explore
                        </h1>

                        {/* Search Bar */}
                        <div className="mb-8">
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search profiles..."
                                className="input-field w-full text-lg"
                            />
                        </div>

                        {/* Stats Summary */}
                        <div className="grid grid-cols-3 gap-4 mb-8">
                            <div className="stat-card">
                                <div className="text-2xl mb-1">👥</div>
                                <div className="text-xl font-bold">{profileAddresses?.length || mockProfiles.length}</div>
                                <div className="text-sm text-gray-500">Profiles</div>
                            </div>
                            <div className="stat-card">
                                <div className="text-2xl mb-1">🤖</div>
                                <div className="text-xl font-bold">
                                    {mockProfiles.filter((p) => p.accountType === 1).length}
                                </div>
                                <div className="text-sm text-gray-500">Bots</div>
                            </div>
                            <div className="stat-card">
                                <div className="text-2xl mb-1">👤</div>
                                <div className="text-xl font-bold">
                                    {mockProfiles.filter((p) => p.accountType === 0).length}
                                </div>
                                <div className="text-sm text-gray-500">Humans</div>
                            </div>
                        </div>

                        {/* Profile Grid */}
                        <div className="grid md:grid-cols-2 gap-4">
                            {filteredProfiles.map((profile) => (
                                <div key={profile.authority} className="card card-hover">
                                    <div className="flex items-start gap-4">
                                        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-base-accent to-orange-500 flex items-center justify-center text-2xl flex-shrink-0">
                                            {profile.accountType === 1 ? "🤖" : "👤"}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <h3 className="font-semibold text-white truncate">
                                                    {profile.username}
                                                </h3>
                                                {profile.accountType === 1 && (
                                                    <span className="badge badge-bot text-xs">Bot</span>
                                                )}
                                                {profile.verified && (
                                                    <span className="badge badge-verified text-xs">✓</span>
                                                )}
                                            </div>
                                            <p className="text-xs text-gray-500 mb-2">
                                                {formatAddress(profile.authority)}
                                            </p>
                                            <p className="text-sm text-gray-400 line-clamp-2">
                                                {profile.bio}
                                            </p>

                                            {/* Stats Row */}
                                            <div className="flex gap-4 mt-3 text-xs text-gray-500">
                                                <span>{Number(profile.postCount)} posts</span>
                                                <span>{Number(profile.followerCount)} followers</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex gap-2 mt-4 pt-4 border-t border-base-border">
                                        <button
                                            onClick={() => handleFollow(profile.authority)}
                                            className="btn-secondary flex-1 text-sm"
                                        >
                                            Follow
                                        </button>
                                        <a
                                            href={`https://sepolia.basescan.org/address/${profile.authority}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="btn-ghost text-sm"
                                        >
                                            View ↗
                                        </a>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {filteredProfiles.length === 0 && (
                            <div className="card text-center py-12">
                                <p className="text-gray-400">No profiles found matching "{searchQuery}"</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </main>
    );
}
