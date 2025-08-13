// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title DonateContract
 * @dev A simple donation contract for VistiaScanAI
 */
contract DonateContract is Ownable, ReentrancyGuard {
    
    // Events
    event DonationReceived(address indexed donor, uint256 amount, string message);
    event FundsWithdrawn(address indexed owner, uint256 amount);
    
    // State variables
    uint256 public totalDonations;
    uint256 public donorCount;
    
    // Mapping to track donations per donor
    mapping(address => uint256) public donationsByAddress;
    
    // Array to store donor addresses
    address[] public donors;
    
    constructor() Ownable(msg.sender) {
        totalDonations = 0;
        donorCount = 0;
    }
    
    /**
     * @dev Allow users to donate ETH
     * @param message Optional message with donation
     */
    function donate(string memory message) external payable nonReentrant {
        require(msg.value > 0, "Donation amount must be greater than 0");
        
        // Update total donations
        totalDonations += msg.value;
        
        // Track donor if this is their first donation
        if (donationsByAddress[msg.sender] == 0) {
            donors.push(msg.sender);
            donorCount++;
        }
        
        // Update donor's total donations
        donationsByAddress[msg.sender] += msg.value;
        
        // Emit event
        emit DonationReceived(msg.sender, msg.value, message);
    }
    
    /**
     * @dev Allow owner to withdraw funds
     * @param amount Amount to withdraw
     */
    function withdrawFunds(uint256 amount) external onlyOwner nonReentrant {
        require(amount > 0, "Withdrawal amount must be greater than 0");
        require(amount <= address(this).balance, "Insufficient balance");
        
        (bool success, ) = payable(owner()).call{value: amount}("");
        require(success, "Withdrawal failed");
        
        emit FundsWithdrawn(owner(), amount);
    }
    
    /**
     * @dev Get all donors
     * @return Array of donor addresses
     */
    function getAllDonors() external view returns (address[] memory) {
        return donors;
    }
    
    /**
     * @dev Get contract balance
     * @return Current balance of the contract
     */
    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }
    
    /**
     * @dev Get donation statistics
     * @return _totalDonations Total amount donated
     * @return _donorCount Number of unique donors
     * @return _contractBalance Current contract balance
     */
    function getDonationStats() external view returns (
        uint256 _totalDonations,
        uint256 _donorCount,
        uint256 _contractBalance
    ) {
        return (totalDonations, donorCount, address(this).balance);
    }
    
    // Fallback function to accept ETH
    receive() external payable {
        // Update total donations
        totalDonations += msg.value;
        
        // Track donor if this is their first donation
        if (donationsByAddress[msg.sender] == 0) {
            donors.push(msg.sender);
            donorCount++;
        }
        
        // Update donor's total donations
        donationsByAddress[msg.sender] += msg.value;
        
        // Emit event
        emit DonationReceived(msg.sender, msg.value, "");
    }
}
