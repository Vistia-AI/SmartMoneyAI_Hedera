// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract DelegatedVault is Ownable, ReentrancyGuard {
    // Hedera USDC Token ID
    address public constant HEDERA_USDC = address(0x0000000000000000000000000000000000001549);
    
    // Hedera Token Service
    address public constant HEDERA_TOKEN_SERVICE = address(0x0000000000000000000000000000000000167f6a);

    struct Investor {
        uint256 totalDeposits;
        uint256 lastDepositTime;
        uint256 claimedProfits;
        bool hasWithdrawalRequest;
        uint256 withdrawalRequestTime;
    }

    struct DepositHistory {
        uint256 amount;
        uint256 timestamp;
    }

    mapping(address => Investor) public investors;
    mapping(address => DepositHistory[]) public depositHistory;
    mapping(address => uint256) public pendingWithdrawals;

    uint256 public totalDeposits;
    uint256 public lastProfitDistribution;
    uint256 public constant WEEKLY_DISTRIBUTION = 7 days;
    uint256 public constant MINIMUM_DEPOSIT = 100 * 10**6; // 100 USDC (6 decimals)
    uint256 public constant MAXIMUM_DEPOSIT = 1000000 * 10**6; // 1,000,000 USDC (6 decimals)

    event Deposit(address indexed investor, uint256 amount, uint256 timestamp);
    event WithdrawalRequested(address indexed investor, uint256 amount, uint256 timestamp);
    event WithdrawalProcessed(address indexed investor, uint256 amount, uint256 timestamp);
    event ProfitClaimed(address indexed investor, uint256 amount, uint256 timestamp);
    event ProfitDistributed(uint256 totalAmount, uint256 timestamp);

    constructor() Ownable(msg.sender) {
        lastProfitDistribution = block.timestamp;
    }

    function deposit(uint256 amount) external nonReentrant {
        require(amount >= MINIMUM_DEPOSIT, "Amount below minimum");
        require(amount <= MAXIMUM_DEPOSIT, "Amount above maximum");
        
        // Transfer USDC from investor to contract
        require(
            IERC20(HEDERA_USDC).transferFrom(msg.sender, address(this), amount),
            "Transfer failed"
        );

        Investor storage investor = investors[msg.sender];
        investor.totalDeposits += amount;
        investor.lastDepositTime = block.timestamp;

        // Add to deposit history
        depositHistory[msg.sender].push(DepositHistory({
            amount: amount,
            timestamp: block.timestamp
        }));

        totalDeposits += amount;

        emit Deposit(msg.sender, amount, block.timestamp);
    }

    function requestWithdrawal() external nonReentrant {
        Investor storage investor = investors[msg.sender];
        require(investor.totalDeposits > 0, "No deposits");
        require(!investor.hasWithdrawalRequest, "Withdrawal already requested");

        investor.hasWithdrawalRequest = true;
        investor.withdrawalRequestTime = block.timestamp;
        pendingWithdrawals[msg.sender] = investor.totalDeposits;

        emit WithdrawalRequested(msg.sender, investor.totalDeposits, block.timestamp);
    }

    function processWithdrawals() external onlyOwner {
        // Implementation for processing withdrawals
        // This would be called by the owner to process pending withdrawals
    }

    function claimProfit() external nonReentrant {
        Investor storage investor = investors[msg.sender];
        require(investor.totalDeposits > 0, "No deposits");
        
        uint256 profit = calculateProfit(msg.sender);
        require(profit > 0, "No profit to claim");

        investor.claimedProfits += profit;
        
        // Transfer profit in USDC
        require(
            IERC20(HEDERA_USDC).transfer(msg.sender, profit),
            "Profit transfer failed"
        );

        emit ProfitClaimed(msg.sender, profit, block.timestamp);
    }

    function distributeProfits() external onlyOwner {
        require(block.timestamp >= lastProfitDistribution + WEEKLY_DISTRIBUTION, "Too early");
        
        uint256 totalProfit = IERC20(HEDERA_USDC).balanceOf(address(this)) - totalDeposits;
        require(totalProfit > 0, "No profit to distribute");

        lastProfitDistribution = block.timestamp;
        emit ProfitDistributed(totalProfit, block.timestamp);
    }

    function calculateProfit(address investor) public view returns (uint256) {
        Investor storage inv = investors[investor];
        if (inv.totalDeposits == 0) return 0;

        uint256 totalProfit = IERC20(HEDERA_USDC).balanceOf(address(this)) - totalDeposits;
        if (totalProfit == 0) return 0;

        return (totalProfit * inv.totalDeposits) / totalDeposits - inv.claimedProfits;
    }

    function getInvestorInfo(address investor) external view returns (
        uint256 totalDeposits,
        uint256 lastDepositTime,
        uint256 claimedProfits,
        bool hasWithdrawalRequest,
        uint256 withdrawalRequestTime,
        uint256 pendingProfit
    ) {
        Investor storage inv = investors[investor];
        return (
            inv.totalDeposits,
            inv.lastDepositTime,
            inv.claimedProfits,
            inv.hasWithdrawalRequest,
            inv.withdrawalRequestTime,
            calculateProfit(investor)
        );
    }

    function getDepositHistory(address investor) external view returns (DepositHistory[] memory) {
        return depositHistory[investor];
    }

    // Function to recover any tokens sent to the contract by mistake
    function recoverTokens(address token, uint256 amount) external onlyOwner {
        require(token != HEDERA_USDC, "Cannot recover USDC");
        IERC20(token).transfer(owner(), amount);
    }
}
