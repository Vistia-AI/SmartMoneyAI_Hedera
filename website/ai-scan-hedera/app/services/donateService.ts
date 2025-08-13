import { ethers } from 'ethers';

// Contract ABI for DonateContract
const DONATE_CONTRACT_ABI = [
  "function donate(string memory message) external payable",
  "function getDonationStats() external view returns (uint256 _totalDonations, uint256 _donorCount, uint256 _contractBalance)",
  "function getAllDonors() external view returns (address[] memory)",
  "function donationsByAddress(address) external view returns (uint256)",
  "function owner() external view returns (address)",
  "function totalDonations() external view returns (uint256)",
  "function donorCount() external view returns (uint256)",
  "function getContractBalance() external view returns (uint256)",
  "event DonationReceived(address indexed donor, uint256 amount, string message)",
  "event FundsWithdrawn(address indexed owner, uint256 amount)"
];

// Contract address on Hedera Mainnet
const CONTRACT_ADDRESS = "0x2afC3e9Be4Ea8a118a29a203873b2305809bF68C";

// Hedera Mainnet RPC URL
const HEDERA_RPC_URL = "https://mainnet.hashio.io/api";

export interface DonationStats {
  totalDonations: string;
  donorCount: string;
  contractBalance: string;
}

export interface DonationResult {
  success: boolean;
  transactionHash?: string;
  error?: string;
}

class DonateService {
  private provider: ethers.JsonRpcProvider;
  private contract: ethers.Contract;

  constructor() {
    this.provider = new ethers.JsonRpcProvider(HEDERA_RPC_URL);
    this.contract = new ethers.Contract(CONTRACT_ADDRESS, DONATE_CONTRACT_ABI, this.provider);
  }

  /**
   * Get donation statistics from the contract
   */
  async getDonationStats(): Promise<DonationStats> {
    try {
      const stats = await this.contract.getDonationStats();
      return {
        totalDonations: ethers.formatEther(stats[0]),
        donorCount: stats[1].toString(),
        contractBalance: ethers.formatEther(stats[2])
      };
    } catch (error) {
      console.error('Error getting donation stats:', error);
      throw new Error('Failed to get donation statistics');
    }
  }

  /**
   * Get all donors from the contract
   */
  async getAllDonors(): Promise<string[]> {
    try {
      const donors = await this.contract.getAllDonors();
      return donors;
    } catch (error) {
      console.error('Error getting donors:', error);
      throw new Error('Failed to get donors list');
    }
  }

  /**
   * Get donations by specific address
   */
  async getDonationsByAddress(address: string): Promise<string> {
    try {
      const donations = await this.contract.donationsByAddress(address);
      return ethers.formatEther(donations);
    } catch (error) {
      console.error('Error getting donations by address:', error);
      throw new Error('Failed to get donations for address');
    }
  }

  /**
   * Make a donation to the contract
   */
  async donate(amount: string, message: string, signer: ethers.Signer): Promise<DonationResult> {
    try {
      // Connect contract with signer
      const contractWithSigner = this.contract.connect(signer);
      
      // Convert amount to wei (HBAR uses same decimal places as ETH)
      const amountInWei = ethers.parseEther(amount);
      
      // Make the donation transaction
      const tx = await contractWithSigner.donate(message, {
        value: amountInWei,
        gasLimit: 200000
      });
      
      // Wait for transaction confirmation
      const receipt = await tx.wait();
      
      return {
        success: true,
        transactionHash: receipt.hash
      };
    } catch (error) {
      console.error('Error making donation:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Donation failed'
      };
    }
  }

  /**
   * Get contract owner
   */
  async getOwner(): Promise<string> {
    try {
      const owner = await this.contract.owner();
      return owner;
    } catch (error) {
      console.error('Error getting owner:', error);
      throw new Error('Failed to get contract owner');
    }
  }

  /**
   * Check if an address is the contract owner
   */
  async isOwner(address: string): Promise<boolean> {
    try {
      const owner = await this.getOwner();
      return owner.toLowerCase() === address.toLowerCase();
    } catch (error) {
      console.error('Error checking ownership:', error);
      return false;
    }
  }

  /**
   * Get provider for wallet connection
   */
  getProvider(): ethers.JsonRpcProvider {
    return this.provider;
  }

  /**
   * Get contract instance
   */
  getContract(): ethers.Contract {
    return this.contract;
  }
}

// Export singleton instance
export const donateService = new DonateService();
export default donateService;
