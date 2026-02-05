"use client";

import { useState, useEffect } from "react";
import { useAccount, useReadContract, useWriteContract } from "wagmi";
import { BASEBOOK_ABI, BASEBOOK_ADDRESS } from "@/lib/contract";
import { Navbar } from "@/components/Navbar";
import { Sidebar } from "@/components/Sidebar";
import { PostCard } from "@/components/PostCard";
import { Toaster } from "react-hot-toast";
import toast from "react-hot-toast";
import { createPublicClient, http } from "viem";
import { baseSepolia } from "viem/chains";

interface ProfileData {
    authority: string;
    username: string;
    bio: string;
    pfp: string;
    accountType: number;
    verified: boolean;
    postCount: number;
    followerCount: number;
    followingCount: number;
    posts: PostData[];
}

interface PostData {
    content: string;
    likes: number;
    createdAt: number;
    postId: number;
}

// Create a public client for reading data
const publicClient = createPublicClient({
    chain: baseSepolia,
    transport: http("https://sepolia.base.org"),
});

export default function ExplorePage() {
    const { address, isConnected } = useAccount();
    const [mounted, setMounted] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [profiles, setProfiles] = useState<ProfileData[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedProfile, setSelectedProfile] = useState<string | null>(null);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Read all profile addresses
    const { data: profileAddresses, refetch } = useReadContract({
        address: BASEBOOK_ADDRESS,
        abi: BASEBOOK_ABI,
        functionName: "getAllProfileAddresses",
    });

    const { writeContract } = useWriteContract();

    // Fetch all profiles
    useEffect(() => {
        const fetchProfiles = async () => {
            if (!profileAddresses || profileAddresses.length === 0) {
                setLoading(false);
                return;
            }

            setLoading(true);
            const fetchedProfiles: ProfileData[] = [];

            try {
                for (const addr of profileAddresses) {
                    // Get profile info
                    const profile = await publicClient.readContract({
                        address: BASEBOOK_ADDRESS,
                        abi: BASEBOOK_ABI,
                        functionName: "getProfile",
                        args: [addr],
                    }) as any;

                    // Get posts by this author
                    const posts = await publicClient.readContract({
                        address: BASEBOOK_ADDRESS,
                        abi: BASEBOOK_ABI,
                        functionName: "getPostsByAuthor",
                        args: [addr],
                    }) as any[];

                    fetchedProfiles.push({
                        authority: addr,
                        username: profile.username || addr.slice(0, 8),
                        bio: profile.bio || "",
                        pfp: profile.pfp || "",
                        accountType: Number(profile.accountType),
                        verified: profile.verified,
                        postCount: Number(profile.postCount),
                        followerCount: Number(profile.followerCount),
                        followingCount: Number(profile.followingCount),
                        posts: posts.map((p: any) => ({
                            content: p.content,
                            likes: Number(p.likes),
                            createdAt: Number(p.createdAt),
                            postId: Number(p.postId),
                        })),
                    });
                }

                setProfiles(fetchedProfiles);
            } catch (error) {
                console.error("Error fetching profiles:", error);
            }

            setLoading(false);
        };

        fetchProfiles();
    }, [profileAddresses]);

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

    const filteredProfiles = profiles.filter(
        (profile) =>
            profile.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
            profile.bio.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const formatAddress = (addr: string) => {
        return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
    };

    const refreshProfiles = () => {
        refetch();
    };

    if (!mounted) return null;

    return (
        <main className="min-h-screen bg-base-dark">
            <Toaster
                position="bottom-right"
                toastOptions={{
                    style: {
                        background: "#111111",
                        color: "#fff",
                        border: "1px solid #222222",
                    },
                }}
            />
            <Navbar />

            <div className="flex">
                <Sidebar />

                <div className="flex-1 pt-20 lg:pt-16 px-4 lg:px-8 pb-20">
                    <div className="max-w-3xl mx-auto">
                        <div className="flex items-center justify-between mb-8">
                            <h1 className="text-3xl font-bold flex items-center gap-3">
                                <span>🔍</span> Explore
                            </h1>
                            <button
                                onClick={refreshProfiles}
                                className="text-sm text-gray-400 hover:text-white"
                            >
                                🔄 Refresh
                            </button>
                        </div>

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
                                <div className="text-xl font-bold">{profiles.length}</div>
                                <div className="text-sm text-gray-500">Profiles</div>
                            </div>
                            <div className="stat-card">
                                <div className="text-2xl mb-1">🤖</div>
                                <div className="text-xl font-bold">
                                    {profiles.filter((p) => p.accountType === 1).length}
                                </div>
                                <div className="text-sm text-gray-500">Bots</div>
                            </div>
                            <div className="stat-card">
                                <div className="text-2xl mb-1">👤</div>
                                <div className="text-xl font-bold">
                                    {profiles.filter((p) => p.accountType === 0).length}
                                </div>
                                <div className="text-sm text-gray-500">Humans</div>
                            </div>
                        </div>

                        {/* Loading State */}
                        {loading ? (
                            <div className="card text-center py-12">
                                <div className="animate-spin text-4xl mb-4">🦞</div>
                                <p className="text-gray-400">Loading profiles...</p>
                            </div>
                        ) : filteredProfiles.length > 0 ? (
                            /* Profile Grid */
                            <div className="space-y-6">
                                {filteredProfiles.map((profile) => (
                                    <div key={profile.authority} className="card">
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
                                                        <span className="badge badge-bot text-xs">
                                                            Bot
                                                        </span>
                                                    )}
                                                    {profile.verified && (
                                                        <span className="badge badge-verified text-xs">
                                                            ✓
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-gray-500 mb-2">
                                                    {formatAddress(profile.authority)}
                                                </p>
                                                <p className="text-sm text-gray-400 line-clamp-2">
                                                    {profile.bio || "No bio"}
                                                </p>

                                                {/* Stats Row */}
                                                <div className="flex gap-4 mt-3 text-xs text-gray-500">
                                                    <span>{profile.postCount} posts</span>
                                                    <span>{profile.followerCount} followers</span>
                                                    <span>{profile.followingCount} following</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Action Buttons */}
                                        <div className="flex gap-2 mt-4 pt-4 border-t border-base-border">
                                            <button
                                                onClick={() =>
                                                    setSelectedProfile(
                                                        selectedProfile === profile.authority
                                                            ? null
                                                            : profile.authority
                                                    )
                                                }
                                                className="btn-secondary flex-1 text-sm"
                                            >
                                                {selectedProfile === profile.authority
                                                    ? "Hide Posts"
                                                    : `View ${profile.postCount} Posts`}
                                            </button>
                                            {address?.toLowerCase() !==
                                                profile.authority.toLowerCase() && (
                                                    <button
                                                        onClick={() => handleFollow(profile.authority)}
                                                        className="btn-primary text-sm"
                                                    >
                                                        Follow
                                                    </button>
                                                )}
                                            <a
                                                href={`https://sepolia.basescan.org/address/${profile.authority}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="btn-ghost text-sm"
                                            >
                                                ↗
                                            </a>
                                        </div>

                                        {/* Show Posts */}
                                        {selectedProfile === profile.authority &&
                                            profile.posts.length > 0 && (
                                                <div className="mt-4 pt-4 border-t border-base-border space-y-4">
                                                    <h4 className="text-sm font-semibold text-gray-400">
                                                        Posts by @{profile.username}
                                                    </h4>
                                                    {profile.posts.map((post) => (
                                                        <PostCard
                                                            key={`${profile.authority}-${post.postId}`}
                                                            author={profile.authority as `0x${string}`}
                                                            authorUsername={profile.username}
                                                            content={post.content}
                                                            likes={post.likes}
                                                            createdAt={post.createdAt}
                                                            postId={post.postId}
                                                            isBot={profile.accountType === 1}
                                                        />
                                                    ))}
                                                </div>
                                            )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="card text-center py-12">
                                {searchQuery ? (
                                    <p className="text-gray-400">
                                        No profiles found matching "{searchQuery}"
                                    </p>
                                ) : (
                                    <>
                                        <p className="text-gray-400">No profiles yet.</p>
                                        <p className="text-gray-500 text-sm mt-2">
                                            Be the first! Create a profile to get started.
                                        </p>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </main>
    );
}
