const hre = require("hardhat");

async function main() {
  console.log("🚀 Starting deployment of Donate contract to Hedera Mainnet...");
  
  // Get the deployer account
  const [deployer] = await hre.ethers.getSigners();
  console.log("📝 Deploying contracts with account:", deployer.address);
  console.log("💰 Account balance:", (await hre.ethers.provider.getBalance(deployer.address)).toString());

  // Deploy the Donate contract
  console.log("📦 Deploying Donate contract...");
  
  const DonateContract = await hre.ethers.getContractFactory("DonateContract");
  const donate = await DonateContract.deploy();

  await donate.waitForDeployment();

  console.log("✅ Donate contract deployed to:", await donate.getAddress());
  console.log("🔗 Transaction hash:", donate.deploymentTransaction().hash);
  
  // Wait for a few block confirmations
  console.log("⏳ Waiting for confirmations...");
  await donate.deploymentTransaction().wait(5);
  
  console.log("🎉 Deployment completed successfully!");
  console.log("📊 Contract Address:", await donate.getAddress());
  console.log("🌐 Network: Hedera Mainnet (Chain ID: 295)");
  
  // Verify the deployment
  console.log("🔍 Verifying deployment...");
  const owner = await donate.owner();
  const totalDonations = await donate.totalDonations();
  const donorCount = await donate.donorCount();
  const contractBalance = await donate.getContractBalance();
  
  console.log("📋 Contract state after deployment:");
  console.log("  Owner:", owner);
  console.log("  Total Donations:", totalDonations.toString());
  console.log("  Donor Count:", donorCount.toString());
  console.log("  Contract Balance:", contractBalance.toString());
  
  // Save deployment info to file
  const deploymentInfo = {
    contractName: "DonateContract",
    contractAddress: await donate.getAddress(),
    deployer: deployer.address,
    network: "Hedera Mainnet",
    chainId: 295,
    deploymentTime: new Date().toISOString(),
    transactionHash: donate.deploymentTransaction().hash
  };
  
  console.log("💾 Deployment info saved to deployment-info.json");
  console.log("📄 Deployment Info:", JSON.stringify(deploymentInfo, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
