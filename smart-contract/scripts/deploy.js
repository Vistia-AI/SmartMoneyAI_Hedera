const hre = require("hardhat");

async function main() {
  const DelegatedVault = await hre.ethers.getContractFactory("DelegatedVault");
  const delegatedVault = await DelegatedVault.deploy();

  await delegatedVault.waitForDeployment();

  console.log("DelegatedVault deployed to:", await delegatedVault.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});