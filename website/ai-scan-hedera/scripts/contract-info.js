const hre = require("hardhat");

async function main() {
  console.log("📋 DonateContract Information");
  console.log("=============================");
  
  // Get the deployer account
  const [deployer] = await hre.ethers.getSigners();
  
  // Contract address
  const contractAddress = "0x2afC3e9Be4Ea8a118a29a203873b2305809bF68C";
  
  // Get contract instance
  const DonateContract = await hre.ethers.getContractFactory("DonateContract");
  const donate = DonateContract.attach(contractAddress);
  
  console.log("🌐 Network: Hedera Mainnet (Chain ID: 295)");
  console.log("📋 Contract Address:", contractAddress);
  console.log("👤 Deployer:", deployer.address);
  console.log("💰 Deployer Balance:", hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address)), "ETH");
  
  // Get contract state
  console.log("\n📊 Contract State");
  console.log("=================");
  
  const owner = await donate.owner();
  const totalDonations = await donate.totalDonations();
  const donorCount = await donate.donorCount();
  const contractBalance = await donate.getContractBalance();
  const stats = await donate.getDonationStats();
  const donors = await donate.getAllDonors();
  
  console.log("👑 Owner:", owner);
  console.log("💵 Total Donations:", hre.ethers.formatEther(totalDonations), "HBAR");
  console.log("👥 Donor Count:", donorCount.toString());
  console.log("🏦 Contract Balance:", hre.ethers.formatEther(contractBalance), "HBAR");
  
  console.log("\n📈 Detailed Statistics");
  console.log("=====================");
  console.log("  Total Donations:", hre.ethers.formatEther(stats[0]), "HBAR");
  console.log("  Donor Count:", stats[1].toString());
  console.log("  Contract Balance:", hre.ethers.formatEther(stats[2]), "HBAR");
  
  console.log("\n👥 All Donors");
  console.log("=============");
  console.log("  Number of donors:", donors.length);
  
  if (donors.length > 0) {
    for (let i = 0; i < donors.length; i++) {
      const donor = donors[i];
      const donorAmount = await donate.donationsByAddress(donor);
      console.log(`  ${i + 1}. ${donor} - ${hre.ethers.formatEther(donorAmount)} ETH`);
    }
  } else {
    console.log("  No donors yet");
  }
  
  // Check if current user is owner
  console.log("\n🔐 Ownership Check");
  console.log("==================");
  const isOwner = owner === deployer.address;
  console.log("  Are you the owner?", isOwner ? "✅ Yes" : "❌ No");
  
  if (isOwner) {
    console.log("  ✅ You can withdraw funds from the contract");
  } else {
    console.log("  ❌ Only the owner can withdraw funds");
  }
  
  // Contract functions summary
  console.log("\n🔧 Available Functions");
  console.log("=====================");
  console.log("  💝 donate(string message) - Send ETH donation with message");
  console.log("  💰 withdrawFunds(uint256 amount) - Owner can withdraw funds");
  console.log("  📊 getDonationStats() - Get donation statistics");
  console.log("  👥 getAllDonors() - Get list of all donors");
  console.log("  🏦 getContractBalance() - Get current contract balance");
  console.log("  👑 owner() - Get contract owner");
  console.log("  📈 totalDonations() - Get total donations received");
  console.log("  👤 donorCount() - Get number of unique donors");
  console.log("  💵 donationsByAddress(address) - Get donations by specific address");
  
  // Events
  console.log("\n📢 Events");
  console.log("==========");
  console.log("  🎉 DonationReceived(address indexed donor, uint256 amount, string message)");
  console.log("  💸 FundsWithdrawn(address indexed owner, uint256 amount)");
  
  console.log("\n🎉 Contract is fully functional and ready for use!");
  console.log("💡 You can interact with it through:");
  console.log("   - Hedera Explorer: https://explorer.arkhia.io");
  console.log("   - Your dApp frontend");
  console.log("   - Direct contract calls");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  });
