# Vault Contract Documentation

## Overview

The Vault contract is a configurable DeFi vault that manages token deposits, withdrawals, and manager operations based on timestamps. It implements a time-based lifecycle with three main phases: **Deposit Phase**, **Run Phase**, and **Withdrawal Phase**. The vault supports dual tokens: **token1** for deposits and **token2** for manager operations.

## Contract Features

- **Time-based phases** with configurable timestamps
- **Share-based system** for proportional token distribution
- **Manager operations** for calling any address
- **Dual token support** (token1 for deposits, token2 for operations)
- **Emergency functions** for token recovery
- **Reentrancy protection** for security

## Contract Lifecycle

```
┌─────────────────┐    ┌──────────────┐    ┌─────────────────┐
│   DEPOSIT       │    │     RUN      │    │   WITHDRAWAL    │
│   PHASE         │───>│   PHASE      │───>│   PHASE         │
│                 │    │              │    │                 │
│ • Deposits open │    │ • Deposits   │    │ • Manager       │
│ • Before        │    │   closed     │    │   must swap     │
│   runTimestamp  │    │ • Manager    │    │   token2→token1 │
│                 │    │   operations │    │ • Withdrawals   │
│                 │    │              │    │   to all        │
│                 │    │              │    │   shareholders  │
└─────────────────┘    └──────────────┘    └─────────────────┘
```

## State Variables

| Variable | Type | Description |
|----------|------|-------------|
| `token1` | `ERC20` | The token that can be deposited into the vault |
| `token2` | `ERC20` | The second token (available for manager operations) |
| `runTimestamp` | `uint256` | Timestamp when deposits close and manager operations begin |
| `stopTimestamp` | `uint256` | Timestamp when withdrawals are enabled |
| `maxShareholders` | `uint256` | Maximum number of shareholders allowed |
| `manager` | `address` | Manager address that can call any address |
| `shares` | `mapping(address => uint256)` | Mapping of shareholder address to their share amount |
| `shareholders` | `address[]` | Array of all shareholders |
| `totalShares` | `uint256` | Total shares issued |
| `depositsClosed` | `bool` | Whether deposits are closed |
| `vaultClosed` | `bool` | Whether the vault is closed (after withdrawal) |

## Core Functions

### 1. Deposit Function

**Function**: `deposit(uint256 amount)`

**Description**: Deposit tokens into the vault and receive shares in return.

**Requirements**:
- Must be called before `runTimestamp`
- Vault must not be at maximum shareholders
- Vault must not be closed
- Deposits must not be closed
- Amount must be greater than 0

**Parameters**:
- `amount`: Amount of tokens to deposit

**Returns**: None

**Events Emitted**:
- `Deposited(address indexed shareholder, uint256 amount, uint256 shares)`

**Example Usage**:
```solidity
// Deposit 1000 tokens
vault.deposit(1000);
```

### 2. Withdraw Function

**Function**: `withdraw()`

**Description**: Withdraw tokens from the vault to all shareholders proportionally.

**Requirements**:
- Must be called after `stopTimestamp`
- Only manager can call
- Token2 balance must be 0 (all swapped back to token1)
- Must have shares to withdraw
- Must have shareholders
- Vault must not be closed
- Must have tokens to withdraw

**Parameters**: None

**Returns**: None

**Events Emitted**:
- `Withdrawn(address indexed shareholder, uint256 amount, uint256 shares)`
- `VaultClosed()`

**Example Usage**:
```solidity
// Manager withdraws all tokens to shareholders
vault.withdraw();
```

### 3. Update Vault Function

**Function**: `updateVault(address _token1, address _token2, uint256 _runTimestamp, uint256 _stopTimestamp, uint256 _maxShareholders)`

**Description**: Update vault configuration (only when vault is closed or has no shareholders).

**Requirements**:
- Only manager can call
- Vault must be closed OR have no shareholders
- Token addresses must be valid and different
- Run timestamp must be in future
- Stop timestamp must be after run timestamp
- Max shareholders must be greater than 0

**Parameters**:
- `_token1`: New token1 address (for deposits)
- `_token2`: New token2 address (for operations)
- `_runTimestamp`: New run timestamp
- `_stopTimestamp`: New stop timestamp
- `_maxShareholders`: New maximum shareholders

**Returns**: None

**Events Emitted**:
- `VaultUpdated(address indexed token1, address indexed token2, uint256 runTimestamp, uint256 stopTimestamp, uint256 maxShareholders)`

