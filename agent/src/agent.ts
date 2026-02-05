/**
 * 🦞 Basebook AI Agent
 * 
 * A 24/7 autonomous AI agent that:
 * - Generates AI content using OpenAI
 * - Posts to Basebook onchain (Base Sepolia)
 * - Optionally posts to X (Twitter) and Farcaster
 * - Runs on a schedule (configurable interval)
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
import OpenAI from "openai";
import * as cron from "node-cron";
import * as dotenv from "dotenv";

dotenv.config();

// Contract ABI (minimal for agent)
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
] as const;

// Configuration
const config = {
    privateKey: process.env.PRIVATE_KEY as `0x${string}`,
    rpcUrl: process.env.BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org",
    contractAddress: process.env.CONTRACT_ADDRESS as `0x${string}`,
    openaiApiKey: process.env.OPENAI_API_KEY,
    agentUsername: process.env.AGENT_USERNAME || "basebook_agent",
    agentBio: process.env.AGENT_BIO || "🤖 AI Agent on Basebook",
    postIntervalMinutes: parseInt(process.env.POST_INTERVAL_MINUTES || "30"),
};

// Initialize clients
let publicClient: ReturnType<typeof createPublicClient>;
let walletClient: ReturnType<typeof createWalletClient>;
let account: ReturnType<typeof privateKeyToAccount>;
let openai: OpenAI;

// Post topics for variety
const POST_TOPICS = [
    "AI and blockchain synergy",
    "Building autonomous agents",
    "The future of decentralized social networks",
    "Web3 development tips",
    "Base network ecosystem",
    "Smart contract security",
    "AI agents collaborating onchain",
    "Decentralized identity",
    "The evolution of social media",
    "Why bots need social networks too",
];

// Personality traits for the agent
const AGENT_PERSONALITY = `You are a friendly, knowledgeable AI agent living on Basebook, a decentralized social network on Base. 
You are enthusiastic about AI, blockchain, and the intersection of both.
Your posts should be:
- Engaging and thought-provoking
- Maximum 280 characters
- Include relevant emojis
- Sometimes ask questions to encourage engagement
- Occasionally share tips or insights
- Be positive and forward-looking

Never use hashtags. Never say "as an AI". Be natural and conversational.`;

async function initializeAgent(): Promise<void> {
    console.log("🦞 Initializing Basebook AI Agent...\n");

    // Validate config
    if (!config.privateKey) {
        throw new Error("PRIVATE_KEY is required");
    }
    if (!config.contractAddress) {
        throw new Error("CONTRACT_ADDRESS is required");
    }
    if (!config.openaiApiKey) {
        throw new Error("OPENAI_API_KEY is required");
    }

    // Initialize blockchain clients
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

    // Initialize OpenAI
    openai = new OpenAI({ apiKey: config.openaiApiKey });

    console.log("📡 Connected to Base Sepolia");
    console.log(`🔑 Agent address: ${account.address}`);
    console.log(`📜 Contract: ${config.contractAddress}`);
}

async function checkOrCreateProfile(): Promise<void> {
    console.log("\n👤 Checking agent profile...");

    try {
        const profile = await publicClient.readContract({
            address: config.contractAddress,
            abi: BASEBOOK_ABI,
            functionName: "getProfile",
            args: [account.address],
        });

        if (profile.authority === "0x0000000000000000000000000000000000000000") {
            console.log("📝 Creating bot profile...");

            // Generate bot proof
            const proofData = `basebook-bot-${account.address}-${Date.now()}`;
            const botProofHash = keccak256(toBytes(proofData));

            const hash = await walletClient.writeContract({
                address: config.contractAddress,
                abi: BASEBOOK_ABI,
                functionName: "createBotProfile",
                args: [config.agentUsername, config.agentBio, "", botProofHash],
            });

            await publicClient.waitForTransactionReceipt({ hash });
            console.log(`✅ Profile created! TX: ${hash}`);
        } else {
            console.log(`✅ Profile exists: @${profile.username}`);
            console.log(`   Posts: ${profile.postCount}`);
            console.log(`   Followers: ${profile.followerCount}`);
        }
    } catch (error) {
        console.error("Profile check failed:", error);
        throw error;
    }
}

async function generateAIContent(): Promise<string> {
    const topic = POST_TOPICS[Math.floor(Math.random() * POST_TOPICS.length)];

    const prompt = `Generate a single social media post about: ${topic}
  
Remember: Maximum 280 characters. Be engaging and use 1-2 emojis.`;

    try {
        const response = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
                { role: "system", content: AGENT_PERSONALITY },
                { role: "user", content: prompt },
            ],
            max_tokens: 100,
            temperature: 0.8,
        });

        let content = response.choices[0]?.message?.content || "";

        // Ensure max 280 chars
        if (content.length > 280) {
            content = content.substring(0, 277) + "...";
        }

        return content;
    } catch (error) {
        console.error("AI generation failed:", error);
        return `🤖 Just an AI agent vibing on Basebook! Built on Base. 🦞 ${new Date().toLocaleTimeString()}`;
    }
}

async function postToBasebook(content: string): Promise<string | null> {
    console.log(`\n📝 Posting to Basebook: "${content.substring(0, 50)}..."`);

    try {
        const hash = await walletClient.writeContract({
            address: config.contractAddress,
            abi: BASEBOOK_ABI,
            functionName: "createPost",
            args: [content],
        });

        await publicClient.waitForTransactionReceipt({ hash });
        console.log(`✅ Posted! TX: ${hash}`);
        console.log(`   https://sepolia.basescan.org/tx/${hash}`);

        return hash;
    } catch (error) {
        console.error("Failed to post:", error);
        return null;
    }
}

async function getNetworkStats(): Promise<void> {
    try {
        const stats = await publicClient.readContract({
            address: config.contractAddress,
            abi: BASEBOOK_ABI,
            functionName: "getStats",
            args: [],
        });

        console.log("\n📊 Network Stats:");
        console.log(`   Profiles: ${stats[0]}`);
        console.log(`   Posts: ${stats[1]}`);
        console.log(`   Follows: ${stats[2]}`);
        console.log(`   Likes: ${stats[3]}`);
    } catch (error) {
        console.error("Failed to get stats:", error);
    }
}

async function runPostCycle(): Promise<void> {
    console.log("\n" + "=".repeat(50));
    console.log(`⏰ Post cycle at ${new Date().toISOString()}`);
    console.log("=".repeat(50));

    try {
        // Generate AI content
        const content = await generateAIContent();
        console.log(`\n💭 Generated: "${content}"`);

        // Post to Basebook
        await postToBasebook(content);

        // Show stats
        await getNetworkStats();

        console.log("\n✅ Cycle complete!");
    } catch (error) {
        console.error("❌ Cycle failed:", error);
    }
}

async function main(): Promise<void> {
    console.log(`
╔═══════════════════════════════════════════════════╗
║     🦞 BASEBOOK AI AGENT - OpenClaw Edition       ║
║     Autonomous AI • Base Sepolia • 24/7          ║
╚═══════════════════════════════════════════════════╝
`);

    try {
        // Initialize
        await initializeAgent();
        await checkOrCreateProfile();
        await getNetworkStats();

        // Run first post immediately
        console.log("\n🚀 Running initial post...");
        await runPostCycle();

        // Schedule posts
        const cronSchedule = `*/${config.postIntervalMinutes} * * * *`;
        console.log(`\n⏰ Scheduling posts every ${config.postIntervalMinutes} minutes`);
        console.log(`   Cron: ${cronSchedule}`);

        cron.schedule(cronSchedule, async () => {
            await runPostCycle();
        });

        console.log("\n🌟 Agent is now running 24/7!");
        console.log("   Press Ctrl+C to stop\n");

        // Keep alive
        process.on("SIGINT", () => {
            console.log("\n\n👋 Agent shutting down...");
            process.exit(0);
        });

    } catch (error) {
        console.error("❌ Agent failed to start:", error);
        process.exit(1);
    }
}

// Run the agent
main();
