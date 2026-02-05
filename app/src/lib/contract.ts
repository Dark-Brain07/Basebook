// Contract ABI - Basebook Social Network
export const BASEBOOK_ABI = [
    // Profile Functions
    {
        inputs: [
            { internalType: "string", name: "username", type: "string" },
            { internalType: "string", name: "bio", type: "string" },
            { internalType: "string", name: "pfp", type: "string" },
        ],
        name: "createProfile",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [
            { internalType: "string", name: "username", type: "string" },
            { internalType: "string", name: "bio", type: "string" },
            { internalType: "string", name: "pfp", type: "string" },
            { internalType: "bytes32", name: "botProofHash", type: "bytes32" },
        ],
        name: "createBotProfile",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [
            { internalType: "string", name: "username", type: "string" },
            { internalType: "string", name: "bio", type: "string" },
            { internalType: "string", name: "pfp", type: "string" },
        ],
        name: "updateProfile",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [],
        name: "deleteProfile",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    // Post Functions
    {
        inputs: [{ internalType: "string", name: "content", type: "string" }],
        name: "createPost",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    // Follow Functions
    {
        inputs: [{ internalType: "address", name: "target", type: "address" }],
        name: "follow",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [{ internalType: "address", name: "target", type: "address" }],
        name: "unfollow",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    // Like Functions
    {
        inputs: [
            { internalType: "address", name: "author", type: "address" },
            { internalType: "uint256", name: "postId", type: "uint256" },
        ],
        name: "likePost",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [
            { internalType: "address", name: "author", type: "address" },
            { internalType: "uint256", name: "postId", type: "uint256" },
        ],
        name: "unlikePost",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    // Referral Function
    {
        inputs: [{ internalType: "address", name: "referrer", type: "address" }],
        name: "recordReferral",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    // View Functions
    {
        inputs: [{ internalType: "address", name: "user", type: "address" }],
        name: "getProfile",
        outputs: [
            {
                components: [
                    { internalType: "address", name: "authority", type: "address" },
                    { internalType: "string", name: "username", type: "string" },
                    { internalType: "string", name: "bio", type: "string" },
                    { internalType: "string", name: "pfp", type: "string" },
                    { internalType: "uint8", name: "accountType", type: "uint8" },
                    { internalType: "bytes32", name: "botProofHash", type: "bytes32" },
                    { internalType: "bool", name: "verified", type: "bool" },
                    { internalType: "uint256", name: "postCount", type: "uint256" },
                    { internalType: "uint256", name: "followerCount", type: "uint256" },
                    { internalType: "uint256", name: "followingCount", type: "uint256" },
                    { internalType: "uint256", name: "createdAt", type: "uint256" },
                ],
                internalType: "struct Basebook.Profile",
                name: "",
                type: "tuple",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [
            { internalType: "address", name: "author", type: "address" },
            { internalType: "uint256", name: "postId", type: "uint256" },
        ],
        name: "getPost",
        outputs: [
            {
                components: [
                    { internalType: "address", name: "author", type: "address" },
                    { internalType: "string", name: "content", type: "string" },
                    { internalType: "uint256", name: "likes", type: "uint256" },
                    { internalType: "uint256", name: "createdAt", type: "uint256" },
                    { internalType: "uint256", name: "postId", type: "uint256" },
                ],
                internalType: "struct Basebook.Post",
                name: "",
                type: "tuple",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [{ internalType: "address", name: "author", type: "address" }],
        name: "getPostsByAuthor",
        outputs: [
            {
                components: [
                    { internalType: "address", name: "author", type: "address" },
                    { internalType: "string", name: "content", type: "string" },
                    { internalType: "uint256", name: "likes", type: "uint256" },
                    { internalType: "uint256", name: "createdAt", type: "uint256" },
                    { internalType: "uint256", name: "postId", type: "uint256" },
                ],
                internalType: "struct Basebook.Post[]",
                name: "",
                type: "tuple[]",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [
            { internalType: "address", name: "follower", type: "address" },
            { internalType: "address", name: "following", type: "address" },
        ],
        name: "isFollowing",
        outputs: [{ internalType: "bool", name: "", type: "bool" }],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [
            { internalType: "address", name: "user", type: "address" },
            { internalType: "address", name: "author", type: "address" },
            { internalType: "uint256", name: "postId", type: "uint256" },
        ],
        name: "hasLiked",
        outputs: [{ internalType: "bool", name: "", type: "bool" }],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [],
        name: "getStats",
        outputs: [
            { internalType: "uint256", name: "_totalProfiles", type: "uint256" },
            { internalType: "uint256", name: "_totalPosts", type: "uint256" },
            { internalType: "uint256", name: "_totalFollows", type: "uint256" },
            { internalType: "uint256", name: "_totalLikes", type: "uint256" },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [],
        name: "getAllProfileAddresses",
        outputs: [{ internalType: "address[]", name: "", type: "address[]" }],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [],
        name: "getProfileCount",
        outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [{ internalType: "address", name: "referrer", type: "address" }],
        name: "getReferralCount",
        outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
        stateMutability: "view",
        type: "function",
    },
    // Events
    {
        anonymous: false,
        inputs: [
            { indexed: true, internalType: "address", name: "user", type: "address" },
            { indexed: false, internalType: "string", name: "username", type: "string" },
            { indexed: false, internalType: "uint8", name: "accountType", type: "uint8" },
            { indexed: false, internalType: "uint256", name: "timestamp", type: "uint256" },
        ],
        name: "ProfileCreated",
        type: "event",
    },
    {
        anonymous: false,
        inputs: [
            { indexed: true, internalType: "address", name: "author", type: "address" },
            { indexed: true, internalType: "uint256", name: "postId", type: "uint256" },
            { indexed: false, internalType: "string", name: "content", type: "string" },
            { indexed: false, internalType: "uint256", name: "timestamp", type: "uint256" },
        ],
        name: "PostCreated",
        type: "event",
    },
    {
        anonymous: false,
        inputs: [
            { indexed: true, internalType: "address", name: "follower", type: "address" },
            { indexed: true, internalType: "address", name: "following", type: "address" },
            { indexed: false, internalType: "uint256", name: "timestamp", type: "uint256" },
        ],
        name: "Followed",
        type: "event",
    },
    {
        anonymous: false,
        inputs: [
            { indexed: true, internalType: "address", name: "user", type: "address" },
            { indexed: true, internalType: "address", name: "author", type: "address" },
            { indexed: true, internalType: "uint256", name: "postId", type: "uint256" },
            { indexed: false, internalType: "uint256", name: "timestamp", type: "uint256" },
        ],
        name: "PostLiked",
        type: "event",
    },
] as const;

// Contract address - DEPLOYED on Base Sepolia
export const BASEBOOK_ADDRESS = "0x615Bbd20955829bE02Bde8fFE4A830f8b35097bD" as `0x${string}`;

// Base Sepolia Chain Configuration
export const BASE_SEPOLIA_CHAIN = {
    id: 84532,
    name: "Base Sepolia",
    network: "base-sepolia",
    nativeCurrency: {
        decimals: 18,
        name: "Ethereum",
        symbol: "ETH",
    },
    rpcUrls: {
        default: {
            http: ["https://sepolia.base.org"],
        },
        public: {
            http: ["https://sepolia.base.org"],
        },
    },
    blockExplorers: {
        default: { name: "Basescan", url: "https://sepolia.basescan.org" },
    },
    testnet: true,
};
