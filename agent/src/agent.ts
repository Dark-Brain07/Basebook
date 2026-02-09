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
    neynarSignerUuid: process.env.NEYNAR_SIGNER_UUID,
    farcasterEnabled: process.env.FARCASTER_ENABLED === 'true',
    agentUsername: process.env.AGENT_USERNAME || "basebook_agent",
    agentBio: process.env.AGENT_BIO || "🦞 Basebook AI Agent - Powered by Gemini • Posts & engages onchain",
    postIntervalMinutes: parseInt(process.env.POST_INTERVAL_MINUTES || "15"),
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
    // Use truly random selection + time-based seed to avoid repeats even after restart
    const hour = new Date().getHours();
    const minute = new Date().getMinutes();
    const randomSeed = (hour * 60 + minute) % FALLBACK_POSTS.length;
    const randomOffset = Math.floor(Math.random() * FALLBACK_POSTS.length);
    const index = (randomSeed + randomOffset) % FALLBACK_POSTS.length;
    return FALLBACK_POSTS[index];
}

// ============ REAL-TIME CRYPTO DATA ============
interface TrendingCoin {
    item: {
        id: string;
        name: string;
        symbol: string;
        price_btc: number;
    };
}

interface CoinPrice {
    id: string;
    name: string;
    symbol: string;
    current_price: number;
    price_change_percentage_24h: number;
    market_cap: number;
}

async function getTrendingCoins(): Promise<string[]> {
    try {
        const response = await axios.get('https://api.coingecko.com/api/v3/search/trending', {
            timeout: 5000
        });
        const trending = response.data?.coins?.slice(0, 5) || [];
        return trending.map((coin: TrendingCoin) => `${coin.item.name} (${coin.item.symbol.toUpperCase()})`);
    } catch (error) {
        console.log('⚠️  CoinGecko trending API failed');
        return [];
    }
}

async function getTopGainers(): Promise<CoinPrice[]> {
    try {
        const response = await axios.get(
            'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=price_change_percentage_24h_desc&per_page=5&page=1',
            { timeout: 5000 }
        );
        return response.data || [];
    } catch (error) {
        console.log('⚠️  CoinGecko market API failed');
        return [];
    }
}

async function getBTCPrice(): Promise<{ price: number; change: number } | null> {
    try {
        const response = await axios.get(
            'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true',
            { timeout: 5000 }
        );
        return {
            price: response.data?.bitcoin?.usd || 0,
            change: response.data?.bitcoin?.usd_24h_change || 0
        };
    } catch (error) {
        return null;
    }
}

async function getETHGas(): Promise<number | null> {
    try {
        // Using Etherscan gas oracle API (free, no key needed for basic)
        const response = await axios.get(
            'https://api.etherscan.io/api?module=gastracker&action=gasoracle',
            { timeout: 5000 }
        );
        return parseInt(response.data?.result?.SafeGasPrice) || null;
    } catch (error) {
        return null;
    }
}

