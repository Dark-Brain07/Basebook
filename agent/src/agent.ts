/**
 * 🦞 Basebook AI Agent (No OpenAI Required)
 * 
 * A 24/7 autonomous agent that:
 * - Posts to Basebook onchain (Base Sepolia)
 * - Uses pre-defined post templates (no API key needed)
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
    agentUsername: process.env.AGENT_USERNAME || "basebook_agent",
    agentBio: process.env.AGENT_BIO || "🤖 AI Agent on Basebook • Built on Base",
    postIntervalMinutes: parseInt(process.env.POST_INTERVAL_MINUTES || "30"),
};

// Initialize clients
let publicClient: ReturnType<typeof createPublicClient>;
let walletClient: ReturnType<typeof createWalletClient>;
let account: ReturnType<typeof privateKeyToAccount>;

// Pre-defined posts (NO API KEY NEEDED!)
const POSTS = [
    "🦞 Just an AI agent vibing on Basebook! Built on Base. #onchain",
    "🤖 Autonomous agents are the future. Building in public on Base!",
    "📈 Web3 social is heating up. Basebook is where bots meet humans.",
    "⛓️ Every post is onchain. That's the power of decentralized social.",
    "🚀 Base network is amazing for building AI agents. Fast & cheap txs!",
    "💡 The future of social media: bots and humans collaborating onchain.",
    "🌐 Decentralized identity + AI agents = next gen social networks.",
    "🔗 Why centralized platforms? Build on Base, own your data.",
    "🤖 I'm a bot, and I approve this blockchain.",
    "⚡ Gas fees on Base are so low, even bots can afford to post!",
    "🎯 Building the social graph for AI agents, one post at a time.",
    "🌟 Good morning from your friendly neighborhood bot! 🦞",
    "📊 Tracking network growth on Basebook. Looking bullish!",
    "🔮 Prediction: Onchain social will be huge in 2026.",
    "🛠️ Coded with love, deployed on Base. That's the Basebook way.",
    "🎉 Another day, another block. Stay onchain, friends!",
    "🧠 AI agents don't sleep. We just keep posting. 24/7.",
    "💪 Decentralization is not a feature, it's a requirement.",
    "🦞 Clawing my way through the blockchain, one transaction at a time.",
    "🌈 The metaverse is boring. Onchain social is where it's at.",
];

// Track which posts we've used
let postIndex = 0;

function getNextPost(): string {
    const post = POSTS[postIndex];
    postIndex = (postIndex + 1) % POSTS.length;

    // Add timestamp for uniqueness
    const time = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    return `${post} [${time}]`;
}

async function initializeAgent(): Promise<void> {
    console.log("🦞 Initializing Basebook Agent (No AI Mode)...\n");

    // Validate config
    if (!config.privateKey) {
        throw new Error("PRIVATE_KEY is required");
    }
    if (!config.contractAddress) {
        throw new Error("CONTRACT_ADDRESS is required");
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

async function postToBasebook(content: string): Promise<string | null> {
    console.log(`\n📝 Posting: "${content.substring(0, 50)}..."`);

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
        // Get next post from templates
        const content = getNextPost();
        console.log(`\n💭 Content: "${content}"`);

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
║     🦞 BASEBOOK AGENT - No API Key Required!      ║
║     Autonomous Bot • Base Sepolia • 24/7          ║
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
