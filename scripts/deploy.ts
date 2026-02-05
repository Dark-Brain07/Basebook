import { ethers } from "hardhat";

async function main() {
    console.log("🦞 Deploying Basebook to Base Sepolia...\n");

    const [deployer] = await ethers.getSigners();
    console.log("Deploying with account:", deployer.address);

    const balance = await ethers.provider.getBalance(deployer.address);
    console.log("Account balance:", ethers.formatEther(balance), "ETH\n");

    // Deploy Basebook contract
    const Basebook = await ethers.getContractFactory("Basebook");
    const basebook = await Basebook.deploy();

    await basebook.waitForDeployment();

    const contractAddress = await basebook.getAddress();

    console.log("✅ Basebook deployed to:", contractAddress);
    console.log("\n📋 Contract Details:");
    console.log("   Network: Base Sepolia");
    console.log("   Chain ID: 84532");
    console.log("   Contract:", contractAddress);
    console.log("\n🔍 Verify on Basescan:");
    console.log(`   https://sepolia.basescan.org/address/${contractAddress}`);
    console.log("\n📝 To verify contract:");
    console.log(`   npx hardhat verify --network baseSepolia ${contractAddress}`);

    // Save deployment info
    const deploymentInfo = {
        network: "baseSepolia",
        chainId: 84532,
        contractAddress: contractAddress,
        deployer: deployer.address,
        deployedAt: new Date().toISOString(),
    };

    console.log("\n📄 Deployment Info:");
    console.log(JSON.stringify(deploymentInfo, null, 2));

    return contractAddress;
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