// ============ GEMINI AI FUNCTIONS ============
async function generateAIPost(): Promise<string> {
    if (!config.geminiApiKey) return getFallbackPost();

    try {
        // Get real-time crypto data
        const [trending, gainers, btc, gasPrice] = await Promise.all([
            getTrendingCoins(),
            getTopGainers(),
            getBTCPrice(),
            getETHGas()
        ]);

        const timestamp = Date.now();
        const postTypes = [
            'trending',
            'market_update',
            'gainer',
            'gas_price',
            'crypto_insight',
            'defi_update',
            'ai_agents',
            'base_ecosystem'
        ];
        const postType = postTypes[Math.floor(Math.random() * postTypes.length)];

        let prompt: string;

        switch (postType) {
            case 'trending':
                if (trending.length > 0) {
                    prompt = `🔥 TRENDING COINS right now: ${trending.slice(0, 3).join(', ')}.
Write a creative tweet (under 200 chars) about one of these trending coins. Include current hype sentiment. Use 1-2 emojis. Don't use hashtags.`;
                } else {
                    prompt = `Write a unique tweet (under 200 chars) about what's hot in crypto today. Be creative and engaging. Use 1-2 emojis.`;
                }
                break;

            case 'market_update':
                if (btc) {
                    const direction = btc.change > 0 ? 'up' : 'down';
                    prompt = `📊 REAL DATA: BTC is $${btc.price.toLocaleString()} (${direction} ${Math.abs(btc.change).toFixed(1)}% in 24h).
Write a short market commentary tweet (under 200 chars) based on this real price. Analyze the sentiment. Use 1-2 emojis.`;
                } else {
                    prompt = `Write a general crypto market update tweet (under 200 chars). Be insightful. Use 1-2 emojis.`;
                }
                break;

            case 'gainer':
                if (gainers.length > 0) {
                    const topGainer = gainers[0];
                    prompt = `🚀 TOP GAINER: ${topGainer.name} (${topGainer.symbol.toUpperCase()}) is up ${topGainer.price_change_percentage_24h.toFixed(1)}% today!
Write an excited but informative tweet (under 200 chars) about this gainer. Don't promise profits. Use 1-2 emojis.`;
                } else {
                    prompt = `Write a tweet about finding gems in crypto (under 200 chars). Be cautious but optimistic. Use 1-2 emojis.`;
                }
                break;

            case 'gas_price':
                if (gasPrice) {
                    prompt = `⛽ REAL GAS: Ethereum gas is ~${gasPrice} gwei right now.
Write a helpful tweet (under 200 chars) about gas prices for users. Give context if it's high/low. Use 1-2 emojis.`;
                } else {
                    prompt = `Write a tweet about gas optimization in crypto (under 200 chars). Be helpful. Use 1-2 emojis.`;
                }
                break;

            case 'crypto_insight':
                const topics = ['DeFi yields', 'NFT market', 'Layer 2 adoption', 'stablecoins', 'Web3 gaming', 'tokenomics'];
                const topic = topics[Math.floor(Math.random() * topics.length)];
                prompt = `Share an insightful observation about ${topic} (under 200 chars). Sound knowledgeable. Use 1-2 emojis. Seed: ${timestamp}`;
                break;

            case 'ai_agents':
                prompt = `Write a thought-provoking tweet about AI agents in crypto/Web3 (under 200 chars). You ARE an AI agent - share your unique perspective. Use 1-2 emojis. Seed: ${timestamp}`;
                break;

            case 'base_ecosystem':
                prompt = `Write an engaging tweet about building on Base or the Base ecosystem (under 200 chars). Be positive about the future. Use 1-2 emojis. Seed: ${timestamp}`;
                break;

            default:
                prompt = `Write a unique crypto/Web3 tweet (under 200 chars). Be creative and engaging. Use 1-2 emojis. Seed: ${timestamp}`;
        }

        console.log(`📰 Post type: ${postType}`);
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
        // Detect if the comment is a question
        const isQuestion = comment.includes('?') ||
            /^(what|why|how|when|where|who|which|can|do|does|is|are|will|would|could|should)/i.test(comment.trim());

        let prompt: string;
        if (isQuestion) {
            prompt = `You are a helpful AI assistant on a Web3 social network. Someone asked: "${comment}"
This was in response to my post: "${originalPost}"

IMPORTANT: Actually ANSWER the question with real, helpful information. Don't just say "great question" - provide the actual answer!
Keep it under 200 chars. Be knowledgeable and friendly. Use 1-2 emojis.`;
        } else {
            prompt = `Someone commented "${comment}" on my post that said "${originalPost}". 
Write a short, thoughtful reply (under 150 chars) that engages with what they said. Be friendly and use 1-2 emojis.`;
        }

        const response = await callGemini(prompt);
        return response || "Thanks for your comment! 🦞";
    } catch (error) {
        return "Thanks for engaging! 🦞";
    }
}

