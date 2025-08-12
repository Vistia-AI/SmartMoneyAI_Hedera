// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.22;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title Vault
 * @dev A configurable vault that manages deposits, withdrawals, and manager operations
 * based on timestamps. Only token1 can be deposited.
 */
contract Vault is ReentrancyGuard, Ownable {
    using SafeERC20 for ERC20;

    // ============ Events ============

    event Deposited(address indexed shareholder, uint256 amount, uint256 shares);
    event Withdrawn(address indexed shareholder, uint256 amount, uint256 shares);
    event ManagerCall(address indexed target, bytes data);
    event DepositsClosed();
    event VaultUpdated(address indexed token1, address indexed token2, uint256 runTimestamp, uint256 stopTimestamp, uint256 maxShareholders);
    event VaultClosed();

    // ============ State Variables ============

    /// @notice The token that can be deposited into the vault
    ERC20 public token1;

    /// @notice The second token (available for manager operations)
    ERC20 public token2;

    /// @notice Timestamp when deposits close and manager operations begin
    uint256 public runTimestamp;

    /// @notice Timestamp when withdrawals are enabled
    uint256 public stopTimestamp;

    /// @notice Maximum number of shareholders allowed
    uint256 public maxShareholders;

    /// @notice Manager address that can call any address
    address public manager;

    /// @notice Mapping of shareholder address to their share amount
    mapping(address => uint256) public shares;

    /// @notice Array of all shareholders
    address[] public shareholders;

    /// @notice Total shares issued
    uint256 public totalShares;

    /// @notice Whether deposits are closed
    bool public depositsClosed;

    /// @notice Whether the vault is closed (after withdrawal)
    bool public vaultClosed;

    // ============ Modifiers ============

    modifier onlyBeforeRun() {
        require(block.timestamp < runTimestamp, "Vault: Run phase has started");
        _;
    }

    modifier onlyAfterRun() {
        require(block.timestamp >= runTimestamp, "Vault: Run phase has not started");
        _;
    }

    modifier onlyAfterStop() {
        require(block.timestamp >= stopTimestamp, "Vault: Stop phase has not started");
        _;
    }

    modifier onlyManager() {
        require(msg.sender == manager, "Vault: Only manager can call this function");
        _;
    }

    modifier notMaxShareholders() {
        require(shareholders.length < maxShareholders, "Vault: Maximum shareholders reached");
        _;
    }

    modifier onlyWhenClosed() {
        require(vaultClosed, "Vault: Vault must be closed to update");
        _;
    }

    modifier onlyWhenClosedOrNoShareholders() {
        require(vaultClosed || shareholders.length == 0, "Vault: Vault must be closed or have no shareholders to update");
        _;
    }

    // ============ Constructor ============

    /**
     * @notice Initialize the vault with configuration parameters
     * @param _token1 The ERC20 token that can be deposited into the vault
     * @param _token2 The second ERC20 token (available for manager operations)
     * @param _runTimestamp Timestamp when deposits close and manager operations begin
     * @param _stopTimestamp Timestamp when withdrawals are enabled
     * @param _maxShareholders Maximum number of shareholders allowed
     * @param _manager Address that can call any address
     */
    constructor(
        address _token1,
        address _token2,
        uint256 _runTimestamp,
        uint256 _stopTimestamp,
        uint256 _maxShareholders,
        address _manager
    ) Ownable(msg.sender) {
        require(_token1 != address(0), "Vault: Invalid token1 address");
        require(_token2 != address(0), "Vault: Invalid token2 address");
        require(_token1 != _token2, "Vault: Token1 and token2 must be different");
        require(_runTimestamp > block.timestamp, "Vault: Run timestamp must be in future");
        require(
            _stopTimestamp > _runTimestamp,
            "Vault: Stop timestamp must be after run timestamp"
        );
        require(_maxShareholders > 0, "Vault: Max shareholders must be greater than 0");
        require(_manager != address(0), "Vault: Invalid manager address");

        token1 = ERC20(_token1);
        token2 = ERC20(_token2);
        runTimestamp = _runTimestamp;
        stopTimestamp = _stopTimestamp;
        maxShareholders = _maxShareholders;
        manager = _manager;
    }

    // ============ External Functions ============

    /**
     * @notice Deposit token1 into the vault (only before run timestamp)
     * @param amount Amount of token1 to deposit
     */
    function deposit(
        uint256 amount
    ) external onlyBeforeRun notMaxShareholders nonReentrant {
        require(amount > 0, "Vault: Amount must be greater than 0");
        require(!depositsClosed, "Vault: Deposits are closed");
        require(!vaultClosed, "Vault: Vault is closed");

        // Transfer token1 from user to vault
        token1.safeTransferFrom(msg.sender, address(this), amount);

        // Calculate shares (1:1 ratio for simplicity, can be modified)
        uint256 newShares = amount;

        // Add to total shares
        totalShares = totalShares + newShares;

        // Update shareholder's shares
        if (shares[msg.sender] == 0) {
            // New shareholder
            shareholders.push(msg.sender);
        }
        shares[msg.sender] = shares[msg.sender] + newShares;

        emit Deposited(msg.sender, amount, newShares);

        // Check if max shareholders reached
        if (shareholders.length >= maxShareholders) {
            depositsClosed = true;
            emit DepositsClosed();
        }
    }

    /**
     * @notice Withdraw token1 from the vault to all shareholders (only manager, only after stop timestamp)
     */
    function withdraw() external onlyAfterStop onlyManager nonReentrant {
        require(token2.balanceOf(address(this)) == 0, "Vault: all token2 must be swap back to token1 to withdraw");
        require(totalShares > 0, "Vault: No shares to withdraw");
        require(shareholders.length > 0, "Vault: No shareholders to withdraw to");
        require(!vaultClosed, "Vault: Vault is already closed");

        uint256 totalTokenBalance = token1.balanceOf(address(this));
        require(totalTokenBalance > 0, "Vault: No tokens to withdraw");

        // Store shareholders array to avoid modification during iteration
        address[] memory shareholdersToProcess = new address[](shareholders.length);
        uint256[] memory sharesToProcess = new uint256[](shareholders.length);
        
        for (uint256 i = 0; i < shareholders.length; i++) {
            shareholdersToProcess[i] = shareholders[i];
            sharesToProcess[i] = shares[shareholders[i]];
        }

        // Calculate and distribute tokens to all shareholders
        for (uint256 i = 0; i < shareholdersToProcess.length; i++) {
            address shareholder = shareholdersToProcess[i];
            uint256 userShares = sharesToProcess[i];
            
            if (userShares > 0) {
                // Calculate withdrawal amount based on share ratio
                uint256 withdrawalAmount = userShares * totalTokenBalance / totalShares;
                
                if (withdrawalAmount > 0) {
                    // Clear shares for this shareholder
                    shares[shareholder] = 0;
                    
                    // Transfer token1 to shareholder
                    token1.safeTransfer(shareholder, withdrawalAmount);
                    
                    emit Withdrawn(shareholder, withdrawalAmount, userShares);
                }
            }
        }

        // Reset all vault parameters to default state
        totalShares = 0;
        delete shareholders;
        depositsClosed = false;
        vaultClosed = true;
        
        emit VaultClosed();
    }

    /**
     * @notice Update vault configuration (only manager, only when vault is closed)
     * @param _token1 New token1 address
     * @param _token2 New token2 address
     * @param _runTimestamp New run timestamp
     * @param _stopTimestamp New stop timestamp
     * @param _maxShareholders New maximum shareholders
     */
    function updateVault(
        address _token1,
        address _token2,
        uint256 _runTimestamp,
        uint256 _stopTimestamp,
        uint256 _maxShareholders
    ) external onlyManager onlyWhenClosedOrNoShareholders {
        require(_token1 != address(0), "Vault: Invalid token1 address");
        require(_token2 != address(0), "Vault: Invalid token2 address");
        require(_token1 != _token2, "Vault: Token1 and token2 must be different");
        require(_runTimestamp > block.timestamp, "Vault: Run timestamp must be in future");
        require(
            _stopTimestamp > _runTimestamp,
            "Vault: Stop timestamp must be after run timestamp"
        );
        require(_maxShareholders > 0, "Vault: Max shareholders must be greater than 0");

        token1 = ERC20(_token1);
        token2 = ERC20(_token2);
        runTimestamp = _runTimestamp;
        stopTimestamp = _stopTimestamp;
        maxShareholders = _maxShareholders;
        
        // Reset vault state to allow new operations
        vaultClosed = false;

        emit VaultUpdated(_token1, _token2, _runTimestamp, _stopTimestamp, _maxShareholders);
    }

    /**
     * @notice Manager can call any address (only after run timestamp)
     * @param target Address to call
     * @param data Calldata to send to target
     * @return result Return data from the call
     */
    function execute(
        address target,
        bytes calldata data
    ) external onlyManager onlyAfterRun returns (bytes memory result) {
        require(target != address(0), "Vault: Invalid target address");

        // Make the call
        (bool success, bytes memory returnData) = target.call(data);
        require(success, "Vault: Call failed");

        emit ManagerCall(target, data);
        return returnData;
    }



    // ============ View Functions ============

    /**
     * @notice Get the number of shareholders
     * @return Number of shareholders
     */
    function getShareholderCount() external view returns (uint256) {
        return shareholders.length;
    }

    /**
     * @notice Get all shareholders
     * @return Array of shareholder addresses
     */
    function getShareholders() external view returns (address[] memory) {
        return shareholders;
    }

    /**
     * @notice Get current vault state
     * @return _totalShares Total shares issued
     * @return _totalBalance Total token1 balance
     * @return _shareholderCount Number of shareholders
     * @return _depositsClosed Whether deposits are closed
     * @return _vaultClosed Whether the vault is closed
     */
    function getVaultState()
        external
        view
        returns (
            uint256 _totalShares,
            uint256 _totalBalance,
            uint256 _shareholderCount,
            bool _depositsClosed,
            bool _vaultClosed
        )
    {
        return (
            totalShares,
            token1.balanceOf(address(this)),
            shareholders.length,
            depositsClosed,
            vaultClosed
        );
    }

    /**
     * @notice Calculate withdrawal amount for a given share amount
     * @param shareAmount Amount of shares to calculate for
     * @return withdrawalAmount Amount of token1 that would be withdrawn
     */
    function calculateWithdrawalAmount(
        uint256 shareAmount
    ) external view returns (uint256 withdrawalAmount) {
        if (totalShares == 0) return 0;
        uint256 totalTokenBalance = token1.balanceOf(address(this));
        return shareAmount * totalTokenBalance / totalShares;
    }

    // ============ Emergency Functions ============

    /**
     * @notice Emergency function to recover stuck tokens (only owner)
     * @param _token Token to recover
     * @param _to Address to send tokens to
     * @param _amount Amount to recover
     */
    function emergencyRecover(address _token, address _to, uint256 _amount) external onlyOwner {
        require(_to != address(0), "Vault: Invalid recipient");
        require(_amount > 0, "Vault: Amount must be greater than 0");

        // Don't allow recovery of the main vault tokens
        require(_token != address(token1), "Vault: Cannot recover vault token1");
        require(_token != address(token2), "Vault: Cannot recover vault token2");

        ERC20(_token).safeTransfer(_to, _amount);
    }
}
