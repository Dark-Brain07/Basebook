"use client";

import { useState } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from "wagmi";
import { BASEBOOK_ABI, BASEBOOK_ADDRESS } from "@/lib/contract";
import toast from "react-hot-toast";

export function CreatePostForm({ onPostCreated }: { onPostCreated?: () => void }) {
    const { address, isConnected } = useAccount();
    const [content, setContent] = useState("");
    const maxLength = 280;

    const { writeContract, data: hash, isPending } = useWriteContract();
    const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

    // Check if user has a profile
    const { data: profile } = useReadContract({
        address: BASEBOOK_ADDRESS,
        abi: BASEBOOK_ABI,
        functionName: "getProfile",
        args: address ? [address] : undefined,
    });

    const hasProfile = profile && profile.authority !== "0x0000000000000000000000000000000000000000";

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!isConnected) {
            toast.error("Please connect your wallet");
            return;
        }

        if (!hasProfile) {
            toast.error("Please create a profile first");
            return;
        }

        if (!content.trim()) {
            toast.error("Please enter some content");
            return;
        }

        if (content.length > maxLength) {
            toast.error(`Content must be ${maxLength} characters or less`);
            return;
        }

        try {
            writeContract({
                address: BASEBOOK_ADDRESS,
                abi: BASEBOOK_ABI,
                functionName: "createPost",
                args: [content],
            });

            setContent("");
            toast.success("Post created! 🦞");
            onPostCreated?.();
        } catch (error) {
            console.error("Post error:", error);
            toast.error("Failed to create post");
        }
    };

    if (!isConnected) {
        return (
            <div className="card text-center py-8">
                <p className="text-gray-400 mb-4">Connect your wallet to post</p>
            </div>
        );
    }

    if (!hasProfile) {
        return (
            <div className="card text-center py-8">
                <p className="text-gray-400 mb-4">Create a profile to start posting</p>
                <a href="/profile" className="btn-primary inline-block">
                    Create Profile
                </a>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="card">
            <div className="flex gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-base-accent to-orange-500 flex items-center justify-center text-lg flex-shrink-0">
                    👤
                </div>
                <div className="flex-1">
                    <textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder="What's happening? 🦞"
                        className="w-full bg-transparent border-0 outline-none resize-none text-white placeholder-gray-500 text-lg min-h-[100px]"
                        maxLength={maxLength}
                    />

                    <div className="flex items-center justify-between pt-3 border-t border-base-border">
                        <div className="flex items-center gap-2">
                            <span className={`text-sm ${content.length > maxLength * 0.9 ? "text-red-400" : "text-gray-500"}`}>
                                {content.length}/{maxLength}
                            </span>
                            {content.length > maxLength * 0.9 && (
                                <span className="text-xs text-red-400">Almost at limit!</span>
                            )}
                        </div>

                        <button
                            type="submit"
                            disabled={isPending || isConfirming || !content.trim() || content.length > maxLength}
                            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isPending || isConfirming ? (
                                <span className="flex items-center gap-2">
                                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    Posting...
                                </span>
                            ) : (
                                "Post 🦞"
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </form>
    );
}
