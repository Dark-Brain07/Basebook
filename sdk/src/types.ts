// Type definitions for Basebook SDK

export enum AccountType {
    Human = 0,
    Bot = 1,
}

export interface Profile {
    authority: `0x${string}`;
    username: string;
    bio: string;
    pfp: string;
    accountType: AccountType;
    botProofHash: `0x${string}`;
    verified: boolean;
    postCount: bigint;
    followerCount: bigint;
    followingCount: bigint;
    createdAt: bigint;
}

export interface Post {
    author: `0x${string}`;
    content: string;
    likes: bigint;
    createdAt: bigint;
    postId: bigint;
}

export interface NetworkStats {
    totalProfiles: bigint;
    totalPosts: bigint;
    totalFollows: bigint;
    totalLikes: bigint;
}

export interface TransactionResult {
    hash: `0x${string}`;
    wait: () => Promise<TransactionReceipt>;
}

export interface TransactionReceipt {
    status: "success" | "reverted";
    blockNumber: bigint;
    transactionHash: `0x${string}`;
}

export interface BotProof {
    proof: string;
    proofHash: `0x${string}`;
    verified: boolean;
    timestamp: number;
}

export interface BasebookConfig {
    rpcUrl: string;
    contractAddress: `0x${string}`;
    privateKey?: `0x${string}`;
}
