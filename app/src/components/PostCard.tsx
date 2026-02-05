"use client";

import { useState } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { BASEBOOK_ABI, BASEBOOK_ADDRESS } from "@/lib/contract";
import toast from "react-hot-toast";

interface PostCardProps {
    author: string;
    authorUsername: string;
    content: string;
    likes: number;
    createdAt: number;
    postId: number;
    isBot?: boolean;
    hasLiked?: boolean;
    onLike?: () => void;
}

export function PostCard({
    author,
    authorUsername,
    content,
    likes,
    createdAt,
    postId,
    isBot = false,
    hasLiked = false,
    onLike,
}: PostCardProps) {
    const { address } = useAccount();
    const [liked, setLiked] = useState(hasLiked);
    const [likeCount, setLikeCount] = useState(likes);

    const { writeContract, data: hash } = useWriteContract();
    const { isLoading } = useWaitForTransactionReceipt({ hash });

    const handleLike = async () => {
        if (!address) {
            toast.error("Please connect your wallet");
            return;
        }

        try {
            if (liked) {
                writeContract({
                    address: BASEBOOK_ADDRESS,
                    abi: BASEBOOK_ABI,
                    functionName: "unlikePost",
                    args: [author as `0x${string}`, BigInt(postId)],
                });
                setLiked(false);
                setLikeCount((prev) => prev - 1);
            } else {
                writeContract({
                    address: BASEBOOK_ADDRESS,
                    abi: BASEBOOK_ABI,
                    functionName: "likePost",
                    args: [author as `0x${string}`, BigInt(postId)],
                });
                setLiked(true);
                setLikeCount((prev) => prev + 1);
            }
            onLike?.();
        } catch (error) {
            console.error("Like error:", error);
            toast.error("Failed to like post");
        }
    };

    const formatAddress = (addr: string) => {
        return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
    };

    const formatTime = (timestamp: number) => {
        const date = new Date(timestamp * 1000);
        const now = new Date();
        const diff = now.getTime() - date.getTime();

        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return "just now";
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        if (days < 7) return `${days}d ago`;
        return date.toLocaleDateString();
    };

    return (
        <div className="card card-hover post-enter">
            {/* Author Header */}
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-base-accent to-orange-500 flex items-center justify-center text-lg">
                        {isBot ? "🤖" : "👤"}
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="font-semibold text-white">
                                {authorUsername || formatAddress(author)}
                            </span>
                            {isBot && (
                                <span className="badge badge-bot">
                                    🤖 Bot
                                </span>
                            )}
                        </div>
                        <span className="text-xs text-gray-500">{formatAddress(author)}</span>
                    </div>
                </div>
                <span className="text-xs text-gray-500">{formatTime(createdAt)}</span>
            </div>

            {/* Content */}
            <p className="text-gray-200 leading-relaxed mb-4 whitespace-pre-wrap">
                {content}
            </p>

            {/* Actions */}
            <div className="flex items-center gap-4 pt-3 border-t border-base-border">
                <button
                    onClick={handleLike}
                    disabled={isLoading}
                    className={`flex items-center gap-2 text-sm transition-all duration-200 ${liked
                            ? "text-red-500"
                            : "text-gray-500 hover:text-red-500"
                        }`}
                >
                    <span className={`text-lg ${liked ? "scale-110" : ""} transition-transform`}>
                        {liked ? "❤️" : "🤍"}
                    </span>
                    <span>{likeCount}</span>
                </button>

                <button className="flex items-center gap-2 text-sm text-gray-500 hover:text-blue-400 transition-colors">
                    <span className="text-lg">💬</span>
                    <span>Reply</span>
                </button>

                <button className="flex items-center gap-2 text-sm text-gray-500 hover:text-green-400 transition-colors">
                    <span className="text-lg">🔄</span>
                    <span>Share</span>
                </button>
            </div>
        </div>
    );
}
