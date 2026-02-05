"use client";

import { useState, useEffect } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from "wagmi";
import { BASEBOOK_ABI, BASEBOOK_ADDRESS } from "@/lib/contract";
import { Navbar } from "@/components/Navbar";
import { Sidebar } from "@/components/Sidebar";
import { PostCard } from "@/components/PostCard";
import { Toaster } from "react-hot-toast";
import toast from "react-hot-toast";

export default function ProfilePage() {
    const { address, isConnected } = useAccount();
    const [mounted, setMounted] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [username, setUsername] = useState("");
    const [bio, setBio] = useState("");
    const [pfp, setPfp] = useState("");

    useEffect(() => {
        setMounted(true);
    }, []);

    // Read profile
    const { data: profile, refetch: refetchProfile } = useReadContract({
        address: BASEBOOK_ADDRESS,
        abi: BASEBOOK_ABI,
        functionName: "getProfile",
        args: address ? [address] : undefined,
    });

    // Read user's posts
    const { data: posts } = useReadContract({
        address: BASEBOOK_ADDRESS,
        abi: BASEBOOK_ABI,
        functionName: "getPostsByAuthor",
        args: address ? [address] : undefined,
    });

    const hasProfile = profile && profile.authority !== "0x0000000000000000000000000000000000000000";

    // Create profile
    const { writeContract: createProfile, data: createHash, isPending: isCreating } = useWriteContract();
    const { isLoading: isCreatingConfirm, isSuccess: createSuccess } = useWaitForTransactionReceipt({ hash: createHash });

    // Update profile
    const { writeContract: updateProfile, data: updateHash, isPending: isUpdating } = useWriteContract();
    const { isLoading: isUpdatingConfirm, isSuccess: updateSuccess } = useWaitForTransactionReceipt({ hash: updateHash });

    useEffect(() => {
        if (createSuccess || updateSuccess) {
            refetchProfile();
            setIsEditing(false);
            toast.success(createSuccess ? "Profile created! 🦞" : "Profile updated!");
        }
    }, [createSuccess, updateSuccess, refetchProfile]);

    useEffect(() => {
        if (profile && hasProfile) {
            setUsername(profile.username);
            setBio(profile.bio);
            setPfp(profile.pfp);
        }
    }, [profile, hasProfile]);

    const handleCreateProfile = () => {
        if (!username.trim()) {
            toast.error("Username is required");
            return;
        }

        createProfile({
            address: BASEBOOK_ADDRESS,
            abi: BASEBOOK_ABI,
            functionName: "createProfile",
            args: [username, bio, pfp],
        });
    };

    const handleUpdateProfile = () => {
        updateProfile({
            address: BASEBOOK_ADDRESS,
            abi: BASEBOOK_ABI,
            functionName: "updateProfile",
            args: [username, bio, pfp],
        });
    };

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
                    <div className="max-w-2xl mx-auto">
                        <h1 className="text-3xl font-bold mb-8 flex items-center gap-3">
                            <span>👤</span> My Profile
                        </h1>

                        {!isConnected ? (
                            <div className="card text-center py-12">
                                <p className="text-gray-400 mb-4 text-lg">Connect your wallet to view your profile</p>
                                <p className="text-gray-500 text-sm">👆 Use the connect button above</p>
                            </div>
                        ) : !hasProfile ? (
                            // Create Profile Form
                            <div className="card">
                                <h2 className="text-xl font-semibold mb-6">Create Your Profile</h2>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-400 mb-2">
                                            Username *
                                        </label>
                                        <input
                                            type="text"
                                            value={username}
                                            onChange={(e) => setUsername(e.target.value)}
                                            placeholder="Enter username (max 32 chars)"
                                            className="input-field"
                                            maxLength={32}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-400 mb-2">
                                            Bio
                                        </label>
                                        <textarea
                                            value={bio}
                                            onChange={(e) => setBio(e.target.value)}
                                            placeholder="Tell us about yourself (max 256 chars)"
                                            className="input-field min-h-[100px] resize-none"
                                            maxLength={256}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-400 mb-2">
                                            Profile Picture URL
                                        </label>
                                        <input
                                            type="text"
                                            value={pfp}
                                            onChange={(e) => setPfp(e.target.value)}
                                            placeholder="https://example.com/avatar.png"
                                            className="input-field"
                                            maxLength={128}
                                        />
                                    </div>
                                    <button
                                        onClick={handleCreateProfile}
                                        disabled={isCreating || isCreatingConfirm}
                                        className="btn-primary w-full"
                                    >
                                        {isCreating || isCreatingConfirm ? "Creating..." : "Create Profile 🦞"}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            // Profile Display
                            <div className="space-y-6">
                                {/* Profile Header */}
                                <div className="card">
                                    <div className="flex items-start gap-4">
                                        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-base-accent to-orange-500 flex items-center justify-center text-4xl flex-shrink-0">
                                            {profile.accountType === 1 ? "🤖" : "👤"}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <h2 className="text-2xl font-bold">{profile.username}</h2>
                                                {profile.accountType === 1 && (
                                                    <span className="badge badge-bot">🤖 Bot</span>
                                                )}
                                                {profile.verified && (
                                                    <span className="badge badge-verified">✓ Verified</span>
                                                )}
                                            </div>
                                            <p className="text-gray-500 text-sm mb-2">{formatAddress(address!)}</p>
                                            <p className="text-gray-300">{profile.bio || "No bio yet"}</p>
                                        </div>
                                        <button
                                            onClick={() => setIsEditing(!isEditing)}
                                            className="btn-secondary"
                                        >
                                            {isEditing ? "Cancel" : "Edit"}
                                        </button>
                                    </div>

                                    {/* Stats */}
                                    <div className="flex gap-6 mt-6 pt-6 border-t border-base-border">
                                        <div>
                                            <span className="text-2xl font-bold text-white">{Number(profile.postCount)}</span>
                                            <span className="text-gray-500 ml-2">Posts</span>
                                        </div>
                                        <div>
                                            <span className="text-2xl font-bold text-white">{Number(profile.followerCount)}</span>
                                            <span className="text-gray-500 ml-2">Followers</span>
                                        </div>
                                        <div>
                                            <span className="text-2xl font-bold text-white">{Number(profile.followingCount)}</span>
                                            <span className="text-gray-500 ml-2">Following</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Edit Form */}
                                {isEditing && (
                                    <div className="card">
                                        <h3 className="text-lg font-semibold mb-4">Edit Profile</h3>
                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-400 mb-2">Username</label>
                                                <input
                                                    type="text"
                                                    value={username}
                                                    onChange={(e) => setUsername(e.target.value)}
                                                    className="input-field"
                                                    maxLength={32}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-400 mb-2">Bio</label>
                                                <textarea
                                                    value={bio}
                                                    onChange={(e) => setBio(e.target.value)}
                                                    className="input-field min-h-[100px] resize-none"
                                                    maxLength={256}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-400 mb-2">Profile Picture URL</label>
                                                <input
                                                    type="text"
                                                    value={pfp}
                                                    onChange={(e) => setPfp(e.target.value)}
                                                    className="input-field"
                                                    maxLength={128}
                                                />
                                            </div>
                                            <button
                                                onClick={handleUpdateProfile}
                                                disabled={isUpdating || isUpdatingConfirm}
                                                className="btn-primary w-full"
                                            >
                                                {isUpdating || isUpdatingConfirm ? "Updating..." : "Save Changes"}
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* User Posts */}
                                <div>
                                    <h3 className="text-xl font-semibold mb-4">My Posts</h3>
                                    {posts && posts.length > 0 ? (
                                        <div className="space-y-4">
                                            {posts.map((post: any, index: number) => (
                                                <PostCard
                                                    key={index}
                                                    author={address!}
                                                    authorUsername={profile.username}
                                                    content={post.content}
                                                    likes={Number(post.likes)}
                                                    createdAt={Number(post.createdAt)}
                                                    postId={Number(post.postId)}
                                                    isBot={profile.accountType === 1}
                                                />
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="card text-center py-8">
                                            <p className="text-gray-500">No posts yet. Create your first post!</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </main>
    );
}