**Example Usage**:
```solidity
// Update vault configuration
vault.updateVault(
    newToken1Address,      // New token1 for deposits
    newToken2Address,      // New token2 for operations
    block.timestamp + 300, // 5 minutes from now
    block.timestamp + 360, // 6 minutes from now
    10                     // Max 10 shareholders
);
```

### 4. Execute Function

**Function**: `execute(address target, bytes calldata data)`

**Description**: Manager can call any address (only after run timestamp).

**Requirements**:
- Only manager can call
- Must be called after `runTimestamp`
- Target must not be zero address

**Parameters**:
- `target`: Address to call
- `data`: Calldata to send to target

**Returns**: `bytes memory result` - Return data from the call

**Events Emitted**:
- `ManagerCall(address indexed target, bytes data)`

**Example Usage**:
```solidity
// Call any contract
bytes memory data = abi.encodeWithSignature("someFunction(uint256)", 123);
vault.execute(targetContract, data);
```

## View Functions

### 1. Get Vault State

**Function**: `getVaultState()`

**Returns**:
- `_totalShares`: Total shares issued
- `_totalBalance`: Total token1 balance
- `_shareholderCount`: Number of shareholders
- `_depositsClosed`: Whether deposits are closed
- `_vaultClosed`: Whether the vault is closed

### 2. Get Shares

**Function**: `shares(address addr)`

**Returns**: `uint256` - Number of shares for the specified address

### 3. Get Total Shares

**Function**: `totalShares()`

**Returns**: `uint256` - Total shares in the vault

### 4. Calculate Withdrawal Amount

**Function**: `calculateWithdrawalAmount(uint256 shareAmount)`

**Returns**: `uint256` - Amount of tokens that would be withdrawn for given shares

### 5. Get Shareholders

**Function**: `getShareholders()`

**Returns**: `address[]` - Array of all shareholder addresses

### 6. Get Shareholder Count

**Function**: `getShareholderCount()`

**Returns**: `uint256` - Number of shareholders

## Management Functions

### 1. Emergency Recover

**Function**: `emergencyRecover(address _token, address _to, uint256 _amount)`

**Description**: Emergency function to recover stuck tokens (only owner).

**Requirements**:
- Only owner can call
- Recipient must not be zero
- Amount must be greater than 0
- Cannot recover vault token1 or token2

## How to Interact with the Vault

### Step 1: Deposit Tokens

**Prerequisites**:
- Current time must be before `runTimestamp`
- Vault must not be at maximum shareholders

**Process**:
1. **Approve tokens**: First approve the vault to spend your tokens
   ```solidity
   token.approve(vaultAddress, amount);
   ```

2. **Deposit tokens**: Call the deposit function
   ```solidity
   vault.deposit(amount);
   ```

3. **Check shares**: Verify your shares were received
   ```solidity
   uint256 myShares = vault.shares(yourAddress);
   ```

**Example**:
```javascript
// 1. Approve tokens
await token.approve(vaultAddress, ethers.utils.parseEther("1000"));

// 2. Deposit
await vault.deposit(ethers.utils.parseEther("1000"));

// 3. Check shares
const shares = await vault.shares(userAddress);
console.log("Shares received:", shares.toString());
```

### Step 2: Wait for Run Phase

**What happens**:
- Deposits are automatically closed when `runTimestamp` is reached
- Manager can now call any address using the `execute` function
- No more deposits allowed

**Check status**:
```javascript
const state = await vault.getVaultState();
console.log("Deposits closed:", state.depositsClosed);
```

### Step 3: Manager Operations Phase

**What happens**:
- After `runTimestamp`, the Manager can execute operations using token2
- Manager can call any contract or address using the `execute` function
- Manager should try to increase the vault's token1 balance through trading operations

**Manager Operations**:
```javascript
// Manager can execute any contract call
const swapData = abi.encodeWithSignature("swap(uint256,uint256)", amountIn, amountOutMin);
await vault.execute(dexAddress, swapData);
```

### Step 4: Withdrawal Phase

**Prerequisites**:
- Must be after `stopTimestamp`
- **Token2 balance must be 0** (Manager must swap all token2 back to token1)
- Only manager can call withdraw
- Must have shareholders and shares

**Process**:
1. **Manager completes rebalancing**: Swap all token2 back to token1
   ```solidity
   // Manager must ensure token2.balanceOf(vault) == 0
   ```

2. **Manager calls withdraw**: This distributes tokens to all shareholders
   ```solidity
   vault.withdraw();
   ```

