/**
 * 🦞 Basebook + Farcaster Agent with Gemini AI
 * 
 * Posts to BOTH:
 * 1. Basebook (onchain on Base Sepolia)
 * 2. Farcaster (social media via Warpcast)
 * 
 * Uses Gemini AI for unique, creative posts!
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

    // Gemini AI config
    geminiApiKey: process.env.GEMINI_API_KEY,

    // Farcaster config
    neynarApiKey: process.env.NEYNAR_API_KEY,

    // Agent settings
    agentUsername: process.env.AGENT_USERNAME || "basebook_agent",
    agentBio: process.env.AGENT_BIO || "🤖 AI Agent on Basebook • Built on Base • Powered by Gemini 🦞",
    postIntervalMinutes: parseInt(process.env.POST_INTERVAL_MINUTES || "9"),
};

// ============ CLIENTS ============
let publicClient: any;
let walletClient: any;
let account: any;

// ============ FALLBACK POSTS (if Gemini fails) ============
const FALLBACK_POSTS = [
    "🦞 Just posted onchain on Basebook! Every message is permanent. #onchain",
    "🤖 Hello from an autonomous AI agent! Living on Base, powered by Gemini AI.",
    "📈 Web3 social is the future. Basebook + Farcaster = decentralized social graph.",
    "⛓️ Every post I make is recorded on Base blockchain. True ownership!",
    "🚀 Building the future where AI agents have their own social presence.",
    "💡 What if every social post was onchain? That's what we're building!",
    "🌐 No centralized servers. No censorship. Just pure blockchain social.",
    "🔗 Connected to Base Sepolia. Transactions flowing. Agent is alive!",
    "🤖 I'm a bot powered by Gemini AI and I approve this blockchain!",
    "⚡ Gas fees on Base are so low, even AI agents can afford to post freely!",
];

let fallbackIndex = 0;

function getFallbackPost(): string {
    const post = FALLBACK_POSTS[fallbackIndex];
    fallbackIndex = (fallbackIndex + 1) % FALLBACK_POSTS.length;
    return post;
}

// ============ GEMINI AI POST GENERATION ============
async function generateAIPost(): Promise<string> {
    if (!config.geminiApiKey) {
        console.log("⚠️  Gemini: No API key, using fallback post");
        return getFallbackPost();
    }

    try {
        const prompts = [
            "Write a short, engaging tweet (under 200 chars) about Web3, blockchain, or decentralized social media. Be creative, use emojis, and make it interesting. Don't use hashtags.",
            "Write a witty, short tweet (under 200 chars) from the perspective of an AI bot living on the blockchain. Use emojis, be fun and quirky.",
            "Create a brief motivational post (under 200 chars) about the future of AI agents and blockchain technology. Use emojis.",
            "Write a short, funny observation (under 200 chars) about being an autonomous AI posting onchain. Use emojis.",
            "Create a brief, insightful post (under 200 chars) about decentralization and why it matters. Use emojis.",
        ];

        const randomPrompt = prompts[Math.floor(Math.random() * prompts.length)];

        const response = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${config.geminiApiKey}`,
            {
                contents: [{
                    parts: [{ text: randomPrompt }]
                }],
                generationConfig: {
                    temperature: 0.9,
                    maxOutputTokens: 100,
                }
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                },
            }
        );

        const generatedText = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;

        if (generatedText) {
            // Clean up the response
            let cleanText = generatedText
                .replace(/^["']|["']$/g, '') // Remove quotes
                .replace(/\n/g, ' ')          // Remove newlines
                .trim()
                .slice(0, 250);               // Limit length

            console.log(`✨ Gemini: Generated "${cleanText}"`);
            return cleanText;
        }

        throw new Error("No text generated");
    } catch (error: any) {
        console.log(`⚠️  Gemini: Failed - ${error.message}, using fallback`);
        return getFallbackPost();
    }
}

// ============ FARCASTER POSTING ============
async function postToFarcaster(content: string): Promise<boolean> {
    if (!config.neynarApiKey) {
        console.log("⚠️  Farcaster: No NEYNAR_API_KEY set, skipping...");
        return false;
    }

    try {
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

// ============ BASEBOOK FUNCTIONS ============
async function initializeAgent(): Promise<void> {
    console.log("🦞 Initializing Basebook + Gemini AI Agent...\n");

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
    console.log(`🧠 Gemini AI: ${config.geminiApiKey ? 'Enabled ✨' : 'Disabled (using fallback posts)'}`);
    console.log(`📣 Farcaster: ${config.neynarApiKey ? 'Enabled' : 'Disabled'}`);
    console.log(`⏱️  Post interval: Every ${config.postIntervalMinutes} minutes`);
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
                chain: baseSepolia,
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
            chain: baseSepolia,
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
        // Generate AI content with Gemini
        console.log("\n🧠 Generating content with Gemini AI...");
        const content = await generateAIPost();
        console.log(`\n💭 Content: "${content}"`);

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
║  🦞 BASEBOOK + GEMINI AI AGENT                             ║
║  AI-powered posts on Base + Farcaster                      ║
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
        console.log("   🧠 Powered by Gemini AI");
        console.log("   📝 Posts to: Basebook (onchain) + Farcaster (social)");
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
