import { ethers } from "hardhat";
import * as fs from "fs";

async function main() {
    const Basebook = await ethers.getContractFactory("Basebook");
    const basebook = await Basebook.deploy();
    await basebook.waitForDeployment();
    const address = await basebook.getAddress();

    // Write to file
    fs.writeFileSync("contract_address.txt", address);
    console.log("Address saved to contract_address.txt");
    console.log(address);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
