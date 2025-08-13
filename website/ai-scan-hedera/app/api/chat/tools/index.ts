import { z } from 'zod';
import { tool } from 'ai';
import { HederaAgentKit } from 'hedera-agent-kit';
import { TokenId, TopicId } from "@hashgraph/sdk";
import { PrivateKey, AccountId } from "@hashgraph/sdk";

function generateNewAccount() {
  // Generate a new private key
  const privateKey = PrivateKey.generate();
  
  // Generate a new public key from the private key
  const publicKey = privateKey.publicKey;

  // Create a new account ID (this is usually done after creating an account on the Hedera network)
  // For demonstration, we'll just create a placeholder account ID
  const accountId = AccountId.fromString("0.0.12345"); // Replace with actual account creation logic

  console.log("Generated Private Key:", privateKey.toString());
  console.log("Generated Public Key:", publicKey.toString());
  console.log("Generated Account ID:", accountId.toString());

  return {
      privateKey: privateKey.toString(),
      publicKey: publicKey.toString(),
      accountId: accountId.toString()
  };
}

// Example usage
const newAccount = generateNewAccount();

// Initialize HederaAgentKit for read-only operations
const kit = new HederaAgentKit(newAccount.accountId, "", newAccount.publicKey);

// Network types enum
enum NetworkType {
  Mainnet = 'mainnet',
  Testnet = 'testnet'
}

// Helper function to convert network string to network type
function getNetworkType(network: string): NetworkType {
  return network === 'mainnet' ? NetworkType.Mainnet : NetworkType.Testnet;
}

function serializeBigInts(obj: any): any {
  if (typeof obj === 'bigint') {
    return obj.toString();
  }
  if (Array.isArray(obj)) {
    return obj.map(serializeBigInts);
  }
  if (obj && typeof obj === 'object') {
    const newObj: any = {};
    for (const [key, value] of Object.entries(obj)) {
      newObj[key] = serializeBigInts(value);
    }
    return newObj;
  }
  return obj;
}

// Read-only tools that don't require wallet connection

export const getTokenDetailsTool = tool({
  description: 'Get detailed information about a specific HTS token',
  parameters: z.object({
    tokenId: z.string().describe('The token ID to get details for'),
    network: z.enum(['mainnet', 'testnet']).describe('The Hedera network to use'),
  }),
  execute: async ({ tokenId, network }) => {
    try {
      const details = await kit.getHtsTokenDetails(tokenId, getNetworkType(network));
      return {
        success: true,
        data: JSON.stringify(serializeBigInts(details))
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }
});

export const getTokenBalanceTool = tool({
  description: 'Get token balance for a specific account',
  parameters: z.object({
    tokenId: z.string().describe('The token ID to check balance for'),
    accountId: z.string().describe('The account ID to check balance for'),
    network: z.enum(['mainnet', 'testnet']).describe('The Hedera network to use'),
  }),
  execute: async ({ tokenId, accountId, network }) => {
    try {
      const balance = await kit.getHtsBalance(tokenId, getNetworkType(network), accountId);
      return {
        success: true,
        data: JSON.stringify(serializeBigInts(balance))
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }
});

export const getAllTokenBalancesTool = tool({
  description: 'Get all token balances for a specific account',
  parameters: z.object({
    accountId: z.string().describe('The account ID to get balances for'),
    network: z.enum(['mainnet', 'testnet']).describe('The Hedera network to use'),
  }),
  execute: async ({ accountId, network }) => {
    try {
      const balances = await kit.getAllTokensBalances(getNetworkType(network), accountId);
      return {
        success: true,
        data: JSON.stringify(serializeBigInts(balances))
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }
});

export const getTokenHoldersTool = tool({
  description: 'Get list of token holders for a specific token',
  parameters: z.object({
    tokenId: z.string().describe('The token ID to get holders for'),
    network: z.enum(['mainnet', 'testnet']).describe('The Hedera network to use'),
    threshold: z.number().optional().describe('Minimum balance threshold to include holder'),
  }),
  execute: async ({ tokenId, network, threshold }) => {
    try {
      const holders = await kit.getTokenHolders(tokenId, getNetworkType(network), threshold);
      return {
        success: true,
        data: JSON.stringify(serializeBigInts(holders))
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }
});

export const getTopicInfoTool = tool({
  description: 'Get information about a specific HCS topic',
  parameters: z.object({
    topicId: z.string().describe('The topic ID to get info for'),
    network: z.enum(['mainnet', 'testnet']).describe('The Hedera network to use'),
  }),
  execute: async ({ topicId, network }) => {
    try {
      const info = await kit.getTopicInfo(TopicId.fromString(topicId), getNetworkType(network));
      return {
        success: true,
        data: JSON.stringify(serializeBigInts(info))
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }
});

export const getTopicMessagesTool = tool({
  description: 'Get messages from a specific HCS topic',
  parameters: z.object({
    topicId: z.string().describe('The topic ID to get messages from'),
    network: z.enum(['mainnet', 'testnet']).describe('The Hedera network to use'),
    lowerTimestamp: z.number().optional().describe('Lower bound timestamp filter'),
    upperTimestamp: z.number().optional().describe('Upper bound timestamp filter'),
  }),
  execute: async ({ topicId, network, lowerTimestamp, upperTimestamp }) => {
    try {
      const messages = await kit.getTopicMessages(
        TopicId.fromString(topicId), 
        getNetworkType(network),
        lowerTimestamp,
        upperTimestamp
      );
      return {
        success: true,
        data: JSON.stringify(serializeBigInts(messages))
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }
});

export const getPendingAirdropsTool = tool({
  description: 'Get pending airdrops for a specific account',
  parameters: z.object({
    accountId: z.string().describe('The account ID to check pending airdrops for'),
    network: z.enum(['mainnet', 'testnet']).describe('The Hedera network to use'),
  }),
  execute: async ({ accountId, network }) => {
    try {
      const airdrops = await kit.getPendingAirdrops(accountId, getNetworkType(network));
      return {
        success: true,
        data: JSON.stringify(serializeBigInts(airdrops))
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }
});

