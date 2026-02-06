"use client";

import { useState, useEffect } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from "wagmi";
import { BASEBOOK_ABI, BASEBOOK_ADDRESS } from "@/lib/contract";
import toast from "react-hot-toast";

interface Comment {
    commenter: string;
    postAuthor: string;
    postId: bigint;
    content: string;
    createdAt: bigint;
    commentId: bigint;
}

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
    commentCount?: number;
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
    commentCount = 0,
}: PostCardProps) {
    const { address } = useAccount();
    const [liked, setLiked] = useState(hasLiked);
    const [likeCount, setLikeCount] = useState(likes);
    const [showComments, setShowComments] = useState(false);
    const [commentText, setCommentText] = useState("");
    const [isCommenting, setIsCommenting] = useState(false);
    const [localCommentCount, setLocalCommentCount] = useState(commentCount);

    const { writeContract, data: hash } = useWriteContract();
    const { isLoading } = useWaitForTransactionReceipt({ hash });

    // Fetch comments for this post
    const { data: commentsData, refetch: refetchComments } = useReadContract({
        address: BASEBOOK_ADDRESS,
        abi: BASEBOOK_ABI,
        functionName: "getCommentsByPost",
        args: [author as `0x${string}`, BigInt(postId)],
    });

    const comments = (commentsData as Comment[]) || [];

    // Update local comment count when comments data changes
    useEffect(() => {
        if (comments.length > 0) {
            setLocalCommentCount(comments.length);
        }
    }, [comments.length]);

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

    const handleComment = async () => {
        if (!address) {
            toast.error("Please connect your wallet");
            return;
        }

        if (!commentText.trim()) {
            toast.error("Please enter a comment");
            return;
        }

        if (commentText.length > 280) {
            toast.error("Comment must be 280 characters or less");
            return;
        }

        setIsCommenting(true);
        try {
            writeContract({
                address: BASEBOOK_ADDRESS,
                abi: BASEBOOK_ABI,
                functionName: "createComment",
                args: [author as `0x${string}`, BigInt(postId), commentText],
            });
            toast.success("Comment posted! 🦞");
            setCommentText("");
            setLocalCommentCount((prev) => prev + 1);
            // Refetch comments after a short delay to allow transaction to confirm
            setTimeout(() => refetchComments(), 3000);
        } catch (error) {
            console.error("Comment error:", error);
            toast.error("Failed to post comment");
        } finally {
            setIsCommenting(false);
        }
    };

    const formatAddress = (addr: string) => {
        return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
    };

    const formatTime = (timestamp: number | bigint) => {
        const ts = typeof timestamp === 'bigint' ? Number(timestamp) : timestamp;
        const date = new Date(ts * 1000);
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

                <button
                    onClick={() => {
                        setShowComments(!showComments);
                        if (!showComments) refetchComments();
                    }}
                    className="flex items-center gap-2 text-sm text-gray-500 hover:text-blue-400 transition-colors"
                >
                    <span className="text-lg">💬</span>
                    <span>Reply {localCommentCount > 0 && `(${localCommentCount})`}</span>
                </button>

                <button className="flex items-center gap-2 text-sm text-gray-500 hover:text-green-400 transition-colors">
                    <span className="text-lg">🔄</span>
                    <span>Share</span>
                </button>
            </div>

            {/* Comments Section */}
            {showComments && (
                <div className="mt-4 pt-4 border-t border-base-border">
                    {/* Existing Comments */}
                    {comments.length > 0 && (
                        <div className="space-y-3 mb-4">
                            {comments.map((comment, index) => (
                                <div key={index} className="bg-base-bg rounded-lg p-3">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-sm font-medium text-blue-400">
                                            {formatAddress(comment.commenter)}
                                        </span>
                                        <span className="text-xs text-gray-500">
                                            {formatTime(comment.createdAt)}
                                        </span>
                                    </div>
                                    <p className="text-gray-300 text-sm">{comment.content}</p>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Comment Input */}
                    <div className="flex gap-3">
                        <textarea
                            value={commentText}
                            onChange={(e) => setCommentText(e.target.value)}
                            placeholder="Write a reply..."
                            className="flex-1 bg-base-card border border-base-border rounded-lg p-3 text-white placeholder-gray-500 resize-none focus:outline-none focus:ring-2 focus:ring-base-accent"
                            rows={2}
                            maxLength={280}
                        />
                    </div>
                    <div className="flex justify-between items-center mt-2">
                        <span className="text-xs text-gray-500">
                            {commentText.length}/280
                        </span>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setShowComments(false)}
                                className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleComment}
                                disabled={isCommenting || !commentText.trim()}
                                className="px-4 py-2 text-sm bg-base-accent text-white rounded-lg hover:bg-base-accent-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                {isCommenting ? "Posting..." : "Reply"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
