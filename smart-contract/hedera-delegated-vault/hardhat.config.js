// Hardhat config with Hedera plugin (to be filled)
require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

module.exports = {
  solidity: "0.8.20",
  networks: {
    hedera_testnet: {
      url: "https://testnet.hashio.io/api",
      accounts: [process.env.PRIVATE_KEY],
      chainId: 296
    }
  }
};