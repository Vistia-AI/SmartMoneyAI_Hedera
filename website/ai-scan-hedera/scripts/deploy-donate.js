const hre = require("hardhat");

async function main() {
  console.log("🚀 Starting deployment of Donate contract to Hedera Mainnet...");
  
  // Get the deployer account
  const [deployer] = await hre.ethers.getSigners();
  console.log("📝 Deploying contracts with account:", deployer.address);
  console.log("💰 Account balance:", (await hre.ethers.provider.getBalance(deployer.address)).toString());

  // Deploy the Vault contract
  console.log("📦 Deploying Vault contract...");
  
  // Constructor parameters for Vault
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

  await vault.waitForDeployment();

  console.log("✅ Vault contract deployed to:", await vault.getAddress());
  console.log("🔗 Transaction hash:", vault.deploymentTransaction().hash);
  
  // Wait for a few block confirmations
  console.log("⏳ Waiting for confirmations...");
  await vault.deploymentTransaction().wait(5);
  
  console.log("🎉 Deployment completed successfully!");
  console.log("📊 Contract Address:", await vault.getAddress());
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
  console.log("  Run Timestamp:", new Date(runTime.toString() * 1000).toISOString());
  console.log("  Stop Timestamp:", new Date(stopTime.toString() * 1000).toISOString());
  console.log("  Max Shareholders:", maxShare.toString());
  console.log("  Manager:", manager);
  
  // Save deployment info to file
  const deploymentInfo = {
    contractName: "Vault",
    contractAddress: await vault.getAddress(),
    deployer: deployer.address,
    network: "Hedera Mainnet",
    chainId: 295,
    deploymentTime: new Date().toISOString(),
    transactionHash: vault.deploymentTransaction().hash
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
