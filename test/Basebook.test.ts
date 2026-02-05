import { expect } from "chai";
import { ethers } from "hardhat";
import { Basebook } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("Basebook", function () {
    let basebook: Basebook;
    let owner: SignerWithAddress;
    let user1: SignerWithAddress;
    let user2: SignerWithAddress;
    let user3: SignerWithAddress;

    beforeEach(async function () {
        [owner, user1, user2, user3] = await ethers.getSigners();

        const Basebook = await ethers.getContractFactory("Basebook");
        basebook = await Basebook.deploy();
        await basebook.waitForDeployment();
    });

    describe("Profile Management", function () {
        it("Should create a human profile", async function () {
            await basebook.connect(user1).createProfile("alice", "Hello, I'm Alice!", "https://example.com/alice.png");

            const profile = await basebook.getProfile(user1.address);
            expect(profile.username).to.equal("alice");
            expect(profile.bio).to.equal("Hello, I'm Alice!");
            expect(profile.pfp).to.equal("https://example.com/alice.png");
            expect(profile.accountType).to.equal(0); // Human
            expect(profile.verified).to.equal(false);
        });

        it("Should create a bot profile with proof", async function () {
            const botProof = ethers.keccak256(ethers.toUtf8Bytes("bot-proof-data"));

            await basebook.connect(user1).createBotProfile("botty", "I'm a bot 🤖", "https://example.com/bot.png", botProof);

            const profile = await basebook.getProfile(user1.address);
            expect(profile.username).to.equal("botty");
            expect(profile.accountType).to.equal(1); // Bot
            expect(profile.verified).to.equal(true);
            expect(profile.botProofHash).to.equal(botProof);
        });

        it("Should reject duplicate profiles", async function () {
            await basebook.connect(user1).createProfile("alice", "Bio", "");

            await expect(
                basebook.connect(user1).createProfile("alice2", "Bio2", "")
            ).to.be.revertedWith("Profile already exists");
        });

        it("Should reject username > 32 chars", async function () {
            const longUsername = "a".repeat(33);

            await expect(
                basebook.connect(user1).createProfile(longUsername, "", "")
            ).to.be.revertedWith("Username too long");
        });

        it("Should update profile", async function () {
            await basebook.connect(user1).createProfile("alice", "Old bio", "");
            await basebook.connect(user1).updateProfile("alice_updated", "New bio", "https://new.pfp");

            const profile = await basebook.getProfile(user1.address);
            expect(profile.username).to.equal("alice_updated");
            expect(profile.bio).to.equal("New bio");
            expect(profile.pfp).to.equal("https://new.pfp");
        });

        it("Should delete profile", async function () {
            await basebook.connect(user1).createProfile("alice", "Bio", "");
            await basebook.connect(user1).deleteProfile();

            const profile = await basebook.getProfile(user1.address);
            expect(profile.authority).to.equal(ethers.ZeroAddress);
        });
    });

    describe("Posts", function () {
        beforeEach(async function () {
            await basebook.connect(user1).createProfile("alice", "Bio", "");
        });

        it("Should create a post", async function () {
            await basebook.connect(user1).createPost("Hello, Basebook! 🦞");

            const post = await basebook.getPost(user1.address, 0);
            expect(post.content).to.equal("Hello, Basebook! 🦞");
            expect(post.author).to.equal(user1.address);
            expect(post.likes).to.equal(0);
        });

        it("Should reject posts > 280 chars", async function () {
            const longContent = "a".repeat(281);

            await expect(
                basebook.connect(user1).createPost(longContent)
            ).to.be.revertedWith("Content too long");
        });

        it("Should get all posts by author", async function () {
            await basebook.connect(user1).createPost("Post 1");
            await basebook.connect(user1).createPost("Post 2");
            await basebook.connect(user1).createPost("Post 3");

            const posts = await basebook.getPostsByAuthor(user1.address);
            expect(posts.length).to.equal(3);
            expect(posts[0].content).to.equal("Post 1");
            expect(posts[2].content).to.equal("Post 3");
        });

        it("Should increment post count", async function () {
            await basebook.connect(user1).createPost("Post 1");
            await basebook.connect(user1).createPost("Post 2");

            const profile = await basebook.getProfile(user1.address);
            expect(profile.postCount).to.equal(2);
        });
    });

    describe("Follow System", function () {
        beforeEach(async function () {
            await basebook.connect(user1).createProfile("alice", "", "");
            await basebook.connect(user2).createProfile("bob", "", "");
        });

        it("Should follow a user", async function () {
            await basebook.connect(user1).follow(user2.address);

            const isFollowing = await basebook.isFollowing(user1.address, user2.address);
            expect(isFollowing).to.equal(true);

            const profile1 = await basebook.getProfile(user1.address);
            const profile2 = await basebook.getProfile(user2.address);
            expect(profile1.followingCount).to.equal(1);
            expect(profile2.followerCount).to.equal(1);
        });

        it("Should unfollow a user", async function () {
            await basebook.connect(user1).follow(user2.address);
            await basebook.connect(user1).unfollow(user2.address);

            const isFollowing = await basebook.isFollowing(user1.address, user2.address);
            expect(isFollowing).to.equal(false);
        });

        it("Should reject self-follow", async function () {
            await expect(
                basebook.connect(user1).follow(user1.address)
            ).to.be.revertedWith("Cannot follow yourself");
        });

        it("Should reject duplicate follows", async function () {
            await basebook.connect(user1).follow(user2.address);

            await expect(
                basebook.connect(user1).follow(user2.address)
            ).to.be.revertedWith("Already following");
        });
    });

    describe("Like System", function () {
        beforeEach(async function () {
            await basebook.connect(user1).createProfile("alice", "", "");
            await basebook.connect(user2).createProfile("bob", "", "");
            await basebook.connect(user1).createPost("Hello!");
        });

        it("Should like a post", async function () {
            await basebook.connect(user2).likePost(user1.address, 0);

            const hasLiked = await basebook.hasLiked(user2.address, user1.address, 0);
            expect(hasLiked).to.equal(true);

            const post = await basebook.getPost(user1.address, 0);
            expect(post.likes).to.equal(1);
        });

        it("Should unlike a post", async function () {
            await basebook.connect(user2).likePost(user1.address, 0);
            await basebook.connect(user2).unlikePost(user1.address, 0);

            const hasLiked = await basebook.hasLiked(user2.address, user1.address, 0);
            expect(hasLiked).to.equal(false);

            const post = await basebook.getPost(user1.address, 0);
            expect(post.likes).to.equal(0);
        });

        it("Should reject duplicate likes", async function () {
            await basebook.connect(user2).likePost(user1.address, 0);

            await expect(
                basebook.connect(user2).likePost(user1.address, 0)
            ).to.be.revertedWith("Already liked");
        });
    });

    describe("Referral System", function () {
        beforeEach(async function () {
            await basebook.connect(user1).createProfile("alice", "", "");
            await basebook.connect(user2).createProfile("bob", "", "");
        });

        it("Should record a referral", async function () {
            await basebook.connect(user2).recordReferral(user1.address);

            const count = await basebook.getReferralCount(user1.address);
            expect(count).to.equal(1);
        });

        it("Should reject self-referral", async function () {
            await expect(
                basebook.connect(user1).recordReferral(user1.address)
            ).to.be.revertedWith("Cannot refer yourself");
        });
    });

    describe("Network Statistics", function () {
        it("Should track network stats", async function () {
            await basebook.connect(user1).createProfile("alice", "", "");
            await basebook.connect(user2).createProfile("bob", "", "");
            await basebook.connect(user1).createPost("Hello!");
            await basebook.connect(user1).follow(user2.address);
            await basebook.connect(user2).likePost(user1.address, 0);

            const [profiles, posts, follows, likes] = await basebook.getStats();
            expect(profiles).to.equal(2);
            expect(posts).to.equal(1);
            expect(follows).to.equal(1);
            expect(likes).to.equal(1);
        });

        it("Should get all profile addresses", async function () {
            await basebook.connect(user1).createProfile("alice", "", "");
            await basebook.connect(user2).createProfile("bob", "", "");

            const addresses = await basebook.getAllProfileAddresses();
            expect(addresses.length).to.equal(2);
            expect(addresses).to.include(user1.address);
            expect(addresses).to.include(user2.address);
        });
    });

    describe("Events", function () {
        it("Should emit ProfileCreated event", async function () {
            await expect(basebook.connect(user1).createProfile("alice", "Bio", ""))
                .to.emit(basebook, "ProfileCreated");
        });

        it("Should emit PostCreated event", async function () {
            await basebook.connect(user1).createProfile("alice", "", "");

            await expect(basebook.connect(user1).createPost("Hello!"))
                .to.emit(basebook, "PostCreated");
        });

        it("Should emit Followed event", async function () {
            await basebook.connect(user1).createProfile("alice", "", "");
            await basebook.connect(user2).createProfile("bob", "", "");

            await expect(basebook.connect(user1).follow(user2.address))
                .to.emit(basebook, "Followed");
        });
    });
});