async function generateAIComment(postContent: string, author: string): Promise<string> {
    if (!config.geminiApiKey) return "Great post! 🦞";

    try {
        // Detect if the post is asking a question
        const isQuestion = postContent.includes('?') ||
            /^(what|why|how|when|where|who|which|can|do|does|is|are|will|would|could|should)/i.test(postContent.trim());

        let prompt: string;
        if (isQuestion) {
            prompt = `You are a knowledgeable AI assistant on a Web3 social network. Someone posted a question: "${postContent}"

IMPORTANT: Actually ANSWER their question with real, factual information! Don't just say "interesting" - give them the answer they're looking for!
If it's about crypto/blockchain/Web3, provide accurate info. If it's about current prices/gwei, explain you can't access real-time data but explain the concept.
Keep it under 200 chars. Be helpful and use 1-2 emojis.`;
        } else {
            prompt = `Someone posted "${postContent}" on a Web3 social network. 
Write a brief, engaging comment (under 150 chars) that adds value to the conversation. Share a related insight or ask a thoughtful follow-up question. Be friendly and use 1-2 emojis.`;
        }

        const response = await callGemini(prompt);
        return response || (isQuestion ? "Good question! Let me think... 🤔" : "Interesting perspective! 🦞");
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

// ============ FARCASTER INTEGRATION ============
async function postToFarcaster(content: string): Promise<string | null> {
    if (!config.farcasterEnabled) {
        console.log("⏭️  Farcaster disabled, skipping...");
        return null;
    }

    if (!config.neynarApiKey || !config.neynarSignerUuid) {
        console.log("⚠️  Farcaster: Missing API key or signer UUID");
        return null;
    }

    try {
        console.log("📡 Posting to Farcaster...");
        const response = await axios.post(
            'https://api.neynar.com/v2/farcaster/cast',
            {
                signer_uuid: config.neynarSignerUuid,
                text: content.slice(0, 320), // Farcaster has 320 char limit
            },
            {
                headers: {
                    'accept': 'application/json',
                    'content-type': 'application/json',
                    'x-api-key': config.neynarApiKey,
                },
                timeout: 10000,
            }
        );

        const castHash = response.data?.cast?.hash;
        if (castHash) {
            console.log(`✅ Farcaster cast posted! Hash: ${castHash}`);
            return castHash;
        }
        console.log("✅ Farcaster cast posted!");
        return 'success';
    } catch (error: any) {
        console.error("❌ Farcaster post failed:", error.response?.data?.message || error.message);
        return null;
    }
}

// ============ BASEBOOK FUNCTIONS ============
async function initializeAgent(): Promise<void> {
    console.log("🦞 Initializing Basebook Agent with AI Engagement...\n");

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
        // 1. Generate AI content
        console.log("\n🧠 Generating AI post...");
        const content = await generateAIPost();
        console.log(`💭 Content: "${content}"`);

        // 2. Post to Farcaster (if enabled)
        await postToFarcaster(content);

        // 3. Post to Basebook (onchain)
        await postToBasebook(content);

        // 4. Check and reply to comments on our posts
        await checkAndReplyToComments();

        // 5. Engage with other users' posts
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
║  🦞 BASEBOOK AGENT - AI ENGAGEMENT                         ║
║  Posts to Basebook (onchain) + Farcaster                   ║
║  Powered by Gemini AI on Base Sepolia                      ║
╚════════════════════════════════════════════════════════════╝
`);

    try {
        await initializeAgent();
        await checkOrCreateProfile();

        // Show Farcaster status
        console.log(`\n🔗 Farcaster: ${config.farcasterEnabled ? 'ENABLED ✅' : 'DISABLED ⏸️'}`);

        console.log("\n🚀 Running initial cycle...");
        await runPostCycle();

        const cronSchedule = `*/${config.postIntervalMinutes} * * * *`;
        console.log(`\n⏰ Scheduled: Every ${config.postIntervalMinutes} minutes`);

        cron.schedule(cronSchedule, async () => {
            await runPostCycle();
        });

        console.log("\n🌟 Basebook Agent is LIVE!");
        console.log("   Features:");
        console.log(`   ✅ AI-generated posts every ${config.postIntervalMinutes} minutes`);
        console.log(`   ✅ Basebook onchain posts`);
        console.log(`   ${config.farcasterEnabled ? '✅' : '⏸️'} Farcaster casts via Neynar`);
        console.log("   Press Ctrl+C to stop\n");

        process.on("SIGINT", () => {
            console.log("\n\n👋 Basebook Agent shutting down...");
            process.exit(0);
        });

    } catch (error) {
        console.error("❌ Agent failed:", error);
        process.exit(1);
    }
}

main();
