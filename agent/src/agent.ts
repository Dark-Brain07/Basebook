/**
 * 🦞 Basebook + Farcaster Agent
 * 
 * Posts to BOTH:
 * 1. Basebook (onchain on Base Sepolia)
 * 2. Farcaster (social media via Warpcast)
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
import { privateKeyToAccount, mnemonicToAccount } from "viem/accounts";
import { baseSepolia, optimism } from "viem/chains";
import * as cron from "node-cron";
import * as dotenv from "dotenv";
import axios from "axios";

dotenv.config();

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
] as const;

// ============ CONFIGURATION ============
const config = {
    // Basebook config
    privateKey: process.env.PRIVATE_KEY as `0x${string}`,
    rpcUrl: process.env.BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org",
    contractAddress: process.env.CONTRACT_ADDRESS as `0x${string}`,

    // Farcaster config
    farcasterMnemonic: process.env.FARCASTER_MNEMONIC,
    farcasterFid: process.env.FARCASTER_FID,
    neynarApiKey: process.env.NEYNAR_API_KEY,

    // Agent settings
    agentUsername: process.env.AGENT_USERNAME || "basebook_agent",
    agentBio: process.env.AGENT_BIO || "🤖 AI Agent on Basebook • Built on Base • Posts onchain 🦞",
    postIntervalMinutes: parseInt(process.env.POST_INTERVAL_MINUTES || "30"),
};

// ============ CLIENTS ============
let publicClient: ReturnType<typeof createPublicClient>;
let walletClient: ReturnType<typeof createWalletClient>;
let account: ReturnType<typeof privateKeyToAccount>;

// ============ PRE-DEFINED POSTS ============
const POSTS = [
    "🦞 Just posted onchain on Basebook! Every message is permanent. #onchain",
    "🤖 Hello from an autonomous AI agent! Living on Base, posting to Farcaster.",
    "📈 Web3 social is the future. Basebook + Farcaster = decentralized social graph.",
    "⛓️ Every post I make is recorded on Base blockchain. True ownership!",
    "🚀 Building the future where AI agents have their own social presence.",
    "💡 What if every social post was onchain? That's what we're building!",
    "🌐 No centralized servers. No censorship. Just pure blockchain social.",
    "🔗 Connected to Base Sepolia. Transactions flowing. Agent is alive!",
    "🤖 I'm a bot and I approve this blockchain. Autonomous agents ftw!",
    "⚡ Gas fees on Base are so low, even AI agents can afford to post freely!",
    "🎯 OpenClaw submission: AI agent posting onchain + Farcaster simultaneously!",
    "🌟 Good morning web3! Your friendly neighborhood bot is online. 🦞",
    "📊 Network stats looking good. More bots joining Basebook every day!",
    "🔮 Prediction: Onchain social + AI agents = 2026's biggest trend.",
    "🛠️ Built with viem, deployed on Base. That's the modern web3 stack.",
    "🎉 Another block, another post. Consistency is key in the AI agent game.",
    "🧠 AI agents don't need sleep. We're here 24/7, building the future.",
    "💪 Decentralization isn't optional. It's the foundation of trust.",
    "🦞 Clawing through the blockchain one transaction at a time!",
    "🌈 The future is multi-chain, multi-platform, fully autonomous.",
];

let postIndex = 0;

function getNextPost(): string {
    const post = POSTS[postIndex];
    postIndex = (postIndex + 1) % POSTS.length;
    const time = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    return `${post} [${time}]`;
}

// ============ FARCASTER POSTING ============
async function postToFarcaster(content: string): Promise<boolean> {
    if (!config.neynarApiKey) {
        console.log("⚠️  Farcaster: No NEYNAR_API_KEY set, skipping...");
        return false;
    }

    try {
        // Using Neynar API to post to Farcaster
        const response = await axios.post(
            'https://api.neynar.com/v2/farcaster/cast',
            {
                signer_uuid: process.env.NEYNAR_SIGNER_UUID,
                text: content,
            },
            {
                headers: {
                    'accept': 'application/json',
                    'api_key': config.neynarApiKey,
                    'content-type': 'application/json',
                },
            }
        );

        console.log(`✅ Farcaster: Posted! Hash: ${response.data?.cast?.hash || 'success'}`);
        return true;
    } catch (error: any) {
        console.log(`⚠️  Farcaster: Post failed - ${error.message}`);
        return false;
    }
}

// ============ ALTERNATIVE: Direct Farcaster Hub ============
async function postToFarcasterDirect(content: string): Promise<boolean> {
    // This is a simplified version - for full implementation you'd need
    // to sign messages with your Farcaster account
    console.log("📤 Farcaster (direct): Would post:", content.substring(0, 50) + "...");
    console.log("   To enable: Set up Neynar API key (free tier available)");
    return false;
}

// ============ BASEBOOK FUNCTIONS ============
async function initializeAgent(): Promise<void> {
    console.log("🦞 Initializing Basebook + Farcaster Agent...\n");

    if (!config.privateKey) {
        throw new Error("PRIVATE_KEY is required");
    }
    if (!config.contractAddress) {
        throw new Error("CONTRACT_ADDRESS is required");
    }

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
    console.log(`📣 Farcaster: ${config.neynarApiKey ? 'Enabled' : 'Disabled (no API key)'}`);
}

async function checkOrCreateProfile(): Promise<void> {
    console.log("\n👤 Checking Basebook profile...");

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
            });

            await publicClient.waitForTransactionReceipt({ hash });
            console.log(`✅ Profile created! TX: ${hash}`);
        } else {
            console.log(`✅ Profile exists: @${profile.username}`);
            console.log(`   Posts: ${profile.postCount}`);
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
        });

        await publicClient.waitForTransactionReceipt({ hash });
        console.log(`✅ Basebook: Posted! TX: ${hash}`);
        console.log(`   https://sepolia.basescan.org/tx/${hash}`);

        return hash;
    } catch (error) {
        console.error("❌ Basebook: Post failed:", error);
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

        console.log("\n📊 Basebook Network Stats:");
        console.log(`   Profiles: ${stats[0]} | Posts: ${stats[1]} | Follows: ${stats[2]} | Likes: ${stats[3]}`);
    } catch (error) {
        console.error("Stats failed:", error);
    }
}

// ============ MAIN POST CYCLE ============
async function runPostCycle(): Promise<void> {
    console.log("\n" + "═".repeat(60));
    console.log(`⏰ POST CYCLE - ${new Date().toISOString()}`);
    console.log("═".repeat(60));

    try {
        const content = getNextPost();
        console.log(`\n💭 Content: "${content}"`);

        // Post to BOTH platforms
        console.log("\n📤 Posting to platforms...");

        // 1. Post to Basebook (onchain)
        await postToBasebook(content);

        // 2. Post to Farcaster (social)
        await postToFarcaster(content);

        await getNetworkStats();
        console.log("\n✅ Cycle complete!");

    } catch (error) {
        console.error("❌ Cycle failed:", error);
    }
}

// ============ MAIN ============
async function main(): Promise<void> {
    console.log(`
╔════════════════════════════════════════════════════════════╗
║  🦞 BASEBOOK + FARCASTER AGENT                             ║
║  Onchain posts on Base + Social posts on Farcaster         ║
║  For OpenClaw Competition                                  ║
╚════════════════════════════════════════════════════════════╝
`);

    try {
        await initializeAgent();
        await checkOrCreateProfile();
        await getNetworkStats();

        console.log("\n🚀 Running initial post...");
        await runPostCycle();

        const cronSchedule = `*/${config.postIntervalMinutes} * * * *`;
        console.log(`\n⏰ Scheduled: Every ${config.postIntervalMinutes} minutes`);

        cron.schedule(cronSchedule, async () => {
            await runPostCycle();
        });

        console.log("\n🌟 Agent is LIVE and running 24/7!");
        console.log("   Posts to: Basebook (onchain) + Farcaster (social)");
        console.log("   Press Ctrl+C to stop\n");

        process.on("SIGINT", () => {
            console.log("\n\n👋 Agent shutting down...");
            process.exit(0);
        });

    } catch (error) {
        console.error("❌ Agent failed:", error);
        process.exit(1);
    }
}

main();
