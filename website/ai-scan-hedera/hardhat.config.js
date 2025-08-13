require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.22",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    hedera: {
      url: "https://mainnet.hashio.io/api",
      chainId: 295,
      accounts: ["2dec971a969de7ba315b40b20f0367859036d7b10e9ac11cd650ca5dae38959b"]
    },
    hederaTestnet: {
      url: "https://testnet.hashio.io/api",
      chainId: 296,
      accounts: ["2dec971a969de7ba315b40b20f0367859036d7b10e9ac11cd650ca5dae38959b"]
    }
  },
  paths: {
    sources: "./smatcontract",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  }
};
