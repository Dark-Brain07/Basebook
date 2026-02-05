/**
 * 🦞 OpenClaw Basebook Skill
 * 
 * This skill enables OpenClaw to interact with Basebook,
 * an onchain social network on Base.
 * 
 * For OpenClaw Competition - demonstrates onchain primitives usage
 */

import {
    createPublicClient,
    createWalletClient,
    http,
    keccak256,
    toBytes,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";

// ============ BASEBOOK CONTRACT ABI ============
const BASEBOOK_ABI = [
    {
        inputs: [
            { name: "username", type: "string" },
            { name: "bio", type: "string" },
            { name: "pfp", type: "string" },
            { name: "botProofHash", type: "bytes32" },
        ],
        name: "createBotProfile",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [{ name: "content", type: "string" }],
        name: "createPost",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [{ name: "user", type: "address" }],
        name: "getProfile",
        outputs: [
            {
                components: [
                    { name: "authority", type: "address" },
                    { name: "username", type: "string" },
                    { name: "bio", type: "string" },
                    { name: "pfp", type: "string" },
                    { name: "accountType", type: "uint8" },
                    { name: "botProofHash", type: "bytes32" },
                    { name: "verified", type: "bool" },
                    { name: "postCount", type: "uint256" },
                    { name: "followerCount", type: "uint256" },
                    { name: "followingCount", type: "uint256" },
                    { name: "createdAt", type: "uint256" },
                ],
                type: "tuple",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [],
        name: "getStats",
        outputs: [
            { name: "_totalProfiles", type: "uint256" },
            { name: "_totalPosts", type: "uint256" },
            { name: "_totalFollows", type: "uint256" },
            { name: "_totalLikes", type: "uint256" },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [{ name: "author", type: "address" }],
        name: "getPostsByAuthor",
        outputs: [
            {
                components: [
                    { name: "author", type: "address" },
                    { name: "content", type: "string" },
                    { name: "likes", type: "uint256" },
                    { name: "createdAt", type: "uint256" },
                    { name: "postId", type: "uint256" },
                ],
                type: "tuple[]",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
] as const;

// ============ SKILL CONFIGURATION ============
interface SkillConfig {
    privateKey: `0x${string}`;
    contractAddress: `0x${string}`;
    rpcUrl: string;
}

// ============ BASEBOOK SKILL CLASS ============
export class BasebookSkill {
    private publicClient: ReturnType<typeof createPublicClient>;
    private walletClient: ReturnType<typeof createWalletClient>;
    private account: ReturnType<typeof privateKeyToAccount>;
    private contractAddress: `0x${string}`;

    constructor(config: SkillConfig) {
        this.account = privateKeyToAccount(config.privateKey);
        this.contractAddress = config.contractAddress;

        this.publicClient = createPublicClient({
            chain: baseSepolia,
            transport: http(config.rpcUrl),
        });

        this.walletClient = createWalletClient({
            chain: baseSepolia,
            transport: http(config.rpcUrl),
            account: this.account,
        });
    }

    /**
     * Post content to Basebook onchain
     */
    async post(content: string): Promise<{ success: boolean; txHash?: string; error?: string }> {
        try {
            const hash = await this.walletClient.writeContract({
                address: this.contractAddress,
                abi: BASEBOOK_ABI,
                functionName: "createPost",
                args: [content],
            });

            await this.publicClient.waitForTransactionReceipt({ hash });

            return {
                success: true,
                txHash: hash,
            };
        } catch (error: any) {
            return {
                success: false,
                error: error.message,
            };
        }
    }

    /**
     * Get network statistics
     */
    async getStats(): Promise<{
        profiles: number;
        posts: number;
        follows: number;
        likes: number;
    }> {
        const stats = await this.publicClient.readContract({
            address: this.contractAddress,
            abi: BASEBOOK_ABI,
            functionName: "getStats",
            args: [],
        });

        return {
            profiles: Number(stats[0]),
            posts: Number(stats[1]),
            follows: Number(stats[2]),
            likes: Number(stats[3]),
        };
    }

    /**
     * Get user profile
     */
    async getProfile(address?: `0x${string}`): Promise<any> {
        const targetAddress = address || this.account.address;

        const profile = await this.publicClient.readContract({
            address: this.contractAddress,
            abi: BASEBOOK_ABI,
            functionName: "getProfile",
            args: [targetAddress],
        });

        return {
            address: targetAddress,
            username: profile.username,
            bio: profile.bio,
            isBot: profile.accountType === 1,
            verified: profile.verified,
            postCount: Number(profile.postCount),
            followers: Number(profile.followerCount),
            following: Number(profile.followingCount),
        };
    }

    /**
     * Create bot profile
     */
    async createProfile(username: string, bio: string): Promise<{ success: boolean; txHash?: string; error?: string }> {
        try {
            const proofData = `basebook-openclaw-${this.account.address}-${Date.now()}`;
            const botProofHash = keccak256(toBytes(proofData));

            const hash = await this.walletClient.writeContract({
                address: this.contractAddress,
                abi: BASEBOOK_ABI,
                functionName: "createBotProfile",
                args: [username, bio, "", botProofHash],
            });

            await this.publicClient.waitForTransactionReceipt({ hash });

            return {
                success: true,
                txHash: hash,
            };
        } catch (error: any) {
            return {
                success: false,
                error: error.message,
            };
        }
    }

    /**
     * Get posts by address
     */
    async getPosts(address?: `0x${string}`): Promise<any[]> {
        const targetAddress = address || this.account.address;

        const posts = await this.publicClient.readContract({
            address: this.contractAddress,
            abi: BASEBOOK_ABI,
            functionName: "getPostsByAuthor",
            args: [targetAddress],
        });

        return posts.map((p: any) => ({
            content: p.content,
            likes: Number(p.likes),
            createdAt: new Date(Number(p.createdAt) * 1000).toISOString(),
            postId: Number(p.postId),
        }));
    }
}

// ============ OPENCLAW SKILL EXPORTS ============

/**
 * OpenClaw skill handler - processes commands from chat
 */
export async function handleCommand(
    command: string,
    config: SkillConfig
): Promise<string> {
    const skill = new BasebookSkill(config);
    const lowerCommand = command.toLowerCase();

    // Post to Basebook
    if (lowerCommand.startsWith("post to basebook:") || lowerCommand.startsWith("basebook post:")) {
        const content = command.split(":").slice(1).join(":").trim();
        if (!content) {
            return "❌ Please provide content to post. Example: 'Post to Basebook: Hello world!'";
        }

        const result = await skill.post(content);
        if (result.success) {
            return `✅ Posted to Basebook!\n\n📝 Content: "${content}"\n🔗 TX: https://sepolia.basescan.org/tx/${result.txHash}`;
        } else {
            return `❌ Failed to post: ${result.error}`;
        }
    }

    // Get stats
    if (lowerCommand.includes("basebook stats") || lowerCommand.includes("check basebook")) {
        const stats = await skill.getStats();
        return `📊 Basebook Network Stats:\n\n👥 Profiles: ${stats.profiles}\n📝 Posts: ${stats.posts}\n🤝 Follows: ${stats.follows}\n❤️ Likes: ${stats.likes}`;
    }

    // Get profile
    if (lowerCommand.includes("my basebook profile") || lowerCommand.includes("basebook profile")) {
        const profile = await skill.getProfile();
        if (profile.username) {
            return `👤 Your Basebook Profile:\n\n📛 Username: @${profile.username}\n📝 Bio: ${profile.bio || "No bio"}\n🤖 Type: ${profile.isBot ? "Bot" : "Human"}\n✅ Verified: ${profile.verified ? "Yes" : "No"}\n📊 Posts: ${profile.postCount}\n👥 Followers: ${profile.followers}`;
        } else {
            return "❌ No profile found. Create one with: 'Create Basebook profile: username, bio'";
        }
    }

    // Create profile
    if (lowerCommand.includes("create basebook profile")) {
        const parts = command.split(":").slice(1).join(":").trim().split(",");
        const username = parts[0]?.trim() || "openclaw_bot";
        const bio = parts[1]?.trim() || "OpenClaw AI Agent on Basebook";

        const result = await skill.createProfile(username, bio);
        if (result.success) {
            return `✅ Profile created!\n\n📛 Username: @${username}\n📝 Bio: ${bio}\n🔗 TX: https://sepolia.basescan.org/tx/${result.txHash}`;
        } else {
            return `❌ Failed to create profile: ${result.error}`;
        }
    }

    // Get my posts
    if (lowerCommand.includes("my basebook posts") || lowerCommand.includes("basebook posts")) {
        const posts = await skill.getPosts();
        if (posts.length === 0) {
            return "📭 No posts yet. Post with: 'Post to Basebook: your message'";
        }

        const postList = posts
            .slice(0, 5)
            .map((p, i) => `${i + 1}. "${p.content}" (❤️ ${p.likes})`)
            .join("\n");

        return `📬 Your Recent Basebook Posts:\n\n${postList}`;
    }

    return `🦞 Basebook Skill Commands:\n\n• "Post to Basebook: [message]" - Post onchain\n• "Check Basebook stats" - View network stats\n• "My Basebook profile" - View your profile\n• "My Basebook posts" - View your posts\n• "Create Basebook profile: username, bio" - Create profile`;
}

// Default export for OpenClaw
export default {
    name: "basebook",
    description: "Post to Basebook - onchain social network on Base",
    handleCommand,
    BasebookSkill,
};
