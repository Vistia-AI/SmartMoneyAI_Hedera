# DonateContract Deployment Information

## Contract Details
- **Contract Name**: DonateContract
- **Contract Address**: `0x2afC3e9Be4Ea8a118a29a203873b2305809bF68C`
- **Network**: Hedera Mainnet (Chain ID: 295)
- **Deployer**: `0x303F6e13dD96B7e9df2e52c3ECA238f6c4A624a8`
- **Transaction Hash**: `0x1d65e3f05b80076d1910485fc0ca9b88161f59b608d144036902868e522f978d`
- **Deployment Time**: 2025-08-13T09:51:50.604Z

## Contract Functions

### Core Functions
1. **donate(string memory message)** - Allow users to donate ETH
2. **withdrawFunds(uint256 amount)** - Owner can withdraw funds
3. **getAllDonors()** - Get all donor addresses
4. **getContractBalance()** - Get current contract balance
5. **getDonationStats()** - Get donation statistics

### View Functions
- **owner()** - Get contract owner
- **totalDonations()** - Get total donations received
- **donorCount()** - Get number of unique donors
- **donationsByAddress(address)** - Get donations by specific address

## Events
- **DonationReceived(address indexed donor, uint256 amount, string message)**
- **FundsWithdrawn(address indexed owner, uint256 amount)**
