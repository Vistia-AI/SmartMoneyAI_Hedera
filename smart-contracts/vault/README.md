# Vault Contract Deployment

This project contains a configurable Vault contract built with Foundry that manages ERC20 token deposits, withdrawals, and manager operations based on timestamps. The vault supports multiple networks through a configuration generation system.

## Features

- **Configurable Vault**: Deposit token1, manage with token2, withdraw to shareholders
- **Time-based Phases**: Deposit phase, manager operation phase, and withdrawal phase
- **Multi-network Support**: Easy deployment to different networks (localnet, testnet, mainnet)
- **Manager Operations**: Manager can execute arbitrary calls during the run phase
- **Share-based Withdrawals**: Proportional token distribution based on shares
- **Emergency Recovery**: Owner can recover stuck tokens (except vault tokens)

## Quick Start

### 1. Generate Configuration

```bash
# Generate config for testnet
node config/genConfig.js testnet

# Generate config for mainnet
node config/genConfig.js mainnet

# Generate config for localnet (default)
node config/genConfig.js localnet
```

### 2. Deploy Contract

```bash
# Set your private key
export OPERATOR_KEY=your_private_key_here

# Deploy using Foundry
forge script script/Vault.s.sol:VaultScript --rpc-url <your_rpc_url> --broadcast
```

## Configuration

The configuration is stored in `config/vaultConfig.json` and contains settings for different networks:

- **localnet**: Development environment
- **testnet**: Hedera testnet
- **mainnet**: Hedera mainnet

### Configuration Parameters

- `token1`: ERC20 token that can be deposited into the vault
- `token2`: Second ERC20 token available for manager operations
- `runTimestamp`: Relative time (in seconds) when deposits close and manager operations begin
- `stopTimestamp`: Relative time (in seconds) when withdrawals are enabled
- `maxShareholders`: Maximum number of shareholders allowed
- `manager`: Address that can execute manager operations (set to deployer in script)

## Usage Examples

### Deploy to Testnet

```bash
# 1. Generate testnet configuration
node config/genConfig.js testnet

# 2. Deploy
export OPERATOR_KEY=your_private_key_here
forge script script/Vault.s.sol:VaultScript --rpc-url https://testnet.hashio.io --broadcast
```

### Deploy to Mainnet

```bash
# 1. Generate mainnet configuration
node config/genConfig.js mainnet

# 2. Deploy
export OPERATOR_KEY=your_private_key_here
forge script script/Vault.s.sol:VaultScript --rpc-url https://mainnet.hashio.io --broadcast
```

## Vault Operation Phases

1. **Deposit Phase** (before runTimestamp): Users can deposit token1 and receive shares
2. **Manager Phase** (runTimestamp to stopTimestamp): Manager can execute operations try to increase vault balance
3. **Withdrawal Phase** (after stopTimestamp): all tokens can be withdraw to shareholders proportionally

## Files

- `config/vaultConfig.json` - Configuration for all networks
- `config/genConfig.js` - Script to generate Solidity configuration
- `src/VaultConfig.sol` - Auto-generated Solidity configuration (do not edit)
- `script/Vault.s.sol` - Foundry deploy script
- `src/Vault.sol` - Vault contract

## Adding New Networks

1. Add network configuration to `config/vaultConfig.json`
2. Run `node config/genConfig.js <network_name>`
3. Deploy using the generated configuration

## Important Notes

- The manager address is set to the deployer's address
- Timestamps in the config are relative (added to block.timestamp during deployment)
- Only token1 can be deposited; token2 is for manager operations
- The vault must have all token2 swapped back to token1 before withdrawal
- Maximum shareholders limit is enforced during deposit phase
