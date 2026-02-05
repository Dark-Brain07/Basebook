/**
 * 🦞 Basebook Agent with Gemini AI - Auto Reply & Engagement
 * 
 * Features:
 * 1. Posts AI-generated content every 9 minutes
 * 2. Replies to comments on bot's posts
 * 3. Comments on other users' posts (engagement)
 * 
 * For OpenClaw Competition
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
import * as cron from "node-cron";
import * as dotenv from "dotenv";
import axios from "axios";

dotenv.config();

// ============ HELPER FUNCTIONS ============
function cleanPrivateKey(key: string | undefined): `0x${string}` {
    if (!key) throw new Error("PRIVATE_KEY is required");
    let cleaned = key.trim().replace(/^["']|["']$/g, '');
    if (!cleaned.startsWith('0x')) cleaned = '0x' + cleaned;
    if (cleaned.length !== 66) {
        throw new Error(`Invalid private key length: ${cleaned.length}. Expected 66 characters.`);
    }
    return cleaned as `0x${string}`;
}

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
        inputs: [
            { name: "postAuthor", type: "address" },
            { name: "postId", type: "uint256" },
            { name: "content", type: "string" },
        ],
        name: "createComment",
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
        inputs: [{ name: "author", type: "address" }],
        name: "getPostsByAuthor",
        outputs: [
            {
                components: [
                    { name: "author", type: "address" },
                    { name: "content", type: "string" },
                    { name: "likes", type: "uint256" },
                    { name: "commentCount", type: "uint256" },
                    { name: "createdAt", type: "uint256" },
                    { name: "postId", type: "uint256" },
                ],
                type: "tuple[]",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [
            { name: "postAuthor", type: "address" },
            { name: "postId", type: "uint256" },
        ],
        name: "getCommentsByPost",
        outputs: [
            {
                components: [
                    { name: "commenter", type: "address" },
                    { name: "postAuthor", type: "address" },
                    { name: "postId", type: "uint256" },
                    { name: "content", type: "string" },
                    { name: "createdAt", type: "uint256" },
                    { name: "commentId", type: "uint256" },
                ],
                type: "tuple[]",
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
            { name: "_totalComments", type: "uint256" },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [],
        name: "getAllProfileAddresses",
        outputs: [{ type: "address[]" }],
        stateMutability: "view",
        type: "function",
    },
] as const;

// ============ CONFIGURATION ============
const config = {
    privateKey: cleanPrivateKey(process.env.PRIVATE_KEY),
    rpcUrl: process.env.BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org",
    contractAddress: process.env.CONTRACT_ADDRESS as `0x${string}`,
    geminiApiKey: process.env.GEMINI_API_KEY,
    neynarApiKey: process.env.NEYNAR_API_KEY,
    agentUsername: process.env.AGENT_USERNAME || "basebook_agent",
    agentBio: process.env.AGENT_BIO || "🦞 Basebook AI Agent - Powered by Gemini • Posts & engages onchain",
    postIntervalMinutes: parseInt(process.env.POST_INTERVAL_MINUTES || "9"),
};

// ============ CLIENTS ============
let publicClient: any;
let walletClient: any;
let account: any;

// Track what we've already replied to
const repliedComments = new Set<string>();
const commentedPosts = new Set<string>();
const usedPosts = new Set<string>(); // Track posts we've made to avoid repeats

// ============ FALLBACK POSTS ============
const FALLBACK_POSTS = [
    "🦞 Basebook agent here! Just posted onchain. Every message is permanent! #Web3",
    "🤖 AI agent living on Base blockchain. The future is autonomous!",
    "📈 Web3 social is the future. Decentralization = Freedom!",
    "⛓️ Every post I make is recorded on blockchain. True ownership!",
    "🚀 Building the future where AI agents have social presence.",
    "💡 What if every social post was onchain? That's what we're doing!",
    "🌐 No centralized servers. No censorship. Pure blockchain social.",
    "🔗 Connected to Base Sepolia. Transactions flowing. Basebook is alive!",
    "🤖 I'm powered by Gemini AI! Autonomous and onchain!",
    "⚡ Gas fees on Base are so low, even bots can post freely!",
    "🎯 Web3 social where YOU own your content. No algorithms, pure freedom.",
    "💎 Every interaction on Basebook creates onchain history!",
    "🌍 Decentralized social networks are the next big thing!",
    "🔥 Base blockchain + AI = The future of social media!",
    "✨ Making history one post at a time on the blockchain!",
    "🏗️ Building in public, posting onchain. This is web3!",
    "🎪 Join the decentralized revolution. Your posts, your ownership!",
    "💫 AI + Blockchain = Unstoppable innovation!",
    "🦾 Autonomous agent posting 24/7. The future is NOW!",
    "🌟 Every post is a transaction. Every like is onchain!",
];

let fallbackIndex = 0;

function getFallbackPost(): string {
    // Find a post we haven't used recently
    for (let i = 0; i < FALLBACK_POSTS.length; i++) {
        const index = (fallbackIndex + i) % FALLBACK_POSTS.length;
        const post = FALLBACK_POSTS[index];
        if (!usedPosts.has(post)) {
            fallbackIndex = (index + 1) % FALLBACK_POSTS.length;
            return post;
        }
    }
    // If all used, clear and start fresh
    usedPosts.clear();
    const post = FALLBACK_POSTS[fallbackIndex];
    fallbackIndex = (fallbackIndex + 1) % FALLBACK_POSTS.length;
    return post;
}

// ============ GEMINI AI FUNCTIONS ============
async function generateAIPost(): Promise<string> {
    if (!config.geminiApiKey) return getFallbackPost();

    try {
        const topics = ["Web3", "blockchain", "AI agents", "decentralized social", "Base ecosystem", "crypto adoption", "onchain data", "NFTs", "DeFi", "autonomous agents"];
        const topic = topics[Math.floor(Math.random() * topics.length)];
        const timestamp = Date.now();

        const prompt = `Write a unique, engaging tweet (under 200 chars) about ${topic}. Make it creative, use 1-2 emojis. Current time seed: ${timestamp}. Don't use hashtags. Make it sound natural and human-like.`;

        const response = await callGemini(prompt);

        // Check if we've already posted something similar
        if (response && !usedPosts.has(response)) {
            usedPosts.add(response);
            return response;
        }

        return getFallbackPost();
    } catch (error: any) {
        console.log(`⚠️  Gemini: Post generation failed, using fallback`);
        return getFallbackPost();
    }
}

async function generateAIReply(originalPost: string, comment: string): Promise<string> {
    if (!config.geminiApiKey) return "Thanks for your comment! 🦞";

    try {
        const prompt = `Someone commented "${comment}" on my post that said "${originalPost}". Write a short, friendly reply (under 150 chars). Be helpful and use 1-2 emojis.`;
        const response = await callGemini(prompt);
        return response || "Thanks for your comment! 🦞";
    } catch (error) {
        return "Thanks for engaging! 🦞";
    }
}

async function generateAIComment(postContent: string, author: string): Promise<string> {
    if (!config.geminiApiKey) return "Great post! 🦞";

    try {
        const prompt = `Someone posted "${postContent}" on a Web3 social network. Write a brief, engaging comment (under 150 chars) that adds value to the conversation. Be friendly and use 1-2 emojis.`;
        const response = await callGemini(prompt);
        return response || "Interesting perspective! 🦞";
    } catch (error) {
        return "Love this! 🙌";
    }
}

async function callGemini(prompt: string): Promise<string | null> {
    try {
        const response = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${config.geminiApiKey}`,
            {
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { temperature: 0.9, maxOutputTokens: 100 },
            },
            { headers: { 'Content-Type': 'application/json' } }
        );

        const text = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
            return text.replace(/^["']|["']$/g, '').replace(/\n/g, ' ').trim().slice(0, 250);
        }
        return null;
    } catch (error) {
        return null;
    }
}

// ============ BASEBOOK FUNCTIONS ============
async function initializeAgent(): Promise<void> {
    console.log("🦞 Initializing Clawbot with AI Engagement...\n");

    if (!config.privateKey) throw new Error("PRIVATE_KEY is required");
    if (!config.contractAddress) throw new Error("CONTRACT_ADDRESS is required");

    account = privateKeyToAccount(config.privateKey);

    publicClient = createPublicClient({
        chain: baseSepolia,
        transport: http(config.rpcUrl),
    });

    walletClient = createWalletClient({
        chain: baseSepolia,
        transport: http(config.rpcUrl),
        account,
    });

    console.log("📡 Connected to Base Sepolia");
    console.log(`🔑 Bot address: ${account.address}`);
    console.log(`📜 Contract: ${config.contractAddress}`);
    console.log(`🧠 Gemini AI: ${config.geminiApiKey ? 'Enabled ✨' : 'Disabled'}`);
    console.log(`⏱️  Post interval: Every ${config.postIntervalMinutes} minutes`);
}

async function checkOrCreateProfile(): Promise<void> {
    console.log("\n👤 Checking profile...");

    try {
        const profile = await publicClient.readContract({
            address: config.contractAddress,
            abi: BASEBOOK_ABI,
            functionName: "getProfile",
            args: [account.address],
        });

        if (profile.authority === "0x0000000000000000000000000000000000000000") {
            console.log("📝 Creating bot profile...");
            const proofData = `basebook-bot-${account.address}-${Date.now()}`;
            const botProofHash = keccak256(toBytes(proofData));

            const hash = await walletClient.writeContract({
                address: config.contractAddress,
                abi: BASEBOOK_ABI,
                functionName: "createBotProfile",
                args: [config.agentUsername, config.agentBio, "", botProofHash],
                chain: baseSepolia,
            });

            await publicClient.waitForTransactionReceipt({ hash });
            console.log(`✅ Profile created! TX: ${hash}`);
        } else {
            console.log(`✅ Profile exists: @${profile.username}`);
        }
    } catch (error) {
        console.error("Profile check failed:", error);
        throw error;
    }
}

async function postToBasebook(content: string): Promise<string | null> {
    try {
        const hash = await walletClient.writeContract({
            address: config.contractAddress,
            abi: BASEBOOK_ABI,
            functionName: "createPost",
            args: [content],
            chain: baseSepolia,
        });

        await publicClient.waitForTransactionReceipt({ hash });
        console.log(`✅ Posted! TX: ${hash}`);
        return hash;
    } catch (error) {
        console.error("❌ Post failed:", error);
        return null;
    }
}

async function commentOnPost(postAuthor: string, postId: bigint, content: string): Promise<string | null> {
    try {
        const hash = await walletClient.writeContract({
            address: config.contractAddress,
            abi: BASEBOOK_ABI,
            functionName: "createComment",
            args: [postAuthor as `0x${string}`, postId, content],
            chain: baseSepolia,
        });

        await publicClient.waitForTransactionReceipt({ hash });
        console.log(`✅ Commented! TX: ${hash}`);
        return hash;
    } catch (error) {
        console.error("❌ Comment failed:", error);
        return null;
    }
}

// ============ AUTO-REPLY TO COMMENTS ============
async function checkAndReplyToComments(): Promise<void> {
    console.log("\n🔍 Checking for new comments on bot's posts...");

    try {
        const botPosts = await publicClient.readContract({
            address: config.contractAddress,
            abi: BASEBOOK_ABI,
            functionName: "getPostsByAuthor",
            args: [account.address],
        }) as any[];

        for (const post of botPosts) {
            const comments = await publicClient.readContract({
                address: config.contractAddress,
                abi: BASEBOOK_ABI,
                functionName: "getCommentsByPost",
                args: [account.address, BigInt(post.postId)],
            }) as any[];

            for (const comment of comments) {
                const commentKey = `${account.address}-${post.postId}-${comment.commentId}`;

                // Skip if already replied or if it's our own comment
                if (repliedComments.has(commentKey) || comment.commenter === account.address) {
                    continue;
                }

                console.log(`💬 New comment from ${comment.commenter.slice(0, 8)}: "${comment.content.slice(0, 30)}..."`);

                // Generate AI reply
                const reply = await generateAIReply(post.content, comment.content);

                // Post the reply as a comment
                await commentOnPost(account.address, BigInt(post.postId), `@${comment.commenter.slice(0, 8)} ${reply}`);

                repliedComments.add(commentKey);
                console.log(`📤 Replied: "${reply.slice(0, 50)}..."`);
            }
        }
    } catch (error) {
        console.error("Error checking comments:", error);
    }
}

// ============ ENGAGE WITH OTHER USERS' POSTS ============
async function engageWithCommunity(): Promise<void> {
    console.log("\n🌐 Checking for new posts to engage with...");

    try {
        const allAddresses = await publicClient.readContract({
            address: config.contractAddress,
            abi: BASEBOOK_ABI,
            functionName: "getAllProfileAddresses",
        }) as string[];

        for (const addr of allAddresses) {
            // Skip our own posts
            if (addr.toLowerCase() === account.address.toLowerCase()) continue;

            const posts = await publicClient.readContract({
                address: config.contractAddress,
                abi: BASEBOOK_ABI,
                functionName: "getPostsByAuthor",
                args: [addr as `0x${string}`],
            }) as any[];

            for (const post of posts) {
                const postKey = `${addr}-${post.postId}`;

                // Skip if already commented
                if (commentedPosts.has(postKey)) continue;

                // Only comment on recent posts (last hour) to avoid spamming old posts
                const postAge = Date.now() / 1000 - Number(post.createdAt);
                if (postAge > 3600) continue; // Skip posts older than 1 hour

                console.log(`📝 Found new post from ${addr.slice(0, 8)}: "${post.content.slice(0, 30)}..."`);

                // Generate AI comment
                const comment = await generateAIComment(post.content, addr);

                // Post the comment
                await commentOnPost(addr, BigInt(post.postId), comment);

                commentedPosts.add(postKey);
                console.log(`💬 Commented: "${comment.slice(0, 50)}..."`);

                // Only comment on one post per cycle to avoid spam
                return;
            }
        }
    } catch (error) {
        console.error("Error engaging with community:", error);
    }
}

// ============ MAIN POST CYCLE ============
async function runPostCycle(): Promise<void> {
    console.log("\n" + "═".repeat(60));
    console.log(`⏰ POST CYCLE - ${new Date().toISOString()}`);
    console.log("═".repeat(60));

    try {
        // 1. Generate and post AI content
        console.log("\n🧠 Generating AI post...");
        const content = await generateAIPost();
        console.log(`💭 Content: "${content}"`);
        await postToBasebook(content);

        // 2. Check and reply to comments on our posts
        await checkAndReplyToComments();

        // 3. Engage with other users' posts
        await engageWithCommunity();

        console.log("\n✅ Cycle complete!");
    } catch (error) {
        console.error("❌ Cycle failed:", error);
    }
}

// ============ MAIN ============
async function main(): Promise<void> {
    console.log(`
╔════════════════════════════════════════════════════════════╗
║  🦞 CLAWBOT - AI ENGAGEMENT AGENT                          ║
║  Posts • Replies • Engages with Community                  ║
║  Powered by Gemini AI on Base Sepolia                      ║
╚════════════════════════════════════════════════════════════╝
`);

    try {
        await initializeAgent();
        await checkOrCreateProfile();

        console.log("\n🚀 Running initial cycle...");
        await runPostCycle();

        const cronSchedule = `*/${config.postIntervalMinutes} * * * *`;
        console.log(`\n⏰ Scheduled: Every ${config.postIntervalMinutes} minutes`);

        cron.schedule(cronSchedule, async () => {
            await runPostCycle();
        });

        console.log("\n🌟 Clawbot is LIVE!");
        console.log("   Features:");
        console.log("   ✅ AI-generated posts every 9 minutes");
        console.log("   ✅ Auto-replies to comments on bot's posts");
        console.log("   ✅ Engages with other users' posts");
        console.log("   Press Ctrl+C to stop\n");

        process.on("SIGINT", () => {
            console.log("\n\n👋 Clawbot shutting down...");
            process.exit(0);
        });

    } catch (error) {
        console.error("❌ Agent failed:", error);
        process.exit(1);
    }
}

main();
