const hre = require("hardhat");

async function main() {
  console.log("🚀 Starting deployment to Hedera Mainnet...");
  
  // Get the deployer account
  const [deployer] = await hre.ethers.getSigners();
  console.log("📝 Deploying contracts with account:", deployer.address);
  console.log("💰 Account balance:", (await deployer.getBalance()).toString());

  // Deploy the Vault contract
  console.log("📦 Deploying Vault contract...");
  
  // Constructor parameters for Vault
  // Note: You'll need to replace these with actual token addresses and timestamps
  const token1Address = "0x0000000000000000000000000000000000000000"; // Replace with actual token1 address
  const token2Address = "0x0000000000000000000000000000000000000000"; // Replace with actual token2 address
  
  // Set timestamps (run in 1 hour, stop in 24 hours from now)
  const currentTime = Math.floor(Date.now() / 1000);
  const runTimestamp = currentTime + 3600; // 1 hour from now
  const stopTimestamp = currentTime + 86400; // 24 hours from now
  
  const maxShareholders = 100;
  const managerAddress = deployer.address; // Set manager as deployer for now

  console.log("📋 Constructor parameters:");
  console.log("  Token1 Address:", token1Address);
  console.log("  Token2 Address:", token2Address);
  console.log("  Run Timestamp:", new Date(runTimestamp * 1000).toISOString());
  console.log("  Stop Timestamp:", new Date(stopTimestamp * 1000).toISOString());
  console.log("  Max Shareholders:", maxShareholders);
  console.log("  Manager Address:", managerAddress);

  const Vault = await hre.ethers.getContractFactory("Vault");
  const vault = await Vault.deploy(
    token1Address,
    token2Address,
    runTimestamp,
    stopTimestamp,
    maxShareholders,
    managerAddress
  );

  await vault.deployed();

  console.log("✅ Vault deployed to:", vault.address);
  console.log("🔗 Transaction hash:", vault.deployTransaction.hash);
  
  // Wait for a few block confirmations
  console.log("⏳ Waiting for confirmations...");
  await vault.deployTransaction.wait(5);
  
  console.log("🎉 Deployment completed successfully!");
  console.log("📊 Contract Address:", vault.address);
  console.log("🌐 Network: Hedera Mainnet (Chain ID: 295)");
  
  // Verify the deployment
  console.log("🔍 Verifying deployment...");
  const token1 = await vault.token1();
  const token2 = await vault.token2();
  const runTime = await vault.runTimestamp();
  const stopTime = await vault.stopTimestamp();
  const maxShare = await vault.maxShareholders();
  const manager = await vault.manager();
  
  console.log("📋 Contract state after deployment:");
  console.log("  Token1:", token1);
  console.log("  Token2:", token2);
  console.log("  Run Timestamp:", new Date(runTime.toNumber() * 1000).toISOString());
  console.log("  Stop Timestamp:", new Date(stopTime.toNumber() * 1000).toISOString());
  console.log("  Max Shareholders:", maxShare.toString());
  console.log("  Manager:", manager);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
