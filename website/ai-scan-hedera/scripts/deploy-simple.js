const hre = require("hardhat");

async function main() {
  console.log("🚀 Starting deployment to Hedera Mainnet...");
  
  // Get the deployer account
  const [deployer] = await hre.ethers.getSigners();
  console.log("📝 Deploying contracts with account:", deployer.address);
  console.log("💰 Account balance:", (await hre.ethers.provider.getBalance(deployer.address)).toString());

  // Deploy the DonateContract
  console.log("📦 Deploying DonateContract...");
  
  const DonateContract = await hre.ethers.getContractFactory("DonateContract");
  
  // Estimate gas
  const deploymentData = DonateContract.getDeployTransaction();
  const estimatedGas = await hre.ethers.provider.estimateGas(deploymentData);
  console.log("⛽ Estimated gas:", estimatedGas.toString());
  
  // Deploy with higher gas limit
  const donate = await DonateContract.deploy({
    gasLimit: estimatedGas * 2n // Double the estimated gas
  });

  console.log("⏳ Waiting for deployment...");
  await donate.waitForDeployment();

  const contractAddress = await donate.getAddress();
  console.log("✅ DonateContract deployed to:", contractAddress);
  console.log("🔗 Transaction hash:", donate.deploymentTransaction().hash);
  
  console.log("🎉 Deployment completed successfully!");
  console.log("📊 Contract Address:", contractAddress);
  console.log("🌐 Network: Hedera Mainnet (Chain ID: 295)");
  
  // Verify the deployment
  console.log("🔍 Verifying deployment...");
  const owner = await donate.owner();
  const totalDonations = await donate.totalDonations();
  const donorCount = await donate.donorCount();
  
  console.log("📋 Contract state after deployment:");
  console.log("  Owner:", owner);
  console.log("  Total Donations:", totalDonations.toString());
  console.log("  Donor Count:", donorCount.toString());
  
  // Save deployment info
  const deploymentInfo = {
    contractName: "DonateContract",
    contractAddress: contractAddress,
    deployer: deployer.address,
    network: "Hedera Mainnet",
    chainId: 295,
    deploymentTime: new Date().toISOString(),
    transactionHash: donate.deploymentTransaction().hash,
    estimatedGas: estimatedGas.toString()
  };
  
  console.log("📄 Deployment Info:", JSON.stringify(deploymentInfo, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