3. **Check results**: Verify tokens were received
   ```solidity
   uint256 balance = token.balanceOf(yourAddress);
   ```

**Example**:
```javascript
// Manager withdraws all tokens
await vault.withdraw();

// Check your new balance
const newBalance = await token.balanceOf(userAddress);
console.log("New balance:", newBalance.toString());
```

## Python Integration Example

```python
from web3 import Web3
import json

# Connect to blockchain
w3 = Web3(Web3.HTTPProvider('http://localhost:8545'))

# Load contract
with open('out/Vault.sol/Vault.json', 'r') as f:
    vault_artifact = json.load(f)

vault_contract = w3.eth.contract(
    address=vault_address, 
    abi=vault_artifact['abi']
)

# Get vault state
state = vault_contract.functions.getVaultState().call()
print("Vault state:", state)

# Get your shares
your_shares = vault_contract.functions.shares(your_address).call()
print("Your shares:", your_shares)

# Calculate withdrawal amount
withdrawal_amount = vault_contract.functions.calculateWithdrawalAmount(your_shares).call()
print("Withdrawal amount:", withdrawal_amount)
```

## Security Considerations

1. **Reentrancy Protection**: All external calls are protected
2. **Access Control**: Manager and owner functions are properly restricted
3. **Time-based Security**: Operations are restricted by timestamps
4. **Token Balance Validation**: Withdrawals require token2 balance to be 0
5. **Emergency Recovery**: Owner can recover stuck tokens (except vault token1 and token2)

## Events

| Event | Description |
|-------|-------------|
| `Deposited` | Emitted when tokens are deposited |
| `Withdrawn` | Emitted when tokens are withdrawn |
| `ManagerCall` | Emitted when manager calls any address |
| `DepositsClosed` | Emitted when deposits are closed |
| `VaultUpdated` | Emitted when vault is updated |
| `VaultClosed` | Emitted when vault is closed |

## Error Handling

The contract uses custom errors and require statements for validation:

- **Time-based errors**: "Run phase has started", "Stop phase has not started"
- **Access errors**: "Only manager can call this function"
- **State errors**: "Vault is closed", "Deposits are closed"
- **Token balance errors**: "all token2 must be swap back to token1 to withdraw"
- **Validation errors**: "Amount must be greater than 0", "Invalid token address"

## Best Practices

1. **Always check vault state** before interacting
2. **Verify timestamps** before attempting operations
3. **Monitor token2 balance** before attempting withdrawals
4. **Monitor events** for important state changes
5. **Use proper error handling** in your frontend/scripts
6. **Test thoroughly** with different scenarios
7. **Ensure Manager completes rebalancing** before withdrawal

## Manager Integration

### Manager Operations Process

During the run phase (after `runTimestamp`), the Manager can:

1. **Execute any contract calls** using the `execute` function
2. **Trade token2 for token1** to increase vault value
3. **Interact with DEXs, lending protocols, or any other contracts**
4. **Manage the vault's token2 balance** through various strategies

### Withdrawal Preparation

Before calling `withdraw()` (after `stopTimestamp`), the Manager must:

1. **Swap all token2 back to token1** using DEX operations
2. **Ensure token2.balanceOf(vault) == 0** 
3. **Only then call `vault.withdraw()`** to distribute tokens to shareholders

### Key Requirements

- **Token2 balance must be 0** before withdrawal is possible
- **Manager must complete rebalancing** before calling withdraw
- **Manager has full control** over trading operations during run phase

### Example Manager Flow

```javascript
// Manager logic (pseudo-code)
async function managerOperations() {
    const vault = await getVaultContract();
    const currentTime = await getCurrentTimestamp();
    const runTime = await vault.runTimestamp();
    const stopTime = await vault.stopTimestamp();
    
    if (currentTime >= runTime && currentTime < stopTime) {
        // Run phase: Execute trading operations
        const swapData = abi.encodeWithSignature("swap(uint256,uint256)", amountIn, amountOutMin);
        await vault.execute(dexAddress, swapData);
    }
    
    if (currentTime >= stopTime) {
        // Stop phase: Prepare for withdrawal
        // 1. Swap all token2 back to token1
        const rebalanceData = abi.encodeWithSignature("swapAllToken2ToToken1()");
        await vault.execute(dexAddress, rebalanceData);
        
        // 2. Verify token2 balance is 0
        const token2Balance = await vault.token2().balanceOf(vault.address);
        require(token2Balance == 0, "Token2 balance must be 0");
        
        // 3. Call withdraw to distribute to shareholders
        await vault.withdraw();
    }
}
```
